import { Response } from 'express';
import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../errors.js';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationDto,
  NotificationEventPayload,
  NotificationStatsDto,
} from '@ai-qa/shared-types';
import { NotificationQuerySchema } from '@ai-qa/validation';
import { RecipientResolutionService } from './recipient-resolution.service.js';
import { NotificationPreferenceService } from './notification-preference.service.js';
import { EmailTemplateEngine } from './email/email-template.engine.js';
import { getEmailProvider } from './email/email.factory.js';
import { SlackAdapter } from '../integrations/adapters/slack.adapter.js';
import { TeamsAdapter } from '../integrations/adapters/teams.adapter.js';
import { OutboundWebhookAdapter } from '../integrations/adapters/outbound-webhook.adapter.js';
import { logger } from '../../logger.js';

export class NotificationService {
  // Active Server-Sent Events (SSE) connections keyed by userId
  private static sseClients = new Map<string, Set<Response>>();

  /**
   * Registers a client for real-time Server-Sent Events.
   */
  static addSseClient(userId: string, res: Response): void {
    if (!this.sseClients.has(userId)) {
      this.sseClients.set(userId, new Set());
    }
    this.sseClients.get(userId)!.add(res);

    res.on('close', () => {
      this.removeSseClient(userId, res);
    });
  }

