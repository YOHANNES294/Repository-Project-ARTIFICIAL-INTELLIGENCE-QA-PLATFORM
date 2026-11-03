import { BillingTier, BillingPlanDto, CreateBillingPlanInput, UpdateBillingPlanInput } from '@ai-qa/shared-types';
import { prisma } from '../../prisma.js';

export const DEFAULT_PLANS: Array<CreateBillingPlanInput & { sortOrder: number }> = [
  {
    name: 'Free',
    tier: BillingTier.FREE,
    description: 'Essential QA workflows for small open-source or individual projects.',
    priceCentsMonth: 0,
    priceCentsYear: 0,
    currency: 'USD',
    isActive: true,
    isPublic: true,
    sortOrder: 1,
    maxProjects: 3,
    maxMembers: 5,
    maxTestCases: 500,
    maxTestRunsPerMonth: 100,
    maxAutomationRunsPerMonth: 50,
    aiTokenAllowance: 100000,
    storageBytes: 1073741824, // 1 GB
    allowCustomReports: false,
    allowIntegrations: false,
    allowAdvancedAnalytics: false,
    allowSso: false,
    allowAuditExport: false,
  },
  {
    name: 'Starter',
    tier: BillingTier.STARTER,
    description: 'Robust testing collaboration for agile product teams and growing startups.',
    priceCentsMonth: 2900,
    priceCentsYear: 29000,
    currency: 'USD',
    isActive: true,
    isPublic: true,
    sortOrder: 2,
    maxProjects: 10,
    maxMembers: 15,
    maxTestCases: 5000,
    maxTestRunsPerMonth: 1000,
    maxAutomationRunsPerMonth: 500,
    aiTokenAllowance: 500000,
    storageBytes: 10737418240, // 10 GB
    allowCustomReports: true,
    allowIntegrations: true,
    allowAdvancedAnalytics: false,
    allowSso: false,
    allowAuditExport: false,
  },
  {
    name: 'Professional',
    tier: BillingTier.PROFESSIONAL,
    description: 'High-velocity automation, advanced analytics, and custom reporting for scaling engineering orgs.',
    priceCentsMonth: 9900,
    priceCentsYear: 99000,
    currency: 'USD',
    isActive: true,
    isPublic: true,
    sortOrder: 3,
    maxProjects: 50,
    maxMembers: 50,
    maxTestCases: 50000,
    maxTestRunsPerMonth: 10000,
    maxAutomationRunsPerMonth: 5000,
    aiTokenAllowance: 2000000,
    storageBytes: 53687091200, // 50 GB
    allowCustomReports: true,
    allowIntegrations: true,
    allowAdvancedAnalytics: true,
    allowSso: false,
    allowAuditExport: true,
  },
  {
    name: 'Enterprise',
    tier: BillingTier.ENTERPRISE,
    description: 'Dedicated capacity, unlimited resources, SSO, compliance exports, and premier SLA.',
    priceCentsMonth: 29900,
    priceCentsYear: 299000,
    currency: 'USD',
    isActive: true,
    isPublic: true,
    sortOrder: 4,
    maxProjects: -1,
    maxMembers: -1,
    maxTestCases: -1,
    maxTestRunsPerMonth: -1,
    maxAutomationRunsPerMonth: -1,
    aiTokenAllowance: 10000000,
    storageBytes: 536870912000, // 500 GB
    allowCustomReports: true,
    allowIntegrations: true,
    allowAdvancedAnalytics: true,
    allowSso: true,
    allowAuditExport: true,
  },
];

