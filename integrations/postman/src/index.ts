import {
  IngestTestResultItemDto,
  AutomationTestResultStatus,
} from '@ai-qa/shared-types';

export interface PostmanCollectionInfo {
  name: string;
  schema?: string;
  _postman_id?: string;
  description?: string;
}

export interface PostmanValidationResult {
  isValid: boolean;
  name: string;
  totalRequests: number;
  totalFolders: number;
  folders: string[];
  requests: Array<{ name: string; method: string; path: string }>;
  warnings: string[];
}

/**
 * Validate and inspect a Postman Collection JSON structure.
 * Validates v2.0 and v2.1 schema formats without executing any request.
 */
export function validatePostmanCollection(raw: string | object): PostmanValidationResult {
  const collection = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const warnings: string[] = [];

  if (!collection || typeof collection !== 'object') {
    return {
      isValid: false,
      name: 'Invalid Collection',
      totalRequests: 0,
      totalFolders: 0,
      folders: [],
      requests: [],
      warnings: ['Payload is not a valid JSON object'],
    };
  }

  const name = collection.info?.name || 'Untitled Collection';
  const folders: string[] = [];
  const requests: Array<{ name: string; method: string; path: string }> = [];

  function traverse(items: any[], currentPath: string[]) {
    for (const item of items || []) {
      if (item.item && Array.isArray(item.item)) {
        // Folder
        const folderName = item.name || 'Folder';
        folders.push([...currentPath, folderName].join(' / '));
        traverse(item.item, [...currentPath, folderName]);
      } else if (item.request) {
        // Request
        const method = typeof item.request === 'string' ? 'GET' : item.request.method || 'GET';
        let urlPath = '';
        if (typeof item.request.url === 'string') {
          urlPath = item.request.url;
        } else if (item.request.url?.raw) {
          urlPath = item.request.url.raw;
        } else if (Array.isArray(item.request.url?.path)) {
          urlPath = '/' + item.request.url.path.join('/');
        }

        requests.push({
          name: item.name || 'Untitled Request',
          method: method.toUpperCase(),
          path: urlPath,
        });
      }
    }
  }

  traverse(collection.item, []);

  if (requests.length === 0) {
    warnings.push('Collection contains no executable requests');
  }

  return {
    isValid: true,
    name,
    totalRequests: requests.length,
    totalFolders: folders.length,
    folders,
    requests,
    warnings,
  };
}

/**
 * Sanitize sensitive authentication headers and secret variables from a Postman collection before storage.
 */
export function sanitizePostmanCollection(raw: string | object): any {
  const collection = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(JSON.stringify(raw));

  const SENSITIVE_KEY_REGEX = /(?:password|secret|key|token|auth|bearer|credential)/i;

  function sanitizeItems(items: any[]) {
    for (const item of items || []) {
      if (item.item) {
        sanitizeItems(item.item);
      }

      if (item.request?.header && Array.isArray(item.request.header)) {
        for (const h of item.request.header) {
          if (SENSITIVE_KEY_REGEX.test(h.key || '')) {
            h.value = '[REDACTED_SECRET]';
          }
        }
      }

      if (item.request?.auth) {
        item.request.auth = { type: item.request.auth.type, description: '[AUTH_CONFIG_REDACTED]' };
      }
    }
  }

  if (collection.variable && Array.isArray(collection.variable)) {
    for (const v of collection.variable) {
      if (SENSITIVE_KEY_REGEX.test(v.key || '')) {
        v.value = '[REDACTED_SECRET]';
      }
    }
  }

  if (collection.item) {
    sanitizeItems(collection.item);
  }

  return collection;
}

/**
 * Parse a Newman JSON execution summary into platform test results.
 */
export function parseNewmanReportToItems(report: any): IngestTestResultItemDto[] {
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
      for (let a = 0; a < assertions.length; a++) {
        const assertion = assertions[a];
        const assertionTitle = assertion.assertion || `Assertion #${a + 1}`;
        const isFailed = !!assertion.error;

        items.push({
          externalId: `${reqId}_assertion_${a + 1}`,
          externalTitle: `${reqName} > ${assertionTitle}`,
          suiteHierarchy: [collectionName, reqName],
          status: (isFailed ? 'FAILED' : 'PASSED') as AutomationTestResultStatus,
          durationMs: a === 0 ? responseTime : 0,
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

/**
 * Upload a Newman execution report directly to the platform API.
 */
export async function uploadNewmanReport(options: {
  apiUrl: string;
  projectId: string;
  apiToken: string;
  report: any;
}): Promise<any> {
  const res = await fetch(
    `${options.apiUrl}/projects/${options.projectId}/automation/ingest/newman`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiToken}`,
      },
      body: JSON.stringify(options.report),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Newman report upload failed (${res.status}): ${errorText}`);
  }

  return res.json();
}
