import {
  IngestTestResultItemDto,
  AutomationTestResultStatus,
  CreateAutomationSessionInput,
} from '@ai-qa/shared-types';

export interface AIQAPlaywrightReporterOptions {
  apiUrl?: string;
  projectId?: string;
  apiToken?: string;
  environmentId?: string;
  milestoneId?: string;
  testRunName?: string;
}

export interface PlaywrightTestCaseLike {
  title: string;
  titlePath(): string[];
  annotations?: Array<{ type: string; description?: string }>;
  parent?: any;
  location?: { file: string; line: number; column: number };
}

export interface PlaywrightTestResultLike {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  retry: number;
  errors?: Array<{ message?: string; stack?: string }>;
  error?: { message?: string; stack?: string };
  attachments?: Array<{ name: string; contentType: string; path?: string; body?: Buffer }>;
  steps?: Array<{ title: string; duration: number; error?: any }>;
}

export class AIQAPlaywrightReporter {
  private options: AIQAPlaywrightReporterOptions;
  private results: IngestTestResultItemDto[] = [];
  private sessionId: string | null = null;
  private apiUrl: string;
  private projectId: string;
  private apiToken: string;

  constructor(options: AIQAPlaywrightReporterOptions = {}) {
    this.options = options;
    this.apiUrl =
      options.apiUrl ||
      process.env.AIQA_API_URL ||
      'http://localhost:4000/api/v1';
    this.projectId = options.projectId || process.env.AIQA_PROJECT_ID || '';
    this.apiToken = options.apiToken || process.env.AIQA_API_TOKEN || '';
  }

  async onBegin(_config?: any, _suite?: any): Promise<void> {
    if (!this.projectId || !this.apiToken) {
      console.warn(
        '[AIQA-Playwright] Warning: AIQA_PROJECT_ID or AIQA_API_TOKEN not configured. Results will not be uploaded.'
      );
      return;
    }

    try {
      const sessionPayload: CreateAutomationSessionInput = {
        framework: 'PLAYWRIGHT',
        testRunName:
          this.options.testRunName ||
          process.env.AIQA_RUN_NAME ||
          `Playwright Run - ${new Date().toISOString().substring(0, 19).replace('T', ' ')}`,
        environmentId: this.options.environmentId || process.env.AIQA_ENVIRONMENT_ID || null,
        milestoneId: this.options.milestoneId || process.env.AIQA_MILESTONE_ID || null,
        ciProvider: process.env.GITHUB_ACTIONS ? 'GITHUB_ACTIONS' : process.env.CI ? 'CI' : 'LOCAL',
        ciBuildId: process.env.GITHUB_RUN_ID || undefined,
        ciBuildUrl:
          process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
            ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
            : undefined,
        gitBranch: process.env.GITHUB_REF_NAME || undefined,
        gitCommitSha: process.env.GITHUB_SHA || undefined,
        gitAuthor: process.env.GITHUB_ACTOR || undefined,
        os: process.platform,
      };

      const res = await fetch(
        `${this.apiUrl}/projects/${this.projectId}/automation/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify(sessionPayload),
        }
      );

      if (res.ok) {
        const data = (await res.json()) as any;
        this.sessionId = data.data?.id || null;
      } else {
        console.warn(`[AIQA-Playwright] Failed to initialize session: ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      console.warn(`[AIQA-Playwright] Session init network error: ${err.message}`);
    }
  }

  onTestEnd(test: PlaywrightTestCaseLike, result: PlaywrightTestResultLike): void {
    const fullPath = test.titlePath ? test.titlePath() : [test.title];
    const file = test.location?.file || 'test';
    const externalId = `${file}::${test.title}`;

    // Map test status
    let status: AutomationTestResultStatus = 'PASSED';
    if (result.status === 'failed') status = 'FAILED';
    else if (result.status === 'timedOut') status = 'TIMED_OUT';
    else if (result.status === 'skipped' || result.status === 'interrupted') status = 'SKIPPED';

    const errorMessage =
      result.error?.message ||
      (result.errors && result.errors.length > 0 ? result.errors[0].message : null);
    const stackTrace =
      result.error?.stack ||
      (result.errors && result.errors.length > 0 ? result.errors[0].stack : null);

    // Extract explicit test case annotation if present
    let testCaseId: string | undefined;
    if (test.annotations) {
      const tcAnno = test.annotations.find(
        (a) => a.type === 'testCaseId' || a.type === 'aiqa' || a.type === 'tc'
      );
      if (tcAnno?.description) {
        testCaseId = tcAnno.description;
      }
    }

    if (!testCaseId) {
      const match = `${test.title} ${file}`.match(/@?(?:AIQA|TC|TEST)-?(\d+)/i);
      if (match && match[1]) {
        testCaseId = match[1];
      }
    }

    const item: IngestTestResultItemDto = {
      externalId,
      externalTitle: fullPath.join(' > '),
      suiteHierarchy: fullPath.slice(0, -1),
      status,
      durationMs: Math.round(result.duration || 0),
      errorMessage,
      stackTrace,
      attemptNumber: (result.retry || 0) + 1,
      isFinalAttempt: true,
      retryCount: result.retry || 0,
      testCaseId,
      steps: (result.steps || []).map((st, idx) => ({
        stepNumber: idx + 1,
        title: st.title,
        status: st.error ? 'FAILED' : 'PASSED',
        durationMs: Math.round(st.duration || 0),
        errorMessage: st.error?.message || null,
      })),
    };

    this.results.push(item);
  }

  async onEnd(_result?: any): Promise<void> {
    if (!this.sessionId || this.results.length === 0) {
      return;
    }

    try {
      // 1. Batch upload results
      const res = await fetch(
        `${this.apiUrl}/projects/${this.projectId}/automation/sessions/${this.sessionId}/results`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({ results: this.results }),
        }
      );

      if (!res.ok) {
        console.warn(`[AIQA-Playwright] Results batch upload failed: ${res.status}`);
      }

      // 2. Finalize session
      await fetch(
        `${this.apiUrl}/projects/${this.projectId}/automation/sessions/${this.sessionId}/finalize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({ status: 'COMPLETED' }),
        }
      );
    } catch (err: any) {
      console.warn(`[AIQA-Playwright] Error uploading final results: ${err.message}`);
    }
  }

  /**
   * Helper utility for testing payload generation without network access.
   */
  getAccumulatedResults(): IngestTestResultItemDto[] {
    return this.results;
  }
}

export default AIQAPlaywrightReporter;
