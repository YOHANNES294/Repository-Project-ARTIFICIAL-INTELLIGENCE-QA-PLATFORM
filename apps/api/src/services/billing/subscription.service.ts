import {
  BillingTier,
  SubscriptionStatus,
  BillingInterval,
  SubscriptionDto,
  ChangeSubscriptionInput,
  CancelSubscriptionInput,
  PaymentProviderType,
  NotificationCategory,
  NotificationPriority,
} from '@ai-qa/shared-types';
import { prisma } from '../../prisma.js';
import { ensureDefaultPlans, getPlanByTier, mapPlanToDto } from './plan.service.js';
import { createAuditLog } from '../audit.service.js';
import { NotificationService } from '../notifications/notification.service.js';

export function mapSubscriptionToDto(sub: any): SubscriptionDto {
  return {
    id: sub.id,
    organizationId: sub.organizationId,
    billingPlanId: sub.billingPlanId,
    status: sub.status as SubscriptionStatus,
    billingInterval: (sub.billingInterval ?? BillingInterval.MONTHLY) as BillingInterval,
    currentPeriodStart: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : sub.createdAt.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    trialStart: sub.trialStart ? sub.trialStart.toISOString() : null,
    trialEnd: sub.trialEnd ? sub.trialEnd.toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    cancelledAt: sub.cancelledAt ? sub.cancelledAt.toISOString() : null,
    endedAt: sub.endedAt ? sub.endedAt.toISOString() : null,
    gracePeriodEnd: sub.gracePeriodEnd ? sub.gracePeriodEnd.toISOString() : null,
    paymentProvider: (sub.paymentProvider ?? PaymentProviderType.LOCAL_TEST) as PaymentProviderType,
    providerCustomerId: sub.providerCustomerId,
    providerSubscriptionId: sub.providerSubscriptionId,
    metadata: sub.metadata as Record<string, unknown> | null,
    plan: sub.plan ? mapPlanToDto(sub.plan) : undefined,
    createdAt: sub.createdAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
  };
}

export async function getSubscription(organizationId: string): Promise<SubscriptionDto> {
  await ensureDefaultPlans();

  let subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });

  if (!subscription) {
    // If no subscription exists for organization, provision default Free plan
    const freePlan = await getPlanByTier(BillingTier.FREE);
    if (!freePlan) {
      throw new Error('Default Free billing plan not found');
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default period

    subscription = await prisma.subscription.create({
      data: {
        organizationId,
        billingPlanId: freePlan.id,
        status: SubscriptionStatus.ACTIVE as any,
        billingInterval: BillingInterval.MONTHLY as any,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paymentProvider: PaymentProviderType.LOCAL_TEST as any,
      },
      include: { plan: true },
    });
  }

  return mapSubscriptionToDto(subscription);
}

export async function changeSubscription(
  organizationId: string,
  input: ChangeSubscriptionInput,
  userId: string
): Promise<SubscriptionDto> {
  const currentSub = await getSubscription(organizationId);
  const targetPlan = await getPlanByTier(input.planTier);

  if (!targetPlan) {
    throw new Error(`Billing plan for tier ${input.planTier} not found`);
  }

  const now = new Date();
  const interval = input.interval || BillingInterval.MONTHLY;
  const days = interval === BillingInterval.YEARLY ? 365 : 30;
  const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const updated = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.update({
      where: { organizationId },
      data: {
        billingPlanId: targetPlan.id,
        billingInterval: interval as any,
        status: SubscriptionStatus.ACTIVE as any,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        endedAt: null,
        paymentProvider: (input.paymentProvider ?? PaymentProviderType.LOCAL_TEST) as any,
      },
      include: { plan: true },
    });

    // Record auditable state transition history
    await tx.subscriptionHistory.create({
      data: {
        subscriptionId: sub.id,
        organizationId,
        fromStatus: currentSub.status as any,
        toStatus: SubscriptionStatus.ACTIVE as any,
        fromPlanId: currentSub.billingPlanId,
        toPlanId: targetPlan.id,
        reason: `Subscription changed to ${targetPlan.name} (${interval})`,
        changedById: userId,
      },
    });

    return sub;
  });

  // Log audit event
  await createAuditLog({
    organizationId,
    userId,
    action: 'SUBSCRIPTION_CHANGED',
    entityType: 'Subscription',
    entityId: updated.id,
    metadata: {
      fromTier: currentSub.plan?.tier,
      toTier: targetPlan.tier,
      interval,
    },
  });

  // Notify organization admins
  await NotificationService.dispatch({
    organizationId,
    title: 'Subscription Updated',
    message: `Your organization subscription has been updated to the ${targetPlan.name} plan (${interval.toLowerCase()}).`,
    type: 'SUBSCRIPTION_CHANGED',
    category: NotificationCategory.GENERAL,
    priority: NotificationPriority.HIGH,
    actorId: userId,
  }).catch(() => {});

  return mapSubscriptionToDto(updated);
}

