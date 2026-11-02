import { Router, Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/org.service.js';
import {
  createOrganizationSchema,
  switchOrganizationSchema,
  inviteMemberSchema,
  acceptInvitationSchema,
  updateMemberRoleSchema,
} from '@ai-qa/validation';
import { authenticate, requireTenant, requireRole } from '../middleware/auth.js';
import { getAccessTokenCookieOptions } from '../utils/security.js';
import { OrganizationRole, ApiResponse } from '@ai-qa/shared-types';

export const organizationRouter: Router = Router();

// Create new organization
organizationRouter.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createOrganizationSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const org = await organizationService.createOrganization(
        req.user!.id,
        validated.name,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: org,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get all organizations the current user belongs to
organizationRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgs = await organizationService.getUserOrganizations(req.user!.id);
      const response: ApiResponse = {
        success: true,
        data: orgs,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Switch active organization context
organizationRouter.post(
  '/switch',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = switchOrganizationSchema.parse(req.body);
      const result = await organizationService.switchOrganization(
        req.user!.id,
        validated.organizationId
      );

      res.cookie('accessToken', result.accessToken, getAccessTokenCookieOptions());

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Accept invitation
organizationRouter.post(
  '/invitations/accept',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = acceptInvitationSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await organizationService.acceptInvitation(
        req.user!.id,
        validated.token,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get members of organization (requires membership in that org)
organizationRouter.get(
  '/:orgId/members',
  authenticate,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await organizationService.getMembers(req.organizationId!);
      const response: ApiResponse = {
        success: true,
        data: members,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Invite a new member (requires OWNER or ADMINISTRATOR role)
organizationRouter.post(
  '/:orgId/invitations',
  authenticate,
  requireTenant,
  requireRole(OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = inviteMemberSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await organizationService.inviteMember(
        req.user!.id,
        req.organizationId!,
        validated.email,
        validated.role as OrganizationRole,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Update member role (requires OWNER or ADMINISTRATOR)
organizationRouter.patch(
  '/:orgId/members/:memberId',
  authenticate,
  requireTenant,
  requireRole(OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateMemberRoleSchema.parse(req.body);
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const updated = await organizationService.updateMemberRole(
        req.user!.id,
        req.organizationId!,
        req.params.memberId as string,
        validated.role as OrganizationRole,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: updated,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Remove member (requires OWNER or ADMINISTRATOR)
organizationRouter.delete(
  '/:orgId/members/:memberId',
  authenticate,
  requireTenant,
  requireRole(OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      await organizationService.removeMember(
        req.user!.id,
        req.organizationId!,
        req.params.memberId as string,
        ip,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: { message: 'Member removed successfully' },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);
