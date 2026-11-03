import { prisma } from '../../prisma.js';
import {
  UpdateNotificationPreferencesInput,
  NotificationCategory,
  NotificationPreferenceDto,
} from '@ai-qa/shared-types';

export class NotificationPreferenceService {
  /**
   * Retrieves or initializes default notification preferences for a user.
   */
  static async getPreferences(userId: string): Promise<NotificationPreferenceDto> {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId,
          emailAlerts: true,
          inAppAlerts: true,
          defectUpdates: true,
          testAssignment: true,
          executionAlerts: true,
          automationAlerts: true,
          aiAlerts: true,
          reportingAlerts: true,
          mentionAlerts: true,
          weeklyDigest: false,
          digestFrequency: 'NONE',
          digestTimezone: 'UTC',
          quietHoursEnabled: false,
          quietHoursStart: null,
          quietHoursEnd: null,
        },
      });
    }

    return {
      id: pref.id,
      userId: pref.userId,
      emailAlerts: pref.emailAlerts,
      inAppAlerts: pref.inAppAlerts,
      defectUpdates: pref.defectUpdates,
      testAssignment: pref.testAssignment,
      executionAlerts: pref.executionAlerts,
      automationAlerts: pref.automationAlerts,
      aiAlerts: pref.aiAlerts,
      reportingAlerts: pref.reportingAlerts,
      mentionAlerts: pref.mentionAlerts,
      weeklyDigest: pref.weeklyDigest,
      digestFrequency: pref.digestFrequency,
      digestTimezone: pref.digestTimezone,
      quietHoursEnabled: pref.quietHoursEnabled,
      quietHoursStart: pref.quietHoursStart,
      quietHoursEnd: pref.quietHoursEnd,
      createdAt: pref.createdAt.toISOString(),
      updatedAt: pref.updatedAt.toISOString(),
    };
  }

  /**
   * Updates notification preferences for a user.
   */
  static async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferenceDto> {
    // Ensure the record exists
    await this.getPreferences(userId);

    const updated = await prisma.notificationPreference.update({
      where: { userId },
      data: {
        ...(input.emailAlerts !== undefined ? { emailAlerts: input.emailAlerts } : {}),
        ...(input.inAppAlerts !== undefined ? { inAppAlerts: input.inAppAlerts } : {}),
        ...(input.defectUpdates !== undefined ? { defectUpdates: input.defectUpdates } : {}),
        ...(input.testAssignment !== undefined ? { testAssignment: input.testAssignment } : {}),
        ...(input.executionAlerts !== undefined ? { executionAlerts: input.executionAlerts } : {}),
        ...(input.automationAlerts !== undefined ? { automationAlerts: input.automationAlerts } : {}),
        ...(input.aiAlerts !== undefined ? { aiAlerts: input.aiAlerts } : {}),
        ...(input.reportingAlerts !== undefined ? { reportingAlerts: input.reportingAlerts } : {}),
        ...(input.mentionAlerts !== undefined ? { mentionAlerts: input.mentionAlerts } : {}),
        ...(input.weeklyDigest !== undefined ? { weeklyDigest: input.weeklyDigest } : {}),
        ...(input.digestFrequency !== undefined ? { digestFrequency: String(input.digestFrequency) } : {}),
        ...(input.digestTimezone !== undefined ? { digestTimezone: input.digestTimezone } : {}),
        ...(input.quietHoursEnabled !== undefined ? { quietHoursEnabled: input.quietHoursEnabled } : {}),
        ...(input.quietHoursStart !== undefined ? { quietHoursStart: input.quietHoursStart } : {}),
        ...(input.quietHoursEnd !== undefined ? { quietHoursEnd: input.quietHoursEnd } : {}),
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      emailAlerts: updated.emailAlerts,
      inAppAlerts: updated.inAppAlerts,
      defectUpdates: updated.defectUpdates,
      testAssignment: updated.testAssignment,
      executionAlerts: updated.executionAlerts,
      automationAlerts: updated.automationAlerts,
      aiAlerts: updated.aiAlerts,
      reportingAlerts: updated.reportingAlerts,
      mentionAlerts: updated.mentionAlerts,
      weeklyDigest: updated.weeklyDigest,
      digestFrequency: updated.digestFrequency,
      digestTimezone: updated.digestTimezone,
      quietHoursEnabled: updated.quietHoursEnabled,
      quietHoursStart: updated.quietHoursStart,
      quietHoursEnd: updated.quietHoursEnd,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Resets notification preferences to default values.
   */
  static async resetPreferences(userId: string): Promise<NotificationPreferenceDto> {
    const reset = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailAlerts: true,
        inAppAlerts: true,
        defectUpdates: true,
        testAssignment: true,
        executionAlerts: true,
        automationAlerts: true,
        aiAlerts: true,
        reportingAlerts: true,
        mentionAlerts: true,
        weeklyDigest: false,
        digestFrequency: 'NONE',
        digestTimezone: 'UTC',
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      },
      update: {
        emailAlerts: true,
        inAppAlerts: true,
        defectUpdates: true,
        testAssignment: true,
        executionAlerts: true,
        automationAlerts: true,
        aiAlerts: true,
        reportingAlerts: true,
        mentionAlerts: true,
        weeklyDigest: false,
        digestFrequency: 'NONE',
        digestTimezone: 'UTC',
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      },
    });

    return {
      id: reset.id,
      userId: reset.userId,
      emailAlerts: reset.emailAlerts,
      inAppAlerts: reset.inAppAlerts,
      defectUpdates: reset.defectUpdates,
      testAssignment: reset.testAssignment,
      executionAlerts: reset.executionAlerts,
      automationAlerts: reset.automationAlerts,
      aiAlerts: reset.aiAlerts,
      reportingAlerts: reset.reportingAlerts,
      mentionAlerts: reset.mentionAlerts,
      weeklyDigest: reset.weeklyDigest,
      digestFrequency: reset.digestFrequency,
      digestTimezone: reset.digestTimezone,
      quietHoursEnabled: reset.quietHoursEnabled,
      quietHoursStart: reset.quietHoursStart,
      quietHoursEnd: reset.quietHoursEnd,
      createdAt: reset.createdAt.toISOString(),
      updatedAt: reset.updatedAt.toISOString(),
    };
  }

  /**
   * Evaluates if a given time falls within the user's quiet hours in their configured timezone.
   */
  static isInQuietHours(
    pref: {
      quietHoursEnabled: boolean;
      quietHoursStart?: string | null;
      quietHoursEnd?: string | null;
      digestTimezone?: string;
    },
    now: Date = new Date()
  ): boolean {
    if (!pref.quietHoursEnabled || !pref.quietHoursStart || !pref.quietHoursEnd) {
      return false;
    }

    try {
      // Get current hours and minutes in user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: pref.digestTimezone || 'UTC',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const hourPart = parts.find((p) => p.type === 'hour')?.value || '0';
      const minutePart = parts.find((p) => p.type === 'minute')?.value || '0';

      const currentMinutes = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);

      const [startHour, startMin] = pref.quietHoursStart.split(':').map(Number);
      const [endHour, endMin] = pref.quietHoursEnd.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes < endMinutes) {
        // Simple range (e.g. 01:00 to 07:00)
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // Overnight range wrapping midnight (e.g. 22:00 to 08:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch {
      // Fallback if timezone string is invalid
      return false;
    }
  }

  /**
   * Checks whether a notification should be suppressed for a user on a given channel.
   * Note: Security notifications are NEVER suppressed.
   */
  static async isSuppressed(
    userId: string,
    channel: 'IN_APP' | 'EMAIL',
    category: string,
    isSecurity: boolean = false,
    now: Date = new Date()
  ): Promise<{ suppressed: boolean; reason?: string }> {
    // 1. Mandatory security override: never suppress
    if (isSecurity || category === NotificationCategory.SECURITY) {
      return { suppressed: false };
    }

    const pref = await this.getPreferences(userId);

    // 2. Channel master switch
    if (channel === 'IN_APP' && !pref.inAppAlerts) {
      return { suppressed: true, reason: 'In-app notifications disabled by user' };
    }
    if (channel === 'EMAIL' && !pref.emailAlerts) {
      return { suppressed: true, reason: 'Email notifications disabled by user' };
    }

    // 3. Category switch
    switch (category) {
      case NotificationCategory.DEFECT:
        if (!pref.defectUpdates) {
          return { suppressed: true, reason: 'Defect notifications disabled' };
        }
        break;
      case NotificationCategory.ASSIGNMENT:
        if (!pref.testAssignment) {
          return { suppressed: true, reason: 'Assignment notifications disabled' };
        }
        break;
      case NotificationCategory.EXECUTION:
        if (!pref.executionAlerts) {
          return { suppressed: true, reason: 'Execution notifications disabled' };
        }
        break;
      case NotificationCategory.AUTOMATION:
        if (!pref.automationAlerts) {
          return { suppressed: true, reason: 'Automation notifications disabled' };
        }
        break;
      case NotificationCategory.AI:
        if (!pref.aiAlerts) {
          return { suppressed: true, reason: 'AI notifications disabled' };
        }
        break;
      case NotificationCategory.REPORTING:
        if (!pref.reportingAlerts) {
          return { suppressed: true, reason: 'Reporting notifications disabled' };
        }
        break;
    }

    // 4. Quiet hours evaluation for Email
    if (channel === 'EMAIL' && this.isInQuietHours(pref, now)) {
      return { suppressed: true, reason: 'Suppressed by quiet hours schedule' };
    }

    return { suppressed: false };
  }
}
