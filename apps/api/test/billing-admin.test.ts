import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import {
  BillingTier,
  SubscriptionStatus,
  BillingInterval,
  PaymentProviderType,
  PaymentStatus,
  InvoiceStatus,
  UsageMetric,
  OrganizationRole,
} from '@ai-qa/shared-types';
import {
  ensureDefaultPlans,
  getPlans,
  getPlanByTier,
  getSubscription,
  changeSubscription,
  cancelSubscription,
  reactivateSubscription,
  checkEntitlement,
  assertEntitlement,
  checkFeatureFlag,
  assertFeatureFlag,
  recordUsage,
  createAdjustment,
  getUsageSummary,
  createCheckout,
  getInvoices,
  generateInvoiceHtml,
  LocalTestPaymentProvider,
  LOCAL_TEST_WEBHOOK_SECRET,
  encryptSecret,
  decryptSecret,
  getPlatformOverview,
  suspendOrganization,
  reactivateOrganization,
  suspendUser,
  reactivateUser,
} from '../src/services/billing/index.js';

vi.mock('../src/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      organization: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      organizationMember: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      billingPlan: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      subscription: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      subscriptionHistory: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      usageLedgerEntry: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        aggregate: vi.fn(),
      },
      usageAdjustment: {
        create: vi.fn(),
        findMany: vi.fn(),
        aggregate: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      invoice: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      paymentWebhookEvent: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      paymentProviderConfig: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      project: {
        count: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      testCase: {
        count: vi.fn(),
        create: vi.fn(),
      },
      attachment: {
        aggregate: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
      $queryRaw: vi.fn(),
    },
  };
});

