import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { createAuditLog } from './audit.service.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/pdf',
  'application/zip',
  'video/mp4',
  'video/webm',
]);

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads', 'attachments');

export interface UploadAttachmentOptions {
  projectId: string;
  file: Express.Multer.File;
  uploadedById?: string;
  testResultId?: string;
  defectId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class StorageService {
  private static ensureUploadDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static async saveAttachment(options: UploadAttachmentOptions) {
    const { projectId, file, uploadedById, testResultId, defectId, ipAddress, userAgent } = options;

    if (!file) {
      throw new ValidationError('No file was provided for upload');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new ValidationError(
        `File type '${file.mimetype}' is not permitted. Allowed types: images, text, logs, PDFs, and video.`
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Verify testResult belongs to project if provided
    if (testResultId) {
      const testResult = await prisma.testResult.findUnique({
        where: { id: testResultId },
        include: {
          testRunCase: {
            include: {
              testRun: {
                select: { projectId: true },
              },
            },
          },
        },
      });

      if (!testResult || testResult.testRunCase.testRun.projectId !== projectId) {
        throw new NotFoundError('Test execution record not found in this project');
      }
    }

    // Sanitize filename & generate unique safe storage key
    const sanitizedOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeKey = `${uuidv4()}-${sanitizedOriginalName}`;
    const projectUploadDir = path.join(UPLOADS_ROOT, projectId);

    this.ensureUploadDirectory(projectUploadDir);
    const destinationPath = path.join(projectUploadDir, safeKey);

    // Write file to disk
    fs.writeFileSync(destinationPath, file.buffer);

    const fileUrl = `/api/v1/projects/${projectId}/attachments/${safeKey}/download`;

    const attachment = await prisma.attachment.create({
      data: {
        projectId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileUrl,
        storageKey: safeKey,
        uploadedById: uploadedById || null,
        testResultId: testResultId || null,
        defectId: defectId || null,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: project.organizationId,
      userId: uploadedById,
      action: 'ATTACHMENT_UPLOADED',
      entityType: 'Attachment',
      entityId: attachment.id,
      ipAddress,
      userAgent,
      metadata: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        testResultId,
      },
    });

    return attachment;
  }

  static async getAttachmentFile(projectId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.projectId !== projectId) {
      throw new NotFoundError('Attachment not found');
    }

    if (!attachment.storageKey) {
      throw new NotFoundError('File storage key is missing');
    }

    const filePath = path.join(UPLOADS_ROOT, projectId, attachment.storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Stored attachment file could not be located on disk');
    }

    return {
      attachment,
      filePath,
      readStream: fs.createReadStream(filePath),
    };
  }

  static async deleteAttachment(projectId: string, attachmentId: string, userId?: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        project: {
          select: { organizationId: true },
        },
      },
    });

    if (!attachment || attachment.projectId !== projectId) {
      throw new NotFoundError('Attachment not found');
    }

    if (attachment.storageKey) {
      const filePath = path.join(UPLOADS_ROOT, projectId, attachment.storageKey);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore disk unlink error
        }
      }
    }

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    if (attachment.project) {
      await createAuditLog({
        organizationId: attachment.project.organizationId,
        userId,
        action: 'ATTACHMENT_DELETED',
        entityType: 'Attachment',
        entityId: attachmentId,
        metadata: {
          fileName: attachment.fileName,
        },
      });
    }

    return { message: 'Attachment successfully deleted' };
  }
}

export const storageService = StorageService;
