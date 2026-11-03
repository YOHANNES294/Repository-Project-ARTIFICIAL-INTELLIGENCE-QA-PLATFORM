import { prisma } from '../../prisma.js';
import { FormulaSanitizer } from './formula-sanitizer.js';
import { CustomReportService } from './custom-report.service.js';
import { ReportType } from '@ai-qa/shared-types';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

export class ExportService {
  /**
   * Generates CSV export content
   */
  static async exportToCsv(
    projectId: string,
    organizationId: string,
    reportType: string,
    filters: Record<string, any> = {},
    customTitle?: string
  ): Promise<{ filename: string; content: string; contentType: string }> {
    const data = await CustomReportService.runReport(projectId, organizationId, reportType, filters);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${reportType.toLowerCase()}_report_${timestamp}.csv`;

    const lines: string[] = [];
    // Header block
    lines.push(FormulaSanitizer.escapeCsvField(customTitle || `${reportType} Quality Report`));
    lines.push(`Generated: ${FormulaSanitizer.escapeCsvField(new Date().toISOString())}`);
    lines.push(`Project ID: ${FormulaSanitizer.escapeCsvField(projectId)}`);
    lines.push('');

    // Format depending on report type
    if (reportType === ReportType.EXECUTIVE) {
      const exec = data as any;
      lines.push('METRIC,VALUE');
      lines.push(`Total Test Cases,${FormulaSanitizer.escapeCsvField(exec.totalTestCases)}`);
      lines.push(`Active Test Cases,${FormulaSanitizer.escapeCsvField(exec.activeTestCases)}`);
      lines.push(`Test Coverage %,${FormulaSanitizer.escapeCsvField(`${exec.testCoveragePercentage}%`)}`);
      lines.push(`Total Executions,${FormulaSanitizer.escapeCsvField(exec.totalExecutions)}`);
      lines.push(`Passed Tests,${FormulaSanitizer.escapeCsvField(exec.passedTests)}`);
      lines.push(`Failed Tests,${FormulaSanitizer.escapeCsvField(exec.failedTests)}`);
      lines.push(`Blocked Tests,${FormulaSanitizer.escapeCsvField(exec.blockedTests)}`);
      lines.push(`Skipped Tests,${FormulaSanitizer.escapeCsvField(exec.skippedTests)}`);
      lines.push(`Pass Rate %,${FormulaSanitizer.escapeCsvField(`${exec.passRate}%`)}`);
      lines.push(`Failure Rate %,${FormulaSanitizer.escapeCsvField(`${exec.failureRate}%`)}`);
      lines.push(`Open Defects,${FormulaSanitizer.escapeCsvField(exec.openDefects)}`);
      lines.push(`Critical Defects,${FormulaSanitizer.escapeCsvField(exec.criticalDefects)}`);
      lines.push(`High Defects,${FormulaSanitizer.escapeCsvField(exec.highDefects)}`);
      lines.push(`Defect Resolution Rate %,${FormulaSanitizer.escapeCsvField(`${exec.defectResolutionRate}%`)}`);
      lines.push(`Automation Executions,${FormulaSanitizer.escapeCsvField(exec.automationExecutions)}`);
      lines.push(`Automation Pass Rate %,${FormulaSanitizer.escapeCsvField(`${exec.automationPassRate}%`)}`);
      lines.push(`Release Readiness Score,${FormulaSanitizer.escapeCsvField(`${exec.releaseReadinessScore}/100`)}`);
      lines.push(`Release Readiness Status,${FormulaSanitizer.escapeCsvField(exec.releaseReadinessStatus)}`);
    } else if (reportType === ReportType.TEST_EXECUTION) {
      const exec = data as any;
      lines.push('--- SUMMARY ---');
      lines.push(`Total Executions,${exec.summary.totalExecutions}`);
      lines.push(`Passed,${exec.summary.passed}`);
      lines.push(`Failed,${exec.summary.failed}`);
      lines.push(`Blocked,${exec.summary.blocked}`);
      lines.push(`Skipped,${exec.summary.skipped}`);
      lines.push(`Pass Rate %,${exec.summary.passRate}%`);
      lines.push(`Avg Duration (ms),${exec.summary.avgDurationMs}`);
      lines.push('');
      lines.push('--- DAILY TRENDS ---');
      lines.push('Date,Passed,Failed,Blocked,Skipped,Total,Pass Rate %');
      for (const d of exec.dailyTrends || []) {
        lines.push(`${FormulaSanitizer.escapeCsvField(d.date)},${d.passed},${d.failed},${d.blocked},${d.skipped},${d.total},${d.passRate}%`);
      }
      lines.push('');
      lines.push('--- ENVIRONMENT BREAKDOWN ---');
      lines.push('Environment,Passed,Failed,Blocked,Skipped,Total,Pass Rate %');
      for (const e of exec.environmentBreakdown || []) {
        lines.push(`${FormulaSanitizer.escapeCsvField(e.environmentName)},${e.passed},${e.failed},${e.blocked},${e.skipped},${e.total},${e.passRate}%`);
      }
    } else if (reportType === ReportType.DEFECT_ANALYSIS) {
      const def = data as any;
      lines.push('--- DEFECT SUMMARY ---');
      lines.push(`Total Created,${def.summary.totalCreated}`);
      lines.push(`Total Resolved,${def.summary.totalResolved}`);
      lines.push(`Open Defects,${def.summary.openCount}`);
      lines.push(`Closed Defects,${def.summary.closedCount}`);
      lines.push(`Critical Defects,${def.summary.criticalCount}`);
      lines.push(`High Defects,${def.summary.highCount}`);
      lines.push(`Avg Resolution (hours),${def.summary.avgResolutionHours}`);
      lines.push(`Reopen Rate %,${def.summary.reopenRate}%`);
      lines.push('');
      lines.push('--- SEVERITY DISTRIBUTION ---');
      lines.push('Severity,Count,Percentage %');
      for (const s of def.severityDistribution || []) {
        lines.push(`${FormulaSanitizer.escapeCsvField(s.severity)},${s.count},${s.percentage}%`);
      }
      lines.push('');
      lines.push('--- DEFECTS BY COMPONENT ---');
      lines.push('Component,Total,Open,Closed');
      for (const c of def.defectsByComponent || []) {
        lines.push(`${FormulaSanitizer.escapeCsvField(c.component)},${c.total},${c.open},${c.closed}`);
      }
    } else {
      // Generic JSON flattening
      lines.push('KEY,VALUE');
      const flattenObj = (obj: any, prefix = '') => {
        for (const [k, v] of Object.entries(obj)) {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            flattenObj(v, `${prefix}${k}.`);
          } else if (Array.isArray(v)) {
            lines.push(`${FormulaSanitizer.escapeCsvField(`${prefix}${k}`)},${FormulaSanitizer.escapeCsvField(`[${v.length} items]`)}`);
          } else {
            lines.push(`${FormulaSanitizer.escapeCsvField(`${prefix}${k}`)},${FormulaSanitizer.escapeCsvField(v)}`);
          }
        }
      };
      flattenObj(data);
    }

    return {
      filename,
      content: lines.join('\n'),
      contentType: 'text/csv; charset=utf-8',
    };
  }

  /**
   * Generates XLSX export buffer
   */
  static async exportToXlsx(
    projectId: string,
    organizationId: string,
    reportType: string,
    filters: Record<string, any> = {},
    customTitle?: string
  ): Promise<{ filename: string; buffer: Buffer; contentType: string }> {
    const data = await CustomReportService.runReport(projectId, organizationId, reportType, filters);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${reportType.toLowerCase()}_report_${timestamp}.xlsx`;

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryRows: any[][] = [
      [FormulaSanitizer.sanitizeCellValue(customTitle || `${reportType} Quality Report`)],
      ['Generated At', new Date().toISOString()],
      ['Project ID', projectId],
      [],
    ];

    if (reportType === ReportType.EXECUTIVE) {
      const exec = data as any;
      summaryRows.push(['Metric', 'Value']);
      summaryRows.push(['Total Test Cases', exec.totalTestCases]);
      summaryRows.push(['Active Test Cases', exec.activeTestCases]);
      summaryRows.push(['Test Coverage %', `${exec.testCoveragePercentage}%`]);
      summaryRows.push(['Total Executions', exec.totalExecutions]);
      summaryRows.push(['Passed Tests', exec.passedTests]);
      summaryRows.push(['Failed Tests', exec.failedTests]);
      summaryRows.push(['Blocked Tests', exec.blockedTests]);
      summaryRows.push(['Skipped Tests', exec.skippedTests]);
      summaryRows.push(['Pass Rate %', `${exec.passRate}%`]);
      summaryRows.push(['Failure Rate %', `${exec.failureRate}%`]);
      summaryRows.push(['Open Defects', exec.openDefects]);
      summaryRows.push(['Critical Defects', exec.criticalDefects]);
      summaryRows.push(['High Defects', exec.highDefects]);
      summaryRows.push(['Defect Resolution Rate %', `${exec.defectResolutionRate}%`]);
      summaryRows.push(['Release Readiness Score', `${exec.releaseReadinessScore}/100`]);
      summaryRows.push(['Release Readiness Status', exec.releaseReadinessStatus]);

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');
    } else if (reportType === ReportType.TEST_EXECUTION) {
      const exec = data as any;
      summaryRows.push(['Metric', 'Value']);
      summaryRows.push(['Total Executions', exec.summary.totalExecutions]);
      summaryRows.push(['Passed', exec.summary.passed]);
      summaryRows.push(['Failed', exec.summary.failed]);
      summaryRows.push(['Blocked', exec.summary.blocked]);
      summaryRows.push(['Skipped', exec.summary.skipped]);
      summaryRows.push(['Pass Rate %', `${exec.summary.passRate}%`]);
      summaryRows.push(['Avg Duration (ms)', exec.summary.avgDurationMs]);

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Daily Trends Sheet
      if (exec.dailyTrends && exec.dailyTrends.length > 0) {
        const dailyRows: any[][] = [['Date', 'Passed', 'Failed', 'Blocked', 'Skipped', 'Total', 'Pass Rate %']];
        for (const d of exec.dailyTrends) {
          dailyRows.push([d.date, d.passed, d.failed, d.blocked, d.skipped, d.total, `${d.passRate}%`]);
        }
        const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
        XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Trends');
      }

      // Environment Breakdown Sheet
      if (exec.environmentBreakdown && exec.environmentBreakdown.length > 0) {
        const envRows: any[][] = [['Environment', 'Passed', 'Failed', 'Blocked', 'Skipped', 'Total', 'Pass Rate %']];
        for (const e of exec.environmentBreakdown) {
          envRows.push([e.environmentName, e.passed, e.failed, e.blocked, e.skipped, e.total, `${e.passRate}%`]);
        }
        const wsEnv = XLSX.utils.aoa_to_sheet(envRows);
        XLSX.utils.book_append_sheet(wb, wsEnv, 'Environments');
      }
    } else if (reportType === ReportType.DEFECT_ANALYSIS) {
      const def = data as any;
      summaryRows.push(['Metric', 'Value']);
      summaryRows.push(['Total Created', def.summary.totalCreated]);
      summaryRows.push(['Total Resolved', def.summary.totalResolved]);
      summaryRows.push(['Open Defects', def.summary.openCount]);
      summaryRows.push(['Closed Defects', def.summary.closedCount]);
      summaryRows.push(['Critical Defects', def.summary.criticalCount]);
      summaryRows.push(['High Defects', def.summary.highCount]);
      summaryRows.push(['Avg Resolution (hours)', def.summary.avgResolutionHours]);
      summaryRows.push(['Reopen Rate %', `${def.summary.reopenRate}%`]);

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Defects Summary');

      if (def.severityDistribution && def.severityDistribution.length > 0) {
        const sevRows: any[][] = [['Severity', 'Count', 'Percentage %']];
        for (const s of def.severityDistribution) {
          sevRows.push([s.severity, s.count, `${s.percentage}%`]);
        }
        const wsSev = XLSX.utils.aoa_to_sheet(sevRows);
        XLSX.utils.book_append_sheet(wb, wsSev, 'Severity');
      }
    } else {
      summaryRows.push(['Data', JSON.stringify(data)]);
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Data');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return {
      filename,
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Generates PDF export stream buffer
   */
  static async exportToPdf(
    projectId: string,
    organizationId: string,
    reportType: string,
    filters: Record<string, any> = {},
    customTitle?: string
  ): Promise<{ filename: string; buffer: Buffer; contentType: string }> {
    const data = await CustomReportService.runReport(projectId, organizationId, reportType, filters);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${reportType.toLowerCase()}_report_${timestamp}.pdf`;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(buffers);
          resolve({
            filename,
            buffer,
            contentType: 'application/pdf',
          });
        });

        // 1. Header Banner
        doc.fillColor('#1E293B').fontSize(20).text('AI QA MANAGEMENT PLATFORM', { align: 'left' });
        doc.fontSize(12).fillColor('#64748B').text('ENTERPRISE QUALITY ASSURANCE REPORTING', { align: 'left' });
        doc.moveDown(0.5);

        // Divider
        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.8);

        // Report Title & Meta
        doc.fillColor('#0F172A').fontSize(16).text(customTitle || `${reportType.replace(/_/g, ' ')} REPORT`, { bold: true } as any);
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#64748B').text(`Generated: ${new Date().toUTCString()}  |  Project ID: ${projectId}`);
        doc.moveDown(1.5);

        // 2. Metrics Grid / Content
        if (reportType === ReportType.EXECUTIVE) {
          const exec = data as any;
          doc.fontSize(12).fillColor('#0F172A').text('EXECUTIVE QUALITY SCORECARD', { underline: true });
          doc.moveDown(0.5);

          const metrics = [
            ['Pass Rate', `${exec.passRate}%`],
            ['Release Readiness', exec.releaseReadinessStatus],
            ['Readiness Score', `${exec.releaseReadinessScore} / 100`],
            ['Total Executions', String(exec.totalExecutions)],
            ['Passed Tests', String(exec.passedTests)],
            ['Failed Tests', String(exec.failedTests)],
            ['Blocked Tests', String(exec.blockedTests)],
            ['Test Coverage', `${exec.testCoveragePercentage}%`],
            ['Open Defects', String(exec.openDefects)],
            ['Critical Defects', String(exec.criticalDefects)],
            ['High Severity Defects', String(exec.highDefects)],
            ['Defect Resolution Rate', `${exec.defectResolutionRate}%`],
          ];

          for (const [key, val] of metrics) {
            doc.fontSize(10).fillColor('#334155').text(`${key.padEnd(28, ' .')}: ${val}`);
          }
        } else if (reportType === ReportType.TEST_EXECUTION) {
          const exec = data as any;
          doc.fontSize(12).fillColor('#0F172A').text('EXECUTION SUMMARY', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#334155').text(`Total Executions: ${exec.summary.totalExecutions}`);
          doc.text(`Passed: ${exec.summary.passed}  |  Failed: ${exec.summary.failed}  |  Blocked: ${exec.summary.blocked}`);
          doc.text(`Pass Rate: ${exec.summary.passRate}%  |  Average Duration: ${exec.summary.avgDurationMs}ms`);
          doc.text(`Manual: ${exec.summary.manualExecutions}  |  Automated: ${exec.summary.automatedExecutions}  |  Retries: ${exec.summary.retryCount}`);

          if (exec.dailyTrends && exec.dailyTrends.length > 0) {
            doc.moveDown(1);
            doc.fontSize(11).fillColor('#0F172A').text('RECENT DAILY EXECUTION TRENDS', { underline: true });
            doc.moveDown(0.5);
            for (const d of exec.dailyTrends.slice(0, 10)) {
              doc.fontSize(9).fillColor('#334155').text(`${d.date}: ${d.total} runs (Passed: ${d.passed}, Failed: ${d.failed}, Pass Rate: ${d.passRate}%)`);
            }
          }
        } else if (reportType === ReportType.DEFECT_ANALYSIS) {
          const def = data as any;
          doc.fontSize(12).fillColor('#0F172A').text('DEFECT MANAGEMENT SUMMARY', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#334155').text(`Total Created: ${def.summary.totalCreated}  |  Total Resolved: ${def.summary.totalResolved}`);
          doc.text(`Open Defects: ${def.summary.openCount} (Critical: ${def.summary.criticalCount}, High: ${def.summary.highCount})`);
          doc.text(`Avg Resolution Time: ${def.summary.avgResolutionHours} hrs  |  Reopen Rate: ${def.summary.reopenRate}%`);

          if (def.severityDistribution && def.severityDistribution.length > 0) {
            doc.moveDown(1);
            doc.fontSize(11).fillColor('#0F172A').text('SEVERITY BREAKDOWN', { underline: true });
            doc.moveDown(0.5);
            for (const s of def.severityDistribution) {
              doc.fontSize(9).fillColor('#334155').text(`${s.severity}: ${s.count} (${s.percentage}%)`);
            }
          }
        } else {
          doc.fontSize(10).fillColor('#334155').text(JSON.stringify(data, null, 2));
        }

        // Footer
        doc.moveDown(2);
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(8).fillColor('#94A3B8').text('Confidential — Generated by AI QA Platform — Powered by Google Antigravity', { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Tracks and dispatches an export job
   */
  static async createExportJob(
    projectId: string,
    organizationId: string,
    userId: string,
    reportType: string,
    format: string,
    filters: Record<string, any> = {},
    name?: string
  ) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const extension = format.toLowerCase();
    const fileName = `${(name || reportType).toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${extension}`;

    const job = await prisma.reportExportJob.create({
      data: {
        projectId,
        organizationId,
        reportType,
        format: format.toUpperCase(),
        status: 'COMPLETED',
        parameters: filters,
        fileName,
        createdById: userId,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
      },
    });

    return job;
  }
}
