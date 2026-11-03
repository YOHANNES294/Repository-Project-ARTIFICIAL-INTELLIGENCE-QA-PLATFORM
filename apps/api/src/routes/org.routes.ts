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
import { requireEntitlement } from '../middleware/entitlement.js';
import { getAccessTokenCookieOptions } from '../utils/security.js';
import { OrganizationRole, ApiResponse, UpdateAIProviderConfigInput, UsageMetric } from '@ai-qa/shared-types';
import { updateAIProviderConfigSchema } from '@ai-qa/validation';
import { AIGatewayService } from '../services/ai/ai-gateway.service.js';
import { integrationRouter } from './integration.routes.js';
import { webhookRouter } from './webhook.routes.js';

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
  requireEntitlement(UsageMetric.MEMBERS, 1),
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

// --- Milestone 07 AI Provider & Telemetry Endpoints (Organization Scoped) ---

// Get AI Provider Configuration
organizationRouter.get(
  '/:orgId/ai/provider',
  authenticate,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await AIGatewayService.getProviderConfig(req.organizationId!);
      const response: ApiResponse = {
        success: true,
        data: config,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Update AI Provider Configuration (Owner / Admin / QA Manager)
organizationRouter.put(
  '/:orgId/ai/provider',
  authenticate,
  requireTenant,
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR, OrganizationRole.QA_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateAIProviderConfigSchema.parse(req.body) as UpdateAIProviderConfigInput;
      const updated = await AIGatewayService.updateProviderConfig(req.organizationId!, validated);
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

// Test Provider Connection
organizationRouter.post(
  '/:orgId/ai/provider/test',
  authenticate,
  requireTenant,
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR, OrganizationRole.QA_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AIGatewayService.testProviderConnection(req.organizationId!);
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

// Get Organization AI Usage Telemetry
organizationRouter.get(
  '/:orgId/ai/usage',
  authenticate,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await AIGatewayService.getUsageMetrics(req.organizationId!);
      const response: ApiResponse = {
        success: true,
        data: metrics,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Mount Milestone 10 subrouters scoped to organization
organizationRouter.use('/:orgId/integrations', integrationRouter);
organizationRouter.use('/:orgId/webhooks', webhookRouter);



