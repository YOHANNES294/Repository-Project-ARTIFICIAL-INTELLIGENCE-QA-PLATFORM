import { safeFetch } from '../../notifications/ssrf-guard.js';
import { logger } from '../../../logger.js';

export interface TeamsNotificationPayload {
  title: string;
  message: string;
  category?: string;
  priority?: string;
  link?: string;
  projectName?: string;
}

export class TeamsAdapter {
  /**
   * Formats a Microsoft Teams Connector Card / Adaptive Card payload.
   */
  static formatMessageCard(payload: TeamsNotificationPayload) {
    const themeColor =
      payload.priority === 'URGENT' ? 'D32F2F' : payload.priority === 'HIGH' ? 'FFA000' : '1976D2';

    const facts: { name: string; value: string }[] = [];
    if (payload.projectName) facts.push({ name: 'Project', value: payload.projectName });
    if (payload.category) facts.push({ name: 'Category', value: payload.category });
    if (payload.priority) facts.push({ name: 'Priority', value: payload.priority });

    const card: any = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor,
      summary: payload.title,
      sections: [
        {
          activityTitle: `🛡️ ${payload.title}`,
          activitySubtitle: payload.projectName ? `AI QA Platform - ${payload.projectName}` : 'AI QA Platform',
          text: payload.message,
          facts: facts.length > 0 ? facts : undefined,
        },
      ],
    };

    if (payload.link) {
      card.potentialAction = [
        {
          '@type': 'OpenUri',
          name: 'View in Platform',
          targets: [{ os: 'default', uri: payload.link }],
        },
      ];
    }

    return card;
  }

  /**
   * Sends a notification to a Microsoft Teams incoming webhook with SSRF protection.
   */
  static async send(
    webhookUrl: string,
    payload: TeamsNotificationPayload
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const body = this.formatMessageCard(payload);
      const res = await safeFetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const durationMs = Date.now() - startTime;
      if (!res.ok) {
        const errorText = await res.text();
        logger.warn(`[TeamsAdapter] Teams webhook error ${res.status}: ${errorText}`);
        return { success: false, statusCode: res.status, error: errorText };
      }

      logger.info(`[TeamsAdapter] Message delivered in ${durationMs}ms`);
      return { success: true, statusCode: res.status };
    } catch (err: any) {
      logger.error(`[TeamsAdapter] Failed to deliver Teams message: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
