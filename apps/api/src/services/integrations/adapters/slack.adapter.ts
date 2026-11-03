import { safeFetch } from '../../notifications/ssrf-guard.js';
import { logger } from '../../../logger.js';

export interface SlackNotificationPayload {
  title: string;
  message: string;
  category?: string;
  priority?: string;
  link?: string;
  projectName?: string;
}

export class SlackAdapter {
  /**
   * Formats a standard Slack Block Kit message.
   */
  static formatBlockKit(payload: SlackNotificationPayload) {
    const priorityEmoji =
      payload.priority === 'URGENT' || payload.priority === 'HIGH' ? '🚨' : 'ℹ️';

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji} ${payload.title}`.slice(0, 150),
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.message,
        },
      },
    ];

    const fields: any[] = [];
    if (payload.projectName) {
      fields.push({
        type: 'mrkdwn',
        text: `*Project:*\n${payload.projectName}`,
      });
    }
    if (payload.category) {
      fields.push({
        type: 'mrkdwn',
        text: `*Category:*\n${payload.category}`,
      });
    }
    if (payload.priority) {
      fields.push({
        type: 'mrkdwn',
        text: `*Priority:*\n${payload.priority}`,
      });
    }

    if (fields.length > 0) {
      blocks.push({
        type: 'section',
        fields,
      });
    }

    if (payload.link) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Open in AI QA Platform',
              emoji: true,
            },
            url: payload.link,
            style: payload.priority === 'URGENT' ? 'danger' : 'primary',
          },
        ],
      });
    }

    return { blocks };
  }

  /**
   * Sends a notification to a Slack incoming webhook with SSRF protection.
   */
  static async send(
    webhookUrl: string,
    payload: SlackNotificationPayload
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const body = this.formatBlockKit(payload);
      const res = await safeFetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const durationMs = Date.now() - startTime;
      if (!res.ok) {
        const errorText = await res.text();
        logger.warn(`[SlackAdapter] Slack webhook error ${res.status}: ${errorText}`);
        return { success: false, statusCode: res.status, error: errorText };
      }

      logger.info(`[SlackAdapter] Message delivered in ${durationMs}ms`);
      return { success: true, statusCode: res.status };
    } catch (err: any) {
      logger.error(`[SlackAdapter] Failed to deliver Slack message: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
