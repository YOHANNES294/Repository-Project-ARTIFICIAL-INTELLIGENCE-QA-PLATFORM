import { PaymentProviderType } from '@ai-qa/shared-types';
import { PaymentProviderInterface } from './payment-provider.interface.js';
import { LocalTestPaymentProvider } from './local-test.provider.js';
import { StripePaymentProvider } from './stripe.provider.js';
import { ChapaPaymentProvider } from './chapa.provider.js';

export * from './payment-provider.interface.js';
export * from './local-test.provider.js';
export * from './stripe.provider.js';
export * from './chapa.provider.js';

export function getPaymentProvider(type: PaymentProviderType, apiKey?: string, webhookSecret?: string): PaymentProviderInterface {
  switch (type) {
    case PaymentProviderType.STRIPE:
      return new StripePaymentProvider(apiKey, webhookSecret);
    case PaymentProviderType.CHAPA:
      return new ChapaPaymentProvider(apiKey, webhookSecret);
    case PaymentProviderType.LOCAL_TEST:
    default:
      return new LocalTestPaymentProvider();
  }
}
