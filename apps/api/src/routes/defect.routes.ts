import { Router, Request, Response, NextFunction } from 'express';
import { DefectService } from '../services/defect.service.js';
import { requireRole } from '../middleware/auth.js';
import {
  createDefectSchema,
  updateDefectSchema,
  transitionDefectStatusSchema,
  assignDefectSchema,
  createDefectCommentSchema,
  linkDefectTestSchema,
} from '@ai-qa/validation';
import {
  OrganizationRole,
  DefectStatus,
  DefectSeverity,
  DefectPriority,
  DefectType,
  ApiResponse,
} from '@ai-qa/shared-types';

export const defectRouter: Router = Router({ mergeParams: true });

// ----------------------------------------------------
// GET /api/v1/projects/:projectId/defects/analytics
// (Put before /:defectId to prevent routing collision)
// ----------------------------------------------------
defectRouter.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { milestoneId, environmentId } = req.query;

    const data = await DefectService.getAnalytics(projectId, {
      milestoneId: milestoneId ? String(milestoneId) : undefined,
      environmentId: environmentId ? String(environmentId) : undefined,
    });

    const response: ApiResponse = {
      success: true,
      data,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// GET /api/v1/projects/:projectId/defects/duplicate-candidates
// (Put before /:defectId to prevent routing collision)
// ----------------------------------------------------
defectRouter.get('/duplicate-candidates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { title, component, environmentId } = req.query;

    const candidates = await DefectService.findDuplicateCandidates(projectId, {
      title: title ? String(title) : '',
      component: component ? String(component) : undefined,
      environmentId: environmentId ? String(environmentId) : undefined,
    });

    const response: ApiResponse = {
      success: true,
      data: candidates,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// GET /api/v1/projects/:projectId/defects
// ----------------------------------------------------
defectRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const {
      search,
      status,
      severity,
      priority,
      type,
      assigneeId,
      qaOwnerId,
      reporterId,
      environmentId,
      milestoneId,
      component,
      page,
      limit,
    } = req.query;

    const result = await DefectService.getDefects(projectId, {
      search: search ? String(search) : undefined,
      status: status ? (status as DefectStatus) : undefined,
      severity: severity ? (severity as DefectSeverity) : undefined,
      priority: priority ? (priority as DefectPriority) : undefined,
      type: type ? (type as DefectType) : undefined,
      assigneeId: assigneeId ? String(assigneeId) : undefined,
      qaOwnerId: qaOwnerId ? String(qaOwnerId) : undefined,
      reporterId: reporterId ? String(reporterId) : undefined,
      environmentId: environmentId ? String(environmentId) : undefined,
      milestoneId: milestoneId ? String(milestoneId) : undefined,
      component: component ? String(component) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 20,
    });

    const response: ApiResponse = {
      success: true,
      data: result.defects,
      meta: result.meta,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// POST /api/v1/projects/:projectId/defects
// ----------------------------------------------------
defectRouter.post(
  '/',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const validated = createDefectSchema.parse(req.body);

      const defect = await DefectService.createDefect(
        projectId,
        validated,
        req.user!.id,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      const response: ApiResponse = {
        success: true,
        data: defect,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------
// GET /api/v1/projects/:projectId/defects/:defectId
// ----------------------------------------------------
defectRouter.get('/:defectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const defectId = req.params.defectId as string;
    const userRole = req.membership?.role;

    const defect = await DefectService.getDefectById(projectId, defectId, userRole);

    const response: ApiResponse = {
      success: true,
      data: defect,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// PATCH /api/v1/projects/:projectId/defects/:defectId
// ----------------------------------------------------
defectRouter.patch(
  '/:defectId',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const defectId = req.params.defectId as string;
      const validated = updateDefectSchema.parse(req.body);

      const updated = await DefectService.updateDefect(
        projectId,
        defectId,
        validated,
        req.user!.id,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      const response: ApiResponse = {
        success: true,
        data: updated,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------
// POST /api/v1/projects/:projectId/defects/:defectId/status
// ----------------------------------------------------
defectRouter.post(
  '/:defectId/status',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const defectId = req.params.defectId as string;
      const validated = transitionDefectStatusSchema.parse(req.body);

      const updated = await DefectService.transitionStatus(
        projectId,
        defectId,
        validated,
        req.user!.id,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      const response: ApiResponse = {
        success: true,
        data: updated,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------
// POST /api/v1/projects/:projectId/defects/:defectId/assign
// ----------------------------------------------------
defectRouter.post(
  '/:defectId/assign',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const defectId = req.params.defectId as string;
      const validated = assignDefectSchema.parse(req.body);

      const updated = await DefectService.assignDefect(
        projectId,
        defectId,
        validated,
        req.user!.id
      );

      const response: ApiResponse = {
        success: true,
        data: updated,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------
// DELETE /api/v1/projects/:projectId/defects/:defectId
// ----------------------------------------------------
defectRouter.delete(
  '/:defectId',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const defectId = req.params.defectId as string;

      const result = await DefectService.deleteDefect(projectId, defectId, req.user!.id);

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

// ----------------------------------------------------
// COMMENTS: GET & POST /:defectId/comments
// ----------------------------------------------------
defectRouter.get('/:defectId/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const defectId = req.params.defectId as string;
    const userRole = req.membership?.role;

    const comments = await DefectService.getComments(projectId, defectId, userRole);

    const response: ApiResponse = {
      success: true,
      data: comments,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

defectRouter.post(
  '/:defectId/comments',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const defectId = req.params.defectId as string;
      const validated = createDefectCommentSchema.parse(req.body);
      const userRole = req.membership?.role;

      const comment = await DefectService.addComment(
        projectId,
        defectId,
        validated,
        req.user!.id,
        userRole
      );

      const response: ApiResponse = {
        success: true,
        data: comment,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

defectRouter.delete(
  '/:defectId/comments/:commentId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const defectId = req.params.defectId as string;
      const commentId = req.params.commentId as string;
      const userRole = req.membership?.role;

      const result = await DefectService.deleteComment(
        projectId,
        defectId,
        commentId,
        req.user!.id,
        userRole
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

// ----------------------------------------------------
// HISTORY: GET /:defectId/history
// ----------------------------------------------------
defectRouter.get('/:defectId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const defectId = req.params.defectId as string;

    const history = await DefectService.getHistory(projectId, defectId);

    const response: ApiResponse = {
      success: true,
      data: history,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// TEST LINKS: POST & DELETE /:defectId/links
// ----------------------------------------------------
defectRouter.post(
  '/:defectId/links',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const defectId = req.params.defectId as string;
      const validated = linkDefectTestSchema.parse(req.body);

      const link = await DefectService.linkTest(projectId, defectId, validated, req.user!.id);

      const response: ApiResponse = {
        success: true,
        data: link,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

defectRouter.delete(
  '/:defectId/links/:linkId',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const defectId = req.params.defectId as string;
      const linkId = req.params.linkId as string;

      const result = await DefectService.unlinkTest(projectId, defectId, linkId, req.user!.id);

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
