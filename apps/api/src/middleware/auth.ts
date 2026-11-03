import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { verifyAccessToken } from '../utils/security.js';
import { UnauthorizedError, ForbiddenError, ValidationError } from '../errors.js';
import { OrganizationRole } from '@ai-qa/shared-types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
}

export interface OrganizationMembershipContext {
  id: string;
  role: OrganizationRole;
  organizationId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organizationId?: string;
      membership?: OrganizationMembershipContext;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.accessToken as string | undefined;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperAdmin: true,
        isSuspended: true,
        suspensionReason: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found or deactivated');
    }

    if (user.isSuspended && !user.isSuperAdmin) {
      throw new ForbiddenError(
        user.suspensionReason
          ? `Your account has been suspended: ${user.suspensionReason}`
          : 'Your account has been suspended'
      );
    }

    req.user = user;
    if (payload.orgId) {
      req.organizationId = payload.orgId;
    }

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired authentication token'));
    }
  }
}

export async function requireTenant(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required before tenant resolution');
    }

    // Determine target organization from header or token context
    const requestedOrgId = (req.headers['x-organization-id'] as string) || req.organizationId;

    let targetOrgId = requestedOrgId;

    if (!targetOrgId) {
      // Find user's default/first organization membership
      const firstMembership = await prisma.organizationMember.findFirst({
        where: { userId: req.user.id },
        select: { organizationId: true },
        orderBy: { joinedAt: 'asc' },
      });

      if (!firstMembership) {
        throw new ForbiddenError('User does not belong to any organization');
      }

      targetOrgId = firstMembership.organizationId;
    }

    // STRICT TENANT ISOLATION CHECK:
    // Verify in database that this specific user is an active member of targetOrgId
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId: req.user.id,
        },
      },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (!membership && !req.user.isSuperAdmin) {
      throw new ForbiddenError('Tenant access denied: You are not a member of this organization');
    }

    // Verify organization suspension status if model is available
    const org = prisma.organization?.findUnique
      ? await prisma.organization.findUnique({
          where: { id: targetOrgId },
          select: { isSuspended: true, suspensionReason: true },
        })
      : null;

    if (org?.isSuspended && !req.user.isSuperAdmin) {
      throw new ForbiddenError(
        org.suspensionReason
          ? `Organization has been suspended: ${org.suspensionReason}`
          : 'Organization has been suspended'
      );
    }

    req.organizationId = targetOrgId;
    if (membership) {
      req.membership = {
        id: membership.id,
        role: membership.role as OrganizationRole,
        organizationId: membership.organizationId,
      };
    } else if (req.user.isSuperAdmin) {
      // SuperAdmin bypass context
      req.membership = {
        id: 'super-admin-override',
        role: OrganizationRole.OWNER,
        organizationId: targetOrgId,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: OrganizationRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (req.user.isSuperAdmin) {
      return next();
    }

    if (!req.membership) {
      return next(new ValidationError('Organization context not resolved'));
    }

    // Organization OWNER always possesses full administrative privileges
    if (req.membership.role === OrganizationRole.OWNER) {
      return next();
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions: Role ${req.membership.role} cannot perform this action`
        )
      );
    }

    next();
  };
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.isSuperAdmin) {
    return next(new ForbiddenError('Platform super administration privileges required'));
  }

  next();
}

