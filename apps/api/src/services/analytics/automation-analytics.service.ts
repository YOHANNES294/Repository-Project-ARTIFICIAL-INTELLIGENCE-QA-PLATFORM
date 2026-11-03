import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../errors.js';
import { AutomationAnalyticsDto } from '@ai-qa/shared-types';

export class AutomationAnalyticsService {
  static async getAutomationAnalytics(
    projectId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      framework?: string;
      ciProvider?: string;
    } = {}
  ): Promise<AutomationAnalyticsDto> {
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

    const where: any = {
      projectId,
      createdAt: { gte: start, lte: end },
    };
    if (filters.framework) where.framework = filters.framework;
    if (filters.ciProvider) where.ciProvider = filters.ciProvider;

    const sessions = await prisma.automationSession.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const unmappedCount = await prisma.automationUnmappedTest.count({
      where: { projectId, status: 'PENDING' },
    });

    let totalTestsExecuted = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let totalDurationMs = 0;
    let sessionWithDuration = 0;

    const frameworkMap = new Map<string, { framework: string; executions: number; passed: number }>();
    const browserMap = new Map<string, { browser: string; executions: number; passed: number }>();
    const ciMap = new Map<string, { provider: string; sessionsCount: number; successfulSessions: number; failedSessions: number }>();
    const dateDurationMap = new Map<string, { totalDurationMs: number; count: number; totalTests: number }>();

    for (const s of sessions) {
      totalTestsExecuted += s.totalTests;
      passedTests += s.passedTests;
      failedTests += s.failedTests;
      skippedTests += s.skippedTests;

      if (s.durationMs > 0) {
        totalDurationMs += s.durationMs;
        sessionWithDuration++;
      }

      // Framework breakdown
      const fw = s.framework || 'GENERIC';
      if (!frameworkMap.has(fw)) {
        frameworkMap.set(fw, { framework: fw, executions: 0, passed: 0 });
      }
      const fwData = frameworkMap.get(fw)!;
      fwData.executions += s.totalTests;
      fwData.passed += s.passedTests;

      // Browser breakdown
      const browser = s.browser || 'Headless';
      if (!browserMap.has(browser)) {
        browserMap.set(browser, { browser, executions: 0, passed: 0 });
      }
      const bData = browserMap.get(browser)!;
      bData.executions += s.totalTests;
      bData.passed += s.passedTests;

      // CI Provider breakdown
      const ci = s.ciProvider || 'LOCAL';
      if (!ciMap.has(ci)) {
        ciMap.set(ci, { provider: ci, sessionsCount: 0, successfulSessions: 0, failedSessions: 0 });
      }
      const ciData = ciMap.get(ci)!;
      ciData.sessionsCount++;
      if (s.failedTests === 0 && s.passedTests > 0) {
        ciData.successfulSessions++;
      } else if (s.failedTests > 0) {
        ciData.failedSessions++;
      }

      // Duration trends
      const dayStr = s.createdAt.toISOString().slice(0, 10);
      if (!dateDurationMap.has(dayStr)) {
        dateDurationMap.set(dayStr, { totalDurationMs: 0, count: 0, totalTests: 0 });
      }
      const dayData = dateDurationMap.get(dayStr)!;
      dayData.totalDurationMs += s.durationMs;
      dayData.count++;
      dayData.totalTests += s.totalTests;
    }

    const evaluatedTests = passedTests + failedTests;
    const passRate = evaluatedTests > 0 ? Math.round((passedTests / evaluatedTests) * 1000) / 10 : 0;
    const avgDurationMs = sessionWithDuration > 0 ? Math.round(totalDurationMs / sessionWithDuration) : 0;

    const frameworkDistribution = Array.from(frameworkMap.values()).map((f) => ({
      framework: f.framework,
      executions: f.executions,
      passRate: f.executions > 0 ? Math.round((f.passed / f.executions) * 1000) / 10 : 0,
    }));

    const browserBreakdown = Array.from(browserMap.values()).map((b) => ({
      browser: b.browser,
      executions: b.executions,
      passRate: b.executions > 0 ? Math.round((b.passed / b.executions) * 1000) / 10 : 0,
    }));

    const ciProviderBreakdown = Array.from(ciMap.values());

    const durationTrends = Array.from(dateDurationMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        avgDurationMs: data.count > 0 ? Math.round(data.totalDurationMs / data.count) : 0,
        totalTests: data.totalTests,
      }));

    // Find automated tests with flakiness
    const automatedRuns = await prisma.testRun.findMany({
      where: { projectId, isAutomated: true },
      select: { id: true },
    });
    const autoRunIds = automatedRuns.map((r) => r.id);

    const autoResults = autoRunIds.length > 0
      ? await prisma.testResult.findMany({
          where: { testRunCase: { testRunId: { in: autoRunIds } } },
          include: {
            testRunCase: {
              select: {
                testCaseVersion: {
                  select: {
                    testCaseId: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: { executedAt: 'asc' },
        })
      : [];

    const caseResultMap = new Map<string, { title: string; results: string[] }>();
    for (const r of autoResults) {
      const cid = r.testRunCase.testCaseVersion.testCaseId;
      if (!caseResultMap.has(cid)) {
        caseResultMap.set(cid, { title: r.testRunCase.testCaseVersion.title, results: [] });
      }
      caseResultMap.get(cid)!.results.push(r.status);
    }

    const flakyAutomatedTests: Array<{
      externalId: string;
      externalTitle: string;
      framework: string;
      totalExecutions: number;
      flakinessScore: number;
      testCaseId?: string | null;
    }> = [];

    for (const [cid, data] of caseResultMap.entries()) {
      if (data.results.length >= 2) {
        let flips = 0;
        let hasPassed = false;
        let hasFailed = false;
        for (let i = 0; i < data.results.length; i++) {
          if (data.results[i] === 'PASSED') hasPassed = true;
          if (data.results[i] === 'FAILED') hasFailed = true;
          if (i > 0 && data.results[i] !== data.results[i - 1]) flips++;
        }
        if (hasPassed && hasFailed && flips > 0) {
          flakyAutomatedTests.push({
            externalId: `AUTO-${cid.slice(0, 8)}`,
            externalTitle: data.title,
            framework: 'PLAYWRIGHT',
            totalExecutions: data.results.length,
            flakinessScore: Math.round((flips / (data.results.length - 1)) * 1000) / 10,
            testCaseId: cid,
          });
        }
      }
    }

    return {
      summary: {
        totalSessions: sessions.length,
        totalTestsExecuted,
        passedTests,
        failedTests,
        skippedTests,
        passRate,
        avgDurationMs,
        unmappedCount,
      },
      frameworkDistribution,
      browserBreakdown,
      ciProviderBreakdown,
      flakyAutomatedTests,
      durationTrends,
    };
  }
}