export async function cancelSubscription(
  organizationId: string,
  input: CancelSubscriptionInput,
  userId: string
): Promise<SubscriptionDto> {
  const currentSub = await getSubscription(organizationId);
  const now = new Date();

  const isImmediate = input.immediately ?? false;
  const newStatus = isImmediate ? SubscriptionStatus.CANCELLED : (currentSub.status as SubscriptionStatus);

  const updated = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.update({
      where: { organizationId },
      data: {
        status: newStatus as any,
        cancelAtPeriodEnd: !isImmediate,
        cancelledAt: now,
        endedAt: isImmediate ? now : null,
      },
      include: { plan: true },
    });

    await tx.subscriptionHistory.create({
      data: {
        subscriptionId: sub.id,
        organizationId,
        fromStatus: currentSub.status as any,
        toStatus: newStatus as any,
        fromPlanId: currentSub.billingPlanId,
        toPlanId: currentSub.billingPlanId,
        reason: input.reason || (isImmediate ? 'Subscription cancelled immediately' : 'Subscription scheduled for cancellation at period end'),
        changedById: userId,
      },
    });

    return sub;
  });

  await createAuditLog({
    organizationId,
    userId,
    action: 'SUBSCRIPTION_CANCELLED',
    entityType: 'Subscription',
    entityId: updated.id,
    metadata: {
      immediately: isImmediate,
      reason: input.reason,
    },
  });

  await NotificationService.dispatch({
    organizationId,
    title: 'Subscription Cancellation Scheduled',
    message: isImmediate
      ? 'Your subscription was cancelled immediately.'
      : 'Your subscription is scheduled to end at the conclusion of the current billing cycle.',
    type: 'SUBSCRIPTION_CANCELLED',
    category: NotificationCategory.GENERAL,
    priority: NotificationPriority.HIGH,
    actorId: userId,
  }).catch(() => {});

  return mapSubscriptionToDto(updated);
}

export async function reactivateSubscription(organizationId: string, userId: string): Promise<SubscriptionDto> {
  const currentSub = await getSubscription(organizationId);

  const updated = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.update({
      where: { organizationId },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      include: { plan: true },
    });

    await tx.subscriptionHistory.create({
      data: {
        subscriptionId: sub.id,
        organizationId,
        fromStatus: currentSub.status as any,
        toStatus: sub.status as any,
        fromPlanId: sub.billingPlanId,
        toPlanId: sub.billingPlanId,
        reason: 'Subscription cancellation revoked',
        changedById: userId,
      },
    });

    return sub;
  });

  await createAuditLog({
    organizationId,
    userId,
    action: 'SUBSCRIPTION_REACTIVATED',
    entityType: 'Subscription',
    entityId: updated.id,
    metadata: { organizationId },
  });

  return mapSubscriptionToDto(updated);
}
