import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { storageService } from '../services/storage.service.js';
import { requireRole } from '../middleware/auth.js';
import { OrganizationRole, ApiResponse } from '@ai-qa/shared-types';
import { ValidationError } from '../errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

export const attachmentRouter: Router = Router({ mergeParams: true });

// POST /api/v1/projects/:projectId/attachments
attachmentRouter.post(
  '/',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const { testResultId, defectId } = req.query;

      if (!req.file) {
        throw new ValidationError('No file was uploaded');
      }

      const attachment = await storageService.saveAttachment({
        projectId,
        file: req.file,
        uploadedById: req.user?.id,
        testResultId: testResultId ? String(testResultId) : undefined,
        defectId: defectId ? String(defectId) : undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const response: ApiResponse = {
        success: true,
        data: attachment,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects/:projectId/attachments/:attachmentId/download
attachmentRouter.get(
  '/:attachmentId/download',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const attachmentId = req.params.attachmentId as string;
      const { attachment, readStream } = await storageService.getAttachmentFile(
        projectId,
        attachmentId
      );

      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Length', attachment.fileSize);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(attachment.fileName)}"`
      );

      readStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/projects/:projectId/attachments/:attachmentId
attachmentRouter.delete(
  '/:attachmentId',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const attachmentId = req.params.attachmentId as string;
      const result = await storageService.deleteAttachment(
        projectId,
        attachmentId,
        req.user?.id
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
