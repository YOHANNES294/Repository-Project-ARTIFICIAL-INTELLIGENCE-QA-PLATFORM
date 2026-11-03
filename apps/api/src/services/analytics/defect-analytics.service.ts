import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../errors.js';
import { DetailedDefectAnalyticsDto } from '@ai-qa/shared-types';

export class DefectAnalyticsService {
  static async getDefectAnalytics(
    projectId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      environmentId?: string;
      milestoneId?: string;
      component?: string;
    } = {}
  ): Promise<DetailedDefectAnalyticsDto> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const now = new Date();
    const end = filters.endDate ? new Date(filters.endDate) : now;
    const start = filters.startDate ? new Date(filters.startDate) : new Date(end.getTime() - 60 * 24 * 60 * 60 * 1000);

    const where: any = {
      projectId,
      createdAt: { gte: start, lte: end },
    };
    if (filters.environmentId) where.environmentId = filters.environmentId;
    if (filters.milestoneId) where.milestoneId = filters.milestoneId;
    if (filters.component) where.component = filters.component;

    const defects = await prisma.defect.findMany({
      where,
      include: {
        environment: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        testLinks: { select: { id: true, testCaseId: true, testResultId: true } },
        history: {
          where: { field: 'status', newValue: 'REOPENED' },
          select: { id: true },
        },
      },
    });

    let totalCreated = defects.length;
    let totalResolved = 0;
    let openCount = 0;
    let closedCount = 0;
    let totalResolutionHours = 0;
    let resolvedWithDuration = 0;
    let reopenedCount = 0;
    let criticalCount = 0;
    let highCount = 0;

    const severityMap = new Map<string, number>();
    const priorityMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    const componentMap = new Map<string, { total: number; open: number; closed: number }>();
    const envMap = new Map<string, { environmentName: string; total: number; open: number }>();
    const milestoneMap = new Map<string, { milestoneName: string; total: number; open: number }>();

    let ageLt3 = 0;
    let age3to7 = 0;
    let age8to14 = 0;
    let age15to30 = 0;
    let ageGt30 = 0;

    let linkedToExecutions = 0;
    let linkedToCases = 0;
    let linkedDefectsCount = 0;

    for (const d of defects) {
      const isOpen = d.status !== 'CLOSED' && d.status !== 'REJECTED';
      const isClosed = d.status === 'CLOSED';
      const isResolved = d.status === 'CLOSED' || d.status === 'FIXED' || d.status === 'VERIFIED';

      if (isOpen) openCount++;
      if (isClosed) closedCount++;
      if (isResolved) totalResolved++;

      if (d.severity === 'CRITICAL') criticalCount++;
      else if (d.severity === 'HIGH' || d.severity === 'MAJOR') highCount++;

      // Reopened check
      if (d.status === 'REOPENED' || d.history.length > 0) {
        reopenedCount++;
      }

      // Resolution time
      if (d.closedAt && d.createdAt) {
        const diffMs = d.closedAt.getTime() - d.createdAt.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        totalResolutionHours += diffHours;
        resolvedWithDuration++;
      }

      // Severity distribution
      severityMap.set(d.severity, (severityMap.get(d.severity) || 0) + 1);

      // Priority distribution
      priorityMap.set(d.priority, (priorityMap.get(d.priority) || 0) + 1);

      // Status breakdown
      statusMap.set(d.status, (statusMap.get(d.status) || 0) + 1);

      // Component breakdown
      const comp = d.component || 'Unassigned';
      if (!componentMap.has(comp)) {
        componentMap.set(comp, { total: 0, open: 0, closed: 0 });
      }
      const compData = componentMap.get(comp)!;
      compData.total++;
      if (isOpen) compData.open++;
      if (isClosed) compData.closed++;

      // Environment breakdown
      const envName = d.environment?.name || 'Default';
      if (!envMap.has(envName)) {
        envMap.set(envName, { environmentName: envName, total: 0, open: 0 });
      }
      const envData = envMap.get(envName)!;
      envData.total++;
      if (isOpen) envData.open++;

      // Milestone breakdown
      const mName = d.milestone?.name || 'General';
      if (!milestoneMap.has(mName)) {
        milestoneMap.set(mName, { milestoneName: mName, total: 0, open: 0 });
      }
      const mData = milestoneMap.get(mName)!;
      mData.total++;
      if (isOpen) mData.open++;

      // Aging (for currently open defects)
      if (isOpen) {
        const ageDays = (now.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays < 3) ageLt3++;
        else if (ageDays <= 7) age3to7++;
        else if (ageDays <= 14) age8to14++;
        else if (ageDays <= 30) age15to30++;
        else ageGt30++;
      }

      // Test traceability
      const hasExecutionLink = d.testLinks.some((tl: any) => tl.testResultId !== null);
      const hasCaseLink = d.testLinks.some((tl: any) => tl.testCaseId !== null);
      if (hasExecutionLink) linkedToExecutions++;
      if (hasCaseLink) linkedToCases++;
      if (hasExecutionLink || hasCaseLink) linkedDefectsCount++;
    }

    const avgResolutionHours = resolvedWithDuration > 0 ? Math.round((totalResolutionHours / resolvedWithDuration) * 10) / 10 : 0;
    const reopenRate = totalResolved > 0 ? Math.round((reopenedCount / totalResolved) * 1000) / 10 : 0;

    const severityDistribution = Array.from(severityMap.entries()).map(([severity, count]) => ({
      severity,
      count,
      percentage: totalCreated > 0 ? Math.round((count / totalCreated) * 1000) / 10 : 0,
    }));

    const priorityDistribution = Array.from(priorityMap.entries()).map(([priority, count]) => ({
      priority,
      count,
      percentage: totalCreated > 0 ? Math.round((count / totalCreated) * 1000) / 10 : 0,
    }));

    const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    const defectsByComponent = Array.from(componentMap.entries()).map(([component, data]) => ({
      component,
      total: data.total,
      open: data.open,
      closed: data.closed,
    }));

    const defectsByEnvironment = Array.from(envMap.values());
    const defectsByMilestone = Array.from(milestoneMap.values());

    const defectAging = [
      { ageBucket: '< 3 days', count: ageLt3 },
      { ageBucket: '3-7 days', count: age3to7 },
      { ageBucket: '8-14 days', count: age8to14 },
      { ageBucket: '15-30 days', count: age15to30 },
      { ageBucket: '> 30 days', count: ageGt30 },
    ];

    const standaloneDefects = Math.max(0, totalCreated - linkedDefectsCount);
    const testTraceabilityRate = totalCreated > 0 ? Math.round((linkedDefectsCount / totalCreated) * 1000) / 10 : 0;

    return {
      summary: {
        totalCreated,
        totalResolved,
        openCount,
        closedCount,
        avgResolutionHours,
        reopenRate,
        criticalCount,
        highCount,
      },
      severityDistribution,
      priorityDistribution,
      statusBreakdown,
      defectsByComponent,
      defectsByEnvironment,
      defectsByMilestone,
      defectAging,
      traceability: {
        totalDefects: totalCreated,
        linkedToTestExecutions: linkedToExecutions,
        linkedToTestCases: linkedToCases,
        standaloneDefects,
        testTraceabilityRate,
      },
    };
  }
}
