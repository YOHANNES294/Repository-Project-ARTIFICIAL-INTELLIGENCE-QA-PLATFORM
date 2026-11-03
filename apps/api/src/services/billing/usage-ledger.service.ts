import {
  UsageMetric,
  UsageSummaryDto,
  UsageLedgerEntryDto,
  UsageAdjustmentDto,
  RecordUsageInput,
  CreateUsageAdjustmentInput,
  UsageMeterDto,
} from '@ai-qa/shared-types';
import { prisma } from '../../prisma.js';
import { getSubscription } from './subscription.service.js';

export async function recordUsage(params: RecordUsageInput): Promise<UsageLedgerEntryDto> {
  const subscription = await getSubscription(params.organizationId);
  const periodStart = new Date(subscription.currentPeriodStart);
  const periodEnd = new Date(subscription.currentPeriodEnd);

  // Check if idempotency key already exists to prevent double-metering
  const existing = await prisma.usageLedgerEntry.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });

  if (existing) {
    return {
      id: existing.id,
      organizationId: existing.organizationId,
      metric: existing.metric as UsageMetric,
      quantity: existing.quantity,
      billingPeriodStart: existing.billingPeriodStart.toISOString(),
      billingPeriodEnd: existing.billingPeriodEnd.toISOString(),
      idempotencyKey: existing.idempotencyKey,
      sourceType: existing.sourceType,
      sourceId: existing.sourceId,
      metadata: existing.metadata as Record<string, unknown> | null,
      recordedAt: existing.recordedAt.toISOString(),
    };
  }

  const entry = await prisma.usageLedgerEntry.create({
    data: {
      organizationId: params.organizationId,
      metric: params.metric as any,
      quantity: params.quantity,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      idempotencyKey: params.idempotencyKey,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      metadata: (params.metadata as any) ?? undefined,
    },
  });

  return {
    id: entry.id,
    organizationId: entry.organizationId,
    metric: entry.metric as UsageMetric,
    quantity: entry.quantity,
    billingPeriodStart: entry.billingPeriodStart.toISOString(),
    billingPeriodEnd: entry.billingPeriodEnd.toISOString(),
    idempotencyKey: entry.idempotencyKey,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    metadata: entry.metadata as Record<string, unknown> | null,
    recordedAt: entry.recordedAt.toISOString(),
  };
}

export async function createAdjustment(
  params: CreateUsageAdjustmentInput & { organizationId: string; adjustedById: string }
): Promise<UsageAdjustmentDto> {
  const subscription = await getSubscription(params.organizationId);
  const periodStart = new Date(subscription.currentPeriodStart);
  const periodEnd = new Date(subscription.currentPeriodEnd);

  const adjustment = await prisma.usageAdjustment.create({
    data: {
      organizationId: params.organizationId,
      metric: params.metric as any,
      quantityDelta: params.quantityDelta,
      reason: params.reason,
      adjustedById: params.adjustedById,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
    },
  });

  return {
    id: adjustment.id,
    organizationId: adjustment.organizationId,
    metric: adjustment.metric as UsageMetric,
    quantityDelta: adjustment.quantityDelta,
    reason: adjustment.reason,
    adjustedById: adjustment.adjustedById,
    billingPeriodStart: adjustment.billingPeriodStart.toISOString(),
    billingPeriodEnd: adjustment.billingPeriodEnd.toISOString(),
    createdAt: adjustment.createdAt.toISOString(),
  };
}

export async function getCurrentUsage(organizationId: string, metric: UsageMetric): Promise<number> {
  const subscription = await getSubscription(organizationId);
  const periodStart = new Date(subscription.currentPeriodStart);
  const periodEnd = new Date(subscription.currentPeriodEnd);

  // Get adjustments sum for this metric and period
  const adjustmentAgg = await prisma.usageAdjustment.aggregate({
    where: {
      organizationId,
      metric: metric as any,
      billingPeriodStart: { gte: periodStart },
    },
    _sum: { quantityDelta: true },
  });
  const adjustmentDelta = adjustmentAgg._sum.quantityDelta ?? 0;

  switch (metric) {
    case UsageMetric.PROJECTS: {
      const count = await prisma.project.count({
        where: { organizationId, isArchived: false },
      });
      return Math.max(0, count + adjustmentDelta);
    }
    case UsageMetric.MEMBERS: {
      const count = await prisma.organizationMember.count({
        where: { organizationId },
      });
      return Math.max(0, count + adjustmentDelta);
    }
    case UsageMetric.TEST_CASES: {
      const count = await prisma.testCase.count({
        where: { project: { organizationId }, isArchived: false },
      });
      return Math.max(0, count + adjustmentDelta);
    }
    case UsageMetric.STORAGE_BYTES: {
      const agg = await prisma.attachment.aggregate({
        where: { project: { organizationId } },
        _sum: { fileSize: true },
      });
      const bytes = agg._sum?.fileSize ?? 0;
      return Math.max(0, bytes + adjustmentDelta);
    }
    case UsageMetric.TEST_RUNS_MONTHLY:
    case UsageMetric.AUTOMATION_RUNS_MONTHLY:
    case UsageMetric.AI_TOKENS_MONTHLY: {
      // Sum from immutable usage ledger for the current billing period
      const ledgerAgg = await prisma.usageLedgerEntry.aggregate({
        where: {
          organizationId,
          metric: metric as any,
          recordedAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { quantity: true },
      });
      const recorded = ledgerAgg._sum.quantity ?? 0;
      return Math.max(0, recorded + adjustmentDelta);
    }
    default:
      return 0;
  }
}

export async function getUsageSummary(organizationId: string): Promise<UsageSummaryDto> {
  const subscription = await getSubscription(organizationId);
  const plan = subscription.plan!;

  const metrics = [
    { metric: UsageMetric.PROJECTS, limit: plan.maxProjects, unit: 'projects' },
    { metric: UsageMetric.MEMBERS, limit: plan.maxMembers, unit: 'members' },
    { metric: UsageMetric.TEST_CASES, limit: plan.maxTestCases, unit: 'test cases' },
    { metric: UsageMetric.TEST_RUNS_MONTHLY, limit: plan.maxTestRunsPerMonth, unit: 'runs/mo' },
    { metric: UsageMetric.AUTOMATION_RUNS_MONTHLY, limit: plan.maxAutomationRunsPerMonth, unit: 'runs/mo' },
    { metric: UsageMetric.AI_TOKENS_MONTHLY, limit: plan.aiTokenAllowance, unit: 'tokens/mo' },
    { metric: UsageMetric.STORAGE_BYTES, limit: Number(plan.storageBytes), unit: 'bytes' },
  ];

  const meters: Record<string, UsageMeterDto> = {};

  for (const item of metrics) {
    const current = await getCurrentUsage(organizationId, item.metric);
    const limit = item.limit;
    const isExceeded = limit !== -1 && current >= limit;
    const usagePercentage = limit === -1 ? 0 : Math.min(100, Math.round((current / limit) * 100));

    meters[item.metric] = {
      metric: item.metric,
      current,
      limit,
      usagePercentage,
      unit: item.unit,
      isExceeded,
    };
  }

  return {
    organizationId,
    billingPeriodStart: subscription.currentPeriodStart,
    billingPeriodEnd: subscription.currentPeriodEnd,
    plan,
    subscription,
    meters,
  };
}
