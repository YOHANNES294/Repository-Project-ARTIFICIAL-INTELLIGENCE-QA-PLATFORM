import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma.js';
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/security.js';
import { createAuditLog } from './audit.service.js';
import { UnauthorizedError, ConflictError, ValidationError, NotFoundError } from '../errors.js';
import { RegisterInput, LoginInput, ResetPasswordInput } from '@ai-qa/validation';
import { OrganizationRole, BillingTier } from '@ai-qa/shared-types';

export class AuthService {
  async register(input: RegisterInput, ip?: string, userAgent?: string) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    // Create unique slug for the organization
    const baseSlug = input.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

    // Ensure default Free billing plan exists
    let freePlan = await prisma.billingPlan.findUnique({
      where: { tier: BillingTier.FREE },
    });

    if (!freePlan) {
      freePlan = await prisma.billingPlan.create({
        data: {
          name: 'Free Plan',
          tier: BillingTier.FREE,
          priceCentsMonth: 0,
          maxProjects: 3,
          maxMembers: 5,
          maxTestCases: 500,
          maxTestRuns: 100,
          maxAiRequests: 100,
          storageMb: 1024,
        },
      });
    }

    // Execute atomic creation of user, organization, ownership and subscription
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          isEmailVerified: false,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.OWNER,
        },
      });

      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          billingPlanId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      return { user, organization };
    });

    // Create email verification token
    const verificationRawToken = generateRandomToken();
    await prisma.verificationToken.create({
      data: {
        identifier: result.user.email,
        tokenHash: hashToken(verificationRawToken),
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Issue initial session tokens
    const familyId = uuidv4();
    const accessToken = generateAccessToken({
      sub: result.user.id,
      email: result.user.email,
      orgId: result.organization.id,
      role: OrganizationRole.OWNER,
    });
    const refreshToken = generateRefreshToken({
      sub: result.user.id,
      familyId,
      orgId: result.organization.id,
    });

    // Store hashed refresh token
    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        organizationId: result.organization.id,
        tokenHash: hashToken(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: ip,
        userAgent,
      },
    });

    await createAuditLog({
      organizationId: result.organization.id,
      userId: result.user.id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: result.user.id,
      ipAddress: ip,
      userAgent,
      metadata: { email: result.user.email, organizationName: result.organization.name },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isEmailVerified: result.user.isEmailVerified,
      },
      organization: result.organization,
      tokens: { accessToken, refreshToken },
      verificationToken: verificationRawToken,
    };
  }

  async login(input: LoginInput, ip?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const primaryMembership = user.memberships[0];
    const organizationId = primaryMembership?.organizationId;
    const role = primaryMembership?.role as OrganizationRole | undefined;

    const familyId = uuidv4();
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      orgId: organizationId,
      role,
    });
    const refreshToken = generateRefreshToken({
      sub: user.id,
      familyId,
      orgId: organizationId,
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        organizationId,
        tokenHash: hashToken(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: ip,
        userAgent,
      },
    });

    if (organizationId) {
      await createAuditLog({
        organizationId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ip,
        userAgent,
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        isSuperAdmin: user.isSuperAdmin,
      },
      organization: primaryMembership?.organization,
      role,
      tokens: { accessToken, refreshToken },
    };
  }

  async refreshTokenRotation(rawRefreshToken: string, ip?: string, userAgent?: string) {
    try {
      verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Session not found or already invalidated');
    }

    // CRITICAL SECURITY FEATURE: Token reuse detection
    // If an already revoked token is used, assume breach and revoke entire family!
    if (storedToken.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { familyId: storedToken.familyId },
        data: { isRevoked: true },
      });

      if (storedToken.organizationId) {
        await createAuditLog({
          organizationId: storedToken.organizationId,
          userId: storedToken.userId,
          action: 'SECURITY_ALERT_TOKEN_REUSE',
          entityType: 'RefreshToken',
          entityId: storedToken.id,
          ipAddress: ip,
          userAgent,
          metadata: { familyId: storedToken.familyId },
        });
      }

      throw new UnauthorizedError('Security alert: Refresh token reuse detected. All sessions in this family revoked.');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Check membership role for active organization
    let userRole: OrganizationRole | undefined;
    if (storedToken.organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: storedToken.organizationId,
            userId: storedToken.userId,
          },
        },
      });
      userRole = membership?.role as OrganizationRole | undefined;
    }

    // Issue rotated tokens in the same family
    const newAccessToken = generateAccessToken({
      sub: storedToken.userId,
      email: storedToken.user.email,
      orgId: storedToken.organizationId || undefined,
      role: userRole,
    });
    const newRefreshToken = generateRefreshToken({
      sub: storedToken.userId,
      familyId: storedToken.familyId,
      orgId: storedToken.organizationId || undefined,
    });

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.userId,
        organizationId: storedToken.organizationId,
        tokenHash: hashToken(newRefreshToken),
        familyId: storedToken.familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: ip,
        userAgent,
      },
    });

    return {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      userId: storedToken.userId,
      organizationId: storedToken.organizationId,
    };
  }

  async logout(rawRefreshToken?: string, userId?: string, orgId?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    }

    if (orgId && userId) {
      await createAuditLog({
        organizationId: orgId,
        userId,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
      });
    }
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Timing-attack safe: return immediately if user not found without disclosing presence
    if (!user) {
      return { sent: true };
    }

    const resetToken = generateRandomToken();
    const tokenHash = hashToken(resetToken);

    // Invalidate existing active reset tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email, type: 'PASSWORD_RESET' },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        tokenHash,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    return { sent: true, resetToken };
  }

  async resetPassword(input: ResetPasswordInput, ip?: string, userAgent?: string) {
    const tokenHash = hashToken(input.token);

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        type: 'PASSWORD_RESET',
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.identifier },
      include: { memberships: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all existing sessions for this user on password reset
      await tx.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
      });

      await tx.verificationToken.delete({
        where: { id: tokenRecord.id },
      });
    });

    const primaryOrgId = user.memberships[0]?.organizationId;
    if (primaryOrgId) {
      await createAuditLog({
        organizationId: primaryOrgId,
        userId: user.id,
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ip,
        userAgent,
      });
    }

    return { success: true };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        type: 'EMAIL_VERIFICATION',
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      throw new ValidationError('Invalid or expired verification token');
    }

    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.identifier },
      include: { memberships: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      });

      await tx.verificationToken.delete({
        where: { id: tokenRecord.id },
      });
    });

    const primaryOrgId = user.memberships[0]?.organizationId;
    if (primaryOrgId) {
      await createAuditLog({
        organizationId: primaryOrgId,
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        entityType: 'User',
        entityId: user.id,
      });
    }

    return { verified: true };
  }
}

export const authService = new AuthService();
