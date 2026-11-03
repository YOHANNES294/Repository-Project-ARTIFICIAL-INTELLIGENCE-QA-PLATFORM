import { prisma } from '../../prisma.js';
import { NotFoundError, ConflictError } from '../../errors.js';
import {
  AutomationFramework,
  AutomationSessionDto,
  AutomationSessionStatus,
  CreateAutomationSessionInput,
  FinalizeAutomationSessionInput,
  IngestAutomationResultsInput,
  ExecutionStatus,
  TestRunStatus,
} from '@ai-qa/shared-types';
import { automationMappingService } from './automation-mapping.service.js';

export class AutomationIngestionService {
  /**
   * Initialize a new automation execution session or return existing if idempotency key matches.
   */
  async createSession(
    projectId: string,
    organizationId: string,
    input: CreateAutomationSessionInput
  ): Promise<AutomationSessionDto> {
    // 1. Idempotency check
    if (input.idempotencyKey) {
      const existing = await prisma.automationSession.findUnique({
        where: {
          projectId_idempotencyKey: {
            projectId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: {
          testRun: {
            select: {
              id: true,
              runNumber: true,
              name: true,
              status: true,
            },
          },
        },
      });

      if (existing) {
        return this.mapToDto(existing);
      }
    }

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        _count: {
          select: { testRuns: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found in this organization');
    }

    // Determine runNumber for TestRun
    const highestRun = await prisma.testRun.findFirst({
      where: { projectId },
      orderBy: { runNumber: 'desc' },
      select: { runNumber: true },
    });
    const runNumber = (highestRun?.runNumber || 0) + 1;

    const framework = input.framework || 'PLAYWRIGHT';
    const runName =
      input.testRunName?.trim() ||
      `Automated ${framework} Run #${runNumber}${input.gitBranch ? ` (${input.gitBranch})` : ''}`;

    // Create TestRun and AutomationSession in a transaction
    const [, session] = await prisma.$transaction(async (tx) => {
      const tr = await tx.testRun.create({
        data: {
          projectId,
          runNumber,
          name: runName,
          description: input.gitCommitMessage
            ? `CI Commit: ${input.gitCommitMessage} (${input.gitCommitSha || 'HEAD'})`
            : `Automated test execution via ${framework}`,
          status: 'IN_PROGRESS',
          isAutomated: true,
          environmentId: input.environmentId || null,
          milestoneId: input.milestoneId || null,
          startedAt: new Date(),
        },
      });

      const s = await tx.automationSession.create({
        data: {
          projectId,
          organizationId,
          testRunId: tr.id,
          idempotencyKey: input.idempotencyKey || null,
          framework,
          status: 'INITIALIZED',
          environmentId: input.environmentId || null,
          milestoneId: input.milestoneId || null,
          ciProvider: input.ciProvider || null,
          ciBuildId: input.ciBuildId || null,
          ciBuildUrl: input.ciBuildUrl || null,
          gitBranch: input.gitBranch || null,
          gitCommitSha: input.gitCommitSha || null,
          gitCommitMessage: input.gitCommitMessage || null,
          gitAuthor: input.gitAuthor || null,
          pullRequestNumber: input.pullRequestNumber || null,
          os: input.os || null,
          browser: input.browser || null,
          metadata: input.metadata ? (input.metadata as any) : undefined,
          startedAt: new Date(),
        },
        include: {
          testRun: {
            select: {
              id: true,
              runNumber: true,
              name: true,
              status: true,
            },
          },
        },
      });

      return [tr, s];
    });

    return this.mapToDto(session);
  }

  /**
   * Ingest a batch of test results for an active automation session.
   */
  async ingestResults(
    projectId: string,
    input: IngestAutomationResultsInput
  ): Promise<{
    processedCount: number;
    unmappedCount: number;
    session: AutomationSessionDto;
  }> {
    const session = await prisma.automationSession.findFirst({
      where: { id: input.sessionId, projectId },
      include: {
        testRun: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Automation session not found in this project');
    }

    if (session.status === 'COMPLETED' || session.status === 'ABORTED') {
      throw new ConflictError(`Cannot ingest results into a ${session.status} session`);
    }

    let processedCount = 0;
    let unmappedCount = 0;
    let passedInc = 0;
    let failedInc = 0;
    let skippedInc = 0;
    let durationInc = 0;

    for (const item of input.results) {
      durationInc += item.durationMs || 0;

      // 1. Resolve mapping
      const resolution = await automationMappingService.resolveExternalTest(
        projectId,
        item.externalId,
        item.externalTitle,
        item.testCaseId
      );

      if (!resolution.testCaseId) {
        // Unmapped test
        unmappedCount++;
        const suiteName =
          item.suiteHierarchy && item.suiteHierarchy.length > 0
            ? item.suiteHierarchy.join(' > ')
            : null;

        await automationMappingService.recordUnmappedTest(
          projectId,
          session.id,
          item.externalId,
          item.externalTitle,
          suiteName,
          session.framework
        );
      } else {
        // Mapped test case! Find latest version
        const testCase = await prisma.testCase.findUnique({
          where: { id: resolution.testCaseId },
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
            },
          },
        });

        if (testCase && testCase.versions.length > 0 && session.testRunId) {
          const testCaseVersionId = testCase.versions[0].id;
          const mappedStatus = this.mapStatus(item.status);

          // Find or create TestRunCase
          let runCase = await prisma.testRunCase.findUnique({
            where: {
              testRunId_testCaseVersionId: {
                testRunId: session.testRunId,
                testCaseVersionId,
              },
            },
          });

          if (!runCase) {
            runCase = await prisma.testRunCase.create({
              data: {
                testRunId: session.testRunId,
                testCaseVersionId,
                status: mappedStatus,
              },
            });
          } else if (item.isFinalAttempt !== false) {
            // Update to final status
            await prisma.testRunCase.update({
              where: { id: runCase.id },
              data: { status: mappedStatus },
            });
          }

          // Create TestResult record preserving attempt number
          const resultRecord = await prisma.testResult.create({
            data: {
              testRunCaseId: runCase.id,
              attemptNumber: item.attemptNumber || 1,
              status: mappedStatus,
              durationMs: item.durationMs,
              failureReason: item.errorMessage || null,
              comment: item.stackTrace || null,
              actualResult: item.errorMessage || 'Automated execution step completed',
            },
          });

          // Create steps if present
          if (item.steps && item.steps.length > 0) {
            for (const step of item.steps) {
              await prisma.testExecutionStep.create({
                data: {
                  testResultId: resultRecord.id,
                  stepNumber: step.stepNumber,
                  status: this.mapStatus(step.status),
                  actualResult: step.title,
                  comment: step.errorMessage || null,
                  durationMs: step.durationMs || 0,
                },
              });
            }
          }

          // If defectId is provided and exists in project, link it
          if (item.defectId) {
            const defect = await prisma.defect.findFirst({
              where: { id: item.defectId, projectId },
            });
            if (defect) {
              await prisma.defectTestLink.create({
                data: {
                  defectId: defect.id,
                  testCaseId: testCase.id,
                  testRunId: session.testRunId,
                  testResultId: resultRecord.id,
                },
              });
            }
          }

          processedCount++;
        }
      }

      // Update counters based on final status
      if (item.isFinalAttempt !== false) {
        if (item.status === 'PASSED') passedInc++;
        else if (item.status === 'FAILED' || item.status === 'TIMED_OUT') failedInc++;
        else if (item.status === 'SKIPPED') skippedInc++;
      }
    }

    // Update session metrics
    const updatedSession = await prisma.automationSession.update({
      where: { id: session.id },
      data: {
        status: 'INGESTING',
        totalTests: { increment: input.results.filter((r) => r.isFinalAttempt !== false).length },
        passedTests: { increment: passedInc },
        failedTests: { increment: failedInc },
        skippedTests: { increment: skippedInc },
        durationMs: { increment: durationInc },
      },
      include: {
        testRun: {
          select: {
            id: true,
            runNumber: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return {
      processedCount,
      unmappedCount,
      session: this.mapToDto(updatedSession),
    };
  }

  /**
   * Finalize an automation session and complete the linked TestRun.
   */
  async finalizeSession(
    projectId: string,
    input: FinalizeAutomationSessionInput
  ): Promise<AutomationSessionDto> {
    const session = await prisma.automationSession.findFirst({
      where: { id: input.sessionId, projectId },
      include: { testRun: true },
    });

    if (!session) {
      throw new NotFoundError('Automation session not found in this project');
    }

    const targetStatus = input.status || 'COMPLETED';

    const [updatedSession] = await prisma.$transaction(async (tx) => {
      const s = await tx.automationSession.update({
        where: { id: session.id },
        data: {
          status: targetStatus,
          completedAt: new Date(),
          ...(input.summary
            ? {
                ...(typeof input.summary.totalTests === 'number'
                  ? { totalTests: input.summary.totalTests }
                  : {}),
                ...(typeof input.summary.passedTests === 'number'
                  ? { passedTests: input.summary.passedTests }
                  : {}),
                ...(typeof input.summary.failedTests === 'number'
                  ? { failedTests: input.summary.failedTests }
                  : {}),
                ...(typeof input.summary.skippedTests === 'number'
                  ? { skippedTests: input.summary.skippedTests }
                  : {}),
                ...(typeof input.summary.durationMs === 'number'
                  ? { durationMs: input.summary.durationMs }
                  : {}),
              }
            : {}),
        },
        include: {
          testRun: {
            select: {
              id: true,
              runNumber: true,
              name: true,
              status: true,
            },
          },
        },
      });

      if (session.testRunId) {
        await tx.testRun.update({
          where: { id: session.testRunId },
          data: {
            status: targetStatus === 'ABORTED' ? 'ABORTED' : 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }

      return [s];
    });

    return this.mapToDto(updatedSession);
  }

  /**
   * Get an automation session by ID.
   */
  async getSession(projectId: string, sessionId: string): Promise<AutomationSessionDto> {
    const session = await prisma.automationSession.findFirst({
      where: { id: sessionId, projectId },
      include: {
        testRun: {
          select: {
            id: true,
            runNumber: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Automation session not found');
    }

    return this.mapToDto(session);
  }

  /**
   * List automation sessions for a project with pagination.
   */
  async listSessions(
    projectId: string,
    params: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ sessions: AutomationSessionDto[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { projectId };
    if (params.status) {
      where.status = params.status;
    }

    const [sessions, total] = await Promise.all([
      prisma.automationSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          testRun: {
            select: {
              id: true,
              runNumber: true,
              name: true,
              status: true,
            },
          },
        },
      }),
      prisma.automationSession.count({ where }),
    ]);

    return {
      sessions: sessions.map((s) => this.mapToDto(s)),
      total,
    };
  }

  /**
   * Get overall automation statistics for a project dashboard.
   */
  async getAutomationOverview(projectId: string): Promise<{
    totalSessions: number;
    totalMappings: number;
    totalUnmapped: number;
    activeTokens: number;
    recentSessions: AutomationSessionDto[];
  }> {
    const [totalSessions, totalMappings, totalUnmapped, activeTokens, recentSessions] =
      await Promise.all([
        prisma.automationSession.count({ where: { projectId } }),
        prisma.automationTestMapping.count({ where: { projectId } }),
        prisma.automationUnmappedTest.count({ where: { projectId, status: 'PENDING' } }),
        prisma.automationApiToken.count({ where: { projectId, isRevoked: false } }),
        prisma.automationSession.findMany({
          where: { projectId },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            testRun: {
              select: {
                id: true,
                runNumber: true,
                name: true,
                status: true,
              },
            },
          },
        }),
      ]);

    return {
      totalSessions,
      totalMappings,
      totalUnmapped,
      activeTokens,
      recentSessions: recentSessions.map((s) => this.mapToDto(s)),
    };
  }

  private mapStatus(status: string): ExecutionStatus {
    switch (status) {
      case 'PASSED':
        return ExecutionStatus.PASSED;
      case 'FAILED':
      case 'TIMED_OUT':
        return ExecutionStatus.FAILED;
      case 'SKIPPED':
        return ExecutionStatus.SKIPPED;
      case 'BLOCKED':
        return ExecutionStatus.BLOCKED;
      default:
        return ExecutionStatus.FAILED;
    }
  }

  private mapToDto(s: any): AutomationSessionDto {
    return {
      id: s.id,
      projectId: s.projectId,
      organizationId: s.organizationId,
      testRunId: s.testRunId,
      idempotencyKey: s.idempotencyKey,
      framework: s.framework as AutomationFramework,
      status: s.status as AutomationSessionStatus,
      environmentId: s.environmentId,
      milestoneId: s.milestoneId,
      ciProvider: s.ciProvider,
      ciBuildId: s.ciBuildId,
      ciBuildUrl: s.ciBuildUrl,
      gitBranch: s.gitBranch,
      gitCommitSha: s.gitCommitSha,
      gitCommitMessage: s.gitCommitMessage,
      gitAuthor: s.gitAuthor,
      pullRequestNumber: s.pullRequestNumber,
      os: s.os,
      browser: s.browser,
      totalTests: s.totalTests,
      passedTests: s.passedTests,
      failedTests: s.failedTests,
      skippedTests: s.skippedTests,
      durationMs: s.durationMs,
      metadata: s.metadata,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      testRun: s.testRun
        ? {
            id: s.testRun.id,
            runNumber: s.testRun.runNumber,
            name: s.testRun.name,
            status: s.testRun.status as TestRunStatus,
          }
        : null,
    };
  }
}

export const automationIngestionService = new AutomationIngestionService();
