import { prisma } from '../../prisma.js';
import { EmailTemplateEngine } from './email/email-template.engine.js';
import { getEmailProvider } from './email/email.factory.js';
import { logger } from '../../logger.js';

export class DigestService {
  /**
   * Compiles quality metrics and sends daily or weekly digest emails to subscribed users.
   */
  static async sendDigests(frequency: 'DAILY' | 'WEEKLY'): Promise<{ sentCount: number }> {
    const daysBack = frequency === 'DAILY' ? 1 : 7;
    const sinceDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Find users subscribed to this frequency
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        OR: [
          { digestFrequency: frequency },
          ...(frequency === 'WEEKLY' ? [{ weeklyDigest: true }] : []),
        ],
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (preferences.length === 0) {
      return { sentCount: 0 };
    }

    let sentCount = 0;
    const emailProvider = getEmailProvider();

    for (const pref of preferences) {
      if (!pref.user?.email) continue;
      const recipientName = `${pref.user.firstName || ''} ${pref.user.lastName || ''}`.trim() || 'there';

      try {
        // Find organizations the user is a member of
        const memberships = await prisma.organizationMember.findMany({
          where: { userId: pref.userId },
          select: { organizationId: true },
        });

        const orgIds = memberships.map((m: { organizationId: string }) => m.organizationId);

        // Gather metrics across the user's organizations
        const [
          totalExecutions,
          passedExecutions,
          newDefects,
          resolvedDefects,
          qualityGatesPassed,
        ] = await Promise.all([
          prisma.testResult.count({
            where: {
              testRunCase: { testRun: { project: { organizationId: { in: orgIds } } } },
              executedAt: { gte: sinceDate },
            },
          }),
          prisma.testResult.count({
            where: {
              testRunCase: { testRun: { project: { organizationId: { in: orgIds } } } },
              status: 'PASSED',
              executedAt: { gte: sinceDate },
            },
          }),
          prisma.defect.count({
            where: {
              project: { organizationId: { in: orgIds } },
              createdAt: { gte: sinceDate },
            },
          }),
          prisma.defect.count({
            where: {
              project: { organizationId: { in: orgIds } },
              status: { in: ['FIXED', 'VERIFIED', 'CLOSED'] },
              updatedAt: { gte: sinceDate },
            },
          }),
          prisma.projectQualityGate.count({
            where: {
              organizationId: { in: orgIds },
              isDefault: true,
            },
          }),
        ]);

        const passRate = totalExecutions > 0 ? (passedExecutions / totalExecutions) * 100 : 100;
        const periodName = frequency === 'DAILY' ? 'Daily Quality Digest' : 'Weekly Quality Digest';
        const summaryDate = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        const rendered = EmailTemplateEngine.renderDigest({
          recipientName,
          periodName,
          summaryDate,
          totalExecutions,
          passRate,
          newDefects,
          resolvedDefects,
          qualityGatesPassed,
          dashboardUrl: process.env.APP_URL || 'https://ai-qa.platform/dashboard',
        });

        const result = await emailProvider.sendEmail({
          to: pref.user.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });

        await prisma.emailDelivery.create({
          data: {
            userId: pref.userId,
            recipient: pref.user.email,
            subject: rendered.subject,
            templateId: `DIGEST_${frequency}`,
            status: result.success ? 'SENT' : 'FAILED',
            provider: result.provider,
            providerMessageId: result.messageId,
            error: result.error,
            sentAt: result.success ? new Date() : null,
          },
        });

        if (result.success) {
          sentCount++;
        }
      } catch (err: any) {
        logger.error(`[DigestService] Failed generating digest for user ${pref.userId}: ${err.message}`);
      }
    }

    return { sentCount };
  }
}
