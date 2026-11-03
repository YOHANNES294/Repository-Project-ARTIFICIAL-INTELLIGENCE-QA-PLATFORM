import { Router, Request, Response, NextFunction } from 'express';
import { testCaseService } from '../services/test-case.service.js';
import { csvService } from '../services/csv.service.js';
import {
  createTestCaseSchema,
  updateTestCaseSchema,
  csvBulkImportSchema,
} from '@ai-qa/validation';
import { requireRole } from '../middleware/auth.js';
import { requireEntitlement } from '../middleware/entitlement.js';
import {
  OrganizationRole,
  TestPriority,
  TestType,
  TestCaseStatus,
  ApiResponse,
  UsageMetric,
} from '@ai-qa/shared-types';

export const testCaseRouter: Router = Router({ mergeParams: true });

// CSV Export (must be before /:caseId routes)
testCaseRouter.get('/csv/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, suiteId, milestoneId, priority, type, status, tag } = req.query;

    const csvData = await csvService.exportCsv(
      req.organizationId!,
      req.params.projectId as string,
      {
        search: search as string | undefined,
        suiteId: suiteId as string | undefined,
        milestoneId: milestoneId as string | undefined,
        priority: priority as TestPriority | undefined,
        type: type as TestType | undefined,
        status: status as TestCaseStatus | undefined,
        tag: tag as string | undefined,
      }
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="test-cases-${req.params.projectId}-${Date.now()}.csv"`
    );
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
});

// CSV Import Preview
testCaseRouter.post(
  '/csv/preview',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { csvContent } = req.body;
      const preview = await csvService.previewCsv(
        req.organizationId!,
        req.params.projectId as string,
        csvContent
      );

      const response: ApiResponse = {
        success: true,
        data: preview,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// CSV Bulk Import
testCaseRouter.post(
  '/csv/import',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = csvBulkImportSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await csvService.bulkImport(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// List test cases
testCaseRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      suiteId,
      milestoneId,
      priority,
      type,
      status,
      tag,
      isArchived,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await testCaseService.getTestCases(
      req.organizationId!,
      req.params.projectId as string,
      {
        search: search as string | undefined,
        suiteId: suiteId as string | undefined,
        milestoneId: milestoneId as string | undefined,
        priority: priority as TestPriority | undefined,
        type: type as TestType | undefined,
        status: status as TestCaseStatus | undefined,
        tag: tag as string | undefined,
        isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as any,
      }
    );

    const response: ApiResponse = {
      success: true,
      data: result.testCases,
      meta: result.meta,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Compare two versions
testCaseRouter.get(
  '/:caseId/versions/compare',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { v1, v2 } = req.query;
      const diff = await testCaseService.compareVersions(
        req.organizationId!,
        req.params.projectId as string,
        req.params.caseId as string,
        parseInt(v1 as string, 10) || 1,
        parseInt(v2 as string, 10) || 1
      );

      const response: ApiResponse = {
        success: true,
        data: diff,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// List versions of test case
testCaseRouter.get('/:caseId/versions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const versions = await testCaseService.getTestCaseVersions(
      req.organizationId!,
      req.params.projectId as string,
      req.params.caseId as string
    );

    const response: ApiResponse = {
      success: true,
      data: versions,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Get single version details
testCaseRouter.get(
  '/:caseId/versions/:versionNumber',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const version = await testCaseService.getTestCaseVersion(
        req.organizationId!,
        req.params.projectId as string,
        req.params.caseId as string,
        parseInt(req.params.versionNumber as string, 10)
      );

      const response: ApiResponse = {
        success: true,
        data: version,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get single test case
testCaseRouter.get('/:caseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testCase = await testCaseService.getTestCaseById(
      req.organizationId!,
      req.params.projectId as string,
      req.params.caseId as string
    );

    const response: ApiResponse = {
      success: true,
      data: testCase,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Create test case
testCaseRouter.post(
  '/',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  requireEntitlement(UsageMetric.TEST_CASES, 1),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createTestCaseSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const testCase = await testCaseService.createTestCase(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: testCase,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Update test case
testCaseRouter.patch(
  '/:caseId',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateTestCaseSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const testCase = await testCaseService.updateTestCase(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.caseId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: testCase,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Archive test case
testCaseRouter.post(
  '/:caseId/archive',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const testCase = await testCaseService.archiveTestCase(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.caseId as string,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: testCase,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Restore test case
testCaseRouter.post(
  '/:caseId/restore',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const testCase = await testCaseService.restoreTestCase(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.caseId as string,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: testCase,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Delete test case
testCaseRouter.delete(
  '/:caseId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await testCaseService.deleteTestCase(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.caseId as string,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);
