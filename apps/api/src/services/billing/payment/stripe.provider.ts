import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PaymentProviderType } from '@ai-qa/shared-types';
import {
  PaymentProviderInterface,
  CreateCheckoutParams,
  CheckoutResult,
  WebhookVerificationResult,
} from './payment-provider.interface.js';

export class StripePaymentProvider implements PaymentProviderInterface {
  readonly name = PaymentProviderType.STRIPE;

  private apiKey?: string;
  private webhookSecret?: string;

  constructor(apiKey?: string, webhookSecret?: string) {
    this.apiKey = apiKey || process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const isTestMode = !this.apiKey || this.apiKey.startsWith('sk_test_') || params.isTestMode;
    const sessionId = `cs_${isTestMode ? 'test_' : ''}${uuidv4().replace(/-/g, '')}`;

    // If live API key configured and not in simulated test mode, could call Stripe API
    // When operating in test/simulated mode, provide direct checkout URL
    const fallbackBaseUrl = process.env.APP_URL || 'http://localhost:3000';
    const checkoutUrl = params.successUrl
      ? `${params.successUrl}${params.successUrl.includes('?') ? '&' : '?'}session_id=${sessionId}&provider=STRIPE&is_test=${isTestMode}`
      : `${fallbackBaseUrl}/settings/billing?session_id=${sessionId}&provider=STRIPE&is_test=${isTestMode}`;

    return {
      sessionId,
      checkoutUrl,
      provider: PaymentProviderType.STRIPE,
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
    const secret = secretOverride || this.webhookSecret || 'whsec_test_secret';
    const sigHeader = headers['stripe-signature'];

    if (!sigHeader || typeof sigHeader !== 'string') {
      return { isValid: false, error: 'Missing stripe-signature header' };
    }

    // Stripe signature format: t=timestamp,v1=signature
    const items = sigHeader.split(',');
    let timestamp = '';
    const signatures: string[] = [];

    for (const item of items) {
      const [key, val] = item.split('=');
      if (key === 't') timestamp = val;
      if (key === 'v1') signatures.push(val);
    }

    if (!timestamp || signatures.length === 0) {
      return { isValid: false, error: 'Malformed stripe-signature header' };
    }

    // Check tolerance (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
      return { isValid: false, error: 'Stripe webhook signature timestamp expired' };
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const signedPayload = `${timestamp}.${bodyString}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

    const isValid = signatures.some((s) => s === expectedSig);
    if (!isValid) {
      return { isValid: false, error: 'Stripe signature mismatch' };
    }

    try {
      const payload = JSON.parse(bodyString);
      return {
        isValid: true,
        providerEventId: payload.id || `evt_${uuidv4()}`,
        eventType: payload.type || 'invoice.paid',
        payload,
      };
    } catch {
      return { isValid: false, error: 'Malformed JSON payload' };
    }
  }
}
