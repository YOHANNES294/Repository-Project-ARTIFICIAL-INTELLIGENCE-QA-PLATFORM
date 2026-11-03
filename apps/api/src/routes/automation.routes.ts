import { Router, Request, Response } from 'express';
import { authenticateAutomationOrUser } from '../middleware/automation-auth.js';
import {
  createAutomationTokenSchema,
  createAutomationSessionSchema,
  ingestAutomationResultsSchema,
  finalizeAutomationSessionSchema,
  createAutomationMappingSchema,
  updateAutomationMappingSchema,
  resolveUnmappedTestSchema,
} from '@ai-qa/validation';
import {
  automationTokenService,
  automationMappingService,
  automationIngestionService,
  automationWebhookService,
  parseNewmanReport,
  parsePlaywrightReport,
} from '../services/automation/index.js';
import { ValidationError, UnauthorizedError } from '../errors.js';

const router = Router({ mergeParams: true });

// ----------------------------------------------------------------------------
// 1. OVERVIEW & TELEMETRY
// ----------------------------------------------------------------------------
router.get('/overview', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const overview = await automationIngestionService.getAutomationOverview(projectId);
  res.json({ success: true, data: overview });
});

// ----------------------------------------------------------------------------
// 2. AUTOMATION API TOKENS
// ----------------------------------------------------------------------------
router.get('/tokens', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const tokens = await automationTokenService.listTokens(projectId);
  res.json({ success: true, data: tokens });
});

router.post('/tokens', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const organizationId = req.organizationId!;
  const parsed = createAutomationTokenSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError('Invalid token parameters', parsed.error.format());
  }

  const result = await automationTokenService.createToken(
    projectId,
    organizationId,
    parsed.data,
    req.user?.id
  );

  res.status(201).json({ success: true, data: result });
});

router.delete('/tokens/:tokenId', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const tokenId = req.params.tokenId as string;
  const revoked = await automationTokenService.revokeToken(projectId, tokenId);
  res.json({ success: true, data: revoked });
});

// ----------------------------------------------------------------------------
// 3. SESSIONS & BATCH INGESTION
// ----------------------------------------------------------------------------
router.get('/sessions', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const status = req.query.status as string | undefined;

  const result = await automationIngestionService.listSessions(projectId, {
    page,
    limit,
    status,
  });

  res.json({
    success: true,
    data: result.sessions,
    meta: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

router.post('/sessions', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const organizationId = req.organizationId!;

  // Support Idempotency-Key header if not in body
  const idempotencyKey =
    (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;

  const parsed = createAutomationSessionSchema.safeParse({
    ...req.body,
    idempotencyKey: idempotencyKey || undefined,
  });

  if (!parsed.success) {
    throw new ValidationError('Invalid session input', parsed.error.format());
  }

  const session = await automationIngestionService.createSession(
    projectId,
    organizationId,
    parsed.data
  );

  res.status(201).json({ success: true, data: session });
});

router.get('/sessions/:sessionId', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const sessionId = req.params.sessionId as string;
  const session = await automationIngestionService.getSession(projectId, sessionId);
  res.json({ success: true, data: session });
});

router.post('/sessions/:sessionId/results', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const sessionId = req.params.sessionId as string;

  const parsed = ingestAutomationResultsSchema.safeParse({
    sessionId,
    results: req.body.results,
  });

  if (!parsed.success) {
    throw new ValidationError('Invalid results payload', parsed.error.format());
  }

  const result = await automationIngestionService.ingestResults(projectId, parsed.data);
  res.json({ success: true, data: result });
});

router.post('/sessions/:sessionId/finalize', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const sessionId = req.params.sessionId as string;

  const parsed = finalizeAutomationSessionSchema.safeParse({
    sessionId,
    status: req.body.status,
    summary: req.body.summary,
  });

  if (!parsed.success) {
    throw new ValidationError('Invalid finalize payload', parsed.error.format());
  }

  const finalized = await automationIngestionService.finalizeSession(projectId, parsed.data);
  res.json({ success: true, data: finalized });
});

// ----------------------------------------------------------------------------
// 4. ONE-STEP REPORT INGESTION (NEWMAN & PLAYWRIGHT)
// ----------------------------------------------------------------------------
router.post('/ingest/newman', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const organizationId = req.organizationId!;
  const rawReport = req.body;

  if (!rawReport || typeof rawReport !== 'object') {
    throw new ValidationError('Valid Newman JSON report object is required');
  }

  // 1. Create ingestion session
  const collectionName = rawReport.collection?.info?.name || 'Newman Execution';
  const session = await automationIngestionService.createSession(projectId, organizationId, {
    framework: 'NEWMAN',
    testRunName: `Newman Run - ${collectionName}`,
    metadata: {
      collection: rawReport.collection?.info,
      environment: rawReport.environment?.name,
    },
  });

  // 2. Parse report items
  const items = parseNewmanReport(rawReport);

  // 3. Ingest items
  let ingestResult = { processedCount: 0, unmappedCount: 0, session };
  if (items.length > 0) {
    ingestResult = await automationIngestionService.ingestResults(projectId, {
      sessionId: session.id,
      results: items,
    });
  }

  // 4. Finalize session
  const finalized = await automationIngestionService.finalizeSession(projectId, {
    sessionId: session.id,
    status: 'COMPLETED',
  });

  res.status(201).json({
    success: true,
    data: {
      session: finalized,
      totalItems: items.length,
      processed: ingestResult.processedCount,
      unmapped: ingestResult.unmappedCount,
    },
  });
});

