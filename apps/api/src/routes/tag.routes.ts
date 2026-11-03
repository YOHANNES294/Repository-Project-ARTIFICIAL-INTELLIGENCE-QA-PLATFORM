import { Router, Request, Response, NextFunction } from 'express';
import { tagService } from '../services/tag.service.js';
import { createTagSchema, updateTagSchema } from '@ai-qa/validation';
import { requireRole } from '../middleware/auth.js';
import { OrganizationRole, ApiResponse } from '@ai-qa/shared-types';

export const tagRouter: Router = Router({ mergeParams: true });

// Get all tags for project
tagRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await tagService.getTags(
      req.organizationId!,
      req.params.projectId as string
    );

    const response: ApiResponse = {
      success: true,
      data: tags,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Create tag
tagRouter.post(
  '/',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createTagSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const tag = await tagService.createTag(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: tag,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Update tag
tagRouter.patch(
  '/:tagId',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateTagSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const tag = await tagService.updateTag(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.tagId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: tag,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Delete tag
tagRouter.delete(
  '/:tagId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await tagService.deleteTag(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.tagId as string,
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
