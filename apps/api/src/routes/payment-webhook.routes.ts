import express, { Router, Request, Response } from 'express';
import { PaymentProviderType } from '@ai-qa/shared-types';
import { processPaymentWebhook } from '../services/billing/index.js';
import { logger } from '../logger.js';

export const paymentWebhookRouter: Router = Router();

// Middleware to capture raw body for HMAC verification
paymentWebhookRouter.use(express.raw({ type: '*/*' }));

paymentWebhookRouter.post('/:provider', async (req: Request, res: Response) => {
  const rawParam = req.params.provider;
  const providerParam = (Array.isArray(rawParam) ? rawParam[0] : (rawParam as string) || '').toUpperCase();
  const providerType = PaymentProviderType[providerParam as keyof typeof PaymentProviderType];

  if (!providerType) {
    res.status(400).json({ error: `Unsupported payment provider: ${req.params.provider}` });
    return;
  }

  try {
    const rawBody = req.body;
    const result = await processPaymentWebhook(providerType, rawBody, req.headers);

    if (!result.success) {
      logger.warn(`Payment webhook rejected for ${providerType}: ${result.message}`);
      res.status(400).json({ error: result.message });
      return;
    }

    res.status(200).json({ received: true, eventId: result.eventId });
  } catch (err: any) {
    logger.error(`Error processing payment webhook for ${providerType}: ${err.message}`, {
      stack: err.stack,
    });
    res.status(500).json({ error: 'Internal webhook processing error' });
  }
});
