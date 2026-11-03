import { prisma } from '../prisma.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../errors.js';
import {
  DefectStatus,
  DefectSeverity,
  DefectPriority,
  DefectType,
  CreateDefectInput,
  UpdateDefectInput,
  TransitionDefectStatusInput,
  AssignDefectInput,
  CreateDefectCommentInput,
  LinkDefectTestInput,
} from '@ai-qa/shared-types';

export class DefectService {
  // ----------------------------------------------------
  // LIST & GET DEFECTS
  // ----------------------------------------------------
  static async getDefects(
    projectId: string,
    params: {
      search?: string;
      status?: DefectStatus;
      severity?: DefectSeverity;
      priority?: DefectPriority;
      type?: DefectType;
      assigneeId?: string;
      qaOwnerId?: string;
      reporterId?: string;
      environmentId?: string;
      milestoneId?: string;
      component?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { projectId };

    if (params.status) where.status = params.status;
    if (params.severity) where.severity = params.severity;
    if (params.priority) where.priority = params.priority;
    if (params.type) where.type = params.type;
    if (params.assigneeId) where.assigneeId = params.assigneeId;
    if (params.qaOwnerId) where.qaOwnerId = params.qaOwnerId;
    if (params.reporterId) where.reporterId = params.reporterId;
    if (params.environmentId) where.environmentId = params.environmentId;
    if (params.milestoneId) where.milestoneId = params.milestoneId;
    if (params.component) where.component = params.component;

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [defects, total] = await Promise.all([
      prisma.defect.findMany({
        where,
        skip,
        take: limit,
        orderBy: { defectNumber: 'desc' },
        include: {
          project: { select: { id: true, key: true, name: true } },
          environment: { select: { id: true, name: true } },
          milestone: { select: { id: true, name: true } },
          reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
          qaOwner: { select: { id: true, email: true, firstName: true, lastName: true } },
          duplicateOf: { select: { id: true, defectNumber: true, title: true, status: true } },
          tags: { select: { id: true, name: true, color: true } },
          _count: {
            select: {
              comments: true,
              attachments: true,
              testLinks: true,
              duplicates: true,
            },
          },
        },
      }),
      prisma.defect.count({ where }),
    ]);

    return {
      defects: defects.map((d: any) => ({
        ...d,
        key: `${d.project.key}-BUG-${d.defectNumber}`,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getDefectById(projectId: string, defectId: string, userRole?: string) {
    const defect = await prisma.defect.findUnique({
      where: { id: defectId },
      include: {
        project: { select: { id: true, key: true, name: true } },
        environment: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
        qaOwner: { select: { id: true, email: true, firstName: true, lastName: true } },
        duplicateOf: { select: { id: true, defectNumber: true, title: true, status: true } },
        duplicates: { select: { id: true, defectNumber: true, title: true, status: true } },
        tags: { select: { id: true, name: true, color: true } },
        testLinks: {
          include: {
            testCase: { select: { id: true, caseNumber: true, title: true } },
            testResult: {
              select: {
                id: true,
                attemptNumber: true,
                status: true,
                executedAt: true,
              },
            },
            testRun: { select: { id: true, runNumber: true, name: true } },
          },
        },
        comments: {
          where: userRole === 'VIEWER' ? { isInternal: false } : undefined,
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
            replies: {
              where: userRole === 'VIEWER' ? { isInternal: false } : undefined,
              include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
        history: {
          orderBy: { changedAt: 'desc' },
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        attachments: true,
        _count: {
          select: {
            comments: true,
            attachments: true,
            testLinks: true,
            duplicates: true,
          },
        },
      },
    });

    if (!defect || defect.projectId !== projectId) {
      throw new NotFoundError('Defect not found');
    }

    return {
      ...defect,
      key: `${defect.project.key}-BUG-${defect.defectNumber}`,
      // Filter root-level comments so replies are nested inside parent comments
      comments: defect.comments.filter((c: any) => !c.parentId),
    };
  }

  // ----------------------------------------------------
  // CREATE DEFECT (WITH PREFILL & TEST EXECUTION LINK)
  // ----------------------------------------------------
  static async createDefect(
    projectId: string,
    input: CreateDefectInput,
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true, organizationId: true },
    });
    if (!project) throw new NotFoundError('Project not found');

    // Validate test result if linking directly from execution
    let resolvedTestCaseId = input.testCaseId || null;
    let resolvedTestRunId = input.testRunId || null;

    if (input.testResultId) {
      const result = await prisma.testResult.findUnique({
        where: { id: input.testResultId },
        include: {
          testRunCase: {
            include: {
              testRun: { select: { id: true, projectId: true } },
              testCaseVersion: { select: { testCaseId: true } },
            },
          },
        },
      });

      if (!result || result.testRunCase.testRun.projectId !== projectId) {
        throw new ValidationError('Invalid test result ID for this project');
      }

      resolvedTestCaseId = result.testRunCase.testCaseVersion.testCaseId;
      resolvedTestRunId = result.testRunCase.testRun.id;
    }

    // Concurrency retry loop for sequential project-scoped defect IDs
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      try {
        const defect = await prisma.$transaction(async (tx: any) => {
          // Auto-increment defect number sequentially per project within transaction
          const lastDefect = await tx.defect.findFirst({
            where: { projectId },
            orderBy: { defectNumber: 'desc' },
            select: { defectNumber: true },
          });
          const nextDefectNumber = (lastDefect?.defectNumber || 0) + 1;

          // 1. Create Defect
          const newDefect = await tx.defect.create({
            data: {
              projectId,
              defectNumber: nextDefectNumber,
              title: input.title,
              description: input.description,
              stepsToRepro: input.stepsToRepro || null,
              expectedResult: input.expectedResult || null,
          actualResult: input.actualResult || null,
          severity: input.severity || DefectSeverity.MEDIUM,
          priority: input.priority || DefectPriority.MEDIUM,
          status: input.status || DefectStatus.NEW,
          type: input.type || DefectType.FUNCTIONAL,
          environmentId: input.environmentId || null,
          milestoneId: input.milestoneId || null,
          reporterId: userId,
          assigneeId: input.assigneeId || null,
          qaOwnerId: input.qaOwnerId || null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          browser: input.browser || null,
          os: input.os || null,
          appVersion: input.appVersion || null,
          device: input.device || null,
          component: input.component || null,
          tags: input.tagNames && input.tagNames.length > 0
            ? {
                connectOrCreate: input.tagNames.map((name) => ({
                  where: { projectId_name: { projectId, name } },
                  create: { projectId, name },
                })),
              }
            : undefined,
        },
        include: {
          project: { select: { id: true, key: true, name: true } },
          environment: { select: { id: true, name: true } },
          milestone: { select: { id: true, name: true } },
          reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
          qaOwner: { select: { id: true, email: true, firstName: true, lastName: true } },
          tags: { select: { id: true, name: true, color: true } },
        },
      });

      // 2. Link Test Result / Execution if provided
      if (input.testResultId || resolvedTestCaseId || resolvedTestRunId) {
        await tx.defectTestLink.create({
          data: {
            defectId: newDefect.id,
            testResultId: input.testResultId || null,
            testCaseId: resolvedTestCaseId,
            testRunId: resolvedTestRunId,
          },
        });
      }

      // 3. Associate attachments if provided
      if (input.attachmentIds && input.attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: input.attachmentIds }, projectId },
          data: { defectId: newDefect.id },
        });
      }

      // 4. Initial History entry
      await tx.defectHistory.create({
        data: {
          defectId: newDefect.id,
          userId,
          field: 'status',
          oldValue: null,
          newValue: newDefect.status,
          reason: 'Defect logged',
        },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: project.organizationId,
          userId,
          action: 'DEFECT_CREATED',
          entityType: 'Defect',
          entityId: newDefect.id,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          metadata: {
            key: `${project.key}-BUG-${newDefect.defectNumber}`,
            title: newDefect.title,
            severity: newDefect.severity,
          },
        },
      });

      return newDefect;
    });

    return {
      ...defect,
      key: `${defect.project.key}-BUG-${defect.defectNumber}`,
    };
  } catch (err: any) {
    if (err.code === 'P2002' && attempts < 5) {
      continue;
    }
    throw err;
  }
}
throw new Error('Failed to generate unique defect number after multiple attempts');
}

