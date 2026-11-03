import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { ForbiddenError } from '../errors.js';
import { automationTokenService } from '../services/automation/automation-token.service.js';
import { authenticate } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      isAutomationRunner?: boolean;
      automationTokenId?: string;
    }
  }
}

/**
 * Middleware that authenticates either an Automation API Token (Bearer aiqa_auto_...)
 * or a standard authenticated user session (cookie/Bearer JWT).
 * Strictly verifies project tenant isolation.
 */
export async function authenticateAutomationOrUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const projectId = req.params.projectId as string | undefined;

  let rawToken: string | undefined;

  // Check header 'x-automation-token'
  if (req.headers['x-automation-token']) {
    rawToken = req.headers['x-automation-token'] as string;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    const bearer = req.headers.authorization.substring(7);
    if (bearer.startsWith('aiqa_auto_')) {
      rawToken = bearer;
    }
  }

  // 1. If automation token is present, validate it
  if (rawToken) {
    try {
      const auth = await automationTokenService.authenticateToken(rawToken);

      if (projectId && auth.projectId !== projectId) {
        throw new ForbiddenError('Automation token is not authorized for this project');
      }

      req.isAutomationRunner = true;
      req.automationTokenId = auth.token.id;
      req.organizationId = auth.organizationId;
      return next();
    } catch (err: any) {
      return next(err);
    }
  }

  // 2. Otherwise fall back to standard user authentication
  authenticate(req, res, async (authErr) => {
    if (authErr) {
      return next(authErr);
    }

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true },
      });

      if (!project) {
        return next();
      }

      req.organizationId = project.organizationId;

      // Verify membership
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership) {
        return next(new ForbiddenError('You are not a member of this organization'));
      }
    }

    next();
  });
}
