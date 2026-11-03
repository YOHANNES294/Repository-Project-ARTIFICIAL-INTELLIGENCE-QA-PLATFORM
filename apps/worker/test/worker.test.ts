import { describe, it, expect } from 'vitest';
import { defaultQueue, backgroundWorker, processJob, sanitizePayload, deadLetterQueue } from '../src/index.js';
import type { Job } from 'bullmq';

describe('Background Worker & Queue Configuration', () => {
  it('initializes default queue with correct name and retry defaults', () => {
    expect(defaultQueue.name).toBe('ai-qa-jobs');
    expect(defaultQueue.defaultJobOptions?.attempts).toBe(3);
    expect(defaultQueue.defaultJobOptions?.backoff).toEqual({
      type: 'exponential',
      delay: 2000,
    });
  });

  it('initializes background worker on the correct queue', () => {
    expect(backgroundWorker.name).toBe('ai-qa-jobs');
  });

  describe('Job Processors for Representative Domain Workflows', () => {
    it('processes notification dispatch jobs with recipient telemetry', async () => {
      const mockJob = {
        id: 'job-notif-1',
        name: 'notification.dispatch',
        attemptsMade: 0,
        data: {
          channel: 'email',
          recipients: ['user-1@example.com', 'user-2@example.com'],
          organizationId: 'org-1',
        },
      } as unknown as Job;

      const result = await processJob(mockJob);
      expect(result.delivered).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.recipientCount).toBe(2);
    });

    it('processes report export jobs', async () => {
      const mockJob = {
        id: 'job-rep-1',
        name: 'report.export',
        attemptsMade: 0,
        data: {
          reportId: 'rep-123',
          format: 'pdf',
        },
      } as unknown as Job;

      const result = await processJob(mockJob);
      expect(result.reportId).toBe('rep-123');
      expect(result.format).toBe('pdf');
    });

    it('processes automation ingestion batches', async () => {
      const mockJob = {
        id: 'job-auto-1',
        name: 'automation.ingest',
        attemptsMade: 0,
        data: {
          sessionId: 'sess-abc',
          testCount: 42,
        },
      } as unknown as Job;

      const result = await processJob(mockJob);
      expect(result.sessionId).toBe('sess-abc');
      expect(result.testCount).toBe(42);
    });

    it('processes AI batch jobs without unhandled exceptions', async () => {
      const mockJob = {
        id: 'job-ai-1',
        name: 'ai.batch',
        attemptsMade: 0,
        data: {
          batchId: 'ai-batch-1',
          itemsCount: 5,
        },
      } as unknown as Job;

      const result = await processJob(mockJob);
      expect(result.batchId).toBe('ai-batch-1');
      expect(result.itemsProcessed).toBe(5);
    });

    it('processes billing reconciliation jobs', async () => {
      const mockJob = {
        id: 'job-bill-1',
        name: 'billing.reconcile',
        attemptsMade: 0,
        data: {
          count: 10,
        },
      } as unknown as Job;

      const result = await processJob(mockJob);
      expect(result.reconciled).toBe(true);
    });
  });

  describe('Credential Sanitization & Dead Letter Safety', () => {
    it('redacts sensitive credentials before logging or dead-letter storage', () => {
      const sensitivePayload = {
        organizationId: 'org-1',
        apiKey: 'sk_live_1234567890',
        webhookSecret: 'whsec_abcdef',
        auth_token: 'bearer_secret',
        nested: {
          password: 'super_secret_pw',
          publicInfo: 'safe_data',
        },
      };

      const sanitized = sanitizePayload(sensitivePayload);
      expect(sanitized.organizationId).toBe('org-1');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.webhookSecret).toBe('[REDACTED]');
      expect(sanitized.auth_token).toBe('[REDACTED]');
      expect((sanitized.nested as any).password).toBe('[REDACTED]');
      expect((sanitized.nested as any).publicInfo).toBe('safe_data');
    });
  });
});