  // ----------------------------------------------------
  // UPDATE DEFECT
  // ----------------------------------------------------
  static async updateDefect(
    projectId: string,
    defectId: string,
    input: UpdateDefectInput,
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const defect = await prisma.defect.findUnique({
      where: { id: defectId },
      include: { project: { select: { organizationId: true, key: true } } },
    });

    if (!defect || defect.projectId !== projectId) {
      throw new NotFoundError('Defect not found');
    }

    const historyEntries: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

    if (input.title !== undefined && input.title !== defect.title) {
      historyEntries.push({ field: 'title', oldValue: defect.title, newValue: input.title });
    }
    if (input.severity !== undefined && input.severity !== defect.severity) {
      historyEntries.push({ field: 'severity', oldValue: defect.severity, newValue: input.severity });
    }
    if (input.priority !== undefined && input.priority !== defect.priority) {
      historyEntries.push({ field: 'priority', oldValue: defect.priority, newValue: input.priority });
    }
    if (input.assigneeId !== undefined && input.assigneeId !== defect.assigneeId) {
      historyEntries.push({ field: 'assigneeId', oldValue: defect.assigneeId, newValue: input.assigneeId });
    }
    if (input.qaOwnerId !== undefined && input.qaOwnerId !== defect.qaOwnerId) {
      historyEntries.push({ field: 'qaOwnerId', oldValue: defect.qaOwnerId, newValue: input.qaOwnerId });
    }
    if (input.component !== undefined && input.component !== defect.component) {
      historyEntries.push({ field: 'component', oldValue: defect.component, newValue: input.component });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const result = await tx.defect.update({
        where: { id: defectId },
        data: {
          title: input.title,
          description: input.description,
          stepsToRepro: input.stepsToRepro,
          expectedResult: input.expectedResult,
          actualResult: input.actualResult,
          severity: input.severity,
          priority: input.priority,
          type: input.type,
          environmentId: input.environmentId,
          milestoneId: input.milestoneId,
          assigneeId: input.assigneeId,
          qaOwnerId: input.qaOwnerId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          browser: input.browser,
          os: input.os,
          appVersion: input.appVersion,
          device: input.device,
          component: input.component,
          rootCause: input.rootCause,
          resolution: input.resolution,
        },
        include: {
          project: { select: { id: true, key: true, name: true } },
          environment: { select: { id: true, name: true } },
          milestone: { select: { id: true, name: true } },
          reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
          qaOwner: { select: { id: true, email: true, firstName: true, lastName: true } },
          tags: { select: { id: true, name: true, color: true } },
        },
      });

      // Record history changes
      if (historyEntries.length > 0) {
        await tx.defectHistory.createMany({
          data: historyEntries.map((h) => ({
            defectId,
            userId,
            field: h.field,
            oldValue: h.oldValue,
            newValue: h.newValue,
          })),
        });

        await tx.auditLog.create({
          data: {
            organizationId: defect.project.organizationId,
            userId,
            action: 'DEFECT_UPDATED',
            entityType: 'Defect',
            entityId: defectId,
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
            metadata: { changes: historyEntries },
          },
        });
      }

      return result;
    });

