import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../errors.js';
import { ExecutionStatus, ExecutiveDashboardMetricsDto } from '@ai-qa/shared-types';

export class ExecutiveAnalyticsService {
  static async getExecutiveMetrics(
    projectId: string,
    organizationId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      environmentId?: string;
      milestoneId?: string;
    } = {}
  ): Promise<ExecutiveDashboardMetricsDto> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, name: true, key: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found or tenant access denied');
    }

    // Parse date window
    const now = new Date();
    const end = filters.endDate ? new Date(filters.endDate) : now;
    const start = filters.startDate ? new Date(filters.startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const windowDurationMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - windowDurationMs);
    const prevEnd = start;

    // 1. Projects stats for organization
    const orgProjects = await prisma.project.findMany({
      where: { organizationId, isArchived: false },
      select: { id: true, status: true },
    });
    const totalProjects = orgProjects.length;
    const activeProjects = orgProjects.filter((p) => p.status === 'ACTIVE').length;

    // 2. Test Cases stats
    const testCases = await prisma.testCase.findMany({
      where: { projectId, isArchived: false },
      select: { id: true, status: true, requirementRef: true },
    });
    const totalTestCases = testCases.length;
    const activeTestCases = testCases.filter((tc) => tc.status === 'ACTIVE').length;

    // 3. Test Executions in window
    const runWhere: any = {
      projectId,
      createdAt: { gte: start, lte: end },
    };
    if (filters.environmentId) runWhere.environmentId = filters.environmentId;
    if (filters.milestoneId) runWhere.milestoneId = filters.milestoneId;

    const testRuns = await prisma.testRun.findMany({
      where: runWhere,
      select: { id: true, isAutomated: true },
    });
    const runIds = testRuns.map((r) => r.id);

    // Fetch test results in window
    const results = runIds.length > 0
      ? await prisma.testResult.findMany({
          where: {
            testRunCase: { testRunId: { in: runIds } },
            executedAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            status: true,
            attemptNumber: true,
            testRunCase: {
              select: {
                testCaseVersion: { select: { testCaseId: true } },
                testRun: { select: { isAutomated: true } },
              },
            },
          },
        })
      : [];

    let passedTests = 0;
    let failedTests = 0;
    let blockedTests = 0;
    let skippedTests = 0;
    let autoPassed = 0;
    let autoTotal = 0;
    const executedTestCaseIds = new Set<string>();

    for (const r of results) {
      const tcId = r.testRunCase?.testCaseVersion?.testCaseId;
      if (tcId) {
        executedTestCaseIds.add(tcId);
      }
      const isAuto = r.testRunCase?.testRun?.isAutomated ?? false;

      switch (r.status) {
        case ExecutionStatus.PASSED:
          passedTests++;
          if (isAuto) autoPassed++;
          break;
        case ExecutionStatus.FAILED:
          failedTests++;
          break;
        case ExecutionStatus.BLOCKED:
          blockedTests++;
          break;
        case ExecutionStatus.SKIPPED:
          skippedTests++;
          break;
        default:
          break;
      }
      if (isAuto) autoTotal++;
    }

    const totalExecutions = results.length;
    const evaluatedExecutions = passedTests + failedTests + blockedTests;
    const passRate = evaluatedExecutions > 0 ? Math.round((passedTests / evaluatedExecutions) * 1000) / 10 : 0;
    const failureRate = evaluatedExecutions > 0 ? Math.round((failedTests / evaluatedExecutions) * 1000) / 10 : 0;
    const automationPassRate = autoTotal > 0 ? Math.round((autoPassed / autoTotal) * 1000) / 10 : 0;

    // Test coverage percentage: active cases that have been executed or linked to requirements
    let coveredCasesCount = 0;
    for (const tc of testCases) {
      if (tc.status === 'ACTIVE') {
        if (executedTestCaseIds.has(tc.id) || (tc.requirementRef && tc.requirementRef.trim().length > 0)) {
          coveredCasesCount++;
        }
      }
    }
    const testCoveragePercentage = activeTestCases > 0 ? Math.round((coveredCasesCount / activeTestCases) * 1000) / 10 : 0;

    // 4. Defects in project
    const defectWhere: any = { projectId };
    if (filters.environmentId) defectWhere.environmentId = filters.environmentId;
    if (filters.milestoneId) defectWhere.milestoneId = filters.milestoneId;

    const defects = await prisma.defect.findMany({
      where: defectWhere,
      select: { id: true, status: true, severity: true, createdAt: true, closedAt: true },
    });

    const openDefectsList = defects.filter((d) => d.status !== 'CLOSED' && d.status !== 'REJECTED');
    const openDefects = openDefectsList.length;
    const criticalDefects = openDefectsList.filter((d) => d.severity === 'CRITICAL').length;
    const highDefects = openDefectsList.filter((d) => d.severity === 'HIGH' || d.severity === 'MAJOR').length;
    const resolvedDefects = defects.filter((d) => d.status === 'CLOSED' || d.status === 'FIXED' || d.status === 'VERIFIED').length;
    const defectResolutionRate = defects.length > 0 ? Math.round((resolvedDefects / defects.length) * 1000) / 10 : 0;

    // 5. Milestones in project
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      select: { id: true, status: true },
    });
    const activeMilestones = milestones.filter((m) => m.status === 'PLANNED' || m.status === 'IN_PROGRESS').length;
    const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED').length;

    // 6. Release readiness calculation
    let readinessScore = 100;
    if (passRate < 95) readinessScore -= Math.min(40, (95 - passRate) * 2);
    if (criticalDefects > 0) readinessScore -= criticalDefects * 25;
    if (highDefects > 0) readinessScore -= highDefects * 10;
    if (blockedTests > 0) readinessScore -= blockedTests * 15;
    if (testCoveragePercentage < 80) readinessScore -= Math.min(20, (80 - testCoveragePercentage));
    readinessScore = Math.max(0, Math.min(100, Math.round(readinessScore)));

    let releaseReadinessStatus: 'READY' | 'WARNING' | 'NOT_READY' = 'READY';
    if (criticalDefects > 0 || blockedTests > 0 || readinessScore < 70) {
      releaseReadinessStatus = 'NOT_READY';
    } else if (highDefects > 2 || passRate < 90 || readinessScore < 85) {
      releaseReadinessStatus = 'WARNING';
    }

    // 7. Previous period trends
    const prevRunWhere: any = {
      projectId,
      createdAt: { gte: prevStart, lte: prevEnd },
    };
    if (filters.environmentId) prevRunWhere.environmentId = filters.environmentId;
    if (filters.milestoneId) prevRunWhere.milestoneId = filters.milestoneId;

    const prevRuns = await prisma.testRun.findMany({
      where: prevRunWhere,
      select: { id: true },
    });
    const prevRunIds = prevRuns.map((r) => r.id);

    const prevResults = prevRunIds.length > 0
      ? await prisma.testResult.findMany({
          where: {
            testRunCase: { testRunId: { in: prevRunIds } },
            executedAt: { gte: prevStart, lte: prevEnd },
          },
          select: { status: true },
        })
      : [];

    let prevPassed = 0;
    let prevEvaluated = 0;
    for (const pr of prevResults) {
      if (pr.status === ExecutionStatus.PASSED) {
        prevPassed++;
        prevEvaluated++;
      } else if (pr.status === ExecutionStatus.FAILED || pr.status === ExecutionStatus.BLOCKED) {
        prevEvaluated++;
      }
    }
    const prevPassRate = prevEvaluated > 0 ? (prevPassed / prevEvaluated) * 100 : 0;
    const passRateDelta = Math.round((passRate - prevPassRate) * 10) / 10;
    const executionVolumeDelta = totalExecutions - prevResults.length;

    const prevDefectsCreated = defects.filter(
      (d) => d.createdAt >= prevStart && d.createdAt <= prevEnd
    ).length;
    const currDefectsCreated = defects.filter(
      (d) => d.createdAt >= start && d.createdAt <= end
    ).length;
    const defectDelta = currDefectsCreated - prevDefectsCreated;

    return {
      totalProjects,
      activeProjects,
      totalTestCases,
      activeTestCases,
      testCoveragePercentage,
      totalExecutions,
      passedTests,
      failedTests,
      blockedTests,
      skippedTests,
      passRate,
      failureRate,
      openDefects,
      criticalDefects,
      highDefects,
      defectResolutionRate,
      automationExecutions: autoTotal,
      automationPassRate,
      activeMilestones,
      completedMilestones,
      releaseReadinessScore: readinessScore,
      releaseReadinessStatus,
      previousPeriodTrends: {
        passRateDelta,
        defectDelta,
        coverageDelta: 0,
        executionVolumeDelta,
      },
    };
  }
}
