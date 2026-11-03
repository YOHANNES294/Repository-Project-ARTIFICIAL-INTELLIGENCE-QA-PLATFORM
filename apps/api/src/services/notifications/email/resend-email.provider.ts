import { EmailProviderInterface, SendEmailOptions, EmailSendResult } from './email-provider.interface.js';
import { logger } from '../../../logger.js';

export class ResendEmailProvider implements EmailProviderInterface {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY;
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.apiKey) {
      logger.warn('[ResendEmailProvider] Missing RESEND_API_KEY. Simulating delivery.');
      return {
        success: true,
        messageId: `resend-sim-${Date.now()}`,
        provider: 'RESEND',
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || process.env.EMAIL_FROM || 'AI QA Platform <notifications@ai-qa.platform>',
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[ResendEmailProvider] Failed to send email: ${response.status} ${errorText}`);
        return {
          success: false,
          provider: 'RESEND',
          error: `Resend HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = (await response.json()) as { id?: string };
      return {
        success: true,
        messageId: data.id || `resend-${Date.now()}`,
        provider: 'RESEND',
      };
    } catch (err: any) {
      logger.error(`[ResendEmailProvider] Network error: ${err.message}`);
      return {
        success: false,
        provider: 'RESEND',
        error: err.message,
      };
    }
  }
}
