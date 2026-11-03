import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../errors.js';
import { ExecutionStatus, DetailedExecutionAnalyticsDto } from '@ai-qa/shared-types';

export class ExecutionAnalyticsService {
  static async getDetailedExecutionAnalytics(
    projectId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      environmentId?: string;
      milestoneId?: string;
    } = {}
  ): Promise<DetailedExecutionAnalyticsDto> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const now = new Date();
    const end = filters.endDate ? new Date(filters.endDate) : now;
    const start = filters.startDate ? new Date(filters.startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const runWhere: any = {
      projectId,
      createdAt: { gte: start, lte: end },
    };
    if (filters.environmentId) runWhere.environmentId = filters.environmentId;
    if (filters.milestoneId) runWhere.milestoneId = filters.milestoneId;

    const testRuns = await prisma.testRun.findMany({
      where: runWhere,
      select: {
        id: true,
        name: true,
        isAutomated: true,
        environmentId: true,
        environment: { select: { id: true, name: true } },
      },
    });

    const runIds = testRuns.map((r) => r.id);
    const runMap = new Map(testRuns.map((r) => [r.id, r]));

    // Fetch test results in window
    const results = runIds.length > 0
      ? await prisma.testResult.findMany({
          where: {
            testRunCase: { testRunId: { in: runIds } },
            executedAt: { gte: start, lte: end },
          },
          include: {
            executedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            testRunCase: {
              select: {
                id: true,
                testRunId: true,
                testCaseVersion: {
                  select: {
                    testCaseId: true,
                    title: true,
                    testCase: {
                      select: {
                        id: true,
                        suiteId: true,
                        suite: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { executedAt: 'asc' },
        })
      : [];

    let passed = 0;
    let failed = 0;
    let blocked = 0;
    let skipped = 0;
    let notRun = 0;
    let manualExecutions = 0;
    let automatedExecutions = 0;
    let totalDurationMs = 0;
    let durationCount = 0;
    let retryCount = 0;

    const dailyMap = new Map<string, { passed: number; failed: number; blocked: number; skipped: number; total: number }>();
    const envMap = new Map<string, { environmentName: string; passed: number; failed: number; blocked: number; skipped: number; total: number }>();
    const suiteMap = new Map<string, { suiteId: string; suiteName: string; totalCases: number; passed: number; failed: number }>();
    const testerMap = new Map<string, { testerId: string; testerName: string; executionsCount: number; passedCount: number; failedCount: number }>();
    const caseHistoryMap = new Map<string, Array<{ status: ExecutionStatus; executedAt: Date; title: string }>>();

    for (const r of results) {
      const isAuto = runMap.get(r.testRunCase.testRunId)?.isAutomated ?? false;
      if (isAuto) automatedExecutions++;
      else manualExecutions++;

      if (r.attemptNumber > 1) retryCount++;
      if (r.durationMs && r.durationMs > 0) {
        totalDurationMs += r.durationMs;
        durationCount++;
      }

      switch (r.status) {
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

      // Daily trends
      const dayStr = r.executedAt.toISOString().slice(0, 10);
      if (!dailyMap.has(dayStr)) {
        dailyMap.set(dayStr, { passed: 0, failed: 0, blocked: 0, skipped: 0, total: 0 });
      }
      const dayData = dailyMap.get(dayStr)!;
      dayData.total++;
      if (r.status === ExecutionStatus.PASSED) dayData.passed++;
      else if (r.status === ExecutionStatus.FAILED) dayData.failed++;
      else if (r.status === ExecutionStatus.BLOCKED) dayData.blocked++;
      else if (r.status === ExecutionStatus.SKIPPED) dayData.skipped++;

      // Environment breakdown
      const env = runMap.get(r.testRunCase.testRunId)?.environment;
      const envKey = env?.id || 'none';
      const envName = env?.name || 'Default';
      if (!envMap.has(envKey)) {
        envMap.set(envKey, { environmentName: envName, passed: 0, failed: 0, blocked: 0, skipped: 0, total: 0 });
      }
      const envData = envMap.get(envKey)!;
      envData.total++;
      if (r.status === ExecutionStatus.PASSED) envData.passed++;
      else if (r.status === ExecutionStatus.FAILED) envData.failed++;
      else if (r.status === ExecutionStatus.BLOCKED) envData.blocked++;
      else if (r.status === ExecutionStatus.SKIPPED) envData.skipped++;

      // Suite performance
      const suite = r.testRunCase.testCaseVersion?.testCase?.suite;
      const suiteKey = suite?.id || 'unassigned';
      const suiteName = suite?.name || 'Default Suite';
      if (!suiteMap.has(suiteKey)) {
        suiteMap.set(suiteKey, { suiteId: suiteKey, suiteName, totalCases: 0, passed: 0, failed: 0 });
      }
      const sData = suiteMap.get(suiteKey)!;
      sData.totalCases++;
      if (r.status === ExecutionStatus.PASSED) sData.passed++;
      else if (r.status === ExecutionStatus.FAILED) sData.failed++;

      // Tester workload
      if (r.executedBy) {
        const tId = r.executedBy.id;
        const tName = `${r.executedBy.firstName} ${r.executedBy.lastName}`.trim() || r.executedBy.email;
        if (!testerMap.has(tId)) {
          testerMap.set(tId, { testerId: tId, testerName: tName, executionsCount: 0, passedCount: 0, failedCount: 0 });
        }
        const tData = testerMap.get(tId)!;
        tData.executionsCount++;
        if (r.status === ExecutionStatus.PASSED) tData.passedCount++;
        else if (r.status === ExecutionStatus.FAILED) tData.failedCount++;
      }

      // Case history for flakiness & repeated failures
      const caseId = r.testRunCase.testCaseVersion?.testCaseId || 'unknown';
      const caseTitle = r.testRunCase.testCaseVersion?.title || 'Unknown Test';
      if (!caseHistoryMap.has(caseId)) {
        caseHistoryMap.set(caseId, []);
      }
      caseHistoryMap.get(caseId)!.push({
        status: r.status as ExecutionStatus,
        executedAt: r.executedAt,
        title: caseTitle,
      });
    }

    const totalExecutions = results.length;
    const evaluated = passed + failed + blocked;
    const passRate = evaluated > 0 ? Math.round((passed / evaluated) * 1000) / 10 : 0;
    const failureRate = evaluated > 0 ? Math.round((failed / evaluated) * 1000) / 10 : 0;
    const avgDurationMs = durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0;

    // Daily trends array sorted by date
    const dailyTrends = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => {
        const evalCount = counts.passed + counts.failed + counts.blocked;
        return {
          date,
          passed: counts.passed,
          failed: counts.failed,
          blocked: counts.blocked,
          skipped: counts.skipped,
          total: counts.total,
          passRate: evalCount > 0 ? Math.round((counts.passed / evalCount) * 1000) / 10 : 0,
        };
      });

    // Environment breakdown array
    const environmentBreakdown = Array.from(envMap.entries()).map(([envId, data]) => {
      const evalCount = data.passed + data.failed + data.blocked;
      return {
        environmentId: envId !== 'none' ? envId : undefined,
        environmentName: data.environmentName,
        passed: data.passed,
        failed: data.failed,
        blocked: data.blocked,
        skipped: data.skipped,
        total: data.total,
        passRate: evalCount > 0 ? Math.round((data.passed / evalCount) * 1000) / 10 : 0,
      };
    });

    // Suite performance array
    const testSuitePerformance = Array.from(suiteMap.values()).map((s) => ({
      suiteId: s.suiteId,
      suiteName: s.suiteName,
      totalCases: s.totalCases,
      passed: s.passed,
      failed: s.failed,
      passRate: s.totalCases > 0 ? Math.round((s.passed / s.totalCases) * 1000) / 10 : 0,
    }));

    // Flaky test candidates & repeated failures
    const flakyTestCandidates: Array<{
      testCaseId: string;
      testCaseTitle: string;
      totalAttempts: number;
      passedAttempts: number;
      failedAttempts: number;
      flakinessScore: number;
      lastFlakedAt?: string;
    }> = [];

    const repeatedFailures: Array<{
      testCaseId: string;
      testCaseTitle: string;
      consecutiveFailures: number;
      lastFailedAt: string;
    }> = [];

    for (const [caseId, history] of caseHistoryMap.entries()) {
      if (history.length >= 2) {
        let flips = 0;
        let passedAttempts = 0;
        let failedAttempts = 0;
        let lastFlakedAt: Date | undefined;

        for (let i = 0; i < history.length; i++) {
          if (history[i].status === ExecutionStatus.PASSED) passedAttempts++;
          if (history[i].status === ExecutionStatus.FAILED) failedAttempts++;

          if (i > 0) {
            const prev = history[i - 1].status;
            const curr = history[i].status;
            if (
              (prev === ExecutionStatus.PASSED && curr === ExecutionStatus.FAILED) ||
              (prev === ExecutionStatus.FAILED && curr === ExecutionStatus.PASSED)
            ) {
              flips++;
              lastFlakedAt = history[i].executedAt;
            }
          }
        }

        if (flips > 0 && passedAttempts > 0 && failedAttempts > 0) {
          const flakinessScore = Math.round((flips / (history.length - 1)) * 1000) / 10;
          flakyTestCandidates.push({
            testCaseId: caseId,
            testCaseTitle: history[0].title,
            totalAttempts: history.length,
            passedAttempts,
            failedAttempts,
            flakinessScore,
            lastFlakedAt: lastFlakedAt ? lastFlakedAt.toISOString() : undefined,
          });
        }
      }

      // Check consecutive failures (reverse order from most recent)
      let consecutive = 0;
      let lastFailedAt: string | undefined;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].status === ExecutionStatus.FAILED) {
          consecutive++;
          if (!lastFailedAt) {
            lastFailedAt = history[i].executedAt.toISOString();
          }
        } else {
          break;
        }
      }

      if (consecutive >= 2 && lastFailedAt) {
        repeatedFailures.push({
          testCaseId: caseId,
          testCaseTitle: history[0].title,
          consecutiveFailures: consecutive,
          lastFailedAt,
        });
      }
    }

    flakyTestCandidates.sort((a, b) => b.flakinessScore - a.flakinessScore);
    repeatedFailures.sort((a, b) => b.consecutiveFailures - a.consecutiveFailures);

    return {
      summary: {
        totalExecutions,
        passed,
        failed,
        blocked,
        skipped,
        notRun,
        passRate,
        failureRate,
        avgDurationMs,
        manualExecutions,
        automatedExecutions,
        retryCount,
      },
      dailyTrends,
      environmentBreakdown,
      testSuitePerformance,
      flakyTestCandidates,
      repeatedFailures,
      testerWorkload: Array.from(testerMap.values()),
    };
  }
}
