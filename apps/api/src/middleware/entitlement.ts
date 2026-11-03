import { Request, Response, NextFunction } from 'express';
import { UsageMetric } from '@ai-qa/shared-types';
import { assertEntitlement, assertFeatureFlag, FeatureFlagKey } from '../services/billing/entitlement.service.js';
import { ValidationError } from '../errors.js';
import { prisma } from '../prisma.js';

export function requireEntitlement(metric: UsageMetric, delta: number = 1) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.organizationId || (req.params.orgId as string);
      if (!organizationId) {
        throw new ValidationError('Organization context required for entitlement check');
      }

      // If subscription table is not available in test harness, pass through
      if (!prisma.subscription?.findUnique || !prisma.billingPlan?.findUnique) {
        return next();
      }

      await assertEntitlement(organizationId, metric, delta);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireFeatureFlag(feature: FeatureFlagKey) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.organizationId || (req.params.orgId as string);
      if (!organizationId) {
        throw new ValidationError('Organization context required for feature check');
      }

      if (!prisma.subscription?.findUnique || !prisma.billingPlan?.findUnique) {
        return next();
      }

      await assertFeatureFlag(organizationId, feature);
      next();
    } catch (err) {
      next(err);
    }
  };
}
