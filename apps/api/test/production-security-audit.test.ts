import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { OrganizationRole } from '@ai-qa/shared-types';
import { generateAccessToken } from '../src/utils/security.js';
import { encryptSecret, decryptSecret } from '../src/services/billing/encryption.js';
import { validateUrlForSSRF } from '../src/services/notifications/ssrf-guard.js';
import { FormulaSanitizer } from '../src/services/analytics/formula-sanitizer.js';

vi.mock('../src/prisma.js', () => {
  const mockOrg = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(5),
  };
  const mockUser = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(10),
  };
  const mockMembership = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  };
  const mockProject = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
  };
  const mockProjectMember = {
    findFirst: vi.fn(),
  };
  const mockSubscription = {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
  };
  const mockPayment = {
    aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: 50000 } }),
    findMany: vi.fn().mockResolvedValue([]),
  };
  const mockAudit = {
    create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  };

  return {
    prisma: {
      user: mockUser,
      organization: mockOrg,
      organizationMember: mockMembership,
      project: mockProject,
      projectMember: mockProjectMember,
      subscription: mockSubscription,
      payment: mockPayment,
      auditLog: mockAudit,
      $transaction: vi.fn((fn) => (typeof fn === 'function' ? fn(prisma) : Promise.all(fn))),
      $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    },
  };
});

