import { prisma } from '../prisma.js';
import { logger } from '../logger.js';

export interface AuditLogParams {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      },
    });
  } catch (error) {
    logger.error('Failed to persist audit log entry:', {
      error: error instanceof Error ? error.message : String(error),
      action: params.action,
      entityId: params.entityId,
    });
  }
}
