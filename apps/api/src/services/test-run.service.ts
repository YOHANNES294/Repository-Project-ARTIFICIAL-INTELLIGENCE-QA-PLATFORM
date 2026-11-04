import { prisma } from '../prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../errors.js';
import { createAuditLog } from './audit.service.js';
import { NotificationService } from './notifications/index.js';
import {
  CreateTestRunInput,
  UpdateTestRunInput,
  TestRunStatus,
  ExecutionStatus,
  AssignRunCasesInput,
  ExecutionSummaryDto,
} from '@ai-qa/shared-types';

export class TestRunService {
  private static async getNextRunNumber(projectId: string): Promise<number> {
    const highest = await prisma.testRun.findFirst({
      where: { projectId },
      orderBy: { runNumber: 'desc' },
      select: { runNumber: true },
    });
    return (highest?.runNumber || 0) + 1;
  }

  static calculateSummary(cases: Array<{ status: any }>): ExecutionSummaryDto {
    const total = cases.length;
    let notRun = 0;
    let passed = 0;
    let failed = 0;
    let blocked = 0;
    let skipped = 0;

    for (const c of cases) {
      switch (c.status) {
        case ExecutionStatus.PASSED:
          passed++;
          break;
        case ExecutionStatus.FAILED:
          failed++;
          break;
        case ExecutionStatus.BLOCKED:
          blocked++;
          break;
        case ExecutionStatus.SKIPPED:
          skipped++;
          break;
        case ExecutionStatus.NOT_RUN:
        case ExecutionStatus.RETEST:
        default:
          notRun++;
          break;
      }
    }

    const executed = passed + failed + blocked + skipped;
    const passPercentage = executed > 0 ? Math.round((passed / executed) * 100 * 10) / 10 : 0;
    const completionPercentage = total > 0 ? Math.round((executed / total) * 100 * 10) / 10 : 0;

    return {
      total,
      notRun,
      passed,
      failed,
      blocked,
      skipped,
      passPercentage,
      completionPercentage,
    };
  }

  static async getTestRuns(
    projectId: string,
    params: {
      search?: string;
      status?: TestRunStatus;
      testPlanId?: string;
      milestoneId?: string;
      environmentId?: string;
      assignedToId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const {
      search,
      status,
      testPlanId,
      milestoneId,
      environmentId,
      assignedToId,
      page = 1,
      limit = 20,
    } = params;
    const skip = (page - 1) * limit;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const where: any = { projectId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (testPlanId) {
      where.testPlanId = testPlanId;
    }

    if (milestoneId) {
      where.milestoneId = milestoneId;
    }

    if (environmentId) {
      where.environmentId = environmentId;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    const [testRuns, total] = await Promise.all([
      prisma.testRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          testPlan: { select: { id: true, name: true } },
          milestone: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          cases: { select: { status: true } },
          _count: { select: { cases: true } },
        },
      }),
      prisma.testRun.count({ where }),
    ]);

    const formattedRuns = testRuns.map((run: any) => {
      const summary = this.calculateSummary(run.cases);
      const { cases, ...rest } = run;
      return {
        ...rest,
        key: `${project.key}-TR-${run.runNumber}`,
        summary,
      };
    });

    return {
      testRuns: formattedRuns,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTestRunById(projectId: string, runId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const run = await prisma.testRun.findUnique({
      where: { id: runId },
      include: {
        testPlan: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        cases: { select: { status: true } },
        _count: { select: { cases: true } },
      },
    });

    if (!run || run.projectId !== projectId) {
      throw new NotFoundError('Test run not found');
    }

    const summary = this.calculateSummary(run.cases);
    const { cases, ...rest } = run;
    const runCasesResult = await this.getRunCases(projectId, runId);

    return {
      ...rest,
      key: `${project.key}-TR-${run.runNumber}`,
      summary,
      cases: runCasesResult.runCases,
    };
  }

  static async createTestRun(
    projectId: string,
    input: CreateTestRunInput,
    userId?: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true, organizationId: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Validate milestone
    if (input.milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: input.milestoneId },
        select: { projectId: true },
      });
      if (!milestone || milestone.projectId !== projectId) {
        throw new ValidationError('Selected milestone does not belong to this project');
      }
    }

    // Validate environment
    if (input.environmentId) {
      const env = await prisma.environment.findUnique({
        where: { id: input.environmentId },
        select: { projectId: true },
      });
      if (!env || env.projectId !== projectId) {
        throw new ValidationError('Selected environment does not belong to this project');
      }
    }

    // Validate test plan if provided
    if (input.testPlanId) {
      const plan = await prisma.testPlan.findUnique({
        where: { id: input.testPlanId },
        select: { projectId: true },
      });
      if (!plan || plan.projectId !== projectId) {
        throw new ValidationError('Selected test plan does not belong to this project');
      }
    }

    // Collect test case version IDs to populate run
    const caseVersionMap = new Map<string, string>(); // testCaseId -> testCaseVersionId

