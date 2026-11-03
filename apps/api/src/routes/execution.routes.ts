import { Router, Request, Response, NextFunction } from 'express';
import { executionService } from '../services/execution.service.js';
import { requireRole } from '../middleware/auth.js';
import { submitExecutionSchema, retestExecutionSchema } from '@ai-qa/validation';
import { OrganizationRole, ApiResponse } from '@ai-qa/shared-types';

export const executionRouter: Router = Router({ mergeParams: true });

// GET /api/v1/projects/:projectId/test-runs/:runId/cases/:runCaseId
executionRouter.get('/:runCaseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const runId = req.params.runId as string;
    const runCaseId = req.params.runCaseId as string;
    const result = await executionService.getTestRunCaseDetails(projectId, runId, runCaseId);

    const response: ApiResponse = {
      success: true,
      data: result,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/projects/:projectId/test-runs/:runId/cases/:runCaseId/execute
executionRouter.post(
  '/:runCaseId/execute',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const runId = req.params.runId as string;
      const runCaseId = req.params.runCaseId as string;
      const validated = submitExecutionSchema.parse(req.body);
      const result = await executionService.submitExecution(
        projectId,
        runId,
        runCaseId,
        validated,
        req.user?.id,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
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

// POST /api/v1/projects/:projectId/test-runs/:runId/cases/:runCaseId/retest
executionRouter.post(
  '/:runCaseId/retest',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const runId = req.params.runId as string;
      const runCaseId = req.params.runCaseId as string;
      const validated = retestExecutionSchema.parse(req.body);
      const result = await executionService.retestExecution(
        projectId,
        runId,
        runCaseId,
        validated,
        req.user?.id,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
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

// GET /api/v1/projects/:projectId/test-runs/:runId/cases/:runCaseId/history
executionRouter.get(
  '/:runCaseId/history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const runId = req.params.runId as string;
      const runCaseId = req.params.runCaseId as string;
      const history = await executionService.getExecutionHistory(projectId, runId, runCaseId);

      const response: ApiResponse = {
        success: true,
        data: history,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);
