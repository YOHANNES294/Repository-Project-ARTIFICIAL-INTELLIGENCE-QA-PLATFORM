import { randomUUID } from 'node:crypto';
import { EmailProviderInterface, SendEmailOptions, EmailSendResult } from './email-provider.interface.js';
import { logger } from '../../../logger.js';

export interface RecordedEmail extends SendEmailOptions {
  id: string;
  sentAt: Date;
}

export class LocalMockEmailProvider implements EmailProviderInterface {
  private static sentEmails: RecordedEmail[] = [];

  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const messageId = `local-${randomUUID()}`;
    const record: RecordedEmail = {
      ...options,
      id: messageId,
      sentAt: new Date(),
    };

    LocalMockEmailProvider.sentEmails.push(record);
    logger.info(`[LocalMockEmailProvider] Email sent to ${options.to}: "${options.subject}" (ID: ${messageId})`);

    return {
      success: true,
      messageId,
      provider: 'LOCAL',
    };
  }

  static getSentEmails(): RecordedEmail[] {
    return [...LocalMockEmailProvider.sentEmails];
  }

  static clearSentEmails(): void {
    LocalMockEmailProvider.sentEmails = [];
  }

  static findEmailByRecipient(recipient: string): RecordedEmail | undefined {
    return LocalMockEmailProvider.sentEmails.find((e) => e.to.toLowerCase() === recipient.toLowerCase());
  }
}
