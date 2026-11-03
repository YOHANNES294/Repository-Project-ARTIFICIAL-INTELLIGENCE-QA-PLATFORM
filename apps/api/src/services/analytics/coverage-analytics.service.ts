import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../errors.js';
import { CoverageAnalyticsDto } from '@ai-qa/shared-types';

export class CoverageAnalyticsService {
  static async getCoverageAnalytics(
    projectId: string,
    filters: {
      milestoneId?: string;
    } = {}
  ): Promise<CoverageAnalyticsDto> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // 1. Fetch test cases with suite, versions, and automation mapping
    const caseWhere: any = { projectId, isArchived: false };
    if (filters.milestoneId) caseWhere.milestoneId = filters.milestoneId;

    const testCases = await prisma.testCase.findMany({
      where: caseWhere,
      include: {
        suite: { select: { id: true, name: true } },
        automationMappings: { select: { id: true } },
        milestone: { select: { id: true, name: true } },
        versions: {
          select: {
            runCases: { select: { id: true, status: true } },
          },
        },
      },
    });

    let draftCases = 0;
    let activeCases = 0;
    let deprecatedCases = 0;
    let linkedToRequirements = 0;
    let automatedCases = 0;
    let executedCases = 0;

    const suiteCoverageMap = new Map<
      string,
      { suiteId: string; suiteName: string; totalCases: number; executedCases: number; automatedCases: number }
    >();

    for (const tc of testCases) {
      if (tc.status === 'DRAFT') draftCases++;
      else if (tc.status === 'ACTIVE') activeCases++;
      else if (tc.status === 'DEPRECATED') deprecatedCases++;

      if (tc.requirementRef && tc.requirementRef.trim().length > 0) {
        linkedToRequirements++;
      }

      const isAutomated = tc.automationMappings.length > 0;
      if (isAutomated) automatedCases++;

      // Check if test case has ever been executed with non-NOT_RUN status
      const hasExecuted = tc.versions.some((v) =>
        v.runCases.some((rc) => rc.status !== 'NOT_RUN' && rc.status !== 'RETEST')
      );
      if (hasExecuted) executedCases++;

      // Suite coverage aggregation
      const suiteId = tc.suiteId || 'unassigned';
      const suiteName = tc.suite?.name || 'Default / Root';
      if (!suiteCoverageMap.has(suiteId)) {
        suiteCoverageMap.set(suiteId, {
          suiteId,
          suiteName,
          totalCases: 0,
          executedCases: 0,
          automatedCases: 0,
        });
      }
      const sData = suiteCoverageMap.get(suiteId)!;
      sData.totalCases++;
      if (hasExecuted) sData.executedCases++;
      if (isAutomated) sData.automatedCases++;
    }

    const totalCases = testCases.length;
    const totalEligibleCases = activeCases;
    const unexecutedCases = Math.max(0, totalEligibleCases - executedCases);
    const executionCoverageRate = totalEligibleCases > 0 ? Math.round((executedCases / totalEligibleCases) * 1000) / 10 : 0;
    const automationCoverageRate = totalEligibleCases > 0 ? Math.round((automatedCases / totalEligibleCases) * 1000) / 10 : 0;
    const unlinkedCases = Math.max(0, totalCases - linkedToRequirements);
    const requirementCoverageRate = totalCases > 0 ? Math.round((linkedToRequirements / totalCases) * 1000) / 10 : 0;

    // Milestone coverage aggregation
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        testCases: { select: { id: true } },
      },
    });

    const milestoneCoverage = milestones.map((m) => {
      const caseIds = new Set(m.testCases.map((tc) => tc.id));
      let mTotal = 0;
      let mExecuted = 0;
      for (const tc of testCases) {
        if (caseIds.has(tc.id)) {
          mTotal++;
          if (tc.versions.some((v) => v.runCases.some((rc) => rc.status !== 'NOT_RUN' && rc.status !== 'RETEST'))) {
            mExecuted++;
          }
        }
      }
      return {
        milestoneId: m.id,
        milestoneName: m.name,
        totalCases: mTotal,
        executedCases: mExecuted,
        coverageRate: mTotal > 0 ? Math.round((mExecuted / mTotal) * 1000) / 10 : 0,
      };
    });

    const suiteCoverage = Array.from(suiteCoverageMap.values()).map((s) => ({
      suiteId: s.suiteId,
      suiteName: s.suiteName,
      totalCases: s.totalCases,
      executedCases: s.executedCases,
      automatedCases: s.automatedCases,
      coverageRate: s.totalCases > 0 ? Math.round((s.executedCases / s.totalCases) * 1000) / 10 : 0,
    }));

    return {
      existenceCoverage: {
        totalCases,
        activeCases,
        draftCases,
        deprecatedCases,
      },
      executionCoverage: {
        totalEligibleCases,
        executedCases,
        unexecutedCases,
        executionCoverageRate,
      },
      requirementCoverage: {
        totalCases,
        linkedToRequirements,
        unlinkedCases,
        requirementCoverageRate,
        isAvailable: linkedToRequirements > 0,
        notes: linkedToRequirements === 0 ? 'No requirement references defined on active test cases.' : undefined,
      },
      automationCoverage: {
        totalActiveCases: activeCases,
        automatedCases,
        manualCases: Math.max(0, activeCases - automatedCases),
        automationCoverageRate,
      },
      suiteCoverage,
      milestoneCoverage,
    };
  }
}
