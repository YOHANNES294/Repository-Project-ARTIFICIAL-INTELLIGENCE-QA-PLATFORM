import { Router, Request, Response, NextFunction } from 'express';
import {
  ExecutiveAnalyticsService,
  ExecutionAnalyticsService,
  CoverageAnalyticsService,
  DefectAnalyticsService,
  AutomationAnalyticsService,
  MilestoneReleaseAnalyticsService,
  AIAnalyticsService,
  CustomReportService,
  ExportService,
} from '../services/analytics/index.js';
import { analyticsService } from '../services/analytics.service.js';
import {
  createReportDefinitionSchema,
  updateReportDefinitionSchema,
  createReportSnapshotSchema,
  createReportScheduleSchema,
  createProjectQualityGateSchema,
  updateProjectQualityGateSchema,
  exportReportSchema,
} from '@ai-qa/validation';
import { ApiResponse, ExportFormat } from '@ai-qa/shared-types';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

export const analyticsRouter: Router = Router({ mergeParams: true });

// Require authentication for all analytics routes
analyticsRouter.use(authenticate);

async function resolveOrgId(req: Request, projectId: string): Promise<string> {
  if (req.organizationId) return req.organizationId;
  if (req.membership?.organizationId) return req.membership.organizationId;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });
  return project?.organizationId || '';
}