router.post('/ingest/playwright', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const organizationId = req.organizationId!;
  const rawReport = req.body;

  if (!rawReport || typeof rawReport !== 'object') {
    throw new ValidationError('Valid Playwright JSON report object is required');
  }

  // 1. Create ingestion session
  const session = await automationIngestionService.createSession(projectId, organizationId, {
    framework: 'PLAYWRIGHT',
    testRunName: req.body.testRunName || `Playwright Test Execution`,
    gitBranch: req.body.gitBranch,
    gitCommitSha: req.body.gitCommitSha,
    ciProvider: req.body.ciProvider,
    ciBuildId: req.body.ciBuildId,
    ciBuildUrl: req.body.ciBuildUrl,
  });

  // 2. Parse report items
  const items = parsePlaywrightReport(rawReport);

  // 3. Ingest items
  let ingestResult = { processedCount: 0, unmappedCount: 0, session };
  if (items.length > 0) {
    ingestResult = await automationIngestionService.ingestResults(projectId, {
      sessionId: session.id,
      results: items,
    });
  }

  // 4. Finalize session
  const finalized = await automationIngestionService.finalizeSession(projectId, {
    sessionId: session.id,
    status: 'COMPLETED',
  });

  res.status(201).json({
    success: true,
    data: {
      session: finalized,
      totalItems: items.length,
      processed: ingestResult.processedCount,
      unmapped: ingestResult.unmappedCount,
    },
  });
});

// ----------------------------------------------------------------------------
// 5. TEST MAPPINGS
// ----------------------------------------------------------------------------
router.get('/mappings', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const framework = req.query.framework as string | undefined;
  const search = req.query.search as string | undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

  const result = await automationMappingService.listMappings(projectId, {
    framework,
    search,
    page,
    limit,
  });

  res.json({
    success: true,
    data: result.mappings,
    meta: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

router.post('/mappings', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const parsed = createAutomationMappingSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError('Invalid test mapping parameters', parsed.error.format());
  }

  const mapping = await automationMappingService.createMapping(projectId, parsed.data);
  res.status(201).json({ success: true, data: mapping });
});

router.patch('/mappings/:mappingId', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const mappingId = req.params.mappingId as string;
  const parsed = updateAutomationMappingSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError('Invalid update parameters', parsed.error.format());
  }

  const updated = await automationMappingService.updateMapping(projectId, mappingId, parsed.data);
  res.json({ success: true, data: updated });
});

router.delete('/mappings/:mappingId', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const mappingId = req.params.mappingId as string;
  await automationMappingService.deleteMapping(projectId, mappingId);
  res.json({ success: true, data: { message: 'Mapping removed' } });
});

// ----------------------------------------------------------------------------
// 6. UNMAPPED TESTS
// ----------------------------------------------------------------------------
router.get('/unmapped', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const sessionId = req.query.sessionId as string | undefined;
  const status = req.query.status as string | undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

  const result = await automationMappingService.listUnmappedTests(projectId, {
    sessionId,
    status,
    page,
    limit,
  });

  res.json({
    success: true,
    data: result.unmapped,
    meta: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

router.post('/unmapped/:unmappedId/resolve', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const unmappedId = req.params.unmappedId as string;
  const parsed = resolveUnmappedTestSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError('Invalid resolve input', parsed.error.format());
  }

  const result = await automationMappingService.resolveUnmappedTest(
    projectId,
    unmappedId,
    parsed.data
  );

  res.json({ success: true, data: result });
});

// ----------------------------------------------------------------------------
// 7. WEBHOOKS & CI/CD
// ----------------------------------------------------------------------------
router.post('/webhooks/github', async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const eventId = (req.headers['x-github-delivery'] as string) || req.body.eventId;
  const eventType = (req.headers['x-github-event'] as string) || req.body.eventType || 'workflow_run';

  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'test-webhook-secret';

  // If signature provided, verify it
  if (signature && !automationWebhookService.verifyGitHubSignature(JSON.stringify(req.body), signature, webhookSecret)) {
    throw new UnauthorizedError('Invalid GitHub webhook HMAC signature');
  }

  const result = await automationWebhookService.processGitHubWebhook(
    projectId,
    eventId,
    eventType,
    signature || '',
    req.body
  );

  res.json({ success: true, data: result });
});

router.get('/webhooks', authenticateAutomationOrUser, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  const result = await automationWebhookService.listWebhookEvents(projectId, {
    page,
    limit,
  });

  res.json({
    success: true,
    data: result.events,
    meta: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

export default router;
