import crypto from 'crypto';
import { prisma } from '../../prisma.js';
import { ValidationError, NotFoundError } from '../../errors.js';
import { AutomationWebhookEventDto } from '@ai-qa/shared-types';

export class AutomationWebhookService {
  /**
   * Verify GitHub webhook HMAC-SHA256 signature using timing-safe comparison.
   */
  verifyGitHubSignature(
    rawPayload: string | Buffer,
    signatureHeader: string | undefined,
    secret: string
  ): boolean {
    if (!signatureHeader || !secret) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(rawPayload).digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signatureHeader, 'utf8'),
        Buffer.from(digest, 'utf8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Ingest and process a GitHub Actions webhook event with idempotency protection.
   */
  async processGitHubWebhook(
    projectId: string,
    eventId: string,
    eventType: string,
    signature: string,
    payload: any
  ): Promise<{ status: 'PROCESSED' | 'DUPLICATE' | 'IGNORED'; event: AutomationWebhookEventDto }> {
    if (!eventId) {
      throw new ValidationError('Missing GitHub event ID (X-GitHub-Delivery)');
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // 1. Idempotency check: check if event already processed
    const existing = await prisma.automationWebhookEvent.findUnique({
      where: {
        projectId_eventId: {
          projectId,
          eventId,
        },
      },
    });

    if (existing) {
      return {
        status: 'DUPLICATE',
        event: this.mapToDto(existing),
      };
    }

    let status = 'PROCESSED';
    let errorMessage: string | null = null;

    // Check relevant event types
    if (eventType === 'workflow_run') {
      const action = payload.action; // e.g. completed, requested, in_progress
      const workflowRun = payload.workflow_run;

      if (action === 'completed' && workflowRun) {
        // Extract CI metadata
        const branch = workflowRun.head_branch;
        const commitSha = workflowRun.head_sha;
        const commitMsg = workflowRun.head_commit?.message;
        const author = workflowRun.head_commit?.author?.name;
        const buildUrl = workflowRun.html_url;
        const buildId = String(workflowRun.id);

        // Find or associate with active automation session if matching gitCommitSha
        if (commitSha) {
          const matchingSession = await prisma.automationSession.findFirst({
            where: { projectId, gitCommitSha: commitSha },
            orderBy: { createdAt: 'desc' },
          });

          if (matchingSession && matchingSession.status === 'INGESTING') {
            await prisma.automationSession.update({
              where: { id: matchingSession.id },
              data: {
                ciBuildId: buildId,
                ciBuildUrl: buildUrl,
                gitBranch: branch || matchingSession.gitBranch,
                gitAuthor: author || matchingSession.gitAuthor,
                gitCommitMessage: commitMsg || matchingSession.gitCommitMessage,
              },
            });
          }
        }
      }
    } else if (eventType === 'ping') {
      status = 'PROCESSED';
    } else {
      status = 'IGNORED';
    }

    const recordedEvent = await prisma.automationWebhookEvent.create({
      data: {
        projectId,
        eventId,
        eventType,
        signature: signature ? `${signature.substring(0, 15)}...` : 'unsigned',
        payload: payload || {},
        status,
        errorMessage,
      },
    });

    return {
      status: status as any,
      event: this.mapToDto(recordedEvent),
    };
  }

  /**
   * List webhook events for a project with pagination.
   */
  async listWebhookEvents(
    projectId: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<{ events: AutomationWebhookEventDto[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.automationWebhookEvent.findMany({
        where: { projectId },
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
      }),
      prisma.automationWebhookEvent.count({ where: { projectId } }),
    ]);

    return {
      events: events.map((e) => this.mapToDto(e)),
      total,
    };
  }

  private mapToDto(e: any): AutomationWebhookEventDto {
    return {
      id: e.id,
      projectId: e.projectId,
      eventId: e.eventId,
      eventType: e.eventType,
      status: e.status,
      errorMessage: e.errorMessage,
      receivedAt: e.receivedAt.toISOString(),
    };
  }
}

export const automationWebhookService = new AutomationWebhookService();
