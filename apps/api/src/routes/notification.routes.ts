import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  notificationQuerySchema,
  updateNotificationPreferencesSchema,
} from '@ai-qa/validation';
import {
  NotificationService,
  NotificationPreferenceService,
} from '../services/notifications/index.js';
import { ApiResponse } from '@ai-qa/shared-types';

export const notificationRouter: Router = Router();

// 1. Server-Sent Events (SSE) Stream Endpoint
notificationRouter.get(
  '/stream',
  authenticate,
  async (req: Request, res: Response) => {
    // Required headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Register active client
    NotificationService.addSseClient(req.user!.id, res);

    // Send initial handshake ping
    res.write(`event: connected\ndata: ${JSON.stringify({ userId: req.user!.id, timestamp: new Date().toISOString() })}\n\n`);

    // Keepalive ping every 25 seconds
    const interval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(interval);
      NotificationService.removeSseClient(req.user!.id, res);
    });
  }
);

// 2. Unread count badge
notificationRouter.get(
  '/unread-count',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await NotificationService.getUnreadCount(req.user!.id);
      const response: ApiResponse = {
        success: true,
        data: { count },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// 3. User notification preferences
notificationRouter.get(
  '/preferences',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const preferences = await NotificationPreferenceService.getPreferences(req.user!.id);
      const response: ApiResponse = {
        success: true,
        data: preferences,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

notificationRouter.put(
  '/preferences',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateNotificationPreferencesSchema.parse(req.body);
      const updated = await NotificationPreferenceService.updatePreferences(req.user!.id, input);
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

notificationRouter.post(
  '/preferences/reset',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reset = await NotificationPreferenceService.resetPreferences(req.user!.id);
      const response: ApiResponse = {
        success: true,
        data: reset,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// 4. Delivery statistics (Admin / telemetry)
notificationRouter.get(
  '/admin/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req.query.organizationId as string) || req.organizationId;
      const stats = await NotificationService.getAdminDeliveryStats(orgId);
      const response: ApiResponse = {
        success: true,
        data: stats,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// 5. Test notification dispatch (for verification & diagnostics)
notificationRouter.post(
  '/test-dispatch',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, priority, title, message } = req.body;
      const result = await NotificationService.dispatch({
        recipientUserIds: [req.user!.id],
        organizationId: req.organizationId,
        title: title || 'Test Notification',
        message: message || 'This is a test notification generated from the platform.',
        type: 'TEST_NOTIFICATION',
        category: category || 'GENERAL',
        priority: priority || 'NORMAL',
        forceBypassPreferences: true,
      });

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

// 6. List user notifications with filtering and pagination
notificationRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = notificationQuerySchema.parse(req.query);
      const result = await NotificationService.listUserNotifications(req.user!.id, query);
      const response: ApiResponse = {
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// 7. Mark all notifications as read
notificationRouter.post(
  '/mark-all-read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.query.organizationId as string | undefined;
      const result = await NotificationService.markAllAsRead(req.user!.id, orgId);
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

// 8. Mark single notification as read
notificationRouter.patch(
  '/:id/read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await NotificationService.markAsRead(req.user!.id, req.params.id as string);
      const response: ApiResponse = {
        success: true,
        data: notification,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// 9. Dismiss / delete notification
notificationRouter.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await NotificationService.deleteNotification(req.user!.id, req.params.id as string);
      const response: ApiResponse = {
        success: true,
        data: { message: 'Notification deleted successfully' },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);
