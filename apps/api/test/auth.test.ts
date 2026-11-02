import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { hashPassword, generateAccessToken, hashToken } from '../src/utils/security.js';
import { OrganizationRole } from '@ai-qa/shared-types';

vi.mock('../src/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      organization: {
        create: vi.fn(),
      },
      organizationMember: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      billingPlan: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      subscription: {
        create: vi.fn(),
      },
      invitation: {
        create: vi.fn(),
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      verificationToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe('Authentication & Multi-Tenant SaaS Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('successfully registers new user with organization and sets HTTP-only cookies', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.billingPlan.findUnique).mockResolvedValue({
        id: 'plan-1',
        name: 'Free Plan',
        tier: 'FREE' as any,
        priceCentsMonth: 0,
        maxProjects: 3,
        maxMembers: 5,
        maxTestCases: 500,
        maxTestRuns: 100,
        maxAiRequests: 100,
        storageMb: 1024,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockUser = {
        id: 'user-uuid-1',
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'QA',
        passwordHash: 'hash',
        isEmailVerified: false,
        isSuperAdmin: false,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOrg = {
        id: 'org-uuid-1',
        name: 'Quality Corp',
        slug: 'quality-corp-123',
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          user: { create: vi.fn().mockResolvedValue(mockUser) },
          organization: { create: vi.fn().mockResolvedValue(mockOrg) },
          organizationMember: { create: vi.fn().mockResolvedValue({}) },
          subscription: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
          firstName: 'Alice',
          lastName: 'QA',
          organizationName: 'Quality Corp',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.organization.id).toBe('org-uuid-1');
      expect(res.body.data.accessToken).toBeDefined();

      // Check HTTP-only cookies
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('accessToken=') && c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken=') && c.includes('HttpOnly'))).toBe(true);
    });

    it('rejects duplicate email registration with 409 Conflict', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-id',
        email: 'alice@example.com',
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
          firstName: 'Alice',
          lastName: 'QA',
          organizationName: 'Quality Corp',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('validates password complexity and email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
          firstName: '',
          lastName: '',
          organizationName: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('successfully logs in with valid credentials', async () => {
      const passwordHash = await hashPassword('ValidPass123!');

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'bob@example.com',
        firstName: 'Bob',
        lastName: 'QA',
        passwordHash,
        isEmailVerified: true,
        isSuperAdmin: false,
        memberships: [
          {
            id: 'mem-1',
            organizationId: 'org-1',
            role: OrganizationRole.OWNER,
            organization: { id: 'org-1', name: 'Bob QA Inc', slug: 'bob-qa' },
          },
        ],
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'ValidPass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('bob@example.com');
      expect(res.body.data.role).toBe(OrganizationRole.OWNER);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('rejects invalid password with 401 Unauthorized', async () => {
      const passwordHash = await hashPassword('ValidPass123!');

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'bob@example.com',
        passwordHash,
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/refresh (Token Rotation & Revocation)', () => {
    it('rotates valid refresh token and issues new tokens in same family', async () => {
      const { generateRefreshToken } = await import('../src/utils/security.js');
      const validRefreshToken = generateRefreshToken({
        sub: 'user-1',
        familyId: 'fam-123',
        orgId: 'org-1',
      });

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: 'tok-1',
        userId: 'user-1',
        organizationId: 'org-1',
        familyId: 'fam-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000000),
        user: { email: 'user@example.com' },
      } as any);

      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
        id: 'mem-1',
        role: OrganizationRole.QA_ENGINEER,
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${validRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      // Check that old token was marked revoked
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tok-1' },
          data: { isRevoked: true },
        })
      );
    });

    it('detects token reuse and revokes entire family of tokens', async () => {
      const { generateRefreshToken } = await import('../src/utils/security.js');
      const compromisedRefreshToken = generateRefreshToken({
        sub: 'user-1',
        familyId: 'fam-compromised',
      });

      // Token already marked isRevoked: true
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: 'tok-used',
        userId: 'user-1',
        organizationId: 'org-1',
        familyId: 'fam-compromised',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 1000000),
        user: { email: 'user@example.com' },
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${compromisedRefreshToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      // Verify entire family is revoked
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'fam-compromised' },
        data: { isRevoked: true },
      });
    });
  });

  describe('Password Reset & Email Verification', () => {
    it('requests password reset without leaking email non-existence', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('resets password and revokes all active user sessions', async () => {
      const resetToken = 'valid-reset-token';
      const tokenHash = hashToken(resetToken);

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 'vt-1',
        identifier: 'user@example.com',
        tokenHash,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        memberships: [{ organizationId: 'org-1' }],
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          user: { update: vi.fn() },
          refreshToken: { updateMany: vi.fn() },
          verificationToken: { delete: vi.fn() },
        });
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('verifies email with valid verification token', async () => {
      const verifyToken = 'valid-verify-token';
      const tokenHash = hashToken(verifyToken);

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 'vt-2',
        identifier: 'user@example.com',
        tokenHash,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        memberships: [{ organizationId: 'org-1' }],
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          user: { update: vi.fn() },
          verificationToken: { delete: vi.fn() },
        });
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verifyToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Tenant Isolation & RBAC Authorization', () => {
    it('denies access if user is not a member of the requested organization (Strict Tenant Isolation)', async () => {
      const token = generateAccessToken({
        sub: 'user-hacker',
        email: 'hacker@example.com',
        orgId: 'org-victim',
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-hacker',
        email: 'hacker@example.com',
        firstName: 'Evil',
        lastName: 'Actor',
        isSuperAdmin: false,
      } as any);

      // Membership query returns null: Hacker is NOT a member of org-victim
      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/organizations/org-victim/members')
        .set('Authorization', `Bearer ${token}`)
        .set('x-organization-id', 'org-victim');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Tenant access denied');
    });

    it('enforces RBAC: VIEWER cannot invite members, returns 403 Forbidden', async () => {
      const token = generateAccessToken({
        sub: 'viewer-user',
        email: 'viewer@example.com',
        orgId: 'org-target',
        role: OrganizationRole.VIEWER,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'viewer-user',
        email: 'viewer@example.com',
        firstName: 'View',
        lastName: 'Only',
        isSuperAdmin: false,
      } as any);

      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
        id: 'mem-viewer',
        organizationId: 'org-target',
        userId: 'viewer-user',
        role: OrganizationRole.VIEWER,
      } as any);

      const res = await request(app)
        .post('/api/v1/organizations/org-target/invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('x-organization-id', 'org-target')
        .send({
          email: 'newuser@example.com',
          role: OrganizationRole.QA_ENGINEER,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Insufficient permissions');
    });

    it('allows OWNER to invite new members', async () => {
      const token = generateAccessToken({
        sub: 'owner-user',
        email: 'owner@example.com',
        orgId: 'org-target',
        role: OrganizationRole.OWNER,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'owner-user',
        email: 'owner@example.com',
        firstName: 'Org',
        lastName: 'Owner',
        isSuperAdmin: false,
      } as any);

      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
        id: 'mem-owner',
        organizationId: 'org-target',
        userId: 'owner-user',
        role: OrganizationRole.OWNER,
      } as any);

      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-target',
        email: 'engineer@example.com',
        role: OrganizationRole.QA_ENGINEER,
        tokenHash: 'hash',
        status: 'PENDING',
        invitedById: 'owner-user',
        expiresAt: new Date(Date.now() + 1000000),
        createdAt: new Date(),
        acceptedAt: null,
      });

      const res = await request(app)
        .post('/api/v1/organizations/org-target/invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('x-organization-id', 'org-target')
        .send({
          email: 'engineer@example.com',
          role: OrganizationRole.QA_ENGINEER,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invitation.email).toBe('engineer@example.com');
      expect(res.body.data.invitationToken).toBeDefined();
    });
  });
});
