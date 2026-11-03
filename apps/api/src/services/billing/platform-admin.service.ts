import {
  PlatformOverviewMetricsDto,
  PlatformOrganizationListItemDto,
  PaymentDto,
  BillingInterval,
  SubscriptionStatus,
} from '@ai-qa/shared-types';
import { prisma } from '../../prisma.js';
import { createAuditLog } from '../audit.service.js';
import { mapSubscriptionToDto } from './subscription.service.js';
import { mapPaymentToDto } from './payment.service.js';
import { getUsageSummary } from './usage-ledger.service.js';

export async function getPlatformOverview(): Promise<PlatformOverviewMetricsDto> {
  const [
    totalOrganizations,
    suspendedOrganizations,
    totalUsers,
    suspendedUsers,
    subscriptions,
    recentPaymentsRaw,
    recentAuditLogsRaw,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { isSuspended: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { isSuspended: true } }),
    prisma.subscription.findMany({ include: { plan: true } }),
    prisma.payment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        userId: true,
        organizationId: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  const activeOrganizations = totalOrganizations - suspendedOrganizations;
  const activeUsers = totalUsers - suspendedUsers;

  const subscriptionsByStatus: Record<string, number> = {};
  const subscriptionsByTier: Record<string, number> = {};
  let mrrCents = 0;

  for (const sub of subscriptions) {
    const status = sub.status;
    subscriptionsByStatus[status] = (subscriptionsByStatus[status] || 0) + 1;

    if (sub.plan) {
      const tier = sub.plan.tier;
      subscriptionsByTier[tier] = (subscriptionsByTier[tier] || 0) + 1;

      if (sub.status === SubscriptionStatus.ACTIVE) {
        if (sub.billingInterval === BillingInterval.YEARLY) {
          mrrCents += Math.round(sub.plan.priceCentsYear / 12);
        } else {
          mrrCents += sub.plan.priceCentsMonth;
        }
      }
    }
  }

  const arrCents = mrrCents * 12;
  const recentPayments: PaymentDto[] = recentPaymentsRaw.map(mapPaymentToDto);

  const recentAuditLogs = recentAuditLogsRaw.map((log) => ({
    id: log.id,
    action: log.action,
    userId: log.userId,
    organizationId: log.organizationId,
    createdAt: log.createdAt.toISOString(),
    details: log.metadata,
  }));

  return {
    totalOrganizations,
    activeOrganizations,
    suspendedOrganizations,
    totalUsers,
    activeUsers,
    suspendedUsers,
    subscriptionsByStatus,
    subscriptionsByTier,
    mrrCents,
    arrCents,
    recentPayments,
    recentAuditLogs,
  };
}

export async function listOrganizations(query: {
  search?: string;
  page?: number;
  limit?: number;
  isSuspended?: boolean;
}): Promise<{ items: PlatformOrganizationListItemDto[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.isSuspended !== undefined) {
    where.isSuspended = query.isSuspended;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, orgs] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: { include: { plan: true } },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    }),
  ]);

  const items: PlatformOrganizationListItemDto[] = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    isSuspended: org.isSuspended,
    suspensionReason: org.suspensionReason,
    suspendedAt: org.suspendedAt ? org.suspendedAt.toISOString() : null,
    memberCount: org._count.members,
    projectCount: org._count.projects,
    subscription: org.subscription ? mapSubscriptionToDto(org.subscription) : null,
    createdAt: org.createdAt.toISOString(),
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getOrganizationDetails(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      subscription: { include: { plan: true } },
      members: {
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, isSuspended: true },
          },
        },
      },
      projects: {
        select: { id: true, name: true, key: true, status: true, createdAt: true },
      },
      payments: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      invoices: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const usageSummary = await getUsageSummary(orgId);

  return {
    ...org,
    usageSummary,
  };
}

export async function suspendOrganization(orgId: string, reason: string, adminUserId: string) {
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      isSuspended: true,
      suspensionReason: reason,
      suspendedAt: new Date(),
    },
  });

  await createAuditLog({
    organizationId: orgId,
    userId: adminUserId,
    action: 'ORGANIZATION_SUSPENDED',
    entityType: 'Organization',
    entityId: orgId,
    metadata: { reason },
  });

  return org;
}

export async function reactivateOrganization(orgId: string, adminUserId: string) {
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      isSuspended: false,
      suspensionReason: null,
      suspendedAt: null,
    },
  });

  await createAuditLog({
    organizationId: orgId,
    userId: adminUserId,
    action: 'ORGANIZATION_REACTIVATED',
    entityType: 'Organization',
    entityId: orgId,
    metadata: {},
  });

  return org;
}

export async function listUsers(query: {
  search?: string;
  page?: number;
  limit?: number;
  isSuspended?: boolean;
}) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.isSuspended !== undefined) {
    where.isSuspended = query.isSuspended;
  }
  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperAdmin: true,
        isSuspended: true,
        suspensionReason: true,
        suspendedAt: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    items: users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function suspendUser(userId: string, reason: string, adminUserId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isSuspended: true,
      suspensionReason: reason,
      suspendedAt: new Date(),
    },
  });

  const membership = await prisma.organizationMember.findFirst({ where: { userId } });
  if (membership?.organizationId) {
    await createAuditLog({
      organizationId: membership.organizationId,
      userId: adminUserId,
      action: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: userId,
      metadata: { reason },
    });
  }

  return user;
}

export async function reactivateUser(userId: string, adminUserId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isSuspended: false,
      suspensionReason: null,
      suspendedAt: null,
    },
  });

  const membership = await prisma.organizationMember.findFirst({ where: { userId } });
  if (membership?.organizationId) {
    await createAuditLog({
      organizationId: membership.organizationId,
      userId: adminUserId,
      action: 'USER_REACTIVATED',
      entityType: 'User',
      entityId: userId,
      metadata: {},
    });
  }

  return user;
}

export async function getSystemHealth() {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  return {
    status: dbStatus === 'ok' ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: { status: dbStatus },
    memory: process.memoryUsage(),
    nodeVersion: process.version,
  };
}