describe('Milestone 11 — Billing & SaaS Administration', () => {
  const app = createApp();

  const mockOrgId = 'org-1111-2222-3333-4444';
  const mockUserId = 'user-owner-1111';
  const mockAdminId = 'user-super-admin-9999';

  const mockPlan = {
    id: 'plan-free-1',
    name: 'Free',
    tier: 'FREE',
    priceCentsMonth: 0,
    priceCentsYear: 0,
    currency: 'USD',
    isActive: true,
    isPublic: true,
    sortOrder: 1,
    maxProjects: 3,
    maxMembers: 5,
    maxTestCases: 500,
    maxTestRunsPerMonth: 100,
    maxAutomationRunsPerMonth: 50,
    aiTokenAllowance: 100000,
    storageBytes: BigInt(1073741824),
    allowCustomReports: false,
    allowIntegrations: false,
    allowAdvancedAnalytics: false,
    allowSso: false,
    allowAuditExport: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockStarterPlan = {
    ...mockPlan,
    id: 'plan-starter-2',
    name: 'Starter',
    tier: 'STARTER',
    priceCentsMonth: 2900,
    priceCentsYear: 29000,
    maxProjects: 10,
    maxMembers: 15,
    maxTestCases: 5000,
    allowCustomReports: true,
    allowIntegrations: true,
  };

  const mockSubscription = {
    id: 'sub-1',
    organizationId: mockOrgId,
    billingPlanId: mockPlan.id,
    status: 'ACTIVE',
    billingInterval: 'MONTHLY',
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-02-01'),
    cancelAtPeriodEnd: false,
    paymentProvider: 'LOCAL_TEST',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    plan: mockPlan,
  };

  const ownerToken = generateAccessToken({
    sub: mockUserId,
    email: 'owner@example.com',
    orgId: mockOrgId,
  });

  const superAdminToken = generateAccessToken({
    sub: mockAdminId,
    email: 'superadmin@aiqa.platform',
    orgId: mockOrgId,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === mockAdminId) {
        return Promise.resolve({
          id: mockAdminId,
          email: 'superadmin@aiqa.platform',
          firstName: 'Super',
          lastName: 'Admin',
          isSuperAdmin: true,
          isSuspended: false,
        });
      }
      return Promise.resolve({
        id: mockUserId,
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'User',
        isSuperAdmin: false,
        isSuspended: false,
      });
    });

    (prisma.organization.findUnique as any).mockResolvedValue({
      id: mockOrgId,
      name: 'Acme Test Corp',
      slug: 'acme-test-corp',
      isSuspended: false,
    });

    (prisma.organizationMember.findUnique as any).mockResolvedValue({
      id: 'mem-1',
      organizationId: mockOrgId,
      userId: mockUserId,
      role: OrganizationRole.OWNER,
    });

    (prisma.billingPlan.findUnique as any).mockResolvedValue(mockPlan);
    (prisma.billingPlan.findMany as any).mockResolvedValue([mockPlan, mockStarterPlan]);
    (prisma.subscription.findUnique as any).mockResolvedValue(mockSubscription);
    (prisma.usageAdjustment.aggregate as any).mockResolvedValue({ _sum: { quantityDelta: 0 } });
    (prisma.usageLedgerEntry.aggregate as any).mockResolvedValue({ _sum: { quantity: 0 } });
    (prisma.attachment.aggregate as any).mockResolvedValue({ _sum: { fileSize: 0 } });
  });

  describe('1. Secret Encryption & Decryption', () => {
    it('encrypts and decrypts provider secrets symmetrically using AES-256-GCM', () => {
      const plaintext = 'sk_live_very_secret_provider_key_12345';
      const encrypted = encryptSecret(plaintext);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(plaintext);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.tag);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('2. Plan Management & Defaults', () => {
    it('seeds default plans if missing in the database', async () => {
      (prisma.billingPlan.findUnique as any).mockResolvedValue(null);
      (prisma.billingPlan.create as any).mockResolvedValue(mockPlan);

      await ensureDefaultPlans();
      expect(prisma.billingPlan.create).toHaveBeenCalled();
    });

    it('retrieves active plans catalog', async () => {
      const plans = await getPlans();
      expect(plans.length).toBe(2);
      expect(plans[0].tier).toBe(BillingTier.FREE);
    });
  });

  describe('3. Subscription Lifecycle & State Machine', () => {
    it('provisions Free plan subscription when none exists', async () => {
      (prisma.subscription.findUnique as any).mockResolvedValueOnce(null);
      (prisma.subscription.create as any).mockResolvedValue(mockSubscription);

      const sub = await getSubscription(mockOrgId);
      expect(sub.organizationId).toBe(mockOrgId);
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
      expect(prisma.subscription.create).toHaveBeenCalled();
    });

    it('upgrades subscription to Starter plan and records SubscriptionHistory', async () => {
      (prisma.billingPlan.findUnique as any).mockResolvedValue(mockStarterPlan);
      (prisma.subscription.update as any).mockResolvedValue({
        ...mockSubscription,
        billingPlanId: mockStarterPlan.id,
        plan: mockStarterPlan,
      });

      const updated = await changeSubscription(
        mockOrgId,
        { planTier: BillingTier.STARTER, interval: BillingInterval.MONTHLY },
        mockUserId
      );

      expect(updated.plan?.tier).toBe(BillingTier.STARTER);
      expect(prisma.subscriptionHistory.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('schedules subscription cancellation without deleting tenant data', async () => {
      (prisma.subscription.update as any).mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
      });

      const cancelled = await cancelSubscription(mockOrgId, { immediately: false }, mockUserId);
      expect(cancelled.cancelAtPeriodEnd).toBe(true);
      expect(prisma.subscriptionHistory.create).toHaveBeenCalled();
    });

    it('revokes scheduled cancellation upon reactivation', async () => {
      (prisma.subscription.update as any).mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      });

      const reactivated = await reactivateSubscription(mockOrgId, mockUserId);
      expect(reactivated.cancelAtPeriodEnd).toBe(false);
      expect(prisma.subscriptionHistory.create).toHaveBeenCalled();
    });
  });

  describe('4. Server-Side Entitlement Enforcement', () => {
    it('allows action when resource usage is within plan limits', async () => {
      (prisma.project.count as any).mockResolvedValue(1); // Limit is 3
      const result = await checkEntitlement(mockOrgId, UsageMetric.PROJECTS, 1);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(3);
    });

    it('detects quota exceedance when limit is reached', async () => {
      (prisma.project.count as any).mockResolvedValue(3); // Limit is 3, requested +1 = 4
      const result = await checkEntitlement(mockOrgId, UsageMetric.PROJECTS, 1);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(3);
    });

    it('assertEntitlement throws HTTP 402 ENTITLEMENT_LIMIT_EXCEEDED when quota is exceeded', async () => {
      (prisma.testCase.count as any).mockResolvedValue(500); // Free plan limit 500

      await expect(assertEntitlement(mockOrgId, UsageMetric.TEST_CASES, 1)).rejects.toMatchObject({
        status: 402,
        code: 'ENTITLEMENT_LIMIT_EXCEEDED',
      });
    });

    it('enforces feature flags based on plan definition', async () => {
      const allowed = await checkFeatureFlag(mockOrgId, 'allowCustomReports');
      expect(allowed).toBe(false); // Free plan has allowCustomReports: false

      await expect(assertFeatureFlag(mockOrgId, 'allowCustomReports')).rejects.toMatchObject({
        status: 403,
        code: 'FEATURE_NOT_INCLUDED_IN_PLAN',
      });
    });

    it('blocks project creation API route when project quota is exceeded', async () => {
      (prisma.project.count as any).mockResolvedValue(3); // Quota exhausted

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', [`accessToken=${ownerToken}`])
        .set('x-organization-id', mockOrgId)
        .send({
          name: 'Exceeded Project',
          key: 'EXCEED',
        });

      expect(res.status).toBe(402);
      expect(res.body.error.code).toBe('ENTITLEMENT_LIMIT_EXCEEDED');
    });

    it('blocks member invitation API route when member quota is exceeded', async () => {
      (prisma.organizationMember.count as any).mockResolvedValue(5); // Quota exhausted

      const res = await request(app)
        .post(`/api/v1/organizations/${mockOrgId}/invitations`)
        .set('Cookie', [`accessToken=${ownerToken}`])
        .set('x-organization-id', mockOrgId)
        .send({
          email: 'newuser@example.com',
          role: 'VIEWER',
        });

      expect(res.status).toBe(402);
      expect(res.body.error.code).toBe('ENTITLEMENT_LIMIT_EXCEEDED');
    });
  });

  describe('5. Auditable Usage Metering & Idempotency', () => {
    it('records metric consumption into immutable ledger', async () => {
      const entryData = {
        id: 'entry-1',
        organizationId: mockOrgId,
        metric: 'TEST_RUNS_MONTHLY',
        quantity: 1,
        billingPeriodStart: new Date('2026-01-01'),
        billingPeriodEnd: new Date('2026-02-01'),
        idempotencyKey: 'run-unique-12345',
        sourceType: 'TEST_RUN',
        sourceId: 'run-1',
        metadata: null,
        recordedAt: new Date(),
      };

      (prisma.usageLedgerEntry.findUnique as any).mockResolvedValueOnce(null);
      (prisma.usageLedgerEntry.create as any).mockResolvedValue(entryData);

      const entry = await recordUsage({
        organizationId: mockOrgId,
        metric: UsageMetric.TEST_RUNS_MONTHLY,
        quantity: 1,
        idempotencyKey: 'run-unique-12345',
        sourceType: 'TEST_RUN',
        sourceId: 'run-1',
      });

      expect(entry.idempotencyKey).toBe('run-unique-12345');
      expect(prisma.usageLedgerEntry.create).toHaveBeenCalled();
    });

    it('prevents double-metering on duplicate idempotencyKey', async () => {
      const existingEntry = {
        id: 'entry-1',
        organizationId: mockOrgId,
        metric: 'TEST_RUNS_MONTHLY',
        quantity: 1,
        billingPeriodStart: new Date('2026-01-01'),
        billingPeriodEnd: new Date('2026-02-01'),
        idempotencyKey: 'run-unique-12345',
        sourceType: 'TEST_RUN',
        sourceId: 'run-1',
        metadata: null,
        recordedAt: new Date(),
      };

      (prisma.usageLedgerEntry.findUnique as any).mockResolvedValue(existingEntry);

      const entry = await recordUsage({
        organizationId: mockOrgId,
        metric: UsageMetric.TEST_RUNS_MONTHLY,
        quantity: 1,
        idempotencyKey: 'run-unique-12345',
        sourceType: 'TEST_RUN',
        sourceId: 'run-1',
      });

      expect(entry.id).toBe('entry-1');
      expect(prisma.usageLedgerEntry.create).not.toHaveBeenCalled();
    });

    it('records auditable usage adjustment', async () => {
      const adjustmentData = {
        id: 'adj-1',
        organizationId: mockOrgId,
        metric: 'TEST_RUNS_MONTHLY',
        quantityDelta: -5,
        reason: 'Credit for failed automation runner',
        adjustedById: mockUserId,
        billingPeriodStart: new Date('2026-01-01'),
        billingPeriodEnd: new Date('2026-02-01'),
        createdAt: new Date(),
      };

      (prisma.usageAdjustment.create as any).mockResolvedValue(adjustmentData);

      const adj = await createAdjustment({
        organizationId: mockOrgId,
        metric: UsageMetric.TEST_RUNS_MONTHLY,
        quantityDelta: -5,
        reason: 'Credit for failed automation runner',
        adjustedById: mockUserId,
      });

      expect(adj.quantityDelta).toBe(-5);
      expect(prisma.usageAdjustment.create).toHaveBeenCalled();
    });

    it('calculates usage summary against plan limits', async () => {
      (prisma.project.count as any).mockResolvedValue(2);
      (prisma.organizationMember.count as any).mockResolvedValue(3);

      const summary = await getUsageSummary(mockOrgId);
      expect(summary.meters[UsageMetric.PROJECTS].current).toBe(2);
      expect(summary.meters[UsageMetric.PROJECTS].limit).toBe(3);
      expect(summary.meters[UsageMetric.PROJECTS].usagePercentage).toBe(67);
      expect(summary.meters[UsageMetric.PROJECTS].isExceeded).toBe(false);
    });
  });

  describe('6. Checkout, Invoices & Webhooks', () => {
    it('creates test mode checkout session and opens invoice', async () => {
      (prisma.invoice.create as any).mockResolvedValue({
        id: 'inv-1',
        organizationId: mockOrgId,
        invoiceNumber: 'INV-TEST-001',
        status: 'OPEN',
        subtotalCents: 2900,
        taxCents: 0,
        discountCents: 0,
        totalCents: 2900,
        currency: 'USD',
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        dueDate: new Date(),
        paidAt: null,
        pdfFileKey: null,
        isTestMode: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (prisma.payment.create as any).mockResolvedValue({
        id: 'pay-1',
        organizationId: mockOrgId,
        invoiceId: 'inv-1',
        amountCents: 2900,
        currency: 'USD',
        status: 'PENDING',
        provider: 'LOCAL_TEST',
        providerPaymentId: 'test_sess_123',
        isTestMode: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const checkout = await createCheckout({
        planTier: BillingTier.STARTER,
        interval: BillingInterval.MONTHLY,
        provider: PaymentProviderType.LOCAL_TEST,
        organizationId: mockOrgId,
        organizationName: 'Acme Test Corp',
        userEmail: 'owner@example.com',
      });

      expect(checkout.sessionId).toBeDefined();
      expect(checkout.isTestMode).toBe(true);
      expect(checkout.provider).toBe(PaymentProviderType.LOCAL_TEST);
      expect(prisma.invoice.create).toHaveBeenCalled();
      expect(prisma.payment.create).toHaveBeenCalled();
    });

    it('renders invoice HTML with test mode watermark in test mode', () => {
      const invoiceDto = {
        id: 'inv-1',
        organizationId: mockOrgId,
        invoiceNumber: 'INV-2026-001',
        status: 'OPEN',
        subtotalCents: 2900,
        taxCents: 0,
        discountCents: 0,
        totalCents: 2900,
        currency: 'USD',
        billingPeriodStart: '2026-01-01T00:00:00.000Z',
        billingPeriodEnd: '2026-02-01T00:00:00.000Z',
        dueDate: '2026-01-01T00:00:00.000Z',
        paidAt: null,
        pdfFileKey: null,
        isTestMode: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      const html = generateInvoiceHtml(invoiceDto, 'Acme Test Corp');
      expect(html).toContain('TEST MODE - NOT A REAL INVOICE');
      expect(html).toContain('INV-2026-001');
      expect(html).toContain('$29.00');
    });

    it('processes signed webhook and activates subscription', async () => {
      const payload = {
        id: 'evt_test_123',
        type: 'payment.succeeded',
        sessionId: 'test_sess_xyz',
      };
      const rawPayload = JSON.stringify(payload);
      const signature = LocalTestPaymentProvider.generateTestSignature(rawPayload, LOCAL_TEST_WEBHOOK_SECRET);

      (prisma.paymentWebhookEvent.findUnique as any).mockResolvedValueOnce(null);
      (prisma.paymentWebhookEvent.create as any).mockResolvedValue({ id: 'wh-record-1' });
      (prisma.payment.findFirst as any).mockResolvedValue({
        id: 'pay-1',
        organizationId: mockOrgId,
        invoiceId: 'inv-1',
        amountCents: 2900,
        providerPaymentId: 'test_sess_xyz',
      });

      const res = await request(app)
        .post('/api/v1/billing/webhooks/local_test')
        .set('Content-Type', 'application/json')
        .set('x-signature', signature)
        .set('x-timestamp', String(Math.floor(Date.now() / 1000)))
        .send(rawPayload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalled();
      expect(prisma.invoice.update).toHaveBeenCalled();
      expect(prisma.subscription.update).toHaveBeenCalled();
    });

    it('rejects webhook with invalid signature', async () => {
      const res = await request(app)
        .post('/api/v1/billing/webhooks/local_test')
        .set('Content-Type', 'application/json')
        .set('x-signature', 'invalid_bogus_signature')
        .send(JSON.stringify({ id: 'evt_fake' }));

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid HMAC webhook signature');
    });

    it('safely ignores replayed webhook events (idempotency)', async () => {
      const payload = { id: 'evt_replay_test' };
      const rawPayload = JSON.stringify(payload);
      const signature = LocalTestPaymentProvider.generateTestSignature(rawPayload, LOCAL_TEST_WEBHOOK_SECRET);

      // Event already recorded in DB
      (prisma.paymentWebhookEvent.findUnique as any).mockResolvedValue({ id: 'wh-existing' });

      const res = await request(app)
        .post('/api/v1/billing/webhooks/local_test')
        .set('Content-Type', 'application/json')
        .set('x-signature', signature)
        .set('x-timestamp', String(Math.floor(Date.now() / 1000)))
        .send(rawPayload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      // No re-execution of payment update
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe('7. Platform Super Administration & Tenant Suspension', () => {
    it('blocks regular organization owner from accessing platform routes with 403', async () => {
      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', [`accessToken=${ownerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows platform super admin to retrieve platform overview scorecard', async () => {
      (prisma.organization.count as any).mockResolvedValue(10);
      (prisma.user.count as any).mockResolvedValue(50);
      (prisma.subscription.findMany as any).mockResolvedValue([mockSubscription]);
      (prisma.payment.findMany as any).mockResolvedValue([]);
      (prisma.auditLog.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', [`accessToken=${superAdminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalOrganizations).toBe(10);
      expect(res.body.data.totalUsers).toBe(50);
    });

    it('suspends an organization with mandatory reason logged to audit trail', async () => {
      (prisma.organization.update as any).mockResolvedValue({
        id: mockOrgId,
        isSuspended: true,
        suspensionReason: 'Terms of service violation',
      });

      const res = await request(app)
        .post(`/api/v1/platform/organizations/${mockOrgId}/suspend`)
        .set('Cookie', [`accessToken=${superAdminToken}`])
        .send({ reason: 'Terms of service violation' });

      expect(res.status).toBe(200);
      expect(res.body.data.isSuspended).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('blocks suspended organization members from accessing tenant routes', async () => {
      // Mock organization suspended
      (prisma.organization.findUnique as any).mockResolvedValue({
        id: mockOrgId,
        isSuspended: true,
        suspensionReason: 'Non-payment overdue',
      });

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', [`accessToken=${ownerToken}`])
        .set('x-organization-id', mockOrgId);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Organization has been suspended');
    });

    it('reactivates suspended organization', async () => {
      (prisma.organization.update as any).mockResolvedValue({
        id: mockOrgId,
        isSuspended: false,
        suspensionReason: null,
      });

      const res = await request(app)
        .post(`/api/v1/platform/organizations/${mockOrgId}/reactivate`)
        .set('Cookie', [`accessToken=${superAdminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.isSuspended).toBe(false);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('suspends and reactivates a user', async () => {
      (prisma.user.update as any).mockResolvedValue({
        id: 'target-user',
        isSuspended: true,
        suspensionReason: 'Abuse detected',
      });

      const resSuspend = await request(app)
        .post('/api/v1/platform/users/target-user/suspend')
        .set('Cookie', [`accessToken=${superAdminToken}`])
        .send({ reason: 'Abuse detected' });

      expect(resSuspend.status).toBe(200);
      expect(resSuspend.body.data.isSuspended).toBe(true);

      (prisma.user.update as any).mockResolvedValue({
        id: 'target-user',
        isSuspended: false,
        suspensionReason: null,
      });

      const resReactivate = await request(app)
        .post('/api/v1/platform/users/target-user/reactivate')
        .set('Cookie', [`accessToken=${superAdminToken}`]);

      expect(resReactivate.status).toBe(200);
      expect(resReactivate.body.data.isSuspended).toBe(false);
    });
  });
});
