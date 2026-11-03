import crypto from 'crypto';
import { prisma } from '../../prisma.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../errors.js';
import {
  AutomationApiTokenDto,
  CreateAutomationTokenInput,
  CreateAutomationTokenResponseDto,
} from '@ai-qa/shared-types';

export class AutomationTokenService {
  /**
   * Create a new scoped Automation API Token for CI/CD runners.
   * Generates a raw token formatted as `aiqa_auto_<prefix>_<randomSecret>`,
   * stores only the SHA-256 hash in the database, and returns the raw token once.
   */
  async createToken(
    projectId: string,
    organizationId: string,
    input: CreateAutomationTokenInput,
    userId?: string
  ): Promise<CreateAutomationTokenResponseDto> {
    if (!input.name || input.name.trim().length < 2) {
      throw new ValidationError('Token name must be at least 2 characters');
    }

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundError('Project not found in this organization');
    }

    // Generate random secret and prefix
    const randomHex = crypto.randomBytes(24).toString('hex');
    const prefixSegment = crypto.randomBytes(4).toString('hex');
    const tokenPrefix = `aiqa_auto_${prefixSegment}`;
    const rawToken = `${tokenPrefix}_${randomHex}`;

    // SHA-256 hash of the entire raw token
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    const scopes = input.scopes && input.scopes.length > 0 ? input.scopes : ['automation:ingest'];

    const tokenRecord = await prisma.automationApiToken.create({
      data: {
        projectId,
        organizationId,
        name: input.name.trim(),
        tokenPrefix,
        tokenHash,
        scopes,
        expiresAt,
        createdById: userId || null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      token: this.mapToDto(tokenRecord),
      rawToken,
    };
  }

  /**
   * Authenticate a raw token string from HTTP header.
   */
  async authenticateToken(rawToken: string): Promise<{
    token: AutomationApiTokenDto;
    projectId: string;
    organizationId: string;
    scopes: string[];
  }> {
    if (!rawToken || !rawToken.startsWith('aiqa_auto_')) {
      throw new UnauthorizedError('Invalid automation token format');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const tokenRecord = await prisma.automationApiToken.findUnique({
      where: { tokenHash },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedError('Automation token not found or invalid');
    }

    if (tokenRecord.isRevoked) {
      throw new UnauthorizedError('Automation token has been revoked');
    }

    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Automation token has expired');
    }

    // Update lastUsedAt asynchronously
    await prisma.automationApiToken.update({
      where: { id: tokenRecord.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      token: this.mapToDto(tokenRecord),
      projectId: tokenRecord.projectId,
      organizationId: tokenRecord.organizationId,
      scopes: tokenRecord.scopes,
    };
  }

  /**
   * List active and revoked tokens for a project.
   */
  async listTokens(projectId: string): Promise<AutomationApiTokenDto[]> {
    const tokens = await prisma.automationApiToken.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return tokens.map((t) => this.mapToDto(t));
  }

  /**
   * Revoke an API token.
   */
  async revokeToken(projectId: string, tokenId: string): Promise<AutomationApiTokenDto> {
    const existing = await prisma.automationApiToken.findFirst({
      where: { id: tokenId, projectId },
    });

    if (!existing) {
      throw new NotFoundError('Automation token not found in this project');
    }

    if (existing.isRevoked) {
      return this.mapToDto(existing);
    }

    const updated = await prisma.automationApiToken.update({
      where: { id: tokenId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return this.mapToDto(updated);
  }

  private mapToDto(record: any): AutomationApiTokenDto {
    return {
      id: record.id,
      projectId: record.projectId,
      organizationId: record.organizationId,
      name: record.name,
      tokenPrefix: record.tokenPrefix,
      scopes: record.scopes || ['automation:ingest'],
      lastUsedAt: record.lastUsedAt ? record.lastUsedAt.toISOString() : null,
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
      isRevoked: record.isRevoked,
      revokedAt: record.revokedAt ? record.revokedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      createdBy: record.createdBy || null,
    };
  }
}

export const automationTokenService = new AutomationTokenService();
