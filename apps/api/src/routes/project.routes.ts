import { Router, Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
  createEnvironmentSchema,
  updateEnvironmentSchema,
} from '@ai-qa/validation';
import { authenticate, requireTenant, requireRole } from '../middleware/auth.js';
import { requireEntitlement } from '../middleware/entitlement.js';
import { OrganizationRole, ProjectStatus, ProjectRole, ApiResponse, UsageMetric } from '@ai-qa/shared-types';
import { milestoneRouter } from './milestone.routes.js';
import { testSuiteRouter } from './test-suite.routes.js';
import { tagRouter } from './tag.routes.js';
import { testCaseRouter } from './test-case.routes.js';
import { testPlanRouter } from './test-plan.routes.js';
import { testRunRouter } from './test-run.routes.js';
import { executionRouter } from './execution.routes.js';
import { attachmentRouter } from './attachment.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { defectRouter } from './defect.routes.js';
import { aiRouter } from './ai.routes.js';
import { integrationRouter } from './integration.routes.js';
import { webhookRouter } from './webhook.routes.js';

export const projectRouter: Router = Router();

// Apply authentication and tenant resolution across all project routes
projectRouter.use(authenticate, requireTenant);

// List projects within active organization
projectRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, isArchived, page, limit, sortBy, sortOrder } = req.query;

    const result = await projectService.getProjects(req.organizationId!, {
      search: search as string | undefined,
      status: status as ProjectStatus | undefined,
      isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    const response: ApiResponse = {
      success: true,
      data: result.projects,
      meta: result.meta,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Create new project
projectRouter.post(
  '/',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  requireEntitlement(UsageMetric.PROJECTS, 1),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createProjectSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const project = await projectService.createProject(
        req.user!.id,
        req.organizationId!,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: project,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get single project details
projectRouter.get('/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getProjectById(
      req.organizationId!,
      req.params.projectId as string
    );

    const response: ApiResponse = {
      success: true,
      data: project,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Update project
projectRouter.patch(
  '/:projectId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateProjectSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const project = await projectService.updateProject(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: project,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);




// Archive project
projectRouter.post(
  '/:projectId/archive',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const project = await projectService.archiveProject(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: project,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);




// Restore archived project
projectRouter.post(
  '/:projectId/restore',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const project = await projectService.restoreProject(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: project,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);




// Delete project (requires project to be archived first)
projectRouter.delete(
  '/:projectId',
  requireRole(OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      await projectService.deleteProject(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: { message: 'Project permanently deleted' },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);




// Project Activity history
projectRouter.get('/:projectId/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const logs = await projectService.getProjectActivity(
      req.organizationId!,
      req.params.projectId as string,
      limit
    );

    const response: ApiResponse = {
      success: true,
      data: logs,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// PROJECT MEMBERS ROUTES
// ----------------------------------------------------
projectRouter.get('/:projectId/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await projectService.getMembers(
      req.organizationId!,
      req.params.projectId as string
    );

    const response: ApiResponse = {
      success: true,
      data: members,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

projectRouter.post(
  '/:projectId/members',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = addProjectMemberSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const member = await projectService.addMember(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        validated.userId,
        validated.role as ProjectRole,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: member,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

projectRouter.patch(
  '/:projectId/members/:memberId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateProjectMemberRoleSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const member = await projectService.updateMemberRole(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.memberId as string,
        validated.role as ProjectRole,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: member,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);




projectRouter.delete(
  '/:projectId/members/:memberId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      await projectService.removeMember(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.memberId as string,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: { message: 'Member removed from project' },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);




// ----------------------------------------------------
// PROJECT ENVIRONMENTS ROUTES
// ----------------------------------------------------
projectRouter.get('/:projectId/environments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const envs = await projectService.getEnvironments(
      req.organizationId!,
      req.params.projectId as string
    );

    const response: ApiResponse = {
      success: true,
      data: envs,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

projectRouter.post(
  '/:projectId/environments',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createEnvironmentSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const env = await projectService.createEnvironment(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: env,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

projectRouter.patch(
  '/:projectId/environments/:envId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateEnvironmentSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const env = await projectService.updateEnvironment(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.envId as string,
        validated,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: env,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);




projectRouter.delete(
  '/:projectId/environments/:envId',
  requireRole(OrganizationRole.QA_MANAGER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      await projectService.deleteEnvironment(
        req.user!.id,
        req.organizationId!,
        req.params.projectId as string,
        req.params.envId as string,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: { message: 'Environment deleted successfully' },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Mount Milestone 04 subrouters scoped to project
projectRouter.use('/:projectId/milestones', milestoneRouter);
projectRouter.use('/:projectId/suites', testSuiteRouter);
projectRouter.use('/:projectId/tags', tagRouter);
projectRouter.use('/:projectId/test-cases', testCaseRouter);

// Mount Milestone 05 subrouters scoped to project
projectRouter.use('/:projectId/test-plans', testPlanRouter);
projectRouter.use('/:projectId/test-runs', testRunRouter);
projectRouter.use('/:projectId/test-runs/:runId/cases', executionRouter);
projectRouter.use('/:projectId/attachments', attachmentRouter);
projectRouter.use('/:projectId/analytics', analyticsRouter);
projectRouter.use('/:projectId', analyticsRouter);

// Mount Milestone 06 subrouters scoped to project
projectRouter.use('/:projectId/defects', defectRouter);

// Mount Milestone 07 subrouters scoped to project
projectRouter.use('/:projectId/ai', aiRouter);

// Mount Milestone 10 subrouters scoped to project
projectRouter.use('/:projectId/integrations', integrationRouter);
projectRouter.use('/:projectId/webhooks', webhookRouter);





