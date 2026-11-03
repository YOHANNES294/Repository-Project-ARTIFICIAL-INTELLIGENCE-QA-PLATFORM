import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../errors.js';
import { MilestoneReleaseAnalyticsDto } from '@ai-qa/shared-types';

export class MilestoneReleaseAnalyticsService {
  static async getMilestoneReleaseAnalytics(
    projectId: string,
    milestoneId: string
  ): Promise<MilestoneReleaseAnalyticsDto> {
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
      include: {
        project: { select: { id: true, organizationId: true } },
        testRuns: {
          select: {
            id: true,
            status: true,
            cases: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        defects: {
          select: {
            id: true,
            status: true,
            severity: true,
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundError('Milestone not found');
    }

    // 1. Test Run Stats
    let totalRuns = milestone.testRuns.length;
    let completedRuns = 0;
    let totalCases = 0;
    let passedCases = 0;
    let failedCases = 0;
    let blockedCases = 0;

    for (const run of milestone.testRuns) {
      if (run.status === 'COMPLETED') completedRuns++;
      for (const rc of run.cases) {
        totalCases++;
        if (rc.status === 'PASSED') passedCases++;
        else if (rc.status === 'FAILED') failedCases++;
        else if (rc.status === 'BLOCKED') blockedCases++;
      }
    }

    const evaluatedCases = passedCases + failedCases + blockedCases;
    const passRate = evaluatedCases > 0 ? Math.round((passedCases / evaluatedCases) * 1000) / 10 : 0;
    const progressPercentage = totalCases > 0 ? Math.round((evaluatedCases / totalCases) * 1000) / 10 : 0;

    // 2. Defect Stats
    const totalDefects = milestone.defects.length;
    const openDefectsList = milestone.defects.filter((d) => d.status !== 'CLOSED' && d.status !== 'REJECTED');
    const openDefects = openDefectsList.length;
    const criticalDefects = openDefectsList.filter((d) => d.severity === 'CRITICAL').length;
    const highDefects = openDefectsList.filter((d) => d.severity === 'HIGH' || d.severity === 'MAJOR').length;
    const blockerDefects = criticalDefects; // Blocker defects equate to critical severity defects

    // 3. Load or Default ProjectQualityGate
    let qualityGate = await prisma.projectQualityGate.findFirst({
      where: { projectId, isDefault: true },
    });

    if (!qualityGate) {
      // Create default quality gate if none exists
      qualityGate = await prisma.projectQualityGate.create({
        data: {
          projectId,
          organizationId: milestone.project.organizationId,
          name: 'Default Quality Gate',
          description: 'Standard enterprise production release quality criteria',
          minTestPassRate: 90.0,
          maxCriticalDefects: 0,
          maxHighDefects: 2,
          minExecutionCoverage: 80.0,
          requireZeroBlockers: true,
          requireAllSuitesCompleted: false,
          isDefault: true,
        },
      });
    }

    // Evaluate Quality Gate Rules
    const rules: Array<{
      ruleKey: string;
      description: string;
      threshold: string | number | boolean;
      actual: string | number | boolean;
      passed: boolean;
    }> = [];

    // Rule 1: Pass Rate
    const passRatePassed = passRate >= qualityGate.minTestPassRate;
    rules.push({
      ruleKey: 'minTestPassRate',
      description: `Test pass rate must be at least ${qualityGate.minTestPassRate}%`,
      threshold: `${qualityGate.minTestPassRate}%`,
      actual: `${passRate}%`,
      passed: passRatePassed,
    });

    // Rule 2: Critical Defects
    const criticalPassed = criticalDefects <= qualityGate.maxCriticalDefects;
    rules.push({
      ruleKey: 'maxCriticalDefects',
      description: `Open critical defects must not exceed ${qualityGate.maxCriticalDefects}`,
      threshold: qualityGate.maxCriticalDefects,
      actual: criticalDefects,
      passed: criticalPassed,
    });

    // Rule 3: High Defects
    const highPassed = highDefects <= qualityGate.maxHighDefects;
    rules.push({
      ruleKey: 'maxHighDefects',
      description: `Open high/major defects must not exceed ${qualityGate.maxHighDefects}`,
      threshold: qualityGate.maxHighDefects,
      actual: highDefects,
      passed: highPassed,
    });

    // Rule 4: Execution Progress / Coverage
    const coveragePassed = progressPercentage >= qualityGate.minExecutionCoverage;
    rules.push({
      ruleKey: 'minExecutionCoverage',
      description: `Execution progress must be at least ${qualityGate.minExecutionCoverage}%`,
      threshold: `${qualityGate.minExecutionCoverage}%`,
      actual: `${progressPercentage}%`,
      passed: coveragePassed,
    });

    // Rule 5: Zero Blockers
    if (qualityGate.requireZeroBlockers) {
      const blockersPassed = blockedCases === 0;
      rules.push({
        ruleKey: 'requireZeroBlockers',
        description: 'Zero test cases in BLOCKED execution state',
        threshold: 0,
        actual: blockedCases,
        passed: blockersPassed,
      });
    }

    const allPassed = rules.every((r) => r.passed);

    let recommendation: 'READY_FOR_RELEASE' | 'WARNING_NEEDS_REVIEW' | 'BLOCKED_DO_NOT_RELEASE' = 'READY_FOR_RELEASE';
    if (!criticalPassed || blockedCases > 0 || passRate < 80) {
      recommendation = 'BLOCKED_DO_NOT_RELEASE';
    } else if (!allPassed) {
      recommendation = 'WARNING_NEEDS_REVIEW';
    }

    return {
      milestoneId: milestone.id,
      milestoneName: milestone.name,
      status: milestone.status,
      progressPercentage,
      testRunStats: {
        totalRuns,
        completedRuns,
        totalCases,
        passedCases,
        failedCases,
        blockedCases,
        passRate,
      },
      defectStats: {
        totalDefects,
        openDefects,
        criticalDefects,
        highDefects,
        blockerDefects,
      },
      qualityGateEvaluation: {
        passed: allPassed,
        qualityGateName: qualityGate.name,
        rules,
        recommendation,
        evaluatedAt: new Date().toISOString(),
      },
    };
  }
}
