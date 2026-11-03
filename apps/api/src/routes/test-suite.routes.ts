import { Router, Request, Response, NextFunction } from 'express';
import { testSuiteService } from '../services/test-suite.service.js';
import { createTestSuiteSchema, updateTestSuiteSchema } from '@ai-qa/validation';
import { requireRole } from '../middleware/auth.js';
import { OrganizationRole, ApiResponse } from '@ai-qa/shared-types';

export const testSuiteRouter: Router = Router({ mergeParams: true });

// Get hierarchical test suite tree
testSuiteRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suites = await testSuiteService.getSuites(
      req.organizationId!,
      req.params.projectId as string
    );

    const response: ApiResponse = {
      success: true,
      data: suites,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Get single test suite details
testSuiteRouter.get('/:suiteId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suite = await testSuiteService.getSuiteById(
      req.organizationId!,
      req.params.projectId as string,
      req.params.suiteId as string
    );

    const response: ApiResponse = {
      success: true,
      data: suite,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Create test suite
testSuiteRouter.post(
  '/',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createTestSuiteSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const suite = await testSuiteService.createSuite(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: suite,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Update test suite
testSuiteRouter.patch(
  '/:suiteId',
  requireRole(
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.ADMINISTRATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateTestSuiteSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const suite = await testSuiteService.updateSuite(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.suiteId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: suite,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Delete test suite
testSuiteRouter.delete(
  '/:suiteId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await testSuiteService.deleteSuite(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.suiteId as string,
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
