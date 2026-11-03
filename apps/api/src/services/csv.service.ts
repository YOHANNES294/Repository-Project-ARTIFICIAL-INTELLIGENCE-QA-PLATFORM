import { prisma } from '../prisma.js';
import { createAuditLog } from './audit.service.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { csvImportRowSchema, CsvBulkImportInput } from '@ai-qa/validation';
import {
  CsvImportPreviewResponse,
  CsvImportPreviewRow,
  TestPriority,
  TestType,
  TestCaseStatus,
} from '@ai-qa/shared-types';

export class CsvService {
  private async ensureProject(orgId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found in current organization');
    }

    return project;
  }

  /**
   * Helper to parse CSV text RFC 4180 compliant with multiline and quoted field support
   */
  private parseCsvRows(text: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentCell += '"';
            i++; // Skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if (char === '\r') {
          // Ignore carriage return
        } else if (char === '\n') {
          currentRow.push(currentCell.trim());
          if (currentRow.some((c) => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Spreadsheet Formula Injection Sanitization (CSV / Excel Injection Prevention)
   * Any cell starting with =, +, -, @, \t, or \r is prefixed with a single quote '
   */
  public sanitizeCsvFormula(value: string | null | undefined): string {
    if (!value) return '';
    const str = String(value);
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousChars.includes(str.charAt(0))) {
      return `'${str}`;
    }
    return str;
  }

  /**
   * Escape cell for CSV RFC 4180 export
   */
  public escapeCsvCell(value: string | null | undefined): string {
    const sanitized = this.sanitizeCsvFormula(value);
    if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n') || sanitized.includes('\r')) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  }

  async previewCsv(orgId: string, projectId: string, csvContent: string): Promise<CsvImportPreviewResponse> {
    await this.ensureProject(orgId, projectId);

    if (!csvContent || csvContent.trim().length === 0) {
      throw new ValidationError('CSV content cannot be empty');
    }

    const rawRows = this.parseCsvRows(csvContent);
    if (rawRows.length < 2) {
      throw new ValidationError('CSV must contain a header row and at least one data row');
    }

    const header = rawRows[0].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    const dataRows = rawRows.slice(1);

    // Map column indices
    const titleIdx = header.findIndex((h) => h === 'title' || h === 'name' || h === 'testcasetitle');
    const descIdx = header.findIndex((h) => h === 'description' || h === 'desc');
    const precondIdx = header.findIndex((h) => h === 'preconditions' || h === 'precondition');
    const objIdx = header.findIndex((h) => h === 'objectives' || h === 'objective');
    const priorityIdx = header.findIndex((h) => h === 'priority');
    const typeIdx = header.findIndex((h) => h === 'type' || h === 'testtype');
    const statusIdx = header.findIndex((h) => h === 'status');
    const timeIdx = header.findIndex((h) => h === 'estimatedtime' || h === 'estimatedtimemin' || h === 'time');
    const suiteIdx = header.findIndex((h) => h === 'suite' || h === 'suitename' || h === 'folder');
    const tagsIdx = header.findIndex((h) => h === 'tags' || h === 'labels');
    const actionIdx = header.findIndex((h) => h === 'action' || h === 'stepaction' || h === 'step');
    const testDataIdx = header.findIndex((h) => h === 'testdata' || h === 'data');
    const expectedIdx = header.findIndex((h) => h === 'expectedresult' || h === 'expected' || h === 'result');

    if (titleIdx === -1) {
      throw new ValidationError("CSV is missing the mandatory 'Title' column in header");
    }

    const preview: CsvImportPreviewRow[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // 1-based, skipping header

      const title = row[titleIdx] || '';
      const description = descIdx !== -1 ? row[descIdx] : undefined;
      const preconditions = precondIdx !== -1 ? row[precondIdx] : undefined;
      const objectives = objIdx !== -1 ? row[objIdx] : undefined;
      const priorityRaw = priorityIdx !== -1 ? (row[priorityIdx] || '').toUpperCase() : 'MEDIUM';
      const typeRaw = typeIdx !== -1 ? (row[typeIdx] || '').toUpperCase() : 'FUNCTIONAL';
      const statusRaw = statusIdx !== -1 ? (row[statusIdx] || '').toUpperCase() : 'ACTIVE';
      const estimatedTimeRaw = timeIdx !== -1 ? parseInt(row[timeIdx] || '0', 10) : undefined;
      const suiteName = suiteIdx !== -1 ? row[suiteIdx] : undefined;
      const rawTags = tagsIdx !== -1 ? row[tagsIdx] : '';
      const action = actionIdx !== -1 ? row[actionIdx] : '';
      const testData = testDataIdx !== -1 ? row[testDataIdx] : undefined;
      const expectedResult = expectedIdx !== -1 ? row[expectedIdx] : '';

      const tags = rawTags
        ? rawTags
            .split(/[,;|]/)
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : [];

      // Build step(s)
      const steps: Array<{ stepNumber: number; action: string; testData?: string; expectedResult: string }> = [];
      if (action.trim().length > 0 || expectedResult.trim().length > 0) {
        steps.push({
          stepNumber: 1,
          action: action.trim() || 'Execute test step',
          testData: testData ? testData.trim() : undefined,
          expectedResult: expectedResult.trim() || 'Expected result verified',
        });
      } else {
        // Fallback default step if none provided
        steps.push({
          stepNumber: 1,
          action: 'Perform test verification as described',
          testData: undefined,
          expectedResult: 'System functions as expected with no errors',
        });
      }

      const rowCandidate = {
        title: title.trim(),
        description: description ? description.trim() : undefined,
        preconditions: preconditions ? preconditions.trim() : undefined,
        objectives: objectives ? objectives.trim() : undefined,
        priority: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(priorityRaw)
          ? priorityRaw
          : 'MEDIUM') as TestPriority,
        type: ([
          'FUNCTIONAL',
          'REGRESSION',
          'SMOKE',
          'SANITY',
          'INTEGRATION',
          'SYSTEM',
          'ACCEPTANCE',
          'PERFORMANCE',
          'SECURITY',
          'USABILITY',
          'ACCESSIBILITY',
          'EXPLORATORY',
        ].includes(typeRaw)
          ? typeRaw
          : 'FUNCTIONAL') as TestType,
        status: (['DRAFT', 'ACTIVE', 'DEPRECATED'].includes(statusRaw) ? statusRaw : 'ACTIVE') as TestCaseStatus,
        estimatedTimeMin: Number.isInteger(estimatedTimeRaw) && estimatedTimeRaw! >= 0 ? estimatedTimeRaw : undefined,
        suiteName: suiteName ? suiteName.trim() : undefined,
        tags,
        steps,
      };

      const parseResult = csvImportRowSchema.safeParse(rowCandidate);
      if (parseResult.success) {
        validCount++;
        preview.push({
          rowNumber,
          isValid: true,
          errors: [],
          data: rowCandidate,
        });
      } else {
        invalidCount++;
        const errors = parseResult.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`);
        preview.push({
          rowNumber,
          isValid: false,
          errors,
          data: rowCandidate,
        });
      }
    }

    return {
      totalRows: dataRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      preview,
    };
  }

  async bulkImport(
    userId: string,
    orgId: string,
    projectId: string,
    payload: CsvBulkImportInput,
    ip?: string,
    userAgent?: string
  ) {
    const project = await this.ensureProject(orgId, projectId);

    if (!payload.rows || payload.rows.length === 0) {
      throw new ValidationError('No test cases provided for import');
    }

    // Cache suite IDs by name
    const suiteCache = new Map<string, string>();
    if (payload.defaultSuiteId) {
      suiteCache.set('__default__', payload.defaultSuiteId);
    }

    const importedCases = await prisma.$transaction(async (tx) => {
      // 1. Get starting case number
      const maxCase = await tx.testCase.findFirst({
        where: { projectId },
        orderBy: { caseNumber: 'desc' },
        select: { caseNumber: true },
      });
      let currentCaseNumber = (maxCase?.caseNumber || 0) + 1;

      const createdCases: any[] = [];

      for (const row of payload.rows) {
        // Resolve suite
        let suiteId: string | null = payload.defaultSuiteId || null;
        if (row.suiteName && row.suiteName.trim().length > 0) {
          const sName = row.suiteName.trim();
          if (suiteCache.has(sName)) {
            suiteId = suiteCache.get(sName)!;
          } else {
            let suite = await tx.testSuite.findFirst({
              where: { projectId, name: sName },
            });
            if (!suite) {
              suite = await tx.testSuite.create({
                data: {
                  projectId,
                  name: sName,
                },
              });
            }
            suiteCache.set(sName, suite.id);
            suiteId = suite.id;
          }
        }

        // Resolve tags
        const tagConnect: { id: string }[] = [];
        if (row.tags && row.tags.length > 0) {
          for (const tagName of row.tags) {
            const tName = tagName.trim();
            if (!tName) continue;
            const tag = await tx.tag.upsert({
              where: {
                projectId_name: {
                  projectId,
                  name: tName,
                },
              },
              create: {
                projectId,
                name: tName,
              },
              update: {},
            });
            tagConnect.push({ id: tag.id });
          }
        }

        const tc = await tx.testCase.create({
          data: {
            projectId,
            suiteId,
            milestoneId: payload.defaultMilestoneId,
            caseNumber: currentCaseNumber++,
            title: row.title,
            description: row.description,
            preconditions: row.preconditions,
            objectives: row.objectives,
            priority: (row.priority as TestPriority) || TestPriority.MEDIUM,
            type: (row.type as TestType) || TestType.FUNCTIONAL,
            status: (row.status as TestCaseStatus) || TestCaseStatus.ACTIVE,
            estimatedTimeMin: row.estimatedTimeMin,
            currentVersion: 1,
            authorId: userId,
            tags: {
              connect: tagConnect,
            },
          },
        });

        const ver = await tx.testCaseVersion.create({
          data: {
            testCaseId: tc.id,
            versionNumber: 1,
            title: row.title,
            description: row.description,
            preconditions: row.preconditions,
            objectives: row.objectives,
            priority: (row.priority as TestPriority) || TestPriority.MEDIUM,
            type: (row.type as TestType) || TestType.FUNCTIONAL,
            status: (row.status as TestCaseStatus) || TestCaseStatus.ACTIVE,
            changeSummary: 'Bulk imported via CSV',
            createdById: userId,
          },
        });

        const steps =
          row.steps && row.steps.length > 0
            ? row.steps
            : [
                {
                  stepNumber: 1,
                  action: 'Execute test verification',
                  testData: undefined,
                  expectedResult: 'System performs as expected',
                },
              ];

        await tx.testStep.createMany({
          data: steps.map((s, idx) => ({
            testCaseVersionId: ver.id,
            stepNumber: s.stepNumber || idx + 1,
            action: s.action,
            testData: s.testData,
            expectedResult: s.expectedResult,
          })),
        });

        createdCases.push({
          ...tc,
          key: `${project.key}-${tc.caseNumber}`,
        });
      }

      return createdCases;
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'test_case:csv_import',
      entityType: 'TestCase',
      entityId: projectId,
      metadata: {
        importedCount: importedCases.length,
        projectId,
      },
      ipAddress: ip,
      userAgent,
    });

    return {
      importedCount: importedCases.length,
      testCases: importedCases,
    };
  }

  async exportCsv(
    orgId: string,
    projectId: string,
    filters: {
      search?: string;
      suiteId?: string;
      milestoneId?: string;
      priority?: TestPriority;
      type?: TestType;
      status?: TestCaseStatus;
      tag?: string;
    } = {}
  ): Promise<string> {
    const project = await this.ensureProject(orgId, projectId);

    const where: any = {
      projectId,
      isArchived: false,
    };

    if (filters.suiteId) where.suiteId = filters.suiteId;
    if (filters.milestoneId) where.milestoneId = filters.milestoneId;
    if (filters.priority) where.priority = filters.priority;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.tag) {
      where.tags = {
        some: { name: { equals: filters.tag, mode: 'insensitive' } },
      };
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const testCases = await prisma.testCase.findMany({
      where,
      orderBy: { caseNumber: 'asc' },
      include: {
        suite: { select: { name: true } },
        milestone: { select: { name: true } },
        tags: { select: { name: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
          },
        },
      },
    });

    const headers = [
      'Key',
      'Title',
      'Description',
      'Preconditions',
      'Objectives',
      'Priority',
      'Type',
      'Status',
      'EstimatedTimeMin',
      'Suite',
      'Milestone',
      'Tags',
      'StepNumber',
      'StepAction',
      'StepTestData',
      'StepExpectedResult',
    ];

    const lines: string[] = [headers.join(',')];

    for (const tc of testCases) {
      const key = `${project.key}-${tc.caseNumber}`;
      const latestVer = tc.versions[0];
      const tagsStr = tc.tags.map((t) => t.name).join('; ');
      const suiteName = tc.suite?.name || '';
      const milestoneName = tc.milestone?.name || '';

      if (latestVer && latestVer.steps.length > 0) {
        for (const step of latestVer.steps) {
          const row = [
            this.escapeCsvCell(key),
            this.escapeCsvCell(tc.title),
            this.escapeCsvCell(tc.description),
            this.escapeCsvCell(tc.preconditions),
            this.escapeCsvCell(tc.objectives),
            this.escapeCsvCell(tc.priority),
            this.escapeCsvCell(tc.type),
            this.escapeCsvCell(tc.status),
            this.escapeCsvCell(tc.estimatedTimeMin ? String(tc.estimatedTimeMin) : ''),
            this.escapeCsvCell(suiteName),
            this.escapeCsvCell(milestoneName),
            this.escapeCsvCell(tagsStr),
            this.escapeCsvCell(String(step.stepNumber)),
            this.escapeCsvCell(step.action),
            this.escapeCsvCell(step.testData),
            this.escapeCsvCell(step.expectedResult),
          ];
          lines.push(row.join(','));
        }
      } else {
        const row = [
          this.escapeCsvCell(key),
          this.escapeCsvCell(tc.title),
          this.escapeCsvCell(tc.description),
          this.escapeCsvCell(tc.preconditions),
          this.escapeCsvCell(tc.objectives),
          this.escapeCsvCell(tc.priority),
          this.escapeCsvCell(tc.type),
          this.escapeCsvCell(tc.status),
          this.escapeCsvCell(tc.estimatedTimeMin ? String(tc.estimatedTimeMin) : ''),
          this.escapeCsvCell(suiteName),
          this.escapeCsvCell(milestoneName),
          this.escapeCsvCell(tagsStr),
          '',
          '',
          '',
          '',
        ];
        lines.push(row.join(','));
      }
    }

    return lines.join('\r\n');
  }
}

export const csvService = new CsvService();
