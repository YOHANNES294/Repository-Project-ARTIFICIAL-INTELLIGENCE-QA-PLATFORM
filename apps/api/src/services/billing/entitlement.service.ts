import { UsageMetric } from '@ai-qa/shared-types';
import { getSubscription } from './subscription.service.js';
import { getCurrentUsage } from './usage-ledger.service.js';

export interface EntitlementCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  metric: UsageMetric;
  reason?: string;
}

export type FeatureFlagKey =
  | 'allowCustomReports'
  | 'allowIntegrations'
  | 'allowAdvancedAnalytics'
  | 'allowSso'
  | 'allowAuditExport';

export async function checkEntitlement(
  organizationId: string,
  metric: UsageMetric,
  requestedDelta: number = 1
): Promise<EntitlementCheckResult> {
  const subscription = await getSubscription(organizationId);
  const plan = subscription.plan!;

  let limit = -1;
  switch (metric) {
    case UsageMetric.PROJECTS:
      limit = plan.maxProjects;
      break;
    case UsageMetric.MEMBERS:
      limit = plan.maxMembers;
      break;
    case UsageMetric.TEST_CASES:
      limit = plan.maxTestCases;
      break;
    case UsageMetric.TEST_RUNS_MONTHLY:
      limit = plan.maxTestRunsPerMonth;
      break;
    case UsageMetric.AUTOMATION_RUNS_MONTHLY:
      limit = plan.maxAutomationRunsPerMonth;
      break;
    case UsageMetric.AI_TOKENS_MONTHLY:
      limit = plan.aiTokenAllowance;
      break;
    case UsageMetric.STORAGE_BYTES:
      limit = Number(plan.storageBytes);
      break;
  }

  // -1 represents unlimited
  if (limit === -1) {
    const current = await getCurrentUsage(organizationId, metric);
    return { allowed: true, current, limit: -1, metric };
  }

  const current = await getCurrentUsage(organizationId, metric);
  const allowed = current + requestedDelta <= limit;

  return {
    allowed,
    current,
    limit,
    metric,
    reason: allowed
      ? undefined
      : `Plan quota exceeded for ${metric}. Current: ${current}, Limit: ${limit}, Requested: +${requestedDelta}. Please upgrade your subscription.`,
  };
}

export async function assertEntitlement(
  organizationId: string,
  metric: UsageMetric,
  requestedDelta: number = 1
): Promise<void> {
  const check = await checkEntitlement(organizationId, metric, requestedDelta);
  if (!check.allowed) {
    const err: any = new Error(check.reason);
    err.status = 402;
    err.code = 'ENTITLEMENT_LIMIT_EXCEEDED';
    err.details = {
      metric: check.metric,
      current: check.current,
      limit: check.limit,
      requestedDelta,
    };
    throw err;
  }
}

export async function checkFeatureFlag(organizationId: string, feature: FeatureFlagKey): Promise<boolean> {
  const subscription = await getSubscription(organizationId);
  const plan = subscription.plan!;
  return Boolean(plan[feature]);
}

export async function assertFeatureFlag(organizationId: string, feature: FeatureFlagKey): Promise<void> {
  const allowed = await checkFeatureFlag(organizationId, feature);
  if (!allowed) {
    const err: any = new Error(`Feature '${feature}' is not included in your current subscription plan. Please upgrade to access this feature.`);
    err.status = 403;
    err.code = 'FEATURE_NOT_INCLUDED_IN_PLAN';
    err.details = { feature };
    throw err;
  }
}
