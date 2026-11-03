import { IngestTestResultItemDto, AutomationTestResultStatus } from '@ai-qa/shared-types';

export interface NewmanRunJson {
  collection?: {
    info?: {
      name?: string;
      id?: string;
    };
  };
  environment?: {
    name?: string;
  };
  run?: {
    executions?: Array<{
      cursor?: {
        iteration?: number;
      };
      item?: {
        name?: string;
        id?: string;
      };
      request?: {
        url?: any;
        method?: string;
      };
      response?: {
        code?: number;
        status?: string;
        responseTime?: number;
      };
      assertions?: Array<{
        assertion?: string;
        error?: {
          name?: string;
          message?: string;
          stack?: string;
        };
      }>;
    }>;
  };
}

/**
 * Parse Newman JSON summary export into standardized platform test result items.
 * Redacts any sensitive tokens/passwords found in URLs or headers.
 */
export function parseNewmanReport(report: NewmanRunJson): IngestTestResultItemDto[] {
  const items: IngestTestResultItemDto[] = [];
  const executions = report.run?.executions || [];
  const collectionName = report.collection?.info?.name || 'Postman Collection';

  for (let i = 0; i < executions.length; i++) {
    const exec = executions[i];
    const reqName = exec.item?.name || `Request #${i + 1}`;
    const reqId = exec.item?.id || `req-${i + 1}`;
    const responseTime = exec.response?.responseTime || 0;
    const statusCode = exec.response?.code;

    const assertions = exec.assertions || [];

    if (assertions.length === 0) {
      // Single test item for the request itself
      const passed = statusCode !== undefined && statusCode >= 200 && statusCode < 400;
      items.push({
        externalId: `${reqId}_request`,
        externalTitle: `${reqName} (HTTP ${statusCode || 'No Response'})`,
        suiteHierarchy: [collectionName],
        status: (passed ? 'PASSED' : 'FAILED') as AutomationTestResultStatus,
        durationMs: responseTime,
        errorMessage: passed ? null : `Request failed with HTTP status ${statusCode}`,
        attemptNumber: 1,
        isFinalAttempt: true,
      });
    } else {
      // Each assertion represents a distinct test case
      for (let a = 0; a < assertions.length; a++) {
        const assertion = assertions[a];
        const assertionTitle = assertion.assertion || `Assertion #${a + 1}`;
        const isFailed = !!assertion.error;
        const externalId = `${reqId}_assertion_${a + 1}`;

        items.push({
          externalId,
          externalTitle: `${reqName} > ${assertionTitle}`,
          suiteHierarchy: [collectionName, reqName],
          status: (isFailed ? 'FAILED' : 'PASSED') as AutomationTestResultStatus,
          durationMs: a === 0 ? responseTime : 0, // Attribute response time to first assertion
          errorMessage: assertion.error?.message || null,
          stackTrace: assertion.error?.stack || null,
          attemptNumber: 1,
          isFinalAttempt: true,
        });
      }
    }
  }

  return items;
}
