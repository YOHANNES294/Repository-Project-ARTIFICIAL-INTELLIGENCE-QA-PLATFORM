import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@ai-qa/validation';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} from '../utils/security.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { ApiResponse } from '@ai-qa/shared-types';

export const authRouter: Router = Router();

authRouter.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = registerSchema.parse(req.body);
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await authService.register(validated, ip, userAgent);

    res.cookie('accessToken', result.tokens.accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', result.tokens.refreshToken, getRefreshTokenCookieOptions());

    const response: ApiResponse = {
      success: true,
      data: {
        user: result.user,
        organization: result.organization,
        accessToken: result.tokens.accessToken,
        verificationToken: result.verificationToken,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body);
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(validated, ip, userAgent);

    res.cookie('accessToken', result.tokens.accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', result.tokens.refreshToken, getRefreshTokenCookieOptions());

    const response: ApiResponse = {
      success: true,
      data: {
        user: result.user,
        organization: result.organization,
        role: result.role,
        accessToken: result.tokens.accessToken,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = (req.cookies?.refreshToken as string) || (req.body?.refreshToken as string);
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Refresh token cookie or parameter is required',
        },
      });
      return;
    }

    const result = await authService.refreshTokenRotation(refreshToken, ip, userAgent);

    res.cookie('accessToken', result.tokens.accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', result.tokens.refreshToken, getRefreshTokenCookieOptions());

    const response: ApiResponse = {
      success: true,
      data: {
        accessToken: result.tokens.accessToken,
        organizationId: result.organizationId,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    res.clearCookie('accessToken', getClearCookieOptions('/'));
    res.clearCookie('refreshToken', getClearCookieOptions('/api/v1/auth'));
    next(error);
  }
});

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = (req.cookies?.refreshToken as string) || (req.body?.refreshToken as string);
    await authService.logout(refreshToken, req.user?.id, req.organizationId);

    res.clearCookie('accessToken', getClearCookieOptions('/'));
    res.clearCookie('refreshToken', getClearCookieOptions('/api/v1/auth'));

    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/forgot-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = forgotPasswordSchema.parse(req.body);
    const result = await authService.requestPasswordReset(validated.email);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'If the account exists, password reset instructions have been generated.',
        resetToken: result.resetToken, // Provided for automated testing / notifications
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    await authService.resetPassword(validated, ip, userAgent);

    res.clearCookie('accessToken', getClearCookieOptions('/'));
    res.clearCookie('refreshToken', getClearCookieOptions('/api/v1/auth'));

    const response: ApiResponse = {
      success: true,
      data: { message: 'Password has been reset successfully. Please log in with your new credentials.' },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = verifyEmailSchema.parse(req.body);
    await authService.verifyEmail(validated.token);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Email verified successfully.' },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      user: req.user,
      activeOrganizationId: req.organizationId,
    },
  };

  res.status(200).json(response);
});
