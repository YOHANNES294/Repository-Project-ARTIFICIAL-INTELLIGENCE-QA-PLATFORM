import { Router, Request, Response, NextFunction } from 'express';
import { testPlanService } from '../services/test-plan.service.js';
import { requireRole } from '../middleware/auth.js';
import {
  createTestPlanSchema,
  updateTestPlanSchema,
  selectPlanCasesSchema,
  duplicateTestPlanSchema,
} from '@ai-qa/validation';
import { OrganizationRole, TestPlanStatus, ApiResponse } from '@ai-qa/shared-types';

export const testPlanRouter: Router = Router({ mergeParams: true });

// GET /api/v1/projects/:projectId/test-plans
testPlanRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { search, status, milestoneId, page, limit } = req.query;

    const result = await testPlanService.getTestPlans(projectId, {
      search: search ? String(search) : undefined,
      status: status ? (status as TestPlanStatus) : undefined,
      milestoneId: milestoneId ? String(milestoneId) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 20,
    });

    const response: ApiResponse = {
      success: true,
      data: result.testPlans,
      meta: result.meta,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/projects/:projectId/test-plans/:planId
testPlanRouter.get('/:planId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const planId = req.params.planId as string;
    const plan = await testPlanService.getTestPlanById(projectId, planId);

    const response: ApiResponse = {
      success: true,
      data: plan,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/projects/:projectId/test-plans
testPlanRouter.post(
  '/',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const validated = createTestPlanSchema.parse(req.body);
      const plan = await testPlanService.createTestPlan(projectId, validated, req.user?.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const response: ApiResponse = {
        success: true,
        data: plan,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/projects/:projectId/test-plans/:planId
testPlanRouter.patch(
  '/:planId',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const planId = req.params.planId as string;
      const validated = updateTestPlanSchema.parse(req.body);
      const updated = await testPlanService.updateTestPlan(
        projectId,
        planId,
        validated,
        req.user?.id,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      const response: ApiResponse = {
        success: true,
        data: updated,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/projects/:projectId/test-plans/:planId
testPlanRouter.delete(
  '/:planId',
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR, OrganizationRole.QA_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const planId = req.params.planId as string;
      const result = await testPlanService.deleteTestPlan(projectId, planId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/projects/:projectId/test-plans/:planId/duplicate
testPlanRouter.post(
  '/:planId/duplicate',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const planId = req.params.planId as string;
      const validated = duplicateTestPlanSchema.parse(req.body);
      const duplicated = await testPlanService.duplicateTestPlan(
        projectId,
        planId,
        validated,
        req.user?.id
      );

      const response: ApiResponse = {
        success: true,
        data: duplicated,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects/:projectId/test-plans/:planId/cases
testPlanRouter.get('/:planId/cases', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const planId = req.params.planId as string;
    const result = await testPlanService.getPlanCases(projectId, planId);

    const response: ApiResponse = {
      success: true,
      data: result.planCases,
      meta: { totalCount: result.totalCount },
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/projects/:projectId/test-plans/:planId/cases
testPlanRouter.post(
  '/:planId/cases',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const planId = req.params.planId as string;
      const validated = selectPlanCasesSchema.parse(req.body);
      const result = await testPlanService.selectPlanCases(
        projectId,
        planId,
        validated,
        req.user?.id
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/projects/:projectId/test-plans/:planId/cases/:caseId
testPlanRouter.delete(
  '/:planId/cases/:caseId',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const planId = req.params.planId as string;
      const caseId = req.params.caseId as string;
      const result = await testPlanService.removePlanCase(
        projectId,
        planId,
        caseId,
        req.user?.id
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);
