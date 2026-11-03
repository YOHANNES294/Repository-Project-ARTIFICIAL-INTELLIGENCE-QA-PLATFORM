import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createWebhookSchema,
  updateWebhookSchema,
} from '@ai-qa/validation';
import { WebhookService } from '../services/integrations/webhook.service.js';
import { ApiResponse } from '@ai-qa/shared-types';

export const webhookRouter: Router = Router({ mergeParams: true });

webhookRouter.use(authenticate);

// List webhooks
webhookRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req.params.orgId as string | undefined) || req.organizationId;
      const projectId = req.params.projectId as string | undefined;

      if (!organizationId) {
        return res.status(400).json({ success: false, error: { message: 'Organization context required' } });
      }

      const items = await WebhookService.listWebhooks(organizationId, projectId);
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

// Get single webhook
webhookRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await WebhookService.getWebhook(req.params.id as string);
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

// Create webhook
webhookRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req.params.orgId as string | undefined) || req.organizationId;
      const projectId = (req.params.projectId as string | undefined) || null;

      if (!organizationId) {
        return res.status(400).json({ success: false, error: { message: 'Organization context required' } });
      }

      const input = createWebhookSchema.parse(req.body);
      const created = await WebhookService.createWebhook(organizationId, projectId, input);
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

// Update webhook
webhookRouter.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateWebhookSchema.parse(req.body);
      const updated = await WebhookService.updateWebhook(req.params.id as string, input);
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

// Rotate webhook secret
webhookRouter.post(
  '/:id/rotate-secret',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WebhookService.rotateSecret(req.params.id as string);
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// Delete webhook
webhookRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await WebhookService.deleteWebhook(req.params.id as string);
      const response: ApiResponse = {
        success: true,
        data: { message: 'Webhook deleted successfully' },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// List webhook delivery history
webhookRouter.get(
  '/:id/deliveries',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const items = await WebhookService.listDeliveries(req.params.id as string, limit);
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

// Retry delivery
webhookRouter.post(
  '/:id/deliveries/:deliveryId/retry',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const retried = await WebhookService.retryDelivery(req.params.deliveryId as string);
      const response: ApiResponse = {
        success: true,
        data: retried,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);
