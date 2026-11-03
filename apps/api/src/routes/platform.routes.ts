import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import { ApiResponse, CreateBillingPlanInput } from '@ai-qa/shared-types';
import {
  suspendOrganizationSchema,
  suspendUserSchema,
  createBillingPlanSchema,
  updateBillingPlanSchema,
} from '@ai-qa/validation';
import {
  getPlatformOverview,
  listOrganizations,
  getOrganizationDetails,
  suspendOrganization,
  reactivateOrganization,
  listUsers,
  suspendUser,
  reactivateUser,
  getSystemHealth,
  getPlans,
  createPlan,
  updatePlan,
} from '../services/billing/index.js';

export const platformRouter: Router = Router();

// Strictly enforce platform super-admin access across ALL platform routes
platformRouter.use(authenticate, requireSuperAdmin);

// GET /api/v1/platform/overview - Platform KPI scorecard
platformRouter.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await getPlatformOverview();
    const response: ApiResponse = {
      success: true,
      data: overview,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/platform/organizations - Search & list tenants
platformRouter.get('/organizations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page, limit, isSuspended } = req.query;
    const result = await listOrganizations({
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      isSuspended: isSuspended === 'true' ? true : isSuspended === 'false' ? false : undefined,
    });

    const response: ApiResponse = {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/platform/organizations/:orgId - Inspect tenant details
platformRouter.get('/organizations/:orgId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const details = await getOrganizationDetails(req.params.orgId as string);
    const response: ApiResponse = {
      success: true,
      data: details,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/platform/organizations/:orgId/suspend - Suspend tenant with mandatory reason
platformRouter.post('/organizations/:orgId/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = suspendOrganizationSchema.parse(req.body);
    const org = await suspendOrganization(req.params.orgId as string, validated.reason, req.user!.id);

    const response: ApiResponse = {
      success: true,
      data: org,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/platform/organizations/:orgId/reactivate - Reactivate tenant
platformRouter.post('/organizations/:orgId/reactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await reactivateOrganization(req.params.orgId as string, req.user!.id);
    const response: ApiResponse = {
      success: true,
      data: org,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/platform/users - Search & list users
platformRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page, limit, isSuspended } = req.query;
    const result = await listUsers({
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      isSuspended: isSuspended === 'true' ? true : isSuspended === 'false' ? false : undefined,
    });

    const response: ApiResponse = {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/platform/users/:userId/suspend - Suspend user
platformRouter.post('/users/:userId/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = suspendUserSchema.parse(req.body);
    const user = await suspendUser(req.params.userId as string, validated.reason, req.user!.id);

    const response: ApiResponse = {
      success: true,
      data: user,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/platform/users/:userId/reactivate - Reactivate user
platformRouter.post('/users/:userId/reactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await reactivateUser(req.params.userId as string, req.user!.id);
    const response: ApiResponse = {
      success: true,
      data: user,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/platform/plans - Global plans
platformRouter.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await getPlans(true);
    const response: ApiResponse = {
      success: true,
      data: plans,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/platform/plans - Create plan
platformRouter.post('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createBillingPlanSchema.parse(req.body);
    const plan = await createPlan(validated as unknown as CreateBillingPlanInput);

    const response: ApiResponse = {
      success: true,
      data: plan,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/platform/plans/:planId - Update plan
platformRouter.patch('/plans/:planId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = updateBillingPlanSchema.parse(req.body);
    const plan = await updatePlan(req.params.planId as string, validated);

    const response: ApiResponse = {
      success: true,
      data: plan,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/platform/system/health - System health telemetry
platformRouter.get('/system/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await getSystemHealth();
    const response: ApiResponse = {
      success: true,
      data: health,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});