export function mapPlanToDto(plan: any): BillingPlanDto {
  return {
    id: plan.id,
    name: plan.name,
    tier: plan.tier as BillingTier,
    description: plan.description,
    priceCentsMonth: plan.priceCentsMonth,
    priceCentsYear: plan.priceCentsYear ?? 0,
    currency: plan.currency ?? 'USD',
    isActive: plan.isActive ?? true,
    isPublic: plan.isPublic ?? true,
    sortOrder: plan.sortOrder ?? 0,
    maxProjects: plan.maxProjects,
    maxMembers: plan.maxMembers,
    maxTestCases: plan.maxTestCases,
    maxTestRunsPerMonth: plan.maxTestRunsPerMonth ?? plan.maxTestRuns ?? 100,
    maxAutomationRunsPerMonth: plan.maxAutomationRunsPerMonth ?? 50,
    aiTokenAllowance: plan.aiTokenAllowance ?? 100000,
    storageBytes: typeof plan.storageBytes === 'bigint' ? Number(plan.storageBytes) : (plan.storageBytes ?? 1073741824),
    storageMb: plan.storageMb ?? 1024,
    allowCustomReports: plan.allowCustomReports ?? false,
    allowIntegrations: plan.allowIntegrations ?? false,
    allowAdvancedAnalytics: plan.allowAdvancedAnalytics ?? false,
    allowSso: plan.allowSso ?? false,
    allowAuditExport: plan.allowAuditExport ?? false,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function ensureDefaultPlans(): Promise<void> {
  for (const planDef of DEFAULT_PLANS) {
    const existing = await prisma.billingPlan.findUnique({
      where: { tier: planDef.tier as any },
    });

    if (!existing) {
      await prisma.billingPlan.create({
        data: {
          name: planDef.name,
          tier: planDef.tier as any,
          description: planDef.description,
          priceCentsMonth: planDef.priceCentsMonth,
          priceCentsYear: planDef.priceCentsYear,
          currency: planDef.currency,
          isActive: planDef.isActive,
          isPublic: planDef.isPublic,
          sortOrder: planDef.sortOrder,
          maxProjects: planDef.maxProjects ?? 3,
          maxMembers: planDef.maxMembers ?? 5,
          maxTestCases: planDef.maxTestCases ?? 500,
          maxTestRuns: planDef.maxTestRunsPerMonth ?? 100,
          maxTestRunsPerMonth: planDef.maxTestRunsPerMonth ?? 100,
          maxAutomationRunsPerMonth: planDef.maxAutomationRunsPerMonth ?? 50,
          maxAiRequests: 100,
          aiTokenAllowance: planDef.aiTokenAllowance ?? 100000,
          storageMb: 1024,
          storageBytes: BigInt(planDef.storageBytes ?? 1073741824),
          allowCustomReports: planDef.allowCustomReports ?? false,
          allowIntegrations: planDef.allowIntegrations ?? false,
          allowAdvancedAnalytics: planDef.allowAdvancedAnalytics ?? false,
          allowSso: planDef.allowSso ?? false,
          allowAuditExport: planDef.allowAuditExport ?? false,
        },
      });
    }
  }
}

export async function getPlans(includeInactive: boolean = false): Promise<BillingPlanDto[]> {
  await ensureDefaultPlans();
  const where = includeInactive ? {} : { isActive: true };
  const plans = await prisma.billingPlan.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });
  return plans.map(mapPlanToDto);
}

export async function getPlanByTier(tier: BillingTier): Promise<BillingPlanDto | null> {
  await ensureDefaultPlans();
  const plan = await prisma.billingPlan.findUnique({
    where: { tier: tier as any },
  });
  return plan ? mapPlanToDto(plan) : null;
}

export async function getPlanById(id: string): Promise<BillingPlanDto | null> {
  const plan = await prisma.billingPlan.findUnique({
    where: { id },
  });
  return plan ? mapPlanToDto(plan) : null;
}

export async function createPlan(input: CreateBillingPlanInput): Promise<BillingPlanDto> {
  const plan = await prisma.billingPlan.create({
    data: {
      name: input.name,
      tier: input.tier as any,
      description: input.description,
      priceCentsMonth: input.priceCentsMonth,
      priceCentsYear: input.priceCentsYear,
      currency: input.currency ?? 'USD',
      isActive: input.isActive ?? true,
      isPublic: input.isPublic ?? true,
      sortOrder: input.sortOrder ?? 0,
      maxProjects: input.maxProjects ?? 3,
      maxMembers: input.maxMembers ?? 5,
      maxTestCases: input.maxTestCases ?? 500,
      maxTestRuns: input.maxTestRunsPerMonth ?? 100,
      maxTestRunsPerMonth: input.maxTestRunsPerMonth ?? 100,
      maxAutomationRunsPerMonth: input.maxAutomationRunsPerMonth ?? 50,
      aiTokenAllowance: input.aiTokenAllowance ?? 100000,
      storageBytes: BigInt(input.storageBytes ?? 1073741824),
      allowCustomReports: input.allowCustomReports ?? false,
      allowIntegrations: input.allowIntegrations ?? false,
      allowAdvancedAnalytics: input.allowAdvancedAnalytics ?? false,
      allowSso: input.allowSso ?? false,
      allowAuditExport: input.allowAuditExport ?? false,
    },
  });
  return mapPlanToDto(plan);
}

export async function updatePlan(id: string, input: UpdateBillingPlanInput): Promise<BillingPlanDto> {
  const updateData: any = { ...input };
  if (input.storageBytes !== undefined) {
    updateData.storageBytes = BigInt(input.storageBytes);
  }
  if ((input as any).tier !== undefined) {
    updateData.tier = (input as any).tier as any;
  }
  const plan = await prisma.billingPlan.update({
    where: { id },
    data: updateData,
  });
  return mapPlanToDto(plan);
}
