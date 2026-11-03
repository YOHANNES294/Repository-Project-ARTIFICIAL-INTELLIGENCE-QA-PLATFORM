import { PaymentProviderType } from '@ai-qa/shared-types';

export interface CreateCheckoutParams {
  organizationId: string;
  organizationName: string;
  billingPlanId: string;
  planName: string;
  tier: string;
  amountCents: number;
  currency: string;
  interval: 'MONTHLY' | 'YEARLY';
  customerEmail: string;
  successUrl?: string;
  cancelUrl?: string;
  isTestMode?: boolean;
}

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  provider: PaymentProviderType;
  isTestMode: boolean;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  providerEventId?: string;
  eventType?: string;
  payload?: any;
  error?: string;
}

export interface PaymentProviderInterface {
  readonly name: PaymentProviderType;
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<boolean>;
  verifyWebhookSignature(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret?: string
  ): Promise<WebhookVerificationResult>;
}
