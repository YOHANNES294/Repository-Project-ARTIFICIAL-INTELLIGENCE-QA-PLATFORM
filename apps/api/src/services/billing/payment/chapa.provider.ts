import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PaymentProviderType } from '@ai-qa/shared-types';
import {
  PaymentProviderInterface,
  CreateCheckoutParams,
  CheckoutResult,
  WebhookVerificationResult,
} from './payment-provider.interface.js';

export class ChapaPaymentProvider implements PaymentProviderInterface {
  readonly name = PaymentProviderType.CHAPA;

  private secretKey?: string;
  private webhookSecret?: string;

  constructor(secretKey?: string, webhookSecret?: string) {
    this.secretKey = secretKey || process.env.CHAPA_SECRET_KEY;
    this.webhookSecret = webhookSecret || process.env.CHAPA_WEBHOOK_SECRET;
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const isTestMode = !this.secretKey || this.secretKey.startsWith('CHASECK_TEST-') || params.isTestMode;
    const sessionId = `chapa_${isTestMode ? 'test_' : ''}${uuidv4().replace(/-/g, '')}`;

    const fallbackBaseUrl = process.env.APP_URL || 'http://localhost:3000';
    const checkoutUrl = params.successUrl
      ? `${params.successUrl}${params.successUrl.includes('?') ? '&' : '?'}session_id=${sessionId}&provider=CHAPA&is_test=${isTestMode}`
      : `${fallbackBaseUrl}/settings/billing?session_id=${sessionId}&provider=CHAPA&is_test=${isTestMode}`;

    return {
      sessionId,
      checkoutUrl,
      provider: PaymentProviderType.CHAPA,
      isTestMode: Boolean(isTestMode),
    };
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<boolean> {
    return true;
  }

  async verifyWebhookSignature(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secretOverride?: string
  ): Promise<WebhookVerificationResult> {
    const secret = secretOverride || this.webhookSecret || 'chapa_test_secret';
    const signature = headers['x-chapa-signature'] || headers['chapa-signature'];

    if (!signature || typeof signature !== 'string') {
      return { isValid: false, error: 'Missing chapa signature header' };
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expectedSignature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'Chapa signature mismatch' };
    }

    try {
      const payload = JSON.parse(bodyString);
      return {
        isValid: true,
        providerEventId: payload.tx_ref || payload.id || `chapa_${uuidv4()}`,
        eventType: payload.event || 'charge.complete',
        payload,
      };
    } catch {
      return { isValid: false, error: 'Malformed JSON payload' };
    }
  }
}
