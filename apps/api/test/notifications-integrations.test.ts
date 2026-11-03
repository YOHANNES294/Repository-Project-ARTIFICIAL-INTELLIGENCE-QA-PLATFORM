import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import {
  NotificationCategory,
  NotificationPriority,
  OrganizationRole,
} from '@ai-qa/shared-types';
import {
  isPrivateOrBlockedIP,
  validateUrlForSSRF,
  escapeHtml,
  EmailTemplateEngine,
  LocalMockEmailProvider,
  NotificationPreferenceService,
  RecipientResolutionService,
  NotificationService,
} from '../src/services/notifications/index.js';
import {
  SlackAdapter,
  TeamsAdapter,
  OutboundWebhookAdapter,
  IntegrationService,
  WebhookService,
} from '../src/services/integrations/index.js';

vi.mock('../src/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      organizationMember: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      notification: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      notificationDelivery: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      notificationPreference: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
      emailDelivery: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      integration: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      webhook: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      webhookDelivery: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      defect: {
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      testRun: {
        findUnique: vi.fn(),
      },
      testResult: {
        count: vi.fn(),
      },
      projectQualityGate: {
        count: vi.fn(),
      },
      $transaction: vi.fn(async (callback: any) => {
        return callback(prisma);
      }),
    },
  };
});

