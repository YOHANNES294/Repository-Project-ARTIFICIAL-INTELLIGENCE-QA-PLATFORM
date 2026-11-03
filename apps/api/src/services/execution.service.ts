import { prisma } from '../prisma.js';
import { NotFoundError } from '../errors.js';
import { createAuditLog } from './audit.service.js';
import {
  SubmitExecutionInput,
  RetestExecutionInput,
  ExecutionStatus,
  TestRunStatus,
} from '@ai-qa/shared-types';

export class ExecutionService {
  /**
   * Evaluates overall status based on step-level execution statuses
   */
  static evaluateOverallStatus(
    explicitStatus?: ExecutionStatus,
    stepResults?: Array<{ status: ExecutionStatus }>
  ): ExecutionStatus {
    if (!stepResults || stepResults.length === 0) {
      return explicitStatus || ExecutionStatus.PASSED;
    }

    const hasFailed = stepResults.some((s) => s.status === ExecutionStatus.FAILED);
    if (hasFailed) {
      return ExecutionStatus.FAILED;
    }

    const hasBlocked = stepResults.some((s) => s.status === ExecutionStatus.BLOCKED);
    if (hasBlocked) {
      return ExecutionStatus.BLOCKED;
    }

    const allSkipped = stepResults.every((s) => s.status === ExecutionStatus.SKIPPED);
    if (allSkipped) {
      return ExecutionStatus.SKIPPED;
    }

    const hasPassed = stepResults.some((s) => s.status === ExecutionStatus.PASSED);
    if (hasPassed) {
      return ExecutionStatus.PASSED;
    }

    return explicitStatus || ExecutionStatus.PASSED;
  }

  static async getTestRunCaseDetails(projectId: string, runId: string, runCaseId: string) {
    const runCase = await prisma.testRunCase.findUnique({
      where: { id: runCaseId },
      include: {
        testRun: {
          select: {
            id: true,
            runNumber: true,
            name: true,
            projectId: true,
            project: { select: { key: true } },
          },
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        testCaseVersion: {
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
            testCase: {
              select: {
                id: true,
                caseNumber: true,
                title: true,
                suiteId: true,
                suite: { select: { id: true, name: true } },
              },
            },
          },
        },
        results: {
          orderBy: { attemptNumber: 'desc' },
          include: {
            executedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
            stepResults: { orderBy: { stepNumber: 'asc' } },
            attachments: true,
          },
        },
      },
    });

    if (!runCase || runCase.testRun.id !== runId || runCase.testRun.projectId !== projectId) {
      throw new NotFoundError('Test run case not found');
    }

    const { results, ...rest } = runCase;
    return {
      ...rest,
      testRun: {
        id: runCase.testRun.id,
        name: runCase.testRun.name,
        key: `${runCase.testRun.project.key}-TR-${runCase.testRun.runNumber}`,
      },
      testCaseVersion: {
        ...runCase.testCaseVersion,
        testCase: runCase.testCaseVersion.testCase
          ? {
              ...runCase.testCaseVersion.testCase,
              key: `${runCase.testRun.project.key}-${runCase.testCaseVersion.testCase.caseNumber}`,
            }
          : undefined,
      },
      results,
      latestResult: results[0] || null,
    };
  }

  static async submitExecution(
    projectId: string,
    runId: string,
    runCaseId: string,
    input: SubmitExecutionInput,
    userId?: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const runCase = await prisma.testRunCase.findUnique({
      where: { id: runCaseId },
      include: {
        testRun: {
          select: {
            id: true,
            projectId: true,
            status: true,
            startedAt: true,
            project: { select: { organizationId: true } },
          },
        },
        results: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
          select: { attemptNumber: true },
        },
      },
    });

    if (!runCase || runCase.testRun.id !== runId || runCase.testRun.projectId !== projectId) {
      throw new NotFoundError('Test run case not found');
    }

    const overallStatus = this.evaluateOverallStatus(input.status, input.stepResults);
    const nextAttemptNumber = (runCase.results[0]?.attemptNumber || 0) + 1;

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create new immutable TestResult attempt
      const newResult = await tx.testResult.create({
        data: {
          testRunCaseId: runCaseId,
          executedById: userId || null,
          attemptNumber: nextAttemptNumber,
          status: overallStatus,
          actualResult: input.actualResult || null,
          comment: input.comment || null,
          failureReason: input.failureReason || null,
          durationMs: input.durationMs || null,
          stepResults: input.stepResults && input.stepResults.length > 0
            ? {
                createMany: {
                  data: input.stepResults.map((s) => ({
                    stepNumber: s.stepNumber,
                    status: s.status,
                    actualResult: s.actualResult || null,
                    comment: s.comment || null,
                    durationMs: s.durationMs || null,
                  })),
                },
              }
            : undefined,
        },
        include: {
          executedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          stepResults: { orderBy: { stepNumber: 'asc' } },
          attachments: true,
        },
      });

      // 1b. Associate evidence attachments if provided
      if (input.attachmentIds && input.attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: input.attachmentIds }, projectId },
          data: { testResultId: newResult.id },
        });
      }

      // 2. Update TestRunCase current status
      await tx.testRunCase.update({
        where: { id: runCaseId },
        data: {
          status: overallStatus,
        },
      });

      // 3. Auto-start test run if it was NOT_STARTED
      if (runCase.testRun.status === TestRunStatus.NOT_STARTED) {
        await tx.testRun.update({
          where: { id: runId },
          data: {
            status: TestRunStatus.IN_PROGRESS,
            startedAt: new Date(),
          },
        });
      }

      return newResult;
    });

    await createAuditLog({
      organizationId: runCase.testRun.project.organizationId,
      userId,
      action: 'TEST_CASE_EXECUTED',
      entityType: 'TestResult',
      entityId: result.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        runCaseId,
        attemptNumber: nextAttemptNumber,
        status: overallStatus,
        durationMs: input.durationMs,
      },
    });

    return result;
  }

  static async retestExecution(
    projectId: string,
    runId: string,
    runCaseId: string,
    input: RetestExecutionInput,
    userId?: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const commentWithRetestNotes = input.retestNotes
      ? `[Retest Notes: ${input.retestNotes}] ${input.comment || ''}`.trim()
      : input.comment;

    return this.submitExecution(
      projectId,
      runId,
      runCaseId,
      {
        ...input,
        comment: commentWithRetestNotes,
      },
      userId,
      meta
    );
  }

  static async getExecutionHistory(projectId: string, runId: string, runCaseId: string) {
    const runCase = await prisma.testRunCase.findUnique({
      where: { id: runCaseId },
      include: {
        testRun: { select: { id: true, projectId: true } },
      },
    });

    if (!runCase || runCase.testRun.id !== runId || runCase.testRun.projectId !== projectId) {
      throw new NotFoundError('Test run case not found');
    }

    const history = await prisma.testResult.findMany({
      where: { testRunCaseId: runCaseId },
      orderBy: { attemptNumber: 'asc' },
      include: {
        executedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        stepResults: { orderBy: { stepNumber: 'asc' } },
        attachments: true,
      },
    });

    return history;
  }
}

export const executionService = ExecutionService;