    // 1. From Test Plan
    if (input.testPlanId) {
      const planCases = await prisma.testPlanCase.findMany({
        where: { testPlanId: input.testPlanId },
        include: {
          testCase: {
            include: {
              versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
            },
          },
        },
      });

      for (const pc of planCases) {
        const versionId = pc.testCaseVersionId || pc.testCase.versions[0]?.id;
        if (versionId) {
          caseVersionMap.set(pc.testCaseId, versionId);
        }
      }
    }

    // 2. From direct testCaseIds
    if (input.testCaseIds && input.testCaseIds.length > 0) {
      const cases = await prisma.testCase.findMany({
        where: { id: { in: input.testCaseIds }, projectId, isArchived: false },
        include: {
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      });

      for (const tc of cases) {
        if (tc.versions[0]?.id) {
          caseVersionMap.set(tc.id, tc.versions[0].id);
        }
      }
    }

    // 3. From test suites
    if (input.testSuiteIds && input.testSuiteIds.length > 0) {
      const suiteCases = await prisma.testCase.findMany({
        where: { suiteId: { in: input.testSuiteIds }, projectId, isArchived: false },
        include: {
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      });

      for (const tc of suiteCases) {
        if (tc.versions[0]?.id) {
          caseVersionMap.set(tc.id, tc.versions[0].id);
        }
      }
    }

    const runNumber = await this.getNextRunNumber(projectId);

    const testRun = await prisma.$transaction(async (tx: any) => {
      const newRun = await tx.testRun.create({
        data: {
          projectId,
          runNumber,
          name: input.name,
          description: input.description || null,
          testPlanId: input.testPlanId || null,
          milestoneId: input.milestoneId || null,
          environmentId: input.environmentId || null,
          assignedToId: input.assignedToId || null,
          createdById: userId || null,
          status: TestRunStatus.NOT_STARTED,
          isAutomated: input.isAutomated || false,
        },
      });

      if (caseVersionMap.size > 0) {
        let order = 0;
        const runCasesData = Array.from(caseVersionMap.values()).map((versionId: string) => ({
          testRunId: newRun.id,
          testCaseVersionId: versionId,
          assignedToId: input.assignedToId || null,
          status: ExecutionStatus.NOT_RUN,
          orderIndex: order++,
        }));

        await tx.testRunCase.createMany({
          data: runCasesData,
          skipDuplicates: true,
        });
      }

      return newRun;
    });

    await createAuditLog({
      organizationId: project.organizationId,
      userId,
      action: 'TEST_RUN_CREATED',
      entityType: 'TestRun',
      entityId: testRun.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        name: testRun.name,
        runNumber: testRun.runNumber,
        casesCount: caseVersionMap.size,
      },
    });

    return this.getTestRunById(projectId, testRun.id);
  }

  static async updateTestRun(
    projectId: string,
    runId: string,
    input: UpdateTestRunInput,
    userId?: string
  ) {
    const existing = await prisma.testRun.findUnique({
      where: { id: runId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundError('Test run not found');
    }

    if (input.milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: input.milestoneId },
        select: { projectId: true },
      });
      if (!milestone || milestone.projectId !== projectId) {
        throw new ValidationError('Selected milestone does not belong to this project');
      }
    }

    if (input.environmentId) {
      const env = await prisma.environment.findUnique({
        where: { id: input.environmentId },
        select: { projectId: true },
      });
      if (!env || env.projectId !== projectId) {
        throw new ValidationError('Selected environment does not belong to this project');
      }
    }

