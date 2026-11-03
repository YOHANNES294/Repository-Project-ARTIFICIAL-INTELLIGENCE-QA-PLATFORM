import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../errors.js';
import {
  ReportType,
  CreateReportDefinitionInput,
  UpdateReportDefinitionInput,
  CreateReportSnapshotInput,
  CreateReportScheduleInput,
  CreateProjectQualityGateInput,
  UpdateProjectQualityGateInput,
} from '@ai-qa/shared-types';
import { ExecutiveAnalyticsService } from './executive-analytics.service.js';
import { ExecutionAnalyticsService } from './execution-analytics.service.js';
import { DefectAnalyticsService } from './defect-analytics.service.js';
import { CoverageAnalyticsService } from './coverage-analytics.service.js';
import { AutomationAnalyticsService } from './automation-analytics.service.js';
import { AIAnalyticsService } from './ai-analytics.service.js';

export class CustomReportService {
  // ----------------------------------------------------
  // REPORT DEFINITIONS
  // ----------------------------------------------------
  static async listDefinitions(projectId: string, organizationId: string) {
    return prisma.reportDefinition.findMany({
      where: {
        projectId,
        project: { organizationId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getDefinition(id: string, projectId: string, organizationId: string) {
    const report = await prisma.reportDefinition.findFirst({
      where: {
        id,
        projectId,
        project: { organizationId },
      },
      include: {
        snapshots: {
          orderBy: { generatedAt: 'desc' },
          take: 10,
        },
        schedules: true,
      },
    });

    if (!report) {
      throw new NotFoundError('Report definition not found');
    }

    return report;
  }

  static async createDefinition(
    projectId: string,
    organizationId: string,
    userId: string,
    input: CreateReportDefinitionInput
  ) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return prisma.reportDefinition.create({
      data: {
        projectId,
        name: input.name,
        description: input.description,
        type: input.type || ReportType.EXECUTIVE,
        metrics: input.metrics || [],
        dimensions: input.dimensions || [],
        filters: (input.filters || {}) as any,
        isTemplate: input.isTemplate || false,
        createdById: userId,
      },
    });
  }

  static async updateDefinition(
    id: string,
    projectId: string,
    organizationId: string,
    input: UpdateReportDefinitionInput
  ) {
    await this.getDefinition(id, projectId, organizationId);

    return prisma.reportDefinition.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        metrics: input.metrics !== undefined ? input.metrics : undefined,
        dimensions: input.dimensions !== undefined ? input.dimensions : undefined,
        filters: input.filters !== undefined ? (input.filters as any) : undefined,
      },
    });
  }

  static async deleteDefinition(id: string, projectId: string, organizationId: string) {
    await this.getDefinition(id, projectId, organizationId);
    await prisma.reportDefinition.delete({ where: { id } });
    return { success: true };
  }

  // ----------------------------------------------------
  // RUN REPORT (DYNAMIC EXECUTION)
  // ----------------------------------------------------
  static async runReport(
    projectId: string,
    organizationId: string,
    reportType: string,
    filters: Record<string, any> = {}
  ) {
    switch (reportType) {
      case ReportType.EXECUTIVE:
        return ExecutiveAnalyticsService.getExecutiveMetrics(projectId, organizationId, filters);

      case ReportType.TEST_EXECUTION:
        return ExecutionAnalyticsService.getDetailedExecutionAnalytics(projectId, filters);

      case ReportType.DEFECT_ANALYSIS:
        return DefectAnalyticsService.getDefectAnalytics(projectId, filters);

      case ReportType.TEST_COVERAGE:
        return CoverageAnalyticsService.getCoverageAnalytics(projectId, filters);

      case ReportType.AUTOMATION_PERFORMANCE:
        return AutomationAnalyticsService.getAutomationAnalytics(projectId, filters);

      case ReportType.AI_INTELLIGENCE:
        return AIAnalyticsService.getAIMetrics(projectId, organizationId, filters);

      default:
        return ExecutiveAnalyticsService.getExecutiveMetrics(projectId, organizationId, filters);
    }
  }

  // ----------------------------------------------------
  // REPORT SNAPSHOTS
  // ----------------------------------------------------
  static async createSnapshot(
    projectId: string,
    organizationId: string,
    userId: string,
    input: CreateReportSnapshotInput
  ) {
    const reportType = input.type || ReportType.EXECUTIVE;
    const reportData = await this.runReport(projectId, organizationId, reportType, {
      startDate: input.dateRangeStart,
      endDate: input.dateRangeEnd,
    });

    const snapshot = await prisma.reportSnapshot.create({
      data: {
        projectId,
        reportDefId: input.reportDefId || null,
        name: input.name || `${reportType} Snapshot - ${new Date().toISOString().slice(0, 10)}`,
        type: reportType,
        dateRangeStart: input.dateRangeStart ? new Date(input.dateRangeStart) : null,
        dateRangeEnd: input.dateRangeEnd ? new Date(input.dateRangeEnd) : null,
        data: reportData as any,
        summary: (reportData as any).summary || null,
        createdById: userId,
      },
    });

    return snapshot;
  }

  static async listSnapshots(projectId: string, organizationId: string) {
    return prisma.reportSnapshot.findMany({
      where: {
        projectId,
        project: { organizationId },
      },
      orderBy: { generatedAt: 'desc' },
      take: 50,
    });
  }

  static async getSnapshot(id: string, projectId: string, organizationId: string) {
    const snapshot = await prisma.reportSnapshot.findFirst({
      where: {
        id,
        projectId,
        project: { organizationId },
      },
    });

    if (!snapshot) {
      throw new NotFoundError('Report snapshot not found');
    }

    return snapshot;
  }

  // ----------------------------------------------------
  // REPORT SCHEDULES
  // ----------------------------------------------------
  static async listSchedules(projectId: string, organizationId: string) {
    return prisma.reportSchedule.findMany({
      where: {
        projectId,
        organizationId,
      },
      include: {
        reportDef: { select: { id: true, name: true, type: true } },
        deliveries: {
          orderBy: { deliveredAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createSchedule(
    projectId: string,
    organizationId: string,
    userId: string,
    input: CreateReportScheduleInput
  ) {
    const reportDef = await prisma.reportDefinition.findFirst({
      where: { id: input.reportDefId, projectId },
    });

    if (!reportDef) {
      throw new NotFoundError('Report definition not found');
    }

    return prisma.reportSchedule.create({
      data: {
        projectId,
        organizationId,
        reportDefId: input.reportDefId,
        name: input.name,
        frequency: input.frequency || 'WEEKLY',
        cronExpression: input.cronExpression || null,
        recipients: input.recipients,
        format: input.format || 'PDF',
        createdById: userId,
      },
    });
  }

  static async triggerScheduleRun(scheduleId: string, projectId: string, organizationId: string) {
    const schedule = await prisma.reportSchedule.findFirst({
      where: { id: scheduleId, projectId, organizationId },
      include: { reportDef: true },
    });

    if (!schedule) {
      throw new NotFoundError('Report schedule not found');
    }

    // Record delivery
    const delivery = await prisma.reportDelivery.create({
      data: {
        scheduleId: schedule.id,
        status: 'SUCCESS',
        recipients: schedule.recipients as any,
        format: schedule.format,
        fileUrl: `/api/v1/projects/${projectId}/analytics/reports/${schedule.reportDefId}/export?format=${schedule.format.toLowerCase()}`,
        deliveredAt: new Date(),
      },
    });

    await prisma.reportSchedule.update({
      where: { id: schedule.id },
      data: { lastRunAt: new Date() },
    });

    return delivery;
  }

  static async deleteSchedule(id: string, projectId: string, organizationId: string) {
    const schedule = await prisma.reportSchedule.findFirst({
      where: { id, projectId, organizationId },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    await prisma.reportSchedule.delete({ where: { id } });
    return { success: true };
  }

  // ----------------------------------------------------
  // PROJECT QUALITY GATES
  // ----------------------------------------------------
  static async listQualityGates(projectId: string, organizationId: string) {
    return prisma.projectQualityGate.findMany({
      where: { projectId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createQualityGate(
    projectId: string,
    organizationId: string,
    input: CreateProjectQualityGateInput
  ) {
    if (input.isDefault) {
      // Unset previous defaults
      await prisma.projectQualityGate.updateMany({
        where: { projectId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.projectQualityGate.create({
      data: {
        projectId,
        organizationId,
        name: input.name,
        description: input.description,
        minTestPassRate: input.minTestPassRate ?? 90.0,
        maxCriticalDefects: input.maxCriticalDefects ?? 0,
        maxHighDefects: input.maxHighDefects ?? 2,
        minExecutionCoverage: input.minExecutionCoverage ?? 80.0,
        requireAllSuitesCompleted: input.requireAllSuitesCompleted ?? false,
        requireZeroBlockers: input.requireZeroBlockers ?? true,
        isDefault: input.isDefault ?? true,
      },
    });
  }

  static async updateQualityGate(
    id: string,
    projectId: string,
    organizationId: string,
    input: UpdateProjectQualityGateInput
  ) {
    const gate = await prisma.projectQualityGate.findFirst({
      where: { id, projectId, organizationId },
    });

    if (!gate) {
      throw new NotFoundError('Quality gate not found');
    }

    if (input.isDefault) {
      await prisma.projectQualityGate.updateMany({
        where: { projectId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return prisma.projectQualityGate.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        minTestPassRate: input.minTestPassRate,
        maxCriticalDefects: input.maxCriticalDefects,
        maxHighDefects: input.maxHighDefects,
        minExecutionCoverage: input.minExecutionCoverage,
        requireAllSuitesCompleted: input.requireAllSuitesCompleted,
        requireZeroBlockers: input.requireZeroBlockers,
        isDefault: input.isDefault,
      },
    });
  }

  static async deleteQualityGate(id: string, projectId: string, organizationId: string) {
    const gate = await prisma.projectQualityGate.findFirst({
      where: { id, projectId, organizationId },
    });

    if (!gate) {
      throw new NotFoundError('Quality gate not found');
    }

    await prisma.projectQualityGate.delete({ where: { id } });
    return { success: true };
  }
}
