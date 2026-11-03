import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { ApiResponse } from '@ai-qa/shared-types';

export const analyticsRouter: Router = Router({ mergeParams: true });

// GET /api/v1/projects/:projectId/execution-analytics
analyticsRouter.get(
  '/execution-analytics',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const { testRunId, testPlanId, milestoneId, environmentId } = req.query;

      const analytics = await analyticsService.getExecutionAnalytics(projectId, {
        testRunId: testRunId ? String(testRunId) : undefined,
        testPlanId: testPlanId ? String(testPlanId) : undefined,
        milestoneId: milestoneId ? String(milestoneId) : undefined,
        environmentId: environmentId ? String(environmentId) : undefined,
      });

      const response: ApiResponse = {
        success: true,
        data: analytics,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);
