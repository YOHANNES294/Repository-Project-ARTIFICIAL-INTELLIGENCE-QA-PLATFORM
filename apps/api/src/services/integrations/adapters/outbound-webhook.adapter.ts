import crypto from 'node:crypto';
import { prisma } from '../../../prisma.js';
import { safeFetch } from '../../notifications/ssrf-guard.js';
import { logger } from '../../../logger.js';

export interface DispatchWebhookOptions {
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
  existingDeliveryId?: string;
  attemptNumber?: number;
}

export interface WebhookDispatchResult {
  success: boolean;
  deliveryId: string;
  statusCode?: number;
  durationMs: number;
  error?: string;
}

export class OutboundWebhookAdapter {
  /**
   * Generates HMAC-SHA256 signature for payload verification.
   */
  static generateSignature(secret: string, rawPayload: string): string {
    return crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
  }

  /**
   * Dispatches an outbound webhook event with HMAC-SHA256 signing and SSRF protection.
   */
  static async dispatch(options: DispatchWebhookOptions): Promise<WebhookDispatchResult> {
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const rawPayload = JSON.stringify(options.payload);
    const signature = this.generateSignature(options.secret, rawPayload);

    const startTime = Date.now();
    let statusCode: number | null = null;
    let responseBodyText: string | null = null;
    let errorMessage: string | null = null;
    let isSuccess = false;

    try {
      const response = await safeFetch(options.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AIQA-Signature': `sha256=${signature}`,
          'X-AIQA-Timestamp': timestamp,
          'X-AIQA-Event-ID': eventId,
          'X-AIQA-Event': options.event,
          'User-Agent': 'AIQA-Webhook-Engine/1.0',
        },
        body: rawPayload,
      });

      statusCode = response.status;
      const text = await response.text();
      responseBodyText = text.slice(0, 2000); // Truncate response to prevent DB bloat
      isSuccess = response.ok;

      if (!isSuccess) {
        errorMessage = `HTTP error ${response.status}: ${responseBodyText.slice(0, 200)}`;
      }
    } catch (err: any) {
      errorMessage = err.message || 'Unknown network error';
      logger.error(`[OutboundWebhookAdapter] Failed dispatch to ${options.url}: ${errorMessage}`);
    }

    const durationMs = Date.now() - startTime;
    const currentAttempt = options.attemptNumber || 1;
    const status = isSuccess
      ? 'SUCCESS'
      : currentAttempt >= 5
      ? 'DEAD_LETTER'
      : 'FAILED';

    let deliveryRecord;
    if (options.existingDeliveryId) {
      deliveryRecord = await prisma.webhookDelivery.update({
        where: { id: options.existingDeliveryId },
        data: {
          statusCode,
          responseBody: responseBodyText,
          durationMs,
          status,
          attempts: currentAttempt,
          error: errorMessage,
        },
      });
    } else {
      deliveryRecord = await prisma.webhookDelivery.create({
        data: {
          webhookId: options.webhookId,
          event: options.event,
          eventId,
          payload: options.payload as any,
          statusCode,
          responseBody: responseBodyText,
          durationMs,
          status,
          attempts: currentAttempt,
          error: errorMessage,
        },
      });
    }

    return {
      success: isSuccess,
      deliveryId: deliveryRecord.id,
      statusCode: statusCode || undefined,
      durationMs,
      error: errorMessage || undefined,
    };
  }
}
