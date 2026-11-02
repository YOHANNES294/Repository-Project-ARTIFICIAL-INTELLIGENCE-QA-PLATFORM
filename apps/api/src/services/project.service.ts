import { prisma } from '../prisma.js';
import { createAuditLog } from './audit.service.js';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '../errors.js';
import {
  CreateProjectInput,
  UpdateProjectInput,
  CreateEnvironmentInput,
  UpdateEnvironmentInput,
} from '@ai-qa/validation';
import { ProjectStatus, ProjectRole } from '@ai-qa/shared-types';

export class ProjectService {
  async createProject(
    userId: string,
    orgId: string,
    input: CreateProjectInput,
    ip?: string,
    userAgent?: string
  ) {
    const existing = await prisma.project.findUnique({
      where: {
        organizationId_key: {
          organizationId: orgId,
          key: input.key.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(`A project with key '${input.key.toUpperCase()}' already exists in this organization`);
    }

    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          organizationId: orgId,
          name: input.name,
          key: input.key.toUpperCase(),
          description: input.description,
          objectives: input.objectives,
          status: (input.status as ProjectStatus) || ProjectStatus.ACTIVE,
          settings: input.settings ? JSON.parse(JSON.stringify(input.settings)) : undefined,
        },
      });

      // Add creator as PROJECT_LEAD
      await tx.projectMember.create({
        data: {
          projectId: proj.id,
          userId,
          role: ProjectRole.PROJECT_LEAD,
        },
      });

      // Seed standard initial environments
      await tx.environment.createMany({
        data: [
          {
            projectId: proj.id,
            name: 'Development',
            type: 'DEVELOPMENT',
            description: 'Local and feature branch testing',
            isActive: true,
          },
          {
            projectId: proj.id,
            name: 'Staging',
            type: 'STAGING',
            description: 'Pre-production verification environment',
            isActive: true,
          },
          {
            projectId: proj.id,
            name: 'Production',
            type: 'PRODUCTION',
            description: 'Live production release environment',
            isActive: true,
          },
        ],
      });

      return proj;
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'PROJECT_CREATE',
      entityType: 'Project',
      entityId: project.id,
      ipAddress: ip,
      userAgent,
      metadata: { name: project.name, key: project.key },
    });

    return this.getProjectById(orgId, project.id);
  }

  async getProjects(
    orgId: string,
    options: {
      search?: string;
      status?: ProjectStatus;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: 'name' | 'key' | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: orgId,
      isArchived: options.isArchived !== undefined ? options.isArchived : false,
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { key: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [options.sortBy || 'createdAt']: options.sortOrder || 'desc',
        },
        include: {
          _count: {
            select: {
              members: true,
              environments: true,
              testCases: true,
              testRuns: true,
              defects: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      projects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProjectById(orgId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: orgId,
      },
      include: {
        environments: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            members: true,
            environments: true,
            testCases: true,
            testRuns: true,
            defects: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found in this organization');
    }

    return project;
  }

  async updateProject(
    userId: string,
    orgId: string,
    projectId: string,
    input: UpdateProjectInput,
    ip?: string,
    userAgent?: string
  ) {
    await this.getProjectById(orgId, projectId);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: input.name,
        description: input.description,
        objectives: input.objectives,
        status: input.status as ProjectStatus | undefined,
        settings: input.settings ? JSON.parse(JSON.stringify(input.settings)) : undefined,
      },
      include: {
        environments: true,
        _count: {
          select: {
            members: true,
            environments: true,
            testCases: true,
            testRuns: true,
            defects: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'PROJECT_UPDATE',
      entityType: 'Project',
      entityId: projectId,
      ipAddress: ip,
      userAgent,
      metadata: { ...input },
    });

    return updated;
  }

  async archiveProject(userId: string, orgId: string, projectId: string, ip?: string, userAgent?: string) {
    await this.getProjectById(orgId, projectId);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        status: ProjectStatus.ARCHIVED,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'PROJECT_ARCHIVE',
      entityType: 'Project',
      entityId: projectId,
      ipAddress: ip,
      userAgent,
    });

    return updated;
  }

  async restoreProject(userId: string, orgId: string, projectId: string, ip?: string, userAgent?: string) {
    await this.getProjectById(orgId, projectId);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        isArchived: false,
        archivedAt: null,
        status: ProjectStatus.ACTIVE,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'PROJECT_RESTORE',
      entityType: 'Project',
      entityId: projectId,
      ipAddress: ip,
      userAgent,
    });

    return updated;
  }

  async deleteProject(userId: string, orgId: string, projectId: string, ip?: string, userAgent?: string) {
    const project = await this.getProjectById(orgId, projectId);

    // Safeguard: Enforce project archiving before permanent deletion
    if (!project.isArchived) {
      throw new ValidationError('Project must be archived before it can be permanently deleted');
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'PROJECT_DELETE',
      entityType: 'Project',
      entityId: projectId,
      ipAddress: ip,
      userAgent,
      metadata: { name: project.name, key: project.key },
    });
  }

  async getProjectActivity(orgId: string, projectId: string, limit: number = 50) {
    await this.getProjectById(orgId, projectId);

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { entityId: projectId },
          { metadata: { path: ['projectId'], equals: projectId } },
        ],
      },
      take: Math.min(100, Math.max(1, limit)),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return logs;
  }

  // ----------------------------------------------------
  // PROJECT MEMBERS
  // ----------------------------------------------------
  async getMembers(orgId: string, projectId: string) {
    await this.getProjectById(orgId, projectId);

    return prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(
    currentUserId: string,
    orgId: string,
    projectId: string,
    targetUserId: string,
    role: ProjectRole,
    ip?: string,
    userAgent?: string
  ) {
    await this.getProjectById(orgId, projectId);

    // STRICT CROSS-ORGANIZATION CHECK:
    // targetUserId must be an existing, active member of this organization!
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
    });

    if (!orgMembership) {
      throw new ForbiddenError('Cannot add member to project: User does not belong to this organization');
    }

    const existingProjectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (existingProjectMember) {
      throw new ConflictError('User is already assigned to this project');
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUserId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: currentUserId,
      action: 'PROJECT_MEMBER_ADD',
      entityType: 'ProjectMember',
      entityId: member.id,
      ipAddress: ip,
      userAgent,
      metadata: { projectId, targetUserId, role },
    });

    return member;
  }

  async updateMemberRole(
    currentUserId: string,
    orgId: string,
    projectId: string,
    targetMemberId: string,
    role: ProjectRole,
    ip?: string,
    userAgent?: string
  ) {
    await this.getProjectById(orgId, projectId);

    const member = await prisma.projectMember.findUnique({
      where: { id: targetMemberId },
    });

    if (!member || member.projectId !== projectId) {
      throw new NotFoundError('Member not found in this project');
    }

    const updated = await prisma.projectMember.update({
      where: { id: targetMemberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: currentUserId,
      action: 'PROJECT_MEMBER_ROLE_UPDATE',
      entityType: 'ProjectMember',
      entityId: targetMemberId,
      ipAddress: ip,
      userAgent,
      metadata: { projectId, targetUserId: member.userId, oldRole: member.role, newRole: role },
    });

    return updated;
  }

  async removeMember(
    currentUserId: string,
    orgId: string,
    projectId: string,
    targetMemberId: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.getProjectById(orgId, projectId);

    const member = await prisma.projectMember.findUnique({
      where: { id: targetMemberId },
    });

    if (!member || member.projectId !== projectId) {
      throw new NotFoundError('Member not found in this project');
    }

    await prisma.projectMember.delete({
      where: { id: targetMemberId },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: currentUserId,
      action: 'PROJECT_MEMBER_REMOVE',
      entityType: 'ProjectMember',
      entityId: targetMemberId,
      ipAddress: ip,
      userAgent,
      metadata: { projectId, removedUserId: member.userId },
    });
  }

  // ----------------------------------------------------
  // PROJECT ENVIRONMENTS
  // ----------------------------------------------------
  async getEnvironments(orgId: string, projectId: string) {
    await this.getProjectById(orgId, projectId);

    const envs = await prisma.environment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    // Mask sensitive config variables in responses
    return envs.map((env) => ({
      ...env,
      variables: env.variables ? this.redactVariables(env.variables as Record<string, unknown>) : null,
    }));
  }

  async createEnvironment(
    currentUserId: string,
    orgId: string,
    projectId: string,
    input: CreateEnvironmentInput,
    ip?: string,
    userAgent?: string
  ) {
    await this.getProjectById(orgId, projectId);

    const existing = await prisma.environment.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`An environment named '${input.name}' already exists in this project`);
    }

    const env = await prisma.environment.create({
      data: {
        projectId,
        name: input.name,
        type: input.type,
        url: input.url || null,
        description: input.description,
        variables: input.variables ? JSON.parse(JSON.stringify(input.variables)) : undefined,
        isActive: input.isActive ?? true,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: currentUserId,
      action: 'ENVIRONMENT_CREATE',
      entityType: 'Environment',
      entityId: env.id,
      ipAddress: ip,
      userAgent,
      metadata: { projectId, name: env.name, type: env.type },
    });

    return {
      ...env,
      variables: env.variables ? this.redactVariables(env.variables as Record<string, unknown>) : null,
    };
  }

  async updateEnvironment(
    currentUserId: string,
    orgId: string,
    projectId: string,
    envId: string,
    input: UpdateEnvironmentInput,
    ip?: string,
    userAgent?: string
  ) {
    await this.getProjectById(orgId, projectId);

    const env = await prisma.environment.findUnique({
      where: { id: envId },
    });

    if (!env || env.projectId !== projectId) {
      throw new NotFoundError('Environment not found in this project');
    }

    const updated = await prisma.environment.update({
      where: { id: envId },
      data: {
        name: input.name,
        type: input.type,
        url: input.url !== undefined ? input.url : env.url,
        description: input.description,
        variables: input.variables !== undefined ? JSON.parse(JSON.stringify(input.variables)) : env.variables,
        isActive: input.isActive !== undefined ? input.isActive : env.isActive,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: currentUserId,
      action: 'ENVIRONMENT_UPDATE',
      entityType: 'Environment',
      entityId: envId,
      ipAddress: ip,
      userAgent,
      metadata: { projectId, name: updated.name },
    });

    return {
      ...updated,
      variables: updated.variables ? this.redactVariables(updated.variables as Record<string, unknown>) : null,
    };
  }

  async deleteEnvironment(
    currentUserId: string,
    orgId: string,
    projectId: string,
    envId: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.getProjectById(orgId, projectId);

    const env = await prisma.environment.findUnique({
      where: { id: envId },
    });

    if (!env || env.projectId !== projectId) {
      throw new NotFoundError('Environment not found in this project');
    }

    await prisma.environment.delete({
      where: { id: envId },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: currentUserId,
      action: 'ENVIRONMENT_DELETE',
      entityType: 'Environment',
      entityId: envId,
      ipAddress: ip,
      userAgent,
      metadata: { projectId, name: env.name },
    });
  }

  private redactVariables(vars: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(vars)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('secret') ||
        lower.includes('key') ||
        lower.includes('pass') ||
        lower.includes('token') ||
        lower.includes('auth')
      ) {
        redacted[key] = '••••••••';
      } else {
        redacted[key] = val;
      }
    }
    return redacted;
  }
}

export const projectService = new ProjectService();
