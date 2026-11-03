import { Router, Request, Response, NextFunction } from 'express';
import { testRunService } from '../services/test-run.service.js';
import { requireRole } from '../middleware/auth.js';
import { requireEntitlement } from '../middleware/entitlement.js';
import { recordUsage } from '../services/billing/usage-ledger.service.js';
import {
  createTestRunSchema,
  updateTestRunSchema,
  transitionRunStatusSchema,
  assignRunCasesSchema,
} from '@ai-qa/validation';
import { OrganizationRole, TestRunStatus, ExecutionStatus, ApiResponse, UsageMetric } from '@ai-qa/shared-types';

export const testRunRouter: Router = Router({ mergeParams: true });

// GET /api/v1/projects/:projectId/test-runs
testRunRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const {
      search,
      status,
      testPlanId,
      milestoneId,
      environmentId,
      assignedToId,
      page,
      limit,
    } = req.query;

    const result = await testRunService.getTestRuns(projectId, {
      search: search ? String(search) : undefined,
      status: status ? (status as TestRunStatus) : undefined,
      testPlanId: testPlanId ? String(testPlanId) : undefined,
      milestoneId: milestoneId ? String(milestoneId) : undefined,
      environmentId: environmentId ? String(environmentId) : undefined,
      assignedToId: assignedToId ? String(assignedToId) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 20,
    });

    const response: ApiResponse = {
      success: true,
      data: result.testRuns,
      meta: result.meta,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/projects/:projectId/test-runs/:runId
testRunRouter.get('/:runId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const runId = req.params.runId as string;
    const run = await testRunService.getTestRunById(projectId, runId);

    const response: ApiResponse = {
      success: true,
      data: run,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/projects/:projectId/test-runs
testRunRouter.post(
  '/',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER
  ),
  requireEntitlement(UsageMetric.TEST_RUNS_MONTHLY, 1),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const validated = createTestRunSchema.parse(req.body);
      const run = await testRunService.createTestRun(projectId, validated, req.user?.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (req.organizationId) {
        await recordUsage({
          organizationId: req.organizationId,
          metric: UsageMetric.TEST_RUNS_MONTHLY,
          quantity: 1,
          idempotencyKey: `run_${run.id}`,
          sourceType: 'TEST_RUN',
          sourceId: run.id,
        }).catch(() => {});
      }

      const response: ApiResponse = {
        success: true,
        data: run,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/projects/:projectId/test-runs/:runId
testRunRouter.patch(
  '/:runId',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const runId = req.params.runId as string;
      const validated = updateTestRunSchema.parse(req.body);
      const updated = await testRunService.updateTestRun(projectId, runId, validated, req.user?.id);

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

// DELETE /api/v1/projects/:projectId/test-runs/:runId
testRunRouter.delete(
  '/:runId',
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR, OrganizationRole.QA_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const runId = req.params.runId as string;
      const result = await testRunService.deleteTestRun(projectId, runId, req.user?.id);

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

// POST /api/v1/projects/:projectId/test-runs/:runId/status
testRunRouter.post(
  '/:runId/status',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const runId = req.params.runId as string;
      const validated = transitionRunStatusSchema.parse(req.body);
      const result = await testRunService.transitionStatus(
        projectId,
        runId,
        validated.status as TestRunStatus,
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

// GET /api/v1/projects/:projectId/test-runs/:runId/cases
testRunRouter.get('/:runId/cases', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const runId = req.params.runId as string;
    const { status, assignedToId, search } = req.query;

    const result = await testRunService.getRunCases(projectId, runId, {
      status: status ? (status as ExecutionStatus) : undefined,
      assignedToId: assignedToId ? String(assignedToId) : undefined,
      search: search ? String(search) : undefined,
    });

    const response: ApiResponse = {
      success: true,
      data: result.runCases,
      meta: { summary: result.summary },
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/projects/:projectId/test-runs/:runId/assign
testRunRouter.post(
  '/:runId/assign',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const runId = req.params.runId as string;
      const validated = assignRunCasesSchema.parse(req.body);
      const result = await testRunService.assignRunCases(
        projectId,
        runId,
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
