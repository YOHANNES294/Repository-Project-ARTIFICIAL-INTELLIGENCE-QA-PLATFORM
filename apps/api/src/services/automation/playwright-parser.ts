import { IngestTestResultItemDto, AutomationTestResultStatus } from '@ai-qa/shared-types';

export interface PlaywrightJsonReport {
  config?: any;
  suites?: PlaywrightSuite[];
  errors?: any[];
}

export interface PlaywrightSuite {
  title: string;
  file?: string;
  line?: number;
  column?: number;
  suites?: PlaywrightSuite[];
  specs?: PlaywrightSpec[];
}

export interface PlaywrightSpec {
  id: string;
  title: string;
  file: string;
  line: number;
  column: number;
  tests: PlaywrightTest[];
}

export interface PlaywrightTest {
  projectName?: string;
  status: string;
  results: PlaywrightTestResult[];
}

export interface PlaywrightTestResult {
  workerIndex?: number;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  error?: {
    message?: string;
    stack?: string;
    value?: string;
  };
  errors?: Array<{
    message?: string;
    stack?: string;
  }>;
  retry?: number;
  attachments?: Array<{
    name: string;
    contentType: string;
    path?: string;
    body?: string;
  }>;
  steps?: Array<{
    title: string;
    duration: number;
    error?: any;
  }>;
}

/**
 * Recursively parse Playwright JSON report into normalized platform test results.
 * Preserves retry attempts as distinct attempt numbers (`attemptNumber = 1, 2, ...`).
 */
export function parsePlaywrightReport(report: PlaywrightJsonReport): IngestTestResultItemDto[] {
  const items: IngestTestResultItemDto[] = [];

  function traverseSuite(suite: PlaywrightSuite, breadcrumbs: string[]) {
    const currentBreadcrumbs = suite.title ? [...breadcrumbs, suite.title] : breadcrumbs;

    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          const results = test.results || [];
          const projectName = test.projectName || 'default';
          const externalId = `${spec.file}::${spec.title}::${projectName}`;

          // Check if title or file has explicit test case tag e.g. @AIQA-101 or [TC-101]
          const tagMatch = `${spec.title} ${spec.file}`.match(/@?(?:AIQA|TC|TEST)-?(\d+)/i);
          const testCaseId = tagMatch ? tagMatch[1] : undefined;

          for (let r = 0; r < results.length; r++) {
            const attempt = results[r];
            const attemptNumber = (attempt.retry || r) + 1;
            const isFinalAttempt = r === results.length - 1;

            let status: AutomationTestResultStatus = 'PASSED';
            if (attempt.status === 'failed') status = 'FAILED';
            else if (attempt.status === 'timedOut') status = 'TIMED_OUT';
            else if (attempt.status === 'skipped') status = 'SKIPPED';

            const errorMessage =
              attempt.error?.message ||
              (attempt.errors && attempt.errors.length > 0 ? attempt.errors[0].message : null);
            const stackTrace =
              attempt.error?.stack ||
              (attempt.errors && attempt.errors.length > 0 ? attempt.errors[0].stack : null);

            items.push({
              externalId,
              externalTitle: `${currentBreadcrumbs.join(' > ')} > ${spec.title}`,
              suiteHierarchy: currentBreadcrumbs,
              status,
              durationMs: attempt.duration || 0,
              errorMessage,
              stackTrace,
              attemptNumber,
              isFinalAttempt,
              retryCount: results.length - 1,
              browser: projectName,
              testCaseId,
              attachments: (attempt.attachments || []).map((att) => ({
                fileName: att.name,
                contentType: att.contentType,
                dataBase64: att.body,
                type: att.contentType.startsWith('image/')
                  ? 'SCREENSHOT'
                  : att.contentType.startsWith('video/')
                    ? 'VIDEO'
                    : 'LOG',
              })),
              steps: (attempt.steps || []).map((st, sIdx) => ({
                stepNumber: sIdx + 1,
                title: st.title,
                status: st.error ? 'FAILED' : 'PASSED',
                durationMs: st.duration || 0,
                errorMessage: st.error?.message || null,
              })),
            });
          }
        }
      }
    }

    if (suite.suites) {
      for (const childSuite of suite.suites) {
        traverseSuite(childSuite, currentBreadcrumbs);
      }
    }
  }

  for (const rootSuite of report.suites || []) {
    traverseSuite(rootSuite, []);
  }

  return items;
}
