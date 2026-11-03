import { prisma } from '../prisma.js';
import { NotFoundError } from '../errors.js';
import { ExecutionStatus, ExecutionAnalyticsDto } from '@ai-qa/shared-types';

export class AnalyticsService {
  static async getExecutionAnalytics(
    projectId: string,
    filters: {
      testRunId?: string;
      testPlanId?: string;
      milestoneId?: string;
      environmentId?: string;
    } = {}
  ): Promise<ExecutionAnalyticsDto> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Build filter for testRunCase
    const runWhere: any = { projectId };
    if (filters.testRunId) runWhere.id = filters.testRunId;
    if (filters.testPlanId) runWhere.testPlanId = filters.testPlanId;
    if (filters.milestoneId) runWhere.milestoneId = filters.milestoneId;
    if (filters.environmentId) runWhere.environmentId = filters.environmentId;

    const testRuns = await prisma.testRun.findMany({
      where: runWhere,
      select: { id: true },
    });

    const runIds = testRuns.map((r: { id: string }) => r.id);

    if (runIds.length === 0) {
      return {
        totalCases: 0,
        notRun: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        passPercentage: 0,
        completionPercentage: 0,
        bySuite: [],
        byEnvironment: [],
        byTester: [],
        recentActivity: [],
      };
    }

    // Fetch all test run cases in scope
    const runCases = await prisma.testRunCase.findMany({
      where: { testRunId: { in: runIds } },
      include: {
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
        testRun: {
          select: {
            environmentId: true,
            environment: { select: { id: true, name: true } },
          },
        },
        testCaseVersion: {
          select: {
            testCase: {
              select: {
                suiteId: true,
                suite: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const totalCases = runCases.length;
    let notRun = 0;
    let passed = 0;
    let failed = 0;
    let blocked = 0;
    let skipped = 0;

    const suiteMap = new Map<
      string,
      {
        suiteId: string;
        suiteName: string;
        total: number;
        passed: number;
        failed: number;
        blocked: number;
        skipped: number;
        notRun: number;
      }
    >();

    const envMap = new Map<
      string,
      {
        environmentId: string;
        environmentName: string;
        total: number;
        passed: number;
        failed: number;
        notRun: number;
      }
    >();

    const testerMap = new Map<
      string,
      {
        testerId: string;
        testerName: string;
        assignedCount: number;
        executedCount: number;
        passedCount: number;
        failedCount: number;
      }
    >();

    for (const rc of runCases) {
      switch (rc.status) {
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

      // Group by Suite
      const suiteId = rc.testCaseVersion.testCase?.suiteId || 'unassigned';
      const suiteName = rc.testCaseVersion.testCase?.suite?.name || 'Root / No Suite';
      if (!suiteMap.has(suiteId)) {
        suiteMap.set(suiteId, {
          suiteId,
          suiteName,
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          skipped: 0,
          notRun: 0,
        });
      }
      const suiteStats = suiteMap.get(suiteId)!;
      suiteStats.total++;
      if (rc.status === ExecutionStatus.PASSED) suiteStats.passed++;
      else if (rc.status === ExecutionStatus.FAILED) suiteStats.failed++;
      else if (rc.status === ExecutionStatus.BLOCKED) suiteStats.blocked++;
      else if (rc.status === ExecutionStatus.SKIPPED) suiteStats.skipped++;
      else suiteStats.notRun++;

      // Group by Environment
      const envId = rc.testRun.environmentId || 'none';
      const envName = rc.testRun.environment?.name || 'Default';
      if (!envMap.has(envId)) {
        envMap.set(envId, {
          environmentId: envId,
          environmentName: envName,
          total: 0,
          passed: 0,
          failed: 0,
          notRun: 0,
        });
      }
      const envStats = envMap.get(envId)!;
      envStats.total++;
      if (rc.status === ExecutionStatus.PASSED) envStats.passed++;
      else if (rc.status === ExecutionStatus.FAILED) envStats.failed++;
      else envStats.notRun++;

      // Group by Assigned Tester
      if (rc.assignedTo) {
        const tId = rc.assignedTo.id;
        const tName = `${rc.assignedTo.firstName} ${rc.assignedTo.lastName}`.trim() || rc.assignedTo.email;
        if (!testerMap.has(tId)) {
          testerMap.set(tId, {
            testerId: tId,
            testerName: tName,
            assignedCount: 0,
            executedCount: 0,
            passedCount: 0,
            failedCount: 0,
          });
        }
        const tStats = testerMap.get(tId)!;
        tStats.assignedCount++;
        if (rc.status !== ExecutionStatus.NOT_RUN && rc.status !== ExecutionStatus.RETEST) {
          tStats.executedCount++;
          if (rc.status === ExecutionStatus.PASSED) tStats.passedCount++;
          else if (rc.status === ExecutionStatus.FAILED) tStats.failedCount++;
        }
      }
    }

    const executed = passed + failed + blocked + skipped;
    const passPercentage = executed > 0 ? Math.round((passed / executed) * 100 * 10) / 10 : 0;
    const completionPercentage = totalCases > 0 ? Math.round((executed / totalCases) * 100 * 10) / 10 : 0;

    // Fetch recent 20 execution attempts
    const recentResults = await prisma.testResult.findMany({
      where: {
        testRunCase: { testRunId: { in: runIds } },
      },
      orderBy: { executedAt: 'desc' },
      take: 20,
      include: {
        executedBy: { select: { firstName: true, lastName: true, email: true } },
        testRunCase: {
          select: {
            testRun: { select: { id: true, name: true } },
            testCaseVersion: { select: { title: true } },
          },
        },
      },
    });

    const recentActivity = recentResults.map((r: any) => ({
      id: r.id,
      testRunId: r.testRunCase.testRun.id,
      testRunName: r.testRunCase.testRun.name,
      testCaseTitle: r.testRunCase.testCaseVersion.title,
      status: r.status,
      attemptNumber: r.attemptNumber,
      executedAt: r.executedAt.toISOString(),
      testerName: r.executedBy
        ? `${r.executedBy.firstName} ${r.executedBy.lastName}`.trim() || r.executedBy.email
        : 'Automated / System',
      durationMs: r.durationMs,
    }));

    return {
      totalCases,
      notRun,
      passed,
      failed,
      blocked,
      skipped,
      passPercentage,
      completionPercentage,
      bySuite: Array.from(suiteMap.values()),
      byEnvironment: Array.from(envMap.values()),
      byTester: Array.from(testerMap.values()),
      recentActivity,
    };
  }
}

export const analyticsService = AnalyticsService;
