import { Router, Request, Response, NextFunction } from 'express';
import { milestoneService } from '../services/milestone.service.js';
import { createMilestoneSchema, updateMilestoneSchema } from '@ai-qa/validation';
import { requireRole } from '../middleware/auth.js';
import { OrganizationRole, MilestoneStatus, TestPriority, ApiResponse } from '@ai-qa/shared-types';

export const milestoneRouter: Router = Router({ mergeParams: true });

// List milestones
milestoneRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, priority, page, limit, sortBy, sortOrder } = req.query;

    const result = await milestoneService.getMilestones(
      req.organizationId!,
      req.params.projectId as string,
      {
        search: search as string | undefined,
        status: status as MilestoneStatus | undefined,
        priority: priority as TestPriority | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as any,
      }
    );

    const response: ApiResponse = {
      success: true,
      data: result.milestones,
      meta: result.meta,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Get milestone progress
milestoneRouter.get('/:milestoneId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const milestone = await milestoneService.getMilestoneById(
      req.organizationId!,
      req.params.projectId as string,
      req.params.milestoneId as string
    );

    const response: ApiResponse = {
      success: true,
      data: milestone.progress,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Get single milestone
milestoneRouter.get('/:milestoneId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const milestone = await milestoneService.getMilestoneById(
      req.organizationId!,
      req.params.projectId as string,
      req.params.milestoneId as string
    );

    const response: ApiResponse = {
      success: true,
      data: milestone,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Create milestone
milestoneRouter.post(
  '/',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createMilestoneSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const milestone = await milestoneService.createMilestone(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: milestone,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Update milestone
milestoneRouter.patch(
  '/:milestoneId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateMilestoneSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const milestone = await milestoneService.updateMilestone(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.milestoneId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: milestone,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Delete milestone
milestoneRouter.delete(
  '/:milestoneId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await milestoneService.deleteMilestone(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.milestoneId as string,
        ip,
        userAgent
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