    return {
      ...updated,
      key: `${updated.project.key}-BUG-${updated.defectNumber}`,
    };
  }

  // ----------------------------------------------------
  // LIFECYCLE TRANSITIONS & STATE MACHINE
  // ----------------------------------------------------
  static readonly VALID_TRANSITIONS: Record<DefectStatus, DefectStatus[]> = {
    [DefectStatus.NEW]: [
      DefectStatus.OPEN,
      DefectStatus.TRIAGED,
      DefectStatus.ASSIGNED,
      DefectStatus.IN_PROGRESS,
      DefectStatus.REJECTED,
      DefectStatus.DUPLICATE,
    ],
    [DefectStatus.OPEN]: [
      DefectStatus.TRIAGED,
      DefectStatus.ASSIGNED,
      DefectStatus.IN_PROGRESS,
      DefectStatus.REJECTED,
      DefectStatus.DUPLICATE,
    ],
    [DefectStatus.TRIAGED]: [
      DefectStatus.ASSIGNED,
      DefectStatus.IN_PROGRESS,
      DefectStatus.REJECTED,
      DefectStatus.DUPLICATE,
    ],
    [DefectStatus.ASSIGNED]: [
      DefectStatus.IN_PROGRESS,
      DefectStatus.FIXED,
      DefectStatus.REJECTED,
      DefectStatus.DUPLICATE,
    ],
    [DefectStatus.IN_PROGRESS]: [
      DefectStatus.FIXED,
      DefectStatus.REJECTED,
      DefectStatus.DUPLICATE,
      DefectStatus.ASSIGNED,
    ],
    [DefectStatus.FIXED]: [
      DefectStatus.READY_FOR_RETEST,
      DefectStatus.REOPENED,
      DefectStatus.VERIFIED,
    ],
    [DefectStatus.READY_FOR_RETEST]: [
      DefectStatus.VERIFIED,
      DefectStatus.REOPENED,
      DefectStatus.IN_PROGRESS,
    ],
    [DefectStatus.VERIFIED]: [
      DefectStatus.CLOSED,
      DefectStatus.REOPENED,
    ],
    [DefectStatus.REOPENED]: [
      DefectStatus.IN_PROGRESS,
      DefectStatus.ASSIGNED,
      DefectStatus.FIXED,
      DefectStatus.REJECTED,
      DefectStatus.DUPLICATE,
    ],
    [DefectStatus.REJECTED]: [
      DefectStatus.REOPENED,
      DefectStatus.CLOSED,
    ],
    [DefectStatus.DUPLICATE]: [
      DefectStatus.REOPENED,
      DefectStatus.CLOSED,
    ],
    [DefectStatus.CLOSED]: [
      DefectStatus.REOPENED,
    ],
  };

  static async transitionStatus(
    projectId: string,
    defectId: string,
    input: TransitionDefectStatusInput,
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const targetStatus = input.status;

    // Sensitive transition requirements:
    // FIXED requires resolution notes
    if (targetStatus === DefectStatus.FIXED && !input.resolution?.trim()) {
      throw new ValidationError('Resolution details are required when marking a defect as FIXED');
    }

    // REJECTED requires explanation reason
    if (targetStatus === DefectStatus.REJECTED && !input.reason?.trim()) {
      throw new ValidationError('Reason is required when marking a defect as REJECTED');
    }

    // REOPENED requires reason
    if (targetStatus === DefectStatus.REOPENED && !input.reason?.trim()) {
      throw new ValidationError('Reason is required when reopening a defect');
    }

    // Atomic transaction for concurrency safety and cycle prevention
    const updated = await prisma.$transaction(async (tx: any) => {
      const defect = await tx.defect.findUnique({
        where: { id: defectId },
        include: { project: { select: { organizationId: true, key: true } } },
      });

      if (!defect || defect.projectId !== projectId) {
        throw new NotFoundError('Defect not found');
      }

      const currentStatus = defect.status;

      // Validate allowed transition atomically against latest database state
      const allowed = (this.VALID_TRANSITIONS as Record<string, DefectStatus[]>)[currentStatus] || [];
      if (!allowed.includes(targetStatus)) {
        throw new ValidationError(
          `Invalid defect status transition from ${currentStatus} to ${targetStatus}`
        );
      }

      // DUPLICATE requires duplicateOfId with cycle prevention
      if (targetStatus === DefectStatus.DUPLICATE) {
        if (!input.duplicateOfId) {
          throw new ValidationError('Canonical defect ID is required when marking as DUPLICATE');
        }
        if (input.duplicateOfId === defectId) {
          throw new ValidationError('A defect cannot be marked as a duplicate of itself');
        }

        // Check target exists and belongs to same project
        const canonical = await tx.defect.findUnique({
          where: { id: input.duplicateOfId },
          select: { id: true, projectId: true, duplicateOfId: true },
        });
        if (!canonical || canonical.projectId !== projectId) {
          throw new ValidationError('Canonical defect not found in this project');
        }

        // Cycle Prevention: traverse duplicateOfId chain
        let currCanonicalId: string | null = canonical.duplicateOfId;
        const visited = new Set<string>([defectId, canonical.id]);
        while (currCanonicalId) {
          if (visited.has(currCanonicalId)) {
            throw new ValidationError('Circular duplicate relationship detected');
          }
          visited.add(currCanonicalId);
          const next = await tx.defect.findUnique({
            where: { id: currCanonicalId },
            select: { duplicateOfId: true },
          });
          currCanonicalId = next?.duplicateOfId || null;
        }
      }

      // Prepare date updates
      let resolvedAt = defect.resolvedAt;
      let closedAt = defect.closedAt;

      if (targetStatus === DefectStatus.FIXED) {
        resolvedAt = new Date();
      } else if (targetStatus === DefectStatus.CLOSED) {
        closedAt = new Date();
      } else if (targetStatus === DefectStatus.REOPENED) {
        resolvedAt = null;
        closedAt = null;
      }

      const res = await tx.defect.update({
        where: { id: defectId },
        data: {
          status: targetStatus,
          resolution: input.resolution || defect.resolution,
          duplicateOfId: targetStatus === DefectStatus.DUPLICATE ? input.duplicateOfId : defect.duplicateOfId,
          resolvedAt,
          closedAt,
        },
        include: {
          project: { select: { id: true, key: true, name: true } },
          environment: { select: { id: true, name: true } },
          milestone: { select: { id: true, name: true } },
          reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
          qaOwner: { select: { id: true, email: true, firstName: true, lastName: true } },
          duplicateOf: { select: { id: true, defectNumber: true, title: true, status: true } },
        },
      });

      // Record History
      await tx.defectHistory.create({
        data: {
          defectId,
          userId,
          field: 'status',
          oldValue: currentStatus,
          newValue: targetStatus,
          reason: input.reason || input.resolution || null,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: defect.project.organizationId,
          userId,
          action: 'DEFECT_STATUS_CHANGED',
          entityType: 'Defect',
          entityId: defectId,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          metadata: {
            from: currentStatus,
            to: targetStatus,
            reason: input.reason || input.resolution,
          },
        },
      });

      return res;
    });

    return {
      ...updated,
      key: `${updated.project.key}-BUG-${updated.defectNumber}`,
    };
  }

  // ----------------------------------------------------
  // ASSIGN DEFECT
  // ----------------------------------------------------
  static async assignDefect(
    projectId: string,
    defectId: string,
    input: AssignDefectInput,
    userId: string
  ) {
    const defect = await prisma.defect.findUnique({
      where: { id: defectId },
      include: { project: { select: { key: true } } },
    });

    if (!defect || defect.projectId !== projectId) {
      throw new NotFoundError('Defect not found');
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const res = await tx.defect.update({
        where: { id: defectId },
        data: {
          assigneeId: input.assigneeId !== undefined ? input.assigneeId : defect.assigneeId,
          qaOwnerId: input.qaOwnerId !== undefined ? input.qaOwnerId : defect.qaOwnerId,
        },
        include: {
          project: { select: { id: true, key: true, name: true } },
          assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
          qaOwner: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });

      if (input.assigneeId && input.assigneeId !== defect.assigneeId) {
        await tx.defectAssignment.create({
          data: {
            defectId,
            userId: input.assigneeId,
          },
        });
        await tx.defectHistory.create({
          data: {
            defectId,
            userId,
            field: 'assignee',
            oldValue: defect.assigneeId,
            newValue: input.assigneeId,
          },
        });
      }

      if (input.qaOwnerId && input.qaOwnerId !== defect.qaOwnerId) {
        await tx.defectHistory.create({
          data: {
            defectId,
            userId,
            field: 'qaOwner',
            oldValue: defect.qaOwnerId,
            newValue: input.qaOwnerId,
          },
        });
      }

      return res;
    });

    return {
      ...updated,
      key: `${updated.project.key}-BUG-${updated.defectNumber}`,
    };
  }

  // ----------------------------------------------------
  // DUPLICATE DEFECT DETECTION ENGINE
  // ----------------------------------------------------
  static async findDuplicateCandidates(
    projectId: string,
    params: { title: string; component?: string; environmentId?: string }
  ) {
    if (!params.title || params.title.trim().length < 3) return [];

    const existingDefects = await prisma.defect.findMany({
      where: {
        projectId,
        status: { notIn: [DefectStatus.CLOSED, DefectStatus.REJECTED] },
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
      include: {
        project: { select: { key: true } },
        environment: { select: { id: true, name: true } },
      },
    });

    const queryWords = new Set(
      params.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 2)
    );

    const candidates: Array<{ defect: any; confidence: number; matchReasons: string[] }> = [];

    for (const d of existingDefects) {
      const matchReasons: string[] = [];
      let score = 0;

      // Title word overlap (Jaccard similarity)
      const targetWords = new Set(
        d.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 2)
      );

      const intersection = [...queryWords].filter((w) => targetWords.has(w));
      const union = new Set([...queryWords, ...targetWords]);
      const titleOverlap = union.size > 0 ? intersection.length / union.size : 0;

      score += titleOverlap * 0.6;
      if (titleOverlap > 0.3) {
        matchReasons.push(`Title matches: "${intersection.join(', ')}"`);
      }

      // Component match
      if (params.component && d.component && params.component.toLowerCase() === d.component.toLowerCase()) {
        score += 0.25;
        matchReasons.push(`Affected component matches: ${d.component}`);
      }

      // Environment match
      if (params.environmentId && d.environmentId === params.environmentId) {
        score += 0.15;
        matchReasons.push(`Same target environment`);
      }

      const confidence = Math.min(1, Math.round(score * 100) / 100);

      if (confidence >= 0.35) {
        candidates.push({
          defect: {
            ...d,
            key: `${d.project.key}-BUG-${d.defectNumber}`,
          },
          confidence,
          matchReasons,
        });
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  // ----------------------------------------------------
  // DEFECT COMMENTS & COLLABORATION
  // ----------------------------------------------------
  static async getComments(projectId: string, defectId: string, userRole?: string) {
    const defect = await prisma.defect.findUnique({
      where: { id: defectId },
      select: { projectId: true },
    });
    if (!defect || defect.projectId !== projectId) throw new NotFoundError('Defect not found');

    const comments = await prisma.defectComment.findMany({
      where: {
        defectId,
        parentId: null,
        isInternal: userRole === 'VIEWER' ? false : undefined,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
        replies: {
          where: userRole === 'VIEWER' ? { isInternal: false } : undefined,
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    return comments;
  }

  static async addComment(
    projectId: string,
    defectId: string,
    input: CreateDefectCommentInput,
    userId: string,
    userRole?: string
  ) {
    const defect = await prisma.defect.findUnique({
      where: { id: defectId },
      select: { projectId: true },
    });
    if (!defect || defect.projectId !== projectId) throw new NotFoundError('Defect not found');

    // Only staff can post internal notes
    const isInternal = userRole !== 'VIEWER' && !!input.isInternal;

    const comment = await prisma.defectComment.create({
      data: {
        defectId,
        userId,
        content: input.content.trim(),
        parentId: input.parentId || null,
        isInternal,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return comment;
  }

  static async deleteComment(
    projectId: string,
    defectId: string,
    commentId: string,
    userId: string,
    userRole?: string
  ) {
    const comment = await prisma.defectComment.findUnique({
      where: { id: commentId },
      include: { defect: { select: { projectId: true } } },
    });

    if (!comment || comment.defect.projectId !== projectId || comment.defectId !== defectId) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId && userRole !== 'OWNER' && userRole !== 'ADMINISTRATOR') {
      throw new ForbiddenError('You can only delete your own comments');
    }

    await prisma.defectComment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully' };
  }

  // ----------------------------------------------------
  // TEST EXECUTION LINKING
  // ----------------------------------------------------
  static async linkTest(
    projectId: string,
    defectId: string,
    input: LinkDefectTestInput,
    userId: string
  ) {
    const defect = await prisma.defect.findUnique({
      where: { id: defectId },
      select: { id: true, projectId: true },
    });
    if (!defect || defect.projectId !== projectId) throw new NotFoundError('Defect not found');

    const link = await prisma.defectTestLink.create({
      data: {
        defectId,
        testCaseId: input.testCaseId || null,
        testResultId: input.testResultId || null,
        testRunId: input.testRunId || null,
      },
      include: {
        testCase: { select: { id: true, caseNumber: true, title: true } },
        testResult: {
          select: {
            id: true,
            attemptNumber: true,
            status: true,
            executedAt: true,
          },
        },
        testRun: { select: { id: true, runNumber: true, name: true } },
      },
    });

    await prisma.defectHistory.create({
      data: {
        defectId,
        userId,
        field: 'testLink',
        oldValue: null,
        newValue: input.testResultId || input.testCaseId || input.testRunId,
        reason: 'Linked QA execution test reference',
      },
    });

    return link;
  }

  static async unlinkTest(projectId: string, defectId: string, linkId: string, userId: string) {
    const link = await prisma.defectTestLink.findUnique({
      where: { id: linkId },
      include: { defect: { select: { projectId: true } } },
    });

    if (!link || link.defectId !== defectId || link.defect.projectId !== projectId) {
      throw new NotFoundError('Test link not found');
    }

    await prisma.defectTestLink.delete({ where: { id: linkId } });

    await prisma.defectHistory.create({
      data: {
        defectId,
        userId,
        field: 'testLink',
        oldValue: linkId,
        newValue: null,
        reason: 'Unlinked test execution reference',
      },
    });

    return { message: 'Test link removed successfully' };
  }

  // ----------------------------------------------------
  // DEFECT HISTORY
  // ----------------------------------------------------
  static async getHistory(projectId: string, defectId: string) {
    const defect = await prisma.defect.findUnique({
      where: { id: defectId },
      select: { projectId: true },
    });
    if (!defect || defect.projectId !== projectId) throw new NotFoundError('Defect not found');

    return prisma.defectHistory.findMany({
      where: { defectId },
      orderBy: { changedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  // ----------------------------------------------------
  // DELETE DEFECT (SAFEGUARDED)
  // ----------------------------------------------------
  static async deleteDefect(projectId: string, defectId: string, userId: string) {
    const defect = await prisma.defect.findUnique({
      where: { id: defectId },
      include: {
        project: { select: { organizationId: true } },
        _count: {
          select: { testLinks: true, duplicates: true },
        },
      },
    });

    if (!defect || defect.projectId !== projectId) {
      throw new NotFoundError('Defect not found');
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.defect.delete({ where: { id: defectId } });
      await tx.auditLog.create({
        data: {
          organizationId: defect.project.organizationId,
          userId,
          action: 'DEFECT_DELETED',
          entityType: 'Defect',
          entityId: defectId,
        },
      });
    });

    return { message: 'Defect deleted successfully' };
  }

  // ----------------------------------------------------
  // DEFECT ANALYTICS (DATABASE-BACKED)
  // ----------------------------------------------------
  static async getAnalytics(
    projectId: string,
    params: { milestoneId?: string; environmentId?: string } = {}
  ) {
    const where: any = { projectId };
    if (params.milestoneId) where.milestoneId = params.milestoneId;
    if (params.environmentId) where.environmentId = params.environmentId;

    const defects = await prisma.defect.findMany({
      where,
      select: {
        id: true,
        defectNumber: true,
        title: true,
        status: true,
        severity: true,
        priority: true,
        component: true,
        assigneeId: true,
        milestoneId: true,
        createdAt: true,
        resolvedAt: true,
        closedAt: true,
        project: { select: { key: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        milestone: { select: { id: true, name: true } },
      },
    });

    const totalDefects = defects.length;
    let openDefects = 0;
    let resolvedDefects = 0;
    let closedDefects = 0;
    let criticalHighDefects = 0;
    let totalResolutionTimeHours = 0;
    let resolvedCountForTime = 0;

    const byStatusMap = new Map<string, number>();
    const bySeverityMap = new Map<string, number>();
    const byPriorityMap = new Map<string, number>();
    const byDeveloperMap = new Map<string, { name: string; email: string; count: number }>();
    const byComponentMap = new Map<string, number>();
    const byMilestoneMap = new Map<string, { name: string; count: number }>();

    let lessThan7Days = 0;
    let between7And30Days = 0;
    let moreThan30Days = 0;

    const now = new Date().getTime();

    for (const d of defects) {
      // Status Counts
      byStatusMap.set(d.status, (byStatusMap.get(d.status) || 0) + 1);

      if (
        d.status === DefectStatus.NEW ||
        d.status === DefectStatus.OPEN ||
        d.status === DefectStatus.TRIAGED ||
        d.status === DefectStatus.ASSIGNED ||
        d.status === DefectStatus.IN_PROGRESS ||
        d.status === DefectStatus.REOPENED
      ) {
        openDefects++;
      }

      if (d.status === DefectStatus.FIXED || d.status === DefectStatus.VERIFIED || d.status === DefectStatus.CLOSED) {
        resolvedDefects++;
      }

      if (d.status === DefectStatus.CLOSED) {
        closedDefects++;
      }

      // Severity Counts
      bySeverityMap.set(d.severity, (bySeverityMap.get(d.severity) || 0) + 1);
      if (
        d.severity === DefectSeverity.CRITICAL ||
        d.severity === DefectSeverity.HIGH ||
        d.severity === DefectSeverity.MAJOR
      ) {
        criticalHighDefects++;
      }

      // Priority Counts
      byPriorityMap.set(d.priority, (byPriorityMap.get(d.priority) || 0) + 1);

      // Developer Counts
      if (d.assignee) {
        const existing = byDeveloperMap.get(d.assignee.id) || {
          name: `${d.assignee.firstName} ${d.assignee.lastName}`.trim(),
          email: d.assignee.email,
          count: 0,
        };
        existing.count++;
        byDeveloperMap.set(d.assignee.id, existing);
      }

      // Component Counts
      if (d.component) {
        byComponentMap.set(d.component, (byComponentMap.get(d.component) || 0) + 1);
      }

      // Milestone Counts
      if (d.milestone) {
        const existing = byMilestoneMap.get(d.milestone.id) || {
          name: d.milestone.name,
          count: 0,
        };
        existing.count++;
        byMilestoneMap.set(d.milestone.id, existing);
      }

      // Resolution Time
      if (d.resolvedAt) {
        const diffMs = new Date(d.resolvedAt).getTime() - new Date(d.createdAt).getTime();
        if (diffMs > 0) {
          totalResolutionTimeHours += diffMs / (1000 * 60 * 60);
          resolvedCountForTime++;
        }
      }

      // Aging
      const ageDays = (now - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < 7) {
        lessThan7Days++;
      } else if (ageDays <= 30) {
        between7And30Days++;
      } else {
        moreThan30Days++;
      }
    }

    const avgTimeToResolutionHours =
      resolvedCountForTime > 0
        ? Math.round((totalResolutionTimeHours / resolvedCountForTime) * 10) / 10
        : 0;

    // Fetch reopened count from history
    const reopenedHistoryCount = await prisma.defectHistory.count({
      where: {
        defect: { projectId },
        field: 'status',
        newValue: DefectStatus.REOPENED,
      },
    });

    const totalResolvedOrClosed = resolvedDefects + closedDefects;
    const reopenedRate =
      totalResolvedOrClosed > 0
        ? Math.round((reopenedHistoryCount / totalResolvedOrClosed) * 1000) / 10
        : 0;

    // Recent activity
    const recentActivity = await prisma.defectHistory.findMany({
      where: { defect: { projectId } },
      orderBy: { changedAt: 'desc' },
      take: 10,
      include: {
        defect: { select: { id: true, defectNumber: true, title: true, project: { select: { key: true } } } },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return {
      totalDefects,
      openDefects,
      resolvedDefects,
      closedDefects,
      criticalHighDefects,
      avgTimeToResolutionHours,
      reopenedRate,
      byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count })),
      bySeverity: Array.from(bySeverityMap.entries()).map(([severity, count]) => ({ severity, count })),
      byPriority: Array.from(byPriorityMap.entries()).map(([priority, count]) => ({ priority, count })),
      byDeveloper: Array.from(byDeveloperMap.entries()).map(([userId, data]) => ({
        userId,
        name: data.name,
        email: data.email,
        count: data.count,
      })),
      byComponent: Array.from(byComponentMap.entries()).map(([component, count]) => ({ component, count })),
      byMilestone: Array.from(byMilestoneMap.entries()).map(([milestoneId, data]) => ({
        milestoneId,
        name: data.name,
        count: data.count,
      })),
      aging: {
        lessThan7Days,
        between7And30Days,
        moreThan30Days,
      },
      recentActivity: recentActivity.map((a: any) => ({
        id: a.id,
        defectId: a.defect.id,
        defectKey: `${a.defect.project.key}-BUG-${a.defect.defectNumber}`,
        defectTitle: a.defect.title,
        field: a.field,
        newValue: a.newValue,
        changedBy: `${a.user?.firstName || 'System'} ${a.user?.lastName || ''}`.trim(),
        changedAt: a.changedAt.toISOString(),
      })),
    };
  }
}
