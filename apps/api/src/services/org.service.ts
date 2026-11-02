import crypto from 'node:crypto';
import { prisma } from '../prisma.js';
import { generateAccessToken, generateRandomToken, hashToken } from '../utils/security.js';
import { createAuditLog } from './audit.service.js';
import { ForbiddenError, ConflictError, ValidationError, NotFoundError } from '../errors.js';
import { OrganizationRole, BillingTier } from '@ai-qa/shared-types';

export class OrganizationService {
  async createOrganization(userId: string, name: string, ip?: string, userAgent?: string) {
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

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

    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name, slug },
      });

      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: org.id,
          role: OrganizationRole.OWNER,
        },
      });

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          billingPlanId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      return org;
    });

    await createAuditLog({
      organizationId: organization.id,
      userId,
      action: 'ORGANIZATION_CREATE',
      entityType: 'Organization',
      entityId: organization.id,
      ipAddress: ip,
      userAgent,
      metadata: { name, slug },
    });

    return organization;
  }

  async getUserOrganizations(userId: string) {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      organization: m.organization,
    }));
  }

  async switchOrganization(userId: string, organizationId: string) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      include: {
        organization: true,
        user: true,
      },
    });

    if (!membership) {
      throw new ForbiddenError('Access denied: You are not a member of this organization');
    }

    const accessToken = generateAccessToken({
      sub: userId,
      email: membership.user.email,
      orgId: organizationId,
      role: membership.role as OrganizationRole,
    });

    return {
      accessToken,
      organization: membership.organization,
      role: membership.role,
    };
  }

  async inviteMember(
    currentUserId: string,
    orgId: string,
    email: string,
    role: OrganizationRole,
    ip?: string,
    userAgent?: string
  ) {
    // Check if user already a member of this organization
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        user: { email },
      },
    });

    if (existingMember) {
      throw new ConflictError('A user with this email is already a member of this organization');
    }

    // Invalidate existing pending invitations to this email for this org
    await prisma.invitation.deleteMany({
      where: { organizationId: orgId, email, status: 'PENDING' },
    });

    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: orgId,
        email,
        role,
        tokenHash,
        status: 'PENDING',
        invitedById: currentUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: currentUserId,
      action: 'MEMBER_INVITED',
      entityType: 'Invitation',
      entityId: invitation.id,
      ipAddress: ip,
      userAgent,
      metadata: { email, role },
    });

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      invitationToken: rawToken,
    };
  }

  async acceptInvitation(userId: string, rawToken: string, ip?: string, userAgent?: string) {
    const tokenHash = hashToken(rawToken);

    const invitation = await prisma.invitation.findFirst({
      where: {
        tokenHash,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { organization: true },
    });

    if (!invitation) {
      throw new ValidationError('Invalid or expired invitation token');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if already a member
    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });

    if (existing) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      return { organization: invitation.organization, role: existing.role };
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });
    });

    await createAuditLog({
      organizationId: invitation.organizationId,
      userId,
      action: 'INVITATION_ACCEPTED',
      entityType: 'OrganizationMember',
      entityId: userId,
      ipAddress: ip,
      userAgent,
      metadata: { role: invitation.role },
    });

    return {
      organization: invitation.organization,
      role: invitation.role,
    };
  }

  async getMembers(orgId: string) {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
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
      orderBy: { joinedAt: 'asc' },
    });

    return members;
  }

  async updateMemberRole(
    currentUserId: string,
    orgId: string,
    targetMemberId: string,
    newRole: OrganizationRole,
    ip?: string,
    userAgent?: string
  ) {
    const member = await prisma.organizationMember.findUnique({
      where: { id: targetMemberId },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundError('Member not found in this organization');
    }

    // If demoting an OWNER, ensure at least one other OWNER exists in the organization
    if (member.role === OrganizationRole.OWNER && newRole !== OrganizationRole.OWNER) {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: OrganizationRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new ValidationError('Cannot demote the sole Owner of this organization');
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: targetMemberId },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: currentUserId,
      action: 'MEMBER_ROLE_UPDATED',
      entityType: 'OrganizationMember',
      entityId: targetMemberId,
      ipAddress: ip,
      userAgent,
      metadata: { targetUserId: member.userId, oldRole: member.role, newRole },
    });

    return updated;
  }

  async removeMember(
    currentUserId: string,
    orgId: string,
    targetMemberId: string,
    ip?: string,
    userAgent?: string
  ) {
    const member = await prisma.organizationMember.findUnique({
      where: { id: targetMemberId },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundError('Member not found in this organization');
    }

    // Cannot remove the sole OWNER
    if (member.role === OrganizationRole.OWNER) {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: OrganizationRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new ValidationError('Cannot remove the sole Owner of this organization');
      }
    }

    await prisma.organizationMember.delete({
      where: { id: targetMemberId },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: currentUserId,
      action: 'MEMBER_REMOVED',
      entityType: 'OrganizationMember',
      entityId: targetMemberId,
      ipAddress: ip,
      userAgent,
      metadata: { removedUserId: member.userId },
    });
  }
}

export const organizationService = new OrganizationService();