    const updated = await prisma.testRun.update({
      where: { id: runId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.milestoneId !== undefined && { milestoneId: input.milestoneId }),
        ...(input.environmentId !== undefined && { environmentId: input.environmentId }),
        ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
      },
    });

    await createAuditLog({
      organizationId: existing.project.organizationId,
      userId,
      action: 'TEST_RUN_UPDATED',
      entityType: 'TestRun',
      entityId: runId,
      metadata: { updatedFields: Object.keys(input) },
    });

    return this.getTestRunById(projectId, updated.id);
  }

  static async transitionStatus(
    projectId: string,
    runId: string,
    newStatus: TestRunStatus,
    userId?: string
  ) {
    const run = await prisma.testRun.findUnique({
      where: { id: runId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!run || run.projectId !== projectId) {
      throw new NotFoundError('Test run not found');
    }

    let startedAt = run.startedAt;
    let completedAt = run.completedAt;

    if (newStatus === TestRunStatus.IN_PROGRESS && !startedAt) {
      startedAt = new Date();
    } else if (newStatus === TestRunStatus.COMPLETED || newStatus === TestRunStatus.ABORTED) {
      completedAt = new Date();
      if (!startedAt) startedAt = new Date();
    }

    const updated = await prisma.testRun.update({
      where: { id: runId },
      data: {
        status: newStatus,
        startedAt,
        completedAt,
      },
    });

    await createAuditLog({
      organizationId: run.project.organizationId,
      userId,
      action: 'TEST_RUN_STATUS_TRANSITION',
      entityType: 'TestRun',
      entityId: runId,
      metadata: {
        fromStatus: run.status,
        toStatus: newStatus,
      },
    });

    if (newStatus === TestRunStatus.COMPLETED) {
      this.getTestRunById(projectId, runId).then((details) => {
        NotificationService.dispatch({
          organizationId: run.project.organizationId,
          projectId,
          recipientUserIds: run.assignedToId ? [run.assignedToId] : [],
          actorId: userId,
          title: `Test Run Completed: ${run.name}`,
          message: `Test run finished with ${details.summary.passPercentage}% pass rate (${details.summary.passed}/${details.summary.total} passed).`,
          type: 'TEST_RUN_COMPLETED',
          category: 'EXECUTION',
          priority: details.summary.failed > 0 ? 'HIGH' : 'NORMAL',
          entityType: 'TEST_RUN',
          entityId: runId,
          link: `/projects/${projectId}/runs/${runId}`,
          metadata: {
            runName: run.name,
            totalTests: details.summary.total,
            passedCount: details.summary.passed,
            failedCount: details.summary.failed,
            passRate: details.summary.passPercentage,
            projectName: details.key,
          },
        }).catch(() => {});
      }).catch(() => {});
    }

    return this.getTestRunById(projectId, updated.id);
  }

  static async deleteTestRun(projectId: string, runId: string, userId?: string) {
    const run = await prisma.testRun.findUnique({
      where: { id: runId },
      include: {
        project: { select: { organizationId: true } },
        cases: {
          include: {
            results: { select: { id: true } },
          },
        },
      },
    });

    if (!run || run.projectId !== projectId) {
      throw new NotFoundError('Test run not found');
    }

    // Safety guardrail: do not delete run with executed results
    const executedCount = run.cases.reduce((sum: number, c: any) => sum + c.results.length, 0);
    if (executedCount > 0) {
      throw new ConflictError(
        'Cannot delete test run that contains executed test results. Abort or complete the run instead.'
      );
    }

    await prisma.testRun.delete({
      where: { id: runId },
    });

    await createAuditLog({
      organizationId: run.project.organizationId,
      userId,
      action: 'TEST_RUN_DELETED',
      entityType: 'TestRun',
      entityId: runId,
      metadata: { name: run.name },
    });

    return { message: 'Test run successfully deleted' };
  }

  static async getRunCases(
    projectId: string,
    runId: string,
    params: {
      status?: ExecutionStatus;
      assignedToId?: string;
      search?: string;
    } = {}
  ) {
    const run = await prisma.testRun.findUnique({
      where: { id: runId },
      include: { project: { select: { key: true } } },
    });

    if (!run || run.projectId !== projectId) {
      throw new NotFoundError('Test run not found');
    }

    const where: any = { testRunId: runId };

    if (params.status) {
      where.status = params.status;
    }

    if (params.assignedToId) {
      where.assignedToId = params.assignedToId;
    }

    const runCases = await prisma.testRunCase.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
      include: {
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
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
          take: 1,
          include: {
            executedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
            stepResults: { orderBy: { stepNumber: 'asc' } },
            attachments: true,
          },
        },
      },
    });

    const allCasesForSummary = await prisma.testRunCase.findMany({
      where: { testRunId: runId },
      select: { status: true },
    });

    const summary = this.calculateSummary(allCasesForSummary);

    const formatted = runCases.map((rc: any) => ({
      ...rc,
      testCaseVersion: {
        ...rc.testCaseVersion,
        testCase: rc.testCaseVersion.testCase
          ? {
              ...rc.testCaseVersion.testCase,
              key: `${run.project.key}-${rc.testCaseVersion.testCase.caseNumber}`,
            }
          : undefined,
      },
      latestResult: rc.results[0] || null,
    }));

    return {
      runCases: formatted,
      summary,
    };
  }

  static async assignRunCases(
    projectId: string,
    runId: string,
    input: AssignRunCasesInput,
    userId?: string
  ) {
    const run = await prisma.testRun.findUnique({
      where: { id: runId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!run || run.projectId !== projectId) {
      throw new NotFoundError('Test run not found');
    }

    if (input.assignedToId) {
      const isMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: run.project.organizationId,
            userId: input.assignedToId,
          },
        },
      });

      if (!isMember) {
        throw new ValidationError('Assignee is not a member of the organization');
      }
    }

    const result = await prisma.testRunCase.updateMany({
      where: {
        testRunId: runId,
        id: { in: input.testRunCaseIds },
      },
      data: {
        assignedToId: input.assignedToId || null,
      },
    });

    await createAuditLog({
      organizationId: run.project.organizationId,
      userId,
      action: 'TEST_RUN_CASES_ASSIGNED',
      entityType: 'TestRun',
      entityId: runId,
      metadata: {
        assignedCount: result.count,
        assignedToId: input.assignedToId,
      },
    });

    return { assignedCount: result.count };
  }
}

export const testRunService = TestRunService;
