import { EmailProviderInterface } from './email-provider.interface.js';
import { LocalMockEmailProvider } from './local-email.provider.js';
import { ResendEmailProvider } from './resend-email.provider.js';
import { SmtpEmailProvider } from './smtp-email.provider.js';

let activeProvider: EmailProviderInterface | null = null;

export function getEmailProvider(): EmailProviderInterface {
  if (activeProvider) {
    return activeProvider;
  }

  const providerType = (process.env.EMAIL_PROVIDER || 'LOCAL').toUpperCase();

  switch (providerType) {
    case 'RESEND':
      activeProvider = new ResendEmailProvider();
      break;
    case 'SMTP':
      activeProvider = new SmtpEmailProvider();
      break;
    case 'LOCAL':
    default:
      activeProvider = new LocalMockEmailProvider();
      break;
  }

  return activeProvider;
}

export function setEmailProviderForTesting(provider: EmailProviderInterface | null): void {
  activeProvider = provider;
}
