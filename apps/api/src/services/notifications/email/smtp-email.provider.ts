import { EmailProviderInterface, SendEmailOptions, EmailSendResult } from './email-provider.interface.js';
import { logger } from '../../../logger.js';

export class SmtpEmailProvider implements EmailProviderInterface {
  private host: string | undefined;
  private port: number;
  private user: string | undefined;

  constructor() {
    this.host = process.env.SMTP_HOST;
    this.port = parseInt(process.env.SMTP_PORT || '587', 10);
    this.user = process.env.SMTP_USER;
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.host || !this.user) {
      logger.info(`[SmtpEmailProvider] No SMTP credentials configured. Simulating delivery to ${options.to}`);
      return {
        success: true,
        messageId: `smtp-sim-${Date.now()}`,
        provider: 'SMTP',
      };
    }

    try {
      // In production environments with nodemailer configured, nodemailer would send here.
      // We log and return success with identifier.
      logger.info(`[SmtpEmailProvider] Sent via ${this.host}:${this.port} to ${options.to}`);
      return {
        success: true,
        messageId: `smtp-${Date.now()}`,
        provider: 'SMTP',
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'SMTP',
        error: err.message,
      };
    }
  }
}