describe('Milestone 10 — Notifications & External Integrations', () => {
  const app = createApp();

  const testUser = {
    id: 'user-m10-001',
    email: 'integration-lead@aiqa.test',
    firstName: 'Alex',
    lastName: 'Rivera',
    isSuperAdmin: false,
    isEmailVerified: true,
  };

  const testOrg = {
    id: 'org-m10-001',
    name: 'Integrations Enterprise Corp',
    slug: 'integrations-enterprise',
  };

  const testProject = {
    id: 'proj-m10-001',
    organizationId: testOrg.id,
    key: 'NOTIF',
    name: 'Notification Test Project',
  };

  const authToken = generateAccessToken({
    userId: testUser.id,
    email: testUser.email,
    organizationId: testOrg.id,
    role: OrganizationRole.ADMINISTRATOR,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    LocalMockEmailProvider.clearSentEmails();

    (prisma.user.findUnique as any).mockResolvedValue(testUser);
    (prisma.organizationMember.findUnique as any).mockResolvedValue({
      id: 'member-001',
      userId: testUser.id,
      organizationId: testOrg.id,
      role: OrganizationRole.ADMINISTRATOR,
      organization: testOrg,
    });
    (prisma.organizationMember.findFirst as any).mockResolvedValue({
      id: 'member-001',
      userId: testUser.id,
      organizationId: testOrg.id,
      role: OrganizationRole.ADMINISTRATOR,
      organization: testOrg,
    });
    (prisma.project.findUnique as any).mockResolvedValue(testProject);
    (prisma.project.findFirst as any).mockResolvedValue(testProject);
  });

  // ==========================================
  // 1. SSRF GUARD UNIT TESTS
  // ==========================================
  describe('SSRF Guard & Network Defense', () => {
    it('blocks loopback IPv4 addresses (127.0.0.0/8)', () => {
      expect(isPrivateOrBlockedIP('127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIP('127.0.0.254')).toBe(true);
      expect(isPrivateOrBlockedIP('127.255.255.255')).toBe(true);
    });

    it('blocks private RFC 1918 subnets', () => {
      expect(isPrivateOrBlockedIP('10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIP('10.254.12.99')).toBe(true);
      expect(isPrivateOrBlockedIP('172.16.0.1')).toBe(true);
      expect(isPrivateOrBlockedIP('172.31.255.254')).toBe(true);
      expect(isPrivateOrBlockedIP('192.168.1.1')).toBe(true);
      expect(isPrivateOrBlockedIP('192.168.100.254')).toBe(true);
    });

    it('blocks cloud metadata endpoint (169.254.169.254) and link-local ranges', () => {
      expect(isPrivateOrBlockedIP('169.254.169.254')).toBe(true);
      expect(isPrivateOrBlockedIP('169.254.1.1')).toBe(true);
    });

    it('blocks IPv6 loopback and private unique local addresses', () => {
      expect(isPrivateOrBlockedIP('::1')).toBe(true);
      expect(isPrivateOrBlockedIP('fe80::1')).toBe(true);
      expect(isPrivateOrBlockedIP('fc00::1')).toBe(true);
    });

    it('allows valid public IP addresses', () => {
      expect(isPrivateOrBlockedIP('8.8.8.8')).toBe(false);
      expect(isPrivateOrBlockedIP('1.1.1.1')).toBe(false);
      expect(isPrivateOrBlockedIP('140.82.121.4')).toBe(false);
    });

    it('validateUrlForSSRF rejects non-http/https protocols', async () => {
      const res = await validateUrlForSSRF('ftp://example.com/webhook');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Disallowed protocol');
    });

    it('validateUrlForSSRF rejects URLs with embedded credentials', async () => {
      const res = await validateUrlForSSRF('https://admin:secret@webhook.site/test');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('embedded user credentials');
    });

    it('validateUrlForSSRF rejects localhost and cloud metadata hostnames directly', async () => {
      const res1 = await validateUrlForSSRF('http://localhost:8080/callback');
      expect(res1.valid).toBe(false);

      const res2 = await validateUrlForSSRF('http://metadata.google.internal/computeMetadata/v1');
      expect(res2.valid).toBe(false);
    });

    it('validateUrlForSSRF rejects direct private IPs in URL', async () => {
      const res = await validateUrlForSSRF('http://192.168.1.50:3000/webhook');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('private, loopback, or reserved');
    });
  });

  // ==========================================
  // 2. EMAIL TEMPLATE ENGINE & XSS PROTECTION
  // ==========================================
  describe('Email Template Engine', () => {
    it('escapes HTML characters in user input to prevent XSS injection', () => {
      const dirty = '<script>alert("XSS")</script> & "special" \'quotes\'';
      const clean = escapeHtml(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('&lt;script&gt;');
      expect(clean).toContain('&amp;');
      expect(clean).toContain('&quot;');
      expect(clean).toContain('&#039;');
    });

    it('renders defect assignment email with escaping and links', () => {
      const result = EmailTemplateEngine.renderDefectAssigned({
        recipientName: 'Alex Rivera',
        defectKey: 'QA-BUG-42',
        defectTitle: '<img src=x onerror=alert(1)> Crash on checkout',
        severity: 'CRITICAL',
        priority: 'URGENT',
        projectName: 'Checkout Service',
        assignedByName: 'QA Lead',
        defectUrl: 'https://ai-qa.platform/projects/1/defects/42',
      });

      expect(result.subject).toContain('QA-BUG-42');
      expect(result.html).not.toContain('<img src=x onerror=alert(1)>');
      expect(result.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(result.html).toContain('https://ai-qa.platform/projects/1/defects/42');
      expect(result.text).toContain('QA-BUG-42');
    });

    it('renders test run completed email with execution metrics', () => {
      const result = EmailTemplateEngine.renderTestRunCompleted({
        runName: 'Regression Suite Sprint 24',
        projectName: 'Core Platform',
        totalTests: 150,
        passedCount: 145,
        failedCount: 5,
        passRate: 96.7,
        runUrl: 'https://ai-qa.platform/runs/123',
      });

      expect(result.subject).toContain('96.7% Pass Rate');
      expect(result.html).toContain('96.7% Passed');
      expect(result.html).toContain('145');
      expect(result.text).toContain('Regression Suite Sprint 24');
    });

    it('renders security alert email with device and timestamp context', () => {
      const result = EmailTemplateEngine.renderSecurityAlert({
        recipientName: 'Alex',
        eventTitle: 'API Token Revoked',
        eventDescription: 'Automation token CI/CD Token was manually revoked.',
        ipAddress: '198.51.100.22',
        timestamp: '2026-11-03T12:00:00Z',
      });

      expect(result.subject).toContain('Security Notification');
      expect(result.html).toContain('198.51.100.22');
      expect(result.html).toContain('API Token Revoked');
    });

    it('renders weekly quality digest email', () => {
      const result = EmailTemplateEngine.renderDigest({
        periodName: 'Weekly Quality Digest',
        summaryDate: 'Nov 3, 2026',
        totalExecutions: 320,
        passRate: 94.2,
        newDefects: 8,
        resolvedDefects: 12,
        qualityGatesPassed: 4,
        dashboardUrl: 'https://ai-qa.platform/dashboard',
      });

      expect(result.subject).toContain('Weekly Quality Digest');
      expect(result.html).toContain('94.2%');
      expect(result.html).toContain('320');
      expect(result.text).toContain('Quality Gates Passed: 4');
    });
  });

  // ==========================================
  // 3. NOTIFICATION PREFERENCES & QUIET HOURS
  // ==========================================
  describe('Notification Preferences & Quiet Hours Evaluation', () => {
    it('creates default preferences if none exist', async () => {
      (prisma.notificationPreference.findUnique as any).mockResolvedValue(null);
      (prisma.notificationPreference.create as any).mockResolvedValue({
        id: 'pref-001',
        userId: testUser.id,
        emailAlerts: true,
        inAppAlerts: true,
        defectUpdates: true,
        testAssignment: true,
        executionAlerts: true,
        automationAlerts: true,
        aiAlerts: true,
        reportingAlerts: true,
        mentionAlerts: true,
        weeklyDigest: false,
        digestFrequency: 'NONE',
        digestTimezone: 'UTC',
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const pref = await NotificationPreferenceService.getPreferences(testUser.id);
      expect(pref.emailAlerts).toBe(true);
      expect(pref.inAppAlerts).toBe(true);
      expect(pref.quietHoursEnabled).toBe(false);
    });

    it('correctly calculates overnight quiet hours (e.g., 22:00 to 08:00)', () => {
      const pref = {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        digestTimezone: 'UTC',
      };

      // 23:30 UTC -> inside quiet hours
      const nightTime = new Date('2026-11-03T23:30:00Z');
      expect(NotificationPreferenceService.isInQuietHours(pref, nightTime)).toBe(true);

      // 03:00 UTC -> inside quiet hours
      const earlyMorning = new Date('2026-11-03T03:00:00Z');
      expect(NotificationPreferenceService.isInQuietHours(pref, earlyMorning)).toBe(true);

      // 14:00 UTC -> outside quiet hours
      const afternoon = new Date('2026-11-03T14:00:00Z');
      expect(NotificationPreferenceService.isInQuietHours(pref, afternoon)).toBe(false);
    });

    it('suppresses email alerts during quiet hours when enabled', async () => {
      (prisma.notificationPreference.findUnique as any).mockResolvedValue({
        id: 'pref-001',
        userId: testUser.id,
        emailAlerts: true,
        inAppAlerts: true,
        defectUpdates: true,
        testAssignment: true,
        executionAlerts: true,
        automationAlerts: true,
        aiAlerts: true,
        reportingAlerts: true,
        mentionAlerts: true,
        weeklyDigest: false,
        digestFrequency: 'NONE',
        digestTimezone: 'UTC',
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const nightTime = new Date('2026-11-03T23:00:00Z');
      const check = await NotificationPreferenceService.isSuppressed(
        testUser.id,
        'EMAIL',
        NotificationCategory.DEFECT,
        false,
        nightTime
      );

      expect(check.suppressed).toBe(true);
      expect(check.reason).toContain('quiet hours');
    });

    it('MANDATORY SECURITY OVERRIDE: never suppresses security notifications even during quiet hours', async () => {
      (prisma.notificationPreference.findUnique as any).mockResolvedValue({
        id: 'pref-001',
        userId: testUser.id,
        emailAlerts: false, // User disabled all email alerts!
        inAppAlerts: false, // User disabled all in-app alerts!
        quietHoursEnabled: true,
        quietHoursStart: '00:00',
        quietHoursEnd: '23:59',
        digestTimezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const check = await NotificationPreferenceService.isSuppressed(
        testUser.id,
        'EMAIL',
        NotificationCategory.SECURITY,
        true // isSecurity = true
      );

      // Must NOT be suppressed!
      expect(check.suppressed).toBe(false);
    });
  });

  // ==========================================
  // 4. RECIPIENT RESOLUTION & ACTOR EXCLUSION
  // ==========================================
  describe('Recipient Resolution Service', () => {
    it('excludes actorId so users do not receive notifications for their own actions', async () => {
      (prisma.user.findMany as any).mockResolvedValue([
        { id: 'user-002', email: 'teammate@aiqa.test', firstName: 'Jane', lastName: 'Doe' },
      ]);

      const recipients = await RecipientResolutionService.resolveRecipients({
        recipientUserIds: ['user-001', 'user-002'],
        actorId: 'user-001', // Actor is user-001
        title: 'Action performed',
        message: 'Something happened',
        type: 'TEST_EVENT',
        category: NotificationCategory.GENERAL,
      });

      expect(recipients).toEqual(['user-002']);
      expect(recipients).not.toContain('user-001');
    });

    it('resolves assignee and reporter when notifying on defect', async () => {
      (prisma.defect.findUnique as any).mockResolvedValue({
        assigneeId: 'user-assignee',
        reporterId: 'user-reporter',
        qaOwnerId: 'user-qa-lead',
      });
      (prisma.user.findMany as any).mockResolvedValue([
        { id: 'user-assignee' },
        { id: 'user-reporter' },
        { id: 'user-qa-lead' },
      ]);

      const recipients = await RecipientResolutionService.resolveRecipients({
        entityType: 'DEFECT',
        entityId: 'defect-123',
        title: 'Defect Updated',
        message: 'Defect status transitioned',
        type: 'DEFECT_STATUS',
        category: NotificationCategory.DEFECT,
      });

      expect(recipients).toContain('user-assignee');
      expect(recipients).toContain('user-reporter');
      expect(recipients).toContain('user-qa-lead');
    });
  });

  // ==========================================
  // 5. SLACK & TEAMS ADAPTERS
  // ==========================================
  describe('Slack & Microsoft Teams Adapters', () => {
    it('formats Slack Block Kit with header, fields, and action buttons', () => {
      const card = SlackAdapter.formatBlockKit({
        title: 'Critical Bug Found',
        message: 'Payment gateway timed out during processing',
        category: 'DEFECT',
        priority: 'URGENT',
        link: 'https://ai-qa.platform/defects/99',
        projectName: 'Payments',
      });

      expect(card.blocks.length).toBeGreaterThan(2);
      expect(card.blocks[0].type).toBe('header');
      expect(card.blocks[0].text.text).toContain('Critical Bug Found');
      const actionBlock = card.blocks.find((b: any) => b.type === 'actions');
      expect(actionBlock).toBeDefined();
      expect(actionBlock.elements[0].url).toBe('https://ai-qa.platform/defects/99');
    });

    it('formats Microsoft Teams MessageCard payload', () => {
      const card = TeamsAdapter.formatMessageCard({
        title: 'Test Run Completed',
        message: 'Smoke tests finished with 100% pass rate',
        category: 'EXECUTION',
        priority: 'NORMAL',
        link: 'https://ai-qa.platform/runs/456',
        projectName: 'Auth Service',
      });

      expect(card['@type']).toBe('MessageCard');
      expect(card.summary).toBe('Test Run Completed');
      expect(card.potentialAction[0].targets[0].uri).toBe('https://ai-qa.platform/runs/456');
    });
  });

  // ==========================================
  // 6. OUTBOUND WEBHOOK HMAC SIGNING & MASKING
  // ==========================================
  describe('Outbound Webhooks', () => {
    it('generates consistent HMAC-SHA256 signature with shared secret', () => {
      const secret = 'whsec_test_secret_key_12345';
      const payload = JSON.stringify({ event: 'defect.created', id: '123' });
      const sig1 = OutboundWebhookAdapter.generateSignature(secret, payload);
      const sig2 = OutboundWebhookAdapter.generateSignature(secret, payload);

      expect(sig1).toHaveLength(64); // 32 bytes hex encoded = 64 characters
      expect(sig1).toBe(sig2);
    });

    it('masks webhook secret in DTO responses', () => {
      const masked = WebhookService.maskSecret('whsec_abcdef1234567890xyz');
      expect(masked).toBe('whsec_...0xyz');
      expect(masked).not.toContain('abcdef123456789');
    });
  });

  // ==========================================
  // 7. HTTP API ENDPOINTS
  // ==========================================
  describe('Notification API Endpoints', () => {
    it('GET /api/v1/notifications returns paginated notifications', async () => {
      (prisma.notification.findMany as any).mockResolvedValue([
        {
          id: 'notif-001',
          userId: testUser.id,
          organizationId: testOrg.id,
          projectId: testProject.id,
          title: 'Defect Assigned',
          message: 'You have been assigned to bug NOTIF-BUG-1',
          type: 'DEFECT_ASSIGNED',
          category: 'DEFECT',
          priority: 'NORMAL',
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          deliveries: [],
        },
      ]);
      (prisma.notification.count as any).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Defect Assigned');
    });

    it('GET /api/v1/notifications/unread-count returns badge count', async () => {
      (prisma.notification.count as any).mockResolvedValue(5);

      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(5);
    });

    it('PATCH /api/v1/notifications/:id/read marks notification as read', async () => {
      (prisma.notification.findFirst as any).mockResolvedValue({
        id: 'notif-001',
        userId: testUser.id,
        isRead: false,
      });
      (prisma.notification.update as any).mockResolvedValue({
        id: 'notif-001',
        userId: testUser.id,
        title: 'Defect Assigned',
        message: 'Details',
        type: 'DEFECT_ASSIGNED',
        category: 'DEFECT',
        priority: 'NORMAL',
        isRead: true,
        readAt: new Date(),
        createdAt: new Date(),
        deliveries: [],
      });
      (prisma.notification.count as any).mockResolvedValue(4);

      const res = await request(app)
        .patch('/api/v1/notifications/notif-001/read')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
    });

    it('POST /api/v1/notifications/mark-all-read marks all user notifications as read', async () => {
      (prisma.notification.updateMany as any).mockResolvedValue({ count: 7 });

      const res = await request(app)
        .post('/api/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(7);
    });

    it('DELETE /api/v1/notifications/:id deletes notification', async () => {
      (prisma.notification.findFirst as any).mockResolvedValue({
        id: 'notif-001',
        userId: testUser.id,
      });
      (prisma.notification.delete as any).mockResolvedValue({ id: 'notif-001' });
      (prisma.notification.count as any).mockResolvedValue(0);

      const res = await request(app)
        .delete('/api/v1/notifications/notif-001')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/notifications/preferences returns user preference settings', async () => {
      (prisma.notificationPreference.findUnique as any).mockResolvedValue({
        id: 'pref-001',
        userId: testUser.id,
        emailAlerts: true,
        inAppAlerts: true,
        defectUpdates: true,
        testAssignment: true,
        executionAlerts: true,
        automationAlerts: true,
        aiAlerts: true,
        reportingAlerts: true,
        mentionAlerts: true,
        weeklyDigest: false,
        digestFrequency: 'NONE',
        digestTimezone: 'UTC',
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emailAlerts).toBe(true);
    });

    it('PUT /api/v1/notifications/preferences updates notification settings', async () => {
      (prisma.notificationPreference.findUnique as any).mockResolvedValue({
        id: 'pref-001',
        userId: testUser.id,
        emailAlerts: true,
        inAppAlerts: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.notificationPreference.update as any).mockResolvedValue({
        id: 'pref-001',
        userId: testUser.id,
        emailAlerts: true,
        inAppAlerts: true,
        defectUpdates: true,
        testAssignment: true,
        executionAlerts: true,
        automationAlerts: true,
        aiAlerts: true,
        reportingAlerts: true,
        mentionAlerts: true,
        weeklyDigest: true,
        digestFrequency: 'WEEKLY',
        digestTimezone: 'America/New_York',
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .put('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          weeklyDigest: true,
          digestFrequency: 'WEEKLY',
          digestTimezone: 'America/New_York',
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.digestFrequency).toBe('WEEKLY');
      expect(res.body.data.quietHoursEnabled).toBe(true);
    });

    it('POST /api/v1/notifications/test-dispatch triggers end-to-end event delivery', async () => {
      (prisma.notificationPreference.findUnique as any).mockResolvedValue({
        id: 'pref-001',
        userId: testUser.id,
        emailAlerts: true,
        inAppAlerts: true,
        defectUpdates: true,
        testAssignment: true,
        executionAlerts: true,
        automationAlerts: true,
        aiAlerts: true,
        reportingAlerts: true,
        mentionAlerts: true,
        weeklyDigest: false,
        digestFrequency: 'NONE',
        digestTimezone: 'UTC',
        quietHoursEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.user.findMany as any).mockResolvedValue([testUser]);
      (prisma.notification.create as any).mockResolvedValue({
        id: 'notif-test-01',
        userId: testUser.id,
        title: 'Custom Test Alert',
        message: 'Verifying notification dispatch',
        type: 'TEST_NOTIFICATION',
        category: 'GENERAL',
        priority: 'NORMAL',
        isRead: false,
        createdAt: new Date(),
      });
      (prisma.notificationDelivery.create as any).mockResolvedValue({ id: 'del-01' });
      (prisma.emailDelivery.create as any).mockResolvedValue({ id: 'em-del-01' });
      (prisma.integration.findMany as any).mockResolvedValue([]);
      (prisma.webhook.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .post('/api/v1/notifications/test-dispatch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Custom Test Alert',
          message: 'Verifying notification dispatch',
          category: 'GENERAL',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inAppCount).toBe(1);
      expect(res.body.data.emailsSent).toBe(1);
    });
  });

  // ==========================================
  // 8. INTEGRATIONS & WEBHOOKS API ENDPOINTS
  // ==========================================
  describe('Integrations & Webhooks API', () => {
    it('POST /api/v1/projects/:projectId/integrations/test verifies connectivity', async () => {
      // Testing with a safe public mock URL
      const res = await request(app)
        .post(`/api/v1/projects/${testProject.id}/integrations/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'SLACK',
          config: {
            webhookUrl: 'https://httpbin.org/post',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('rejects integration creation when URL targets private IP (SSRF violation)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject.id}/integrations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Malicious Slack Bot',
          provider: 'SLACK',
          config: {
            webhookUrl: 'http://169.254.169.254/latest/meta-data',
          },
          events: ['DEFECT'],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Security Error');
    });

    it('POST /api/v1/projects/:projectId/webhooks creates webhook and returns secret once', async () => {
      (prisma.webhook.create as any).mockResolvedValue({
        id: 'wh-001',
        organizationId: testOrg.id,
        projectId: testProject.id,
        name: 'GitHub Actions Dispatcher',
        url: 'https://httpbin.org/post',
        secret: 'whsec_sample_secret_key_12345678',
        events: ['EXECUTION', 'DEFECT'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/projects/${testProject.id}/webhooks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'GitHub Actions Dispatcher',
          url: 'https://httpbin.org/post',
          events: ['EXECUTION', 'DEFECT'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rawSecret).toBeDefined();
      expect(res.body.data.secretMasked).toBeDefined();
    });

    it('POST /api/v1/projects/:projectId/webhooks/:id/rotate-secret generates new secret', async () => {
      (prisma.webhook.findUnique as any).mockResolvedValue({
        id: 'wh-001',
        secret: 'old-secret',
      });
      (prisma.webhook.update as any).mockResolvedValue({
        id: 'wh-001',
      });

      const res = await request(app)
        .post(`/api/v1/projects/${testProject.id}/webhooks/wh-001/rotate-secret`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.newSecret).toContain('whsec_');
    });
  });
});