  /**
   * Unregisters a client from SSE.
   */
  static removeSseClient(userId: string, res: Response): void {
    const clients = this.sseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        this.sseClients.delete(userId);
      }
    }
  }

  /**
   * Pushes a real-time event to all active SSE connections of a user.
   */
  static pushToUser(userId: string, eventName: string, data: any): void {
    const clients = this.sseClients.get(userId);
    if (clients && clients.size > 0) {
      const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
      for (const client of clients) {
        try {
          client.write(payload);
        } catch (err: any) {
          logger.warn(`Failed writing to SSE client for user ${userId}: ${err.message}`);
        }
      }
    }
  }

  static toDto(item: any): NotificationDto {
    return {
      id: item.id,
      userId: item.userId,
      organizationId: item.organizationId,
      projectId: item.projectId,
      title: item.title,
      message: item.message,
      type: item.type,
      category: item.category,
      priority: item.priority,
      entityType: item.entityType,
      entityId: item.entityId,
      link: item.link,
      metadata: (item.metadata as Record<string, unknown>) || null,
      isRead: item.isRead,
      readAt: item.readAt ? item.readAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      deliveries: item.deliveries?.map((d: any) => ({
        id: d.id,
        notificationId: d.notificationId,
        channel: d.channel,
        status: d.status,
        error: d.error,
        deliveredAt: d.deliveredAt.toISOString(),
      })),
    };
  }

  /**
   * Lists paginated notifications for a user with category, priority, and read filters.
   */
  static async listUserNotifications(
    userId: string,
    query: NotificationQuerySchema
  ): Promise<{ items: NotificationDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: any = { userId };

    if (query.isRead === 'true') where.isRead = true;
    if (query.isRead === 'false') where.isRead = false;
    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: { deliveries: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((i: any) => this.toDto(i)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  /**
   * Retrieves quick unread count for badges.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Marks a single notification as read.
   */
  static async markAsRead(userId: string, notificationId: string): Promise<NotificationDto> {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    const unreadCount = await this.getUnreadCount(userId);
    this.pushToUser(userId, 'unread_count', { count: unreadCount });

    return this.toDto(updated);
  }

  /**
   * Marks all notifications as read for a user.
   */
  static async markAllAsRead(userId: string, organizationId?: string): Promise<{ count: number }> {
    const where: any = { userId, isRead: false };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const result = await prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });

    this.pushToUser(userId, 'unread_count', { count: 0 });

    return { count: result.count };
  }

  /**
   * Dismisses / deletes a notification.
   */
  static async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notification.delete({ where: { id: notificationId } });

    const unreadCount = await this.getUnreadCount(userId);
    this.pushToUser(userId, 'unread_count', { count: unreadCount });
  }

  /**
   * Gathers platform-wide or organization-scoped delivery statistics.
   */
  static async getAdminDeliveryStats(organizationId?: string): Promise<NotificationStatsDto> {
    const orgFilter = organizationId ? { organizationId } : {};

    const [
      totalInApp,
      unreadInApp,
      totalEmails,
      sentEmails,
      failedEmails,
      totalWebhooks,
      failedWebhooks,
    ] = await Promise.all([
      prisma.notification.count({ where: orgFilter }),
      prisma.notification.count({ where: { ...orgFilter, isRead: false } }),
      prisma.emailDelivery.count({ where: orgFilter }),
      prisma.emailDelivery.count({
        where: { ...orgFilter, status: { in: ['SENT', 'DELIVERED'] } },
      }),
      prisma.emailDelivery.count({
        where: { ...orgFilter, status: { in: ['FAILED', 'BOUNCED'] } },
      }),
      prisma.webhookDelivery.count({
        where: organizationId ? { webhook: { organizationId } } : {},
      }),
      prisma.webhookDelivery.count({
        where: {
          ...(organizationId ? { webhook: { organizationId } } : {}),
          status: { in: ['FAILED', 'DEAD_LETTER'] },
        },
      }),
    ]);

    return {
      totalInApp,
      unreadInApp,
      totalEmails,
      sentEmails,
      failedEmails,
      totalWebhooksSent: totalWebhooks,
      failedWebhooks,
    };
  }

  /**
   * Central resilient event processor.
   * Dispatches notifications to In-App, Email, Slack/Teams integrations, and Webhooks.
   */
  static async dispatch(
    event: NotificationEventPayload
  ): Promise<{ inAppCount: number; emailsSent: number; webhooksFired: number }> {
    let inAppCount = 0;
    let emailsSent = 0;
    let webhooksFired = 0;

    const isSecurity =
      event.category === NotificationCategory.SECURITY ||
      event.type.startsWith('SECURITY_') ||
      event.type.startsWith('AUTH_');

    // 1. Resolve recipients
    const recipientIds = await RecipientResolutionService.resolveRecipients(event);

    // Fetch user details for resolved recipients (email, name)
    const users = recipientIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: recipientIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];

    // 2. Dispatch In-App & Email to resolved users
    for (const user of users) {
      const recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'there';
      // In-App check
      const inAppCheck = await NotificationPreferenceService.isSuppressed(
        user.id,
        'IN_APP',
        event.category,
        isSecurity
      );

      if (!inAppCheck.suppressed || event.forceBypassPreferences) {
        try {
          const notification = await prisma.notification.create({
            data: {
              userId: user.id,
              organizationId: event.organizationId,
              projectId: event.projectId,
              title: event.title,
              message: event.message,
              type: event.type,
              category: event.category || NotificationCategory.GENERAL,
              priority: event.priority || NotificationPriority.NORMAL,
              entityType: event.entityType,
              entityId: event.entityId,
              link: event.link,
              metadata: (event.metadata as any) || undefined,
            },
          });

          await prisma.notificationDelivery.create({
            data: {
              notificationId: notification.id,
              channel: 'IN_APP',
              status: 'DELIVERED',
            },
          });

          inAppCount++;

          // Realtime SSE push
          const unreadCount = await this.getUnreadCount(user.id);
          this.pushToUser(user.id, 'notification', this.toDto(notification));
          this.pushToUser(user.id, 'unread_count', { count: unreadCount });
        } catch (err: any) {
          logger.error(`[NotificationService] Error delivering In-App to user ${user.id}: ${err.message}`);
        }
      }

      // Email check
      const emailCheck = await NotificationPreferenceService.isSuppressed(
        user.id,
        'EMAIL',
        event.category,
        isSecurity
      );

      if (!emailCheck.suppressed || event.forceBypassPreferences) {
        try {
          // Render email template
          let subject = event.title;
          let html = `<p>${event.message}</p>`;
          let text = event.message;

          if (event.category === NotificationCategory.DEFECT && event.metadata) {
            const rendered = EmailTemplateEngine.renderDefectAssigned({
              recipientName,
              defectKey: (event.metadata.defectKey as string) || 'DEFECT',
              defectTitle: event.title,
              severity: (event.metadata.severity as string) || 'MEDIUM',
              priority: (event.metadata.priority as string) || 'NORMAL',
              projectName: (event.metadata.projectName as string) || 'QA Project',
              defectUrl: event.link || 'https://ai-qa.platform/defects',
            });
            subject = rendered.subject;
            html = rendered.html;
            text = rendered.text;
          } else if (event.category === NotificationCategory.SECURITY) {
            const rendered = EmailTemplateEngine.renderSecurityAlert({
              recipientName,
              eventTitle: event.title,
              eventDescription: event.message,
              timestamp: new Date().toISOString(),
              actionUrl: event.link,
            });
            subject = rendered.subject;
            html = rendered.html;
            text = rendered.text;
          } else if (event.category === NotificationCategory.EXECUTION && event.metadata) {
            const rendered = EmailTemplateEngine.renderTestRunCompleted({
              runName: event.title,
              projectName: (event.metadata.projectName as string) || 'QA Project',
              totalTests: Number(event.metadata.totalTests || 0),
              passedCount: Number(event.metadata.passedCount || 0),
              failedCount: Number(event.metadata.failedCount || 0),
              passRate: Number(event.metadata.passRate || 100),
              runUrl: event.link || 'https://ai-qa.platform/runs',
            });
            subject = rendered.subject;
            html = rendered.html;
            text = rendered.text;
          }

          const emailProvider = getEmailProvider();
          const sendResult = await emailProvider.sendEmail({
            to: user.email,
            subject,
            html,
            text,
          });

          await prisma.emailDelivery.create({
            data: {
              organizationId: event.organizationId,
              userId: user.id,
              recipient: user.email,
              subject,
              templateId: event.type,
              status: sendResult.success ? 'SENT' : 'FAILED',
              provider: sendResult.provider,
              providerMessageId: sendResult.messageId,
              error: sendResult.error,
              sentAt: sendResult.success ? new Date() : null,
            },
          });

          if (sendResult.success) {
            emailsSent++;
          }
        } catch (err: any) {
          logger.error(`[NotificationService] Error delivering Email to ${user.email}: ${err.message}`);
        }
      }
    }

    // 3. Dispatch to Integrations (Slack / Teams)
    try {
      if (prisma.integration) {
        const integrationWhere: any = { isEnabled: true };
        if (event.projectId) {
          integrationWhere.OR = [{ projectId: event.projectId }, { organizationId: event.organizationId }];
        } else if (event.organizationId) {
          integrationWhere.organizationId = event.organizationId;
        }

        const integrations = await prisma.integration.findMany({
          where: integrationWhere,
        });

        for (const integration of integrations) {
          // Check if integration subscribes to event category or ALL
          const subscribedEvents = integration.events || [];
          const isSubscribed =
            subscribedEvents.length === 0 ||
            subscribedEvents.includes('*') ||
            subscribedEvents.includes(event.category) ||
            subscribedEvents.includes(event.type);

          if (!isSubscribed) continue;

          const config = (integration.config as Record<string, unknown>) || {};
          const webhookUrl = (config.webhookUrl || config.url) as string | undefined;
          if (!webhookUrl) continue;

          if (integration.provider === 'SLACK') {
            const res = await SlackAdapter.send(webhookUrl, {
              title: event.title,
              message: event.message,
              category: event.category,
              priority: event.priority,
              link: event.link,
            });
            if (res.success) {
              await prisma.integration.update({
                where: { id: integration.id },
                data: { lastSyncAt: new Date(), lastError: null },
              });
            } else {
              await prisma.integration.update({
                where: { id: integration.id },
                data: { lastError: res.error },
              });
            }
          } else if (integration.provider === 'TEAMS') {
            const res = await TeamsAdapter.send(webhookUrl, {
              title: event.title,
              message: event.message,
              category: event.category,
              priority: event.priority,
              link: event.link,
            });
            if (res.success) {
              await prisma.integration.update({
                where: { id: integration.id },
                data: { lastSyncAt: new Date(), lastError: null },
              });
            } else {
              await prisma.integration.update({
                where: { id: integration.id },
                data: { lastError: res.error },
              });
            }
          }
        }
      }
    } catch (err: any) {
      logger.error(`[NotificationService] Error dispatching to integrations: ${err.message}`);
    }

    // 4. Dispatch Outbound Webhooks
    if (event.organizationId && prisma.webhook) {
      try {
        const webhookWhere: any = {
          organizationId: event.organizationId,
          isActive: true,
        };
        if (event.projectId) {
          webhookWhere.OR = [{ projectId: event.projectId }, { projectId: null }];
        }

        const webhooks = await prisma.webhook.findMany({
          where: webhookWhere,
        });

        for (const webhook of webhooks) {
          const isSubscribed =
            webhook.events.includes('*') ||
            webhook.events.includes(event.category) ||
            webhook.events.includes(event.type);

          if (!isSubscribed) continue;

          const dispatchResult = await OutboundWebhookAdapter.dispatch({
            webhookId: webhook.id,
            url: webhook.url,
            secret: webhook.secret,
            event: event.type,
            payload: {
              type: event.type,
              category: event.category,
              title: event.title,
              message: event.message,
              entityType: event.entityType,
              entityId: event.entityId,
              link: event.link,
              metadata: event.metadata,
              timestamp: new Date().toISOString(),
            },
          });

          if (dispatchResult.success) {
            webhooksFired++;
          }
        }
      } catch (err: any) {
        logger.error(`[NotificationService] Error dispatching webhooks: ${err.message}`);
      }
    }

    return { inAppCount, emailsSent, webhooksFired };
  }
}