describe('Milestone 12 — Production Security & Multi-Tenant Audit Suite', () => {
  const app = createApp();

  const validToken = (userId: string) => {
    return generateAccessToken({ sub: userId, email: `${userId}@example.com` });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Multi-Tenant Isolation & Cross-Organization IDOR Prevention', () => {
    it('rejects cross-organization access when user is not a member of target organization', async () => {
      const token = validToken('user-attacker');

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-attacker',
        email: 'user-attacker@example.com',
        isSuspended: false,
        isSuperAdmin: false,
      });

      (prisma.organization.findUnique as any).mockResolvedValue({
        id: 'org-victim',
        name: 'Victim Corp',
        isSuspended: false,
      });

      (prisma.organizationMember.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/organizations/org-victim/members')
        .set('Cookie', [`accessToken=${token}`])
        .set('x-organization-id', 'org-victim');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects cross-organization project access (prevents IDOR ID enumeration)', async () => {
      const token = validToken('user-attacker');

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-attacker',
        email: 'user-attacker@example.com',
        isSuspended: false,
        isSuperAdmin: false,
      });

      (prisma.organization.findUnique as any).mockResolvedValue({
        id: 'org-attacker',
        name: 'Attacker Org',
        isSuspended: false,
      });

      (prisma.organizationMember.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/projects/proj-victim-confidential')
        .set('Cookie', [`accessToken=${token}`])
        .set('x-organization-id', 'org-victim');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('2. Platform Super-Admin Privilege Boundary Enforcement', () => {
    it('strictly denies Organization Owner access to Platform Super-Admin endpoints', async () => {
      const ownerToken = validToken('user-org-owner');

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-org-owner',
        email: 'owner@startup.io',
        isSuspended: false,
        isSuperAdmin: false,
      });

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', [`accessToken=${ownerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Platform super administration privileges required');
    });

    it('allows genuine Super Admin access to Platform endpoints', async () => {
      const adminToken = validToken('user-super-admin');

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-super-admin',
        email: 'admin@platform.com',
        isSuspended: false,
        isSuperAdmin: true,
      });

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalOrganizations).toBeDefined();
    });
  });

  describe('3. Account & Organization Suspension Enforcement', () => {
    it('blocks suspended users from all authenticated endpoints with HTTP 403', async () => {
      const token = validToken('user-banned');

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-banned',
        email: 'banned@example.com',
        firstName: 'Banned',
        lastName: 'User',
        isSuperAdmin: false,
        isSuspended: true, // Suspended
        suspensionReason: 'Terms of service violation',
      });

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('suspended');
    });

    it('blocks requests when the target organization is suspended', async () => {
      const token = validToken('user-active');

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-active',
        email: 'active@example.com',
        firstName: 'Active',
        lastName: 'User',
        isSuspended: false,
        isSuperAdmin: false,
      });

      (prisma.organization.findUnique as any).mockResolvedValue({
        id: 'org-delinquent',
        name: 'Delinquent Corp',
        isSuspended: true,
        suspensionReason: 'Non-payment of Enterprise invoice',
      });

      (prisma.organizationMember.findUnique as any).mockResolvedValue({
        id: 'mem-delinquent',
        organizationId: 'org-delinquent',
        userId: 'user-active',
        role: OrganizationRole.ADMINISTRATOR,
      });

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', [`accessToken=${token}`])
        .set('x-organization-id', 'org-delinquent');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Organization has been suspended');
    });
  });

  describe('4. Server-Side Request Forgery (SSRF) Defense Verification', () => {
    it('prohibits localhost / loopback addresses (127.0.0.1, ::1)', async () => {
      const check1 = await validateUrlForSSRF('http://127.0.0.1:8080/webhook');
      expect(check1.valid).toBe(false);
      expect(check1.error).toContain('private, loopback, or reserved');

      const check2 = await validateUrlForSSRF('http://localhost:3000/api');
      expect(check2.valid).toBe(false);
    });

    it('prohibits AWS / GCP cloud metadata IP (169.254.169.254)', async () => {
      const check = await validateUrlForSSRF('http://169.254.169.254/latest/meta-data/');
      expect(check.valid).toBe(false);
      expect(check.error).toBeDefined();
    });

    it('prohibits RFC 1918 private subnets (10.0.0.0/8, 192.168.0.0/16)', async () => {
      const check1 = await validateUrlForSSRF('http://192.168.1.1/admin');
      expect(check1.valid).toBe(false);

      const check2 = await validateUrlForSSRF('http://10.200.0.1/internal');
      expect(check2.valid).toBe(false);
    });

    it('allows valid public HTTPS webhooks', async () => {
      const safe = await validateUrlForSSRF('https://hooks.slack.com/services/T00/B00/X00');
      expect(safe.valid).toBe(true);
    });
  });

  describe('5. Formula Injection Defense (OWASP CWE-1236)', () => {
    it('sanitizes dangerous spreadsheet triggers by prepending single quote', () => {
      expect(FormulaSanitizer.sanitizeCellValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(FormulaSanitizer.sanitizeCellValue('+cmd|"/c calc"!A0')).toBe("'+cmd|\"/c calc\"!A0");
      expect(FormulaSanitizer.sanitizeCellValue('-2+3')).toBe("'-2+3");
      expect(FormulaSanitizer.sanitizeCellValue('@HYPERLINK("evil.com")')).toBe("'@HYPERLINK(\"evil.com\")");
    });

    it('leaves standard benign strings unmodified', () => {
      expect(FormulaSanitizer.sanitizeCellValue('Normal Test Case Title')).toBe('Normal Test Case Title');
      expect(FormulaSanitizer.sanitizeCellValue('Pass rate: 98%')).toBe('Pass rate: 98%');
    });
  });

  describe('6. Cryptographic Protection of Secrets at Rest (AES-256-GCM)', () => {
    it('encrypts and successfully decrypts credentials with randomized IV and authentication tag', () => {
      const plaintext = 'sk_live_very_secret_stripe_api_key_12345';
      const encrypted = encryptSecret(plaintext);

      expect(encrypted.ciphertext).not.toBe(plaintext);
      expect(encrypted.iv).toHaveLength(32); // 16 bytes in hex = 32 chars
      expect(encrypted.tag).toHaveLength(32); // 16 bytes in hex = 32 chars

      const decrypted = decryptSecret(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.tag
      );

      expect(decrypted).toBe(plaintext);
    });

    it('fails decryption if authentication tag is tampered with', () => {
      const plaintext = 'sk_live_secret';
      const encrypted = encryptSecret(plaintext);

      const tamperedTag = encrypted.tag.substring(0, 30) + 'ff';

      expect(() => {
        decryptSecret(encrypted.ciphertext, encrypted.iv, tamperedTag);
      }).toThrow();
    });
  });

  describe('7. Observability & Operational Health Endpoints', () => {
    it('returns 200 with process health on /health/live', async () => {
      const res = await request(app).get('/api/v1/health/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('live');
    });

    it('returns Prometheus metrics format on /metrics', async () => {
      const res = await request(app).get('/api/v1/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('process_uptime_seconds');
    });

    it('returns telemetry JSON on /metrics/json', async () => {
      const res = await request(app).get('/api/v1/metrics/json');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requests).toBeDefined();
      expect(res.body.data.memory).toBeDefined();
    });
  });
});
