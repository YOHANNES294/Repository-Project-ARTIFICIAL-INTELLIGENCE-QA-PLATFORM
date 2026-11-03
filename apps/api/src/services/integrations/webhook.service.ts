import crypto from 'node:crypto';
import { prisma } from '../../prisma.js';
import { NotFoundError, ValidationError } from '../../errors.js';
import {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookDto,
  WebhookDeliveryDto,
} from '@ai-qa/shared-types';
import { validateUrlForSSRF } from '../notifications/ssrf-guard.js';
import { OutboundWebhookAdapter } from './adapters/outbound-webhook.adapter.js';

export class WebhookService {
  static maskSecret(secret: string): string {
    if (!secret || secret.length < 8) return '********';
    return `${secret.slice(0, 6)}...${secret.slice(-4)}`;
  }

  static toDto(webhook: any): WebhookDto {
    return {
      id: webhook.id,
      organizationId: webhook.organizationId,
      projectId: webhook.projectId,
      name: webhook.name,
      url: webhook.url,
      secretMasked: this.maskSecret(webhook.secret),
      events: webhook.events || [],
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
      deliveriesCount: webhook._count?.deliveries,
    };
  }

  static toDeliveryDto(delivery: any): WebhookDeliveryDto {
    return {
      id: delivery.id,
      webhookId: delivery.webhookId,
      event: delivery.event,
      eventId: delivery.eventId,
      payload: (delivery.payload as Record<string, unknown>) || {},
      statusCode: delivery.statusCode,
      responseBody: delivery.responseBody,
      durationMs: delivery.durationMs,
      status: delivery.status,
      attempts: delivery.attempts,
      error: delivery.error,
      createdAt: delivery.createdAt.toISOString(),
    };
  }

  static async listWebhooks(organizationId: string, projectId?: string): Promise<WebhookDto[]> {
    const where: any = { organizationId };
    if (projectId) {
      where.OR = [{ projectId }, { projectId: null }];
    }

    const items = await prisma.webhook.findMany({
      where,
      include: {
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((w: any) => this.toDto(w));
  }

  static async getWebhook(id: string): Promise<WebhookDto> {
    const item = await prisma.webhook.findUnique({
      where: { id },
      include: {
        _count: { select: { deliveries: true } },
      },
    });

    if (!item) {
      throw new NotFoundError('Webhook not found');
    }

    return this.toDto(item);
  }

  static async createWebhook(
    organizationId: string,
    projectId: string | null,
    input: CreateWebhookInput
  ): Promise<WebhookDto & { rawSecret: string }> {
    const ssrfCheck = await validateUrlForSSRF(input.url);
    if (!ssrfCheck.valid) {
      throw new ValidationError(`SSRF Guard Security Violation: ${ssrfCheck.error}`);
    }

    const secret = input.secret || `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const created = await prisma.webhook.create({
      data: {
        organizationId,
        projectId,
        name: input.name || 'Outbound Webhook',
        url: input.url,
        secret,
        events: input.events,
        isActive: input.isActive ?? true,
      },
    });

    return {
      ...this.toDto(created),
      rawSecret: secret, // Returned once upon creation so user can copy it
    };
  }

  static async updateWebhook(id: string, input: UpdateWebhookInput): Promise<WebhookDto> {
    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    if (input.url && input.url !== existing.url) {
      const ssrfCheck = await validateUrlForSSRF(input.url);
      if (!ssrfCheck.valid) {
        throw new ValidationError(`SSRF Guard Security Violation: ${ssrfCheck.error}`);
      }
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.secret !== undefined ? { secret: input.secret } : {}),
        ...(input.events !== undefined ? { events: input.events } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return this.toDto(updated);
  }

  static async rotateSecret(id: string): Promise<{ newSecret: string }> {
    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    const newSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    await prisma.webhook.update({
      where: { id },
      data: { secret: newSecret },
    });

    return { newSecret };
  }

  static async deleteWebhook(id: string): Promise<void> {
    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    await prisma.webhook.delete({ where: { id } });
  }

  static async listDeliveries(webhookId: string, limit = 50): Promise<WebhookDeliveryDto[]> {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return deliveries.map((d: any) => this.toDeliveryDto(d));
  }

  static async retryDelivery(deliveryId: string): Promise<WebhookDeliveryDto> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      throw new NotFoundError('Webhook delivery record not found');
    }

    await OutboundWebhookAdapter.dispatch({
      webhookId: delivery.webhookId,
      url: delivery.webhook.url,
      secret: delivery.webhook.secret,
      event: delivery.event,
      payload: (delivery.payload as Record<string, unknown>) || {},
      existingDeliveryId: delivery.id,
      attemptNumber: delivery.attempts + 1,
    });

    const refreshed = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    return this.toDeliveryDto(refreshed);
  }
}
