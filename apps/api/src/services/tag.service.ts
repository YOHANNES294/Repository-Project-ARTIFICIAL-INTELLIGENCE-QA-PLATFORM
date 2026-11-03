import { prisma } from '../prisma.js';
import { createAuditLog } from './audit.service.js';
import { NotFoundError, ConflictError } from '../errors.js';
import { CreateTagInput, UpdateTagInput } from '@ai-qa/validation';

export class TagService {
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

  async getTags(orgId: string, projectId: string) {
    await this.ensureProject(orgId, projectId);

    const tags = await prisma.tag.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            testCases: true,
          },
        },
      },
    });

    return tags;
  }

  async createTag(
    userId: string,
    orgId: string,
    projectId: string,
    input: CreateTagInput,
    ip?: string,
    userAgent?: string
  ) {
    await this.ensureProject(orgId, projectId);

    const existing = await prisma.tag.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: input.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Tag '${input.name}' already exists in this project`);
    }

    const tag = await prisma.tag.create({
      data: {
        projectId,
        name: input.name.trim(),
        color: input.color || '#3B82F6',
      },
      include: {
        _count: {
          select: {
            testCases: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'tag:create',
      entityType: 'Tag',
      entityId: tag.id,
      metadata: {
        name: tag.name,
        color: tag.color,
        projectId,
      },
      ipAddress: ip,
      userAgent,
    });

    return tag;
  }

  async updateTag(
    userId: string,
    orgId: string,
    projectId: string,
    tagId: string,
    input: UpdateTagInput,
    ip?: string,
    userAgent?: string
  ) {
    await this.ensureProject(orgId, projectId);

    const existing = await prisma.tag.findFirst({
      where: { id: tagId, projectId },
    });

    if (!existing) {
      throw new NotFoundError('Tag not found in project');
    }

    if (input.name && input.name.trim() !== existing.name) {
      const duplicate = await prisma.tag.findUnique({
        where: {
          projectId_name: {
            projectId,
            name: input.name.trim(),
          },
        },
      });

      if (duplicate) {
        throw new ConflictError(`Tag '${input.name}' already exists in this project`);
      }
    }

    const updated = await prisma.tag.update({
      where: { id: tagId },
      data: {
        name: input.name?.trim(),
        color: input.color,
      },
      include: {
        _count: {
          select: {
            testCases: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'tag:update',
      entityType: 'Tag',
      entityId: tagId,
      metadata: {
        changes: input,
        projectId,
      },
      ipAddress: ip,
      userAgent,
    });

    return updated;
  }

  async deleteTag(
    userId: string,
    orgId: string,
    projectId: string,
    tagId: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.ensureProject(orgId, projectId);

    const existing = await prisma.tag.findFirst({
      where: { id: tagId, projectId },
    });

    if (!existing) {
      throw new NotFoundError('Tag not found in project');
    }

    await prisma.tag.delete({
      where: { id: tagId },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'tag:delete',
      entityType: 'Tag',
      entityId: tagId,
      metadata: {
        name: existing.name,
        projectId,
      },
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Tag deleted successfully' };
  }
}

export const tagService = new TagService();
