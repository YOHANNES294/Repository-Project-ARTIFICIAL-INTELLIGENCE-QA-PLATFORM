import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createIntegrationSchema,
  updateIntegrationSchema,
  testIntegrationSchema,
} from '@ai-qa/validation';
import { IntegrationService } from '../services/integrations/integration.service.js';
import { ApiResponse } from '@ai-qa/shared-types';

export const integrationRouter: Router = Router({ mergeParams: true });

integrationRouter.use(authenticate);

// Test integration connectivity
integrationRouter.post(
  '/test',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = testIntegrationSchema.parse(req.body);
      const result = await IntegrationService.testIntegration(input);
      const response: ApiResponse = {
        success: result.success,
        data: result,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// List integrations
integrationRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string | undefined;
      const organizationId = (req.params.orgId as string | undefined) || req.organizationId;

      let items: any[] = [];
      if (projectId) {
        items = await IntegrationService.listProjectIntegrations(projectId);
      } else if (organizationId) {
        items = await IntegrationService.listOrgIntegrations(organizationId);
      }

      const response: ApiResponse = {
        success: true,
        data: items,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// Get single integration
integrationRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await IntegrationService.getIntegration(req.params.id as string);
      const response: ApiResponse = {
        success: true,
        data: item,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// Create integration
integrationRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createIntegrationSchema.parse(req.body);
      const projectId = (req.params.projectId as string | undefined) || null;
      const organizationId = (req.params.orgId as string | undefined) || req.organizationId || null;

      const created = await IntegrationService.createIntegration(projectId, organizationId, input);
      const response: ApiResponse = {
        success: true,
        data: created,
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// Update integration
integrationRouter.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateIntegrationSchema.parse(req.body);
      const updated = await IntegrationService.updateIntegration(req.params.id as string, input);
      const response: ApiResponse = {
        success: true,
        data: updated,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// Delete integration
integrationRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await IntegrationService.deleteIntegration(req.params.id as string);
      const response: ApiResponse = {
        success: true,
        data: { message: 'Integration deleted successfully' },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);
