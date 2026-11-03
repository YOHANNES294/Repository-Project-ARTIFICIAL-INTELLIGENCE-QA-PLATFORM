import { prisma } from '../prisma.js';
import { createAuditLog } from './audit.service.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { CreateMilestoneInput, UpdateMilestoneInput } from '@ai-qa/validation';
import { MilestoneStatus, TestPriority } from '@ai-qa/shared-types';

export class MilestoneService {
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

  async getMilestones(
    orgId: string,
    projectId: string,
    params: {
      search?: string;
      status?: MilestoneStatus;
      priority?: TestPriority;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    await this.ensureProject(orgId, projectId);

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      projectId,
    };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { objectives: { contains: params.search, mode: 'insensitive' } },
        { releaseVer: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.priority) {
      where.priority = params.priority;
    }

    const orderBy: any = {};
    const validSortFields = ['name', 'status', 'priority', 'dueDate', 'createdAt', 'startDate'];
    const sortBy = validSortFields.includes(params.sortBy || '') ? params.sortBy! : 'createdAt';
    orderBy[sortBy] = params.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, milestones] = await Promise.all([
      prisma.milestone.count({ where }),
      prisma.milestone.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              testPlans: true,
              testRuns: true,
              testCases: true,
              defects: true,
            },
          },
          testRuns: {
            select: {
              id: true,
              status: true,
              cases: {
                select: {
                  status: true,
                },
              },
            },
          },
          defects: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
    ]);

    // Compute progress for each milestone from real testing records
    const milestonesWithProgress = milestones.map((m) => {
      let passedRuns = 0;
      let failedRuns = 0;
      let blockedRuns = 0;
      let skippedRuns = 0;
      let totalExecutedCases = 0;
      let totalAssignedCases = 0;

      for (const run of m.testRuns) {
        for (const c of run.cases) {
          totalAssignedCases++;
          if (c.status === 'PASSED') {
            passedRuns++;
            totalExecutedCases++;
          } else if (c.status === 'FAILED') {
            failedRuns++;
            totalExecutedCases++;
          } else if (c.status === 'BLOCKED') {
            blockedRuns++;
            totalExecutedCases++;
          } else if (c.status === 'SKIPPED') {
            skippedRuns++;
            totalExecutedCases++;
          }
        }
      }

      const totalRuns = m.testRuns.length;
      const totalCases = m._count.testCases || totalAssignedCases;
      const completionPercentage =
        totalAssignedCases > 0
          ? Math.round((totalExecutedCases / totalAssignedCases) * 100)
          : m.status === MilestoneStatus.COMPLETED
          ? 100
          : 0;

      const openDefects = m.defects.filter(
        (d) => d.status !== 'CLOSED' && d.status !== 'REJECTED'
      ).length;

      const { testRuns, defects, ...rest } = m;

      return {
        ...rest,
        progress: {
          totalRuns,
          passedRuns,
          failedRuns,
          blockedRuns,
          skippedRuns,
          totalCases,
          completionPercentage,
          openDefects,
        },
      };
    });

    return {
      milestones: milestonesWithProgress,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMilestoneById(orgId: string, projectId: string, milestoneId: string) {
    await this.ensureProject(orgId, projectId);

    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            testPlans: true,
            testRuns: true,
            testCases: true,
            defects: true,
          },
        },
        testRuns: {
          select: {
            id: true,
            status: true,
            cases: {
              select: {
                status: true,
              },
            },
          },
        },
        defects: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundError('Milestone not found in project');
    }

    let passedRuns = 0;
    let failedRuns = 0;
    let blockedRuns = 0;
    let skippedRuns = 0;
    let totalAssignedCases = 0;
    let totalExecutedCases = 0;

    for (const run of milestone.testRuns) {
      for (const c of run.cases) {
        totalAssignedCases++;
        if (c.status === 'PASSED') {
          passedRuns++;
          totalExecutedCases++;
        } else if (c.status === 'FAILED') {
          failedRuns++;
          totalExecutedCases++;
        } else if (c.status === 'BLOCKED') {
          blockedRuns++;
          totalExecutedCases++;
        } else if (c.status === 'SKIPPED') {
          skippedRuns++;
          totalExecutedCases++;
        }
      }
    }

    const totalRuns = milestone.testRuns.length;
    const totalCases = milestone._count.testCases || totalAssignedCases;
    const completionPercentage =
      totalAssignedCases > 0
        ? Math.round((totalExecutedCases / totalAssignedCases) * 100)
        : milestone.status === MilestoneStatus.COMPLETED
        ? 100
        : 0;

    const openDefects = milestone.defects.filter(
      (d) => d.status !== 'CLOSED' && d.status !== 'REJECTED'
    ).length;

    const { testRuns, defects, ...rest } = milestone;

    return {
      ...rest,
      progress: {
        totalRuns,
        passedRuns,
        failedRuns,
        blockedRuns,
        skippedRuns,
        totalCases,
        completionPercentage,
        openDefects,
      },
    };
  }

  async createMilestone(
    userId: string,
    orgId: string,
    projectId: string,
    input: CreateMilestoneInput,
    ip?: string,
    userAgent?: string
  ) {
    await this.ensureProject(orgId, projectId);

    if (input.startDate && input.dueDate) {
      if (new Date(input.dueDate).getTime() < new Date(input.startDate).getTime()) {
        throw new ValidationError('Due date cannot be earlier than start date');
      }
    }

    if (input.ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: input.ownerId } });
      if (!owner) {
        throw new NotFoundError('Designated milestone owner not found');
      }
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        name: input.name,
        description: input.description,
        objectives: input.objectives,
        status: (input.status as MilestoneStatus) || MilestoneStatus.PLANNED,
        priority: (input.priority as TestPriority) || TestPriority.MEDIUM,
        releaseVer: input.releaseVer,
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        ownerId: input.ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            testPlans: true,
            testRuns: true,
            testCases: true,
            defects: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'milestone:create',
      entityType: 'Milestone',
      entityId: milestone.id,
      metadata: {
        name: milestone.name,
        projectId,
        status: milestone.status,
        priority: milestone.priority,
      },
      ipAddress: ip,
      userAgent,
    });

    return {
      ...milestone,
      progress: {
        totalRuns: 0,
        passedRuns: 0,
        failedRuns: 0,
        blockedRuns: 0,
        skippedRuns: 0,
        totalCases: 0,
        completionPercentage: 0,
        openDefects: 0,
      },
    };
  }

  async updateMilestone(
    userId: string,
    orgId: string,
    projectId: string,
    milestoneId: string,
    input: UpdateMilestoneInput,
    ip?: string,
    userAgent?: string
  ) {
    await this.ensureProject(orgId, projectId);

    const existing = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!existing) {
      throw new NotFoundError('Milestone not found in project');
    }

    const startDate = input.startDate !== undefined
      ? input.startDate ? new Date(input.startDate) : null
      : existing.startDate;

    const dueDate = input.dueDate !== undefined
      ? input.dueDate ? new Date(input.dueDate) : null
      : existing.dueDate;

    if (startDate && dueDate && dueDate.getTime() < startDate.getTime()) {
      throw new ValidationError('Due date cannot be earlier than start date');
    }

    let completedAt = input.completedAt !== undefined
      ? input.completedAt ? new Date(input.completedAt) : null
      : existing.completedAt;

    if (input.status === MilestoneStatus.COMPLETED && !completedAt) {
      completedAt = new Date();
    } else if (input.status && input.status !== MilestoneStatus.COMPLETED && input.status !== existing.status) {
      completedAt = null;
    }

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        name: input.name,
        description: input.description,
        objectives: input.objectives,
        status: input.status as MilestoneStatus | undefined,
        priority: input.priority as TestPriority | undefined,
        releaseVer: input.releaseVer,
        startDate,
        dueDate,
        completedAt,
        ownerId: input.ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            testPlans: true,
            testRuns: true,
            testCases: true,
            defects: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'milestone:update',
      entityType: 'Milestone',
      entityId: milestoneId,
      metadata: {
        changes: input,
        projectId,
      },
      ipAddress: ip,
      userAgent,
    });

    return updated;
  }

  async deleteMilestone(
    userId: string,
    orgId: string,
    projectId: string,
    milestoneId: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.ensureProject(orgId, projectId);

    const existing = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!existing) {
      throw new NotFoundError('Milestone not found in project');
    }

    await prisma.milestone.delete({
      where: { id: milestoneId },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'milestone:delete',
      entityType: 'Milestone',
      entityId: milestoneId,
      metadata: {
        name: existing.name,
        projectId,
      },
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Milestone deleted successfully' };
  }
}

export const milestoneService = new MilestoneService();
