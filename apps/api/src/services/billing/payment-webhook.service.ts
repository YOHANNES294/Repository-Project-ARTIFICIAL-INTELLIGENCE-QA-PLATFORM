import {
  PaymentProviderType,
  PaymentStatus,
  InvoiceStatus,
  SubscriptionStatus,
  NotificationCategory,
  NotificationPriority,
} from '@ai-qa/shared-types';
import { prisma } from '../../prisma.js';
import { getPaymentProvider } from './payment/index.js';
import { createAuditLog } from '../audit.service.js';
import { NotificationService } from '../notifications/notification.service.js';

export async function processPaymentWebhook(
  providerType: PaymentProviderType,
  rawBody: string | Buffer,
  headers: Record<string, string | string[] | undefined>
): Promise<{ success: boolean; eventId?: string; message: string }> {
  const provider = getPaymentProvider(providerType);
  const verification = await provider.verifyWebhookSignature(rawBody, headers);

  if (!verification.isValid || !verification.providerEventId) {
    const errorMsg = verification.error || 'Invalid webhook signature';
    return { success: false, message: errorMsg };
  }

  const { providerEventId, eventType, payload } = verification;

  // Check for duplicate / replayed webhook event
  const existingEvent = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: providerType as any,
        providerEventId,
      },
    },
  });

  if (existingEvent) {
    return {
      success: true,
      eventId: existingEvent.id,
      message: 'Webhook event already processed (idempotent ignore)',
    };
  }

  // Create event record in PENDING state
  const webhookRecord = await prisma.paymentWebhookEvent.create({
    data: {
      provider: providerType as any,
      providerEventId,
      eventType: eventType || 'unknown',
      status: 'PENDING',
      payload: payload || {},
    },
  });

  try {
    // Look up associated payment by sessionId or provider payment reference
    const sessionId = payload?.sessionId || payload?.data?.object?.id || payload?.id;

    if (sessionId) {
      const payment = await prisma.payment.findFirst({
        where: {
          provider: providerType as any,
          providerPaymentId: sessionId,
        },
      });

      if (payment) {
        await prisma.$transaction(async (tx) => {
          // Mark payment succeeded
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCEEDED as any,
              receiptUrl: payload?.receipt_url || `/api/v1/organizations/${payment.organizationId}/billing/invoices/${payment.invoiceId}/html`,
            },
          });

          // Mark invoice paid
          if (payment.invoiceId) {
            await tx.invoice.update({
              where: { id: payment.invoiceId },
              data: {
                status: InvoiceStatus.PAID as any,
                paidAt: new Date(),
              },
            });
          }

          // Ensure subscription is ACTIVE
          await tx.subscription.update({
            where: { organizationId: payment.organizationId },
            data: {
              status: SubscriptionStatus.ACTIVE as any,
            },
          });
        });

        // Audit log
        await createAuditLog({
          organizationId: payment.organizationId,
          action: 'PAYMENT_SUCCEEDED',
          entityType: 'Payment',
          entityId: payment.id,
          metadata: {
            amountCents: payment.amountCents,
            provider: providerType,
            providerEventId,
          },
        });

        // Notify admins
        await NotificationService.dispatch({
          organizationId: payment.organizationId,
          title: 'Payment Confirmed',
          message: `Your payment of $${(payment.amountCents / 100).toFixed(2)} was successfully processed.`,
          type: 'PAYMENT_SUCCEEDED',
          category: NotificationCategory.GENERAL,
          priority: NotificationPriority.NORMAL,
        }).catch(() => {});
      }
    }

    // Mark event record as PROCESSED
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    return { success: true, eventId: webhookRecord.id, message: 'Webhook processed successfully' };
  } catch (err: any) {
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        status: 'FAILED',
        errorMessage: err.message,
      },
    });
    throw err;
  }
}
