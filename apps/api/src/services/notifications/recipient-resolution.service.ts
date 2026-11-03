import { prisma } from '../../prisma.js';
import { NotificationEventPayload } from '@ai-qa/shared-types';

export class RecipientResolutionService {
  /**
   * Resolves, deduplicates, and filters eligible recipient user IDs for a given event.
   */
  static async resolveRecipients(event: NotificationEventPayload): Promise<string[]> {
    const candidateIds = new Set<string>();

    // 1. Explicitly provided recipient IDs
    if (event.recipientUserIds && event.recipientUserIds.length > 0) {
      for (const id of event.recipientUserIds) {
        if (id) candidateIds.add(id);
      }
    }

    // 2. Entity-based recipient resolution
    if (event.entityType === 'DEFECT' && event.entityId) {
      const defect = await prisma.defect.findUnique({
        where: { id: event.entityId },
        select: {
          assigneeId: true,
          reporterId: true,
          qaOwnerId: true,
        },
      });

      if (defect) {
        if (defect.assigneeId) candidateIds.add(defect.assigneeId);
        if (defect.reporterId) candidateIds.add(defect.reporterId);
        if (defect.qaOwnerId) candidateIds.add(defect.qaOwnerId);
      }
    } else if (event.entityType === 'TEST_RUN' && event.entityId) {
      const testRun = await prisma.testRun.findUnique({
        where: { id: event.entityId },
        select: {
          createdById: true,
          milestone: {
            select: { ownerId: true },
          },
        },
      });

      if (testRun) {
        if (testRun.createdById) candidateIds.add(testRun.createdById);
        if (testRun.milestone?.ownerId) candidateIds.add(testRun.milestone.ownerId);
      }
    }

    // 3. Exclude actor (do not notify oneself of an action they performed)
    if (event.actorId && !event.forceBypassPreferences) {
      candidateIds.delete(event.actorId);
    }

    if (candidateIds.size === 0) {
      return [];
    }

    // 4. Verify that users exist and belong to the organization/project
    const candidatesArray = Array.from(candidateIds);
    let validUsers: { id: string }[] = [];

    if (event.organizationId) {
      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId: event.organizationId,
          userId: { in: candidatesArray },
        },
        select: { userId: true },
      });
      validUsers = members.map((m: { userId: string }) => ({ id: m.userId }));
    } else {
      const users = await prisma.user.findMany({
        where: { id: { in: candidatesArray } },
        select: { id: true },
      });
      validUsers = users;
    }

    return validUsers.map((u) => u.id);
  }
}
