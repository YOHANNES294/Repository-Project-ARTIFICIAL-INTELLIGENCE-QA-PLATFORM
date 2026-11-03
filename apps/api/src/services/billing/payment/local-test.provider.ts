import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PaymentProviderType } from '@ai-qa/shared-types';
import {
  PaymentProviderInterface,
  CreateCheckoutParams,
  CheckoutResult,
  WebhookVerificationResult,
} from './payment-provider.interface.js';

export const LOCAL_TEST_WEBHOOK_SECRET = 'local-test-webhook-secret-key-123';

export class LocalTestPaymentProvider implements PaymentProviderInterface {
  readonly name = PaymentProviderType.LOCAL_TEST;

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const sessionId = `test_sess_${uuidv4()}`;
    // Construct local mock checkout URL
    const fallbackBaseUrl = process.env.APP_URL || 'http://localhost:3000';
    const checkoutUrl = params.successUrl
      ? `${params.successUrl}${params.successUrl.includes('?') ? '&' : '?'}session_id=${sessionId}&provider=LOCAL_TEST&is_test=true`
      : `${fallbackBaseUrl}/settings/billing?session_id=${sessionId}&provider=LOCAL_TEST&is_test=true`;

    return {
      sessionId,
      checkoutUrl,
      provider: PaymentProviderType.LOCAL_TEST,
      isTestMode: true,
    };
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<boolean> {
    return true;
  }

  async verifyWebhookSignature(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string = LOCAL_TEST_WEBHOOK_SECRET
  ): Promise<WebhookVerificationResult> {
    const signature = headers['x-signature'] || headers['x-local-signature'];
    const timestampStr = headers['x-timestamp'];

    if (!signature || typeof signature !== 'string') {
      return { isValid: false, error: 'Missing webhook signature header' };
    }

    if (timestampStr && typeof timestampStr === 'string') {
      const timestamp = parseInt(timestampStr, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        return { isValid: false, error: 'Webhook timestamp expired or clock drift exceeded' };
      }
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = hmac.update(bodyString).digest('hex');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'Invalid HMAC webhook signature' };
    }

    try {
      const payload = JSON.parse(bodyString);
      return {
        isValid: true,
        providerEventId: payload.id || `evt_${uuidv4()}`,
        eventType: payload.type || 'payment.succeeded',
        payload,
      };
    } catch {
      return { isValid: false, error: 'Malformed JSON payload' };
    }
  }

  static generateTestSignature(payload: string | object, secret: string = LOCAL_TEST_WEBHOOK_SECRET): string {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(raw).digest('hex');
  }
}