// ----------------------------------------------------
// 1. EXECUTIVE METRICS
// ----------------------------------------------------
analyticsRouter.get('/executive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const { startDate, endDate, environmentId, milestoneId } = req.query;

    const data = await ExecutiveAnalyticsService.getExecutiveMetrics(projectId, organizationId, {
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      environmentId: environmentId ? String(environmentId) : undefined,
      milestoneId: milestoneId ? String(milestoneId) : undefined,
    });

    const response: ApiResponse = { success: true, data };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Legacy backward-compatibility endpoint
analyticsRouter.get('/execution-analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { testRunId, testPlanId, milestoneId, environmentId } = req.query;

    const data = await analyticsService.getExecutionAnalytics(projectId, {
      testRunId: testRunId ? String(testRunId) : undefined,
      testPlanId: testPlanId ? String(testPlanId) : undefined,
      milestoneId: milestoneId ? String(milestoneId) : undefined,
      environmentId: environmentId ? String(environmentId) : undefined,
    });

    const response: ApiResponse = { success: true, data };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 2. DETAILED TEST EXECUTION ANALYTICS
// ----------------------------------------------------
analyticsRouter.get('/executions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { startDate, endDate, environmentId, milestoneId } = req.query;

    const data = await ExecutionAnalyticsService.getDetailedExecutionAnalytics(projectId, {
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      environmentId: environmentId ? String(environmentId) : undefined,
      milestoneId: milestoneId ? String(milestoneId) : undefined,
    });

    const response: ApiResponse = { success: true, data };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 3. TEST COVERAGE ANALYTICS
// ----------------------------------------------------
analyticsRouter.get('/coverage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { milestoneId } = req.query;

    const data = await CoverageAnalyticsService.getCoverageAnalytics(projectId, {
      milestoneId: milestoneId ? String(milestoneId) : undefined,
    });

    const response: ApiResponse = { success: true, data };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 4. DEFECT ANALYTICS
// ----------------------------------------------------
analyticsRouter.get('/defects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { startDate, endDate, environmentId, milestoneId, component } = req.query;

    const data = await DefectAnalyticsService.getDefectAnalytics(projectId, {
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      environmentId: environmentId ? String(environmentId) : undefined,
      milestoneId: milestoneId ? String(milestoneId) : undefined,
      component: component ? String(component) : undefined,
    });

    const response: ApiResponse = { success: true, data };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 5. AUTOMATION ANALYTICS
// ----------------------------------------------------
analyticsRouter.get('/automation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { startDate, endDate, framework, ciProvider } = req.query;

    const data = await AutomationAnalyticsService.getAutomationAnalytics(projectId, {
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      framework: framework ? String(framework) : undefined,
      ciProvider: ciProvider ? String(ciProvider) : undefined,
    });

    const response: ApiResponse = { success: true, data };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 6. MILESTONE RELEASE ANALYTICS & QUALITY GATES
// ----------------------------------------------------
analyticsRouter.get('/milestones/:milestoneId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const milestoneId = req.params.milestoneId as string;

    const data = await MilestoneReleaseAnalyticsService.getMilestoneReleaseAnalytics(projectId, milestoneId);

    const response: ApiResponse = { success: true, data };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 7. AI INTELLIGENCE ANALYTICS
// ----------------------------------------------------
analyticsRouter.get('/ai', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const { startDate, endDate, provider } = req.query;

    const data = await AIAnalyticsService.getAIMetrics(projectId, organizationId, {
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      provider: provider ? String(provider) : undefined,
    });

    const response: ApiResponse = { success: true, data };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 8. PROJECT QUALITY GATES
// ----------------------------------------------------
analyticsRouter.get('/quality-gates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);

    const data = await CustomReportService.listQualityGates(projectId, organizationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post('/quality-gates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const validated = createProjectQualityGateSchema.parse(req.body);

    const data = await CustomReportService.createQualityGate(projectId, organizationId, validated);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.put('/quality-gates/:gateId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const gateId = req.params.gateId as string;
    const validated = updateProjectQualityGateSchema.parse(req.body);

    const data = await CustomReportService.updateQualityGate(gateId, projectId, organizationId, validated);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.delete('/quality-gates/:gateId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const gateId = req.params.gateId as string;

    await CustomReportService.deleteQualityGate(gateId, projectId, organizationId);
    res.status(200).json({ success: true, message: 'Quality gate deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 9. CUSTOM REPORT DEFINITIONS
// ----------------------------------------------------
analyticsRouter.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);

    const data = await CustomReportService.listDefinitions(projectId, organizationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const userId = req.user?.id as string;
    const validated = createReportDefinitionSchema.parse(req.body);

    const data = await CustomReportService.createDefinition(projectId, organizationId, userId, validated);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/reports/:reportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const reportId = req.params.reportId as string;

    const data = await CustomReportService.getDefinition(reportId, projectId, organizationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.put('/reports/:reportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const reportId = req.params.reportId as string;
    const validated = updateReportDefinitionSchema.parse(req.body);

    const data = await CustomReportService.updateDefinition(reportId, projectId, organizationId, validated);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.delete('/reports/:reportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const reportId = req.params.reportId as string;

    await CustomReportService.deleteDefinition(reportId, projectId, organizationId);
    res.status(200).json({ success: true, message: 'Report definition deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Dynamic Report Execution
analyticsRouter.post('/reports/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const { reportType, filters } = req.body;

    const data = await CustomReportService.runReport(projectId, organizationId, reportType || 'EXECUTIVE', filters || {});
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 10. REPORT SNAPSHOTS
// ----------------------------------------------------
analyticsRouter.get('/reports/snapshots/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);

    const data = await CustomReportService.listSnapshots(projectId, organizationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post('/reports/snapshots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const userId = req.user?.id as string;
    const validated = createReportSnapshotSchema.parse(req.body);

    const data = await CustomReportService.createSnapshot(projectId, organizationId, userId, validated);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/reports/snapshots/:snapshotId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const snapshotId = req.params.snapshotId as string;

    const data = await CustomReportService.getSnapshot(snapshotId, projectId, organizationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 11. REPORT SCHEDULES
// ----------------------------------------------------
analyticsRouter.get('/reports/schedules/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);

    const data = await CustomReportService.listSchedules(projectId, organizationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post('/reports/schedules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const userId = req.user?.id as string;
    const validated = createReportScheduleSchema.parse(req.body);

    const data = await CustomReportService.createSchedule(projectId, organizationId, userId, validated);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post('/reports/schedules/:scheduleId/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const scheduleId = req.params.scheduleId as string;

    const data = await CustomReportService.triggerScheduleRun(scheduleId, projectId, organizationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.delete('/reports/schedules/:scheduleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const scheduleId = req.params.scheduleId as string;

    await CustomReportService.deleteSchedule(scheduleId, projectId, organizationId);
    res.status(200).json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 12. EXPORT ENGINE (CSV, XLSX, PDF)
// ----------------------------------------------------
analyticsRouter.post('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const organizationId = await resolveOrgId(req, projectId);
    const userId = req.user?.id as string;
    const validated = exportReportSchema.parse(req.body);

    const format = validated.format.toUpperCase();

    // Log the export job
    await ExportService.createExportJob(
      projectId,
      organizationId,
      userId,
      validated.reportType,
      format,
      validated.filters,
      validated.name
    );

    if (format === ExportFormat.CSV) {
      const result = await ExportService.exportToCsv(
        projectId,
        organizationId,
        validated.reportType,
        validated.filters,
        validated.name
      );
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(200).send(result.content);
    } else if (format === ExportFormat.XLSX) {
      const result = await ExportService.exportToXlsx(
        projectId,
        organizationId,
        validated.reportType,
        validated.filters,
        validated.name
      );
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(200).send(result.buffer);
    } else if (format === ExportFormat.PDF) {
      const result = await ExportService.exportToPdf(
        projectId,
        organizationId,
        validated.reportType,
        validated.filters,
        validated.name
      );
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(200).send(result.buffer);
    } else {
      res.status(400).json({ success: false, message: 'Unsupported export format' });
    }
  } catch (error) {
    next(error);
  }
});
