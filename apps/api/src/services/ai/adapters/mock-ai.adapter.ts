import crypto from 'node:crypto';
import { AIProviderType } from '@ai-qa/shared-types';
import {
  AIProviderAdapter,
  AIProviderResponse,
  AICompletionOptions,
  AIEmbeddingResponse,
} from './ai-provider.adapter';

export class MockAIAdapter implements AIProviderAdapter {
  private defaultModel: string;

  constructor(defaultModel = 'mock-llm-v1') {
    this.defaultModel = defaultModel;
  }

  getProviderType(): AIProviderType {
    return AIProviderType.MOCK;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message?: string }> {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 10));
    return {
      success: true,
      latencyMs: Date.now() - start,
      message: 'Mock AI Provider connection successful',
    };
  }

  async generateEmbedding(text: string): Promise<AIEmbeddingResponse> {
    const dimensions = 1536;
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = new Array<number>(dimensions);
    
    // Generate pseudo-deterministic normalized vector from hash
    let normSq = 0;
    for (let i = 0; i < dimensions; i++) {
      const val = (hash[i % hash.length] / 128.0) - 1.0;
      embedding[i] = val;
      normSq += val * val;
    }
    const norm = Math.sqrt(normSq) || 1;
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = Number((embedding[i] / norm).toFixed(6));
    }

    return {
      embedding,
      dimensions,
      tokens: Math.max(1, Math.ceil(text.length / 4)),
    };
  }

  async generateCompletion(
    prompt: string,
    options?: AICompletionOptions
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    let content = '';

    // If JSON response requested, determine what task type is represented in the prompt
    if (options?.responseFormat === 'json') {
      content = this.generateDeterministicJson(prompt);
    } else {
      content = `Mock AI response for prompt: ${prompt.slice(0, 100)}...`;
    }

    const latencyMs = Math.max(5, Date.now() - startTime);
    const promptTokens = Math.max(1, Math.ceil(prompt.length / 4));
    const completionTokens = Math.max(1, Math.ceil(content.length / 4));
    const totalTokens = promptTokens + completionTokens;

    // Standard mock cost: $0.001 per 1k input, $0.002 per 1k output
    const costUsd = Number(
      ((promptTokens * 0.000001) + (completionTokens * 0.000002)).toFixed(6)
    );

    return {
      content,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd,
      model,
      latencyMs,
      raw: { mock: true },
    };
  }

  private generateDeterministicJson(prompt: string): string {
    const lower = prompt.toLowerCase();

    // 1. Test case generation
    if (lower.includes('test case') || lower.includes('generate_test_cases') || lower.includes('coverage_notes')) {
      return JSON.stringify({
        summary: 'Automated test suite covering core functional flows, boundaries, and security perimeters.',
        coverageNotes: 'Analyzed acceptance criteria. Identified 4 main test vectors: happy path, validation boundary, security injection, and invalid payload handling.',
        testCases: [
          {
            title: 'Verify successful execution with valid parameters',
            description: 'Ensure the system processes compliant requests according to specification.',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            preconditions: 'User is authenticated and has required resource permissions.',
            steps: [
              {
                stepNumber: 1,
                action: 'Navigate to target resource endpoint or view',
                expectedResult: 'Resource interface loads without errors',
              },
              {
                stepNumber: 2,
                action: 'Submit payload with verified parameters',
                expectedResult: 'System returns 200/201 status and valid response body',
              },
            ],
            expectedResult: 'Operation succeeds and persistence layer updates accurately.',
            testCategory: 'POSITIVE',
            tags: ['automated', 'smoke', 'functional'],
          },
          {
            title: 'Verify validation rejection when required field is omitted',
            description: 'Ensure missing mandatory fields trigger clear 400 Bad Request error.',
            type: 'REGRESSION',
            priority: 'MEDIUM',
            preconditions: 'Client is authenticated.',
            steps: [
              {
                stepNumber: 1,
                action: 'Send request with empty or omitted primary identifier',
                expectedResult: 'Validation layer intercepts request before business logic',
              },
            ],
            expectedResult: 'System responds with HTTP 400 and structured validation errors.',
            testCategory: 'NEGATIVE',
            tags: ['validation', 'negative'],
          },
          {
            title: 'Verify boundary condition on maximum input length',
            description: 'Ensure payloads at character threshold boundary are accepted and over-limit rejected.',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            preconditions: 'Environment configured with standard field limits.',
            steps: [
              {
                stepNumber: 1,
                action: 'Submit field with maximum allowed length',
                expectedResult: 'Request is accepted successfully',
              },
              {
                stepNumber: 2,
                action: 'Submit field exceeding maximum by 1 character',
                expectedResult: 'System cleanly rejects with input too long validation error',
              },
            ],
            expectedResult: 'Exact boundary limits enforced correctly.',
            testCategory: 'BOUNDARY',
            tags: ['boundary', 'limits'],
          },
          {
            title: 'Verify prompt and script injection protection on text inputs',
            description: 'Ensure malicious payloads containing script tags or delimiter sequences are neutralized.',
            type: 'SECURITY',
            priority: 'CRITICAL',
            preconditions: 'Security filters and sanitizers enabled.',
            steps: [
              {
                stepNumber: 1,
                action: 'Input payload containing <script>alert(1)</script> and SQL quotes',
                expectedResult: 'Input is safely sanitized or rejected',
              },
            ],
            expectedResult: 'No script execution or unescaped storage occurs.',
            testCategory: 'SECURITY',
            tags: ['security', 'sanitization', 'injection'],
          },
        ],
      });
    }

    // 2. Failure Analysis
    if (lower.includes('failure analysis') || lower.includes('observed_facts') || lower.includes('root_cause')) {
      return JSON.stringify({
        observedFacts: [
          'Test case execution failed during step assertion verification.',
          'HTTP status code received was different from expected contract.',
          'Execution error stack trace points to resource resolution timing.',
        ],
        hypotheses: [
          'Underlying database transaction timed out or encountered concurrency lock contention.',
          'Missing foreign key relationship in test environment setup.',
          'Recent migration changed schema constraint without updating execution fixture.',
        ],
        confidenceScore: 0.88,
        suggestedSeverity: 'HIGH',
        suggestedPriority: 'HIGH',
        debuggingSteps: [
          'Verify database connection pool health and transaction timeouts.',
          'Inspect server logs at exact timestamp for unhandled rejections.',
          'Rerun test fixture in isolated environment to check for test pollution.',
        ],
        suggestedFix: 'Wrap target update in an atomic transaction with concurrency retry loop.',
        potentialDefectTitle: 'Regression: Resource resolution failure during concurrent execution',
      });
    }

    // 3. Duplicate Defect Analysis
    if (lower.includes('duplicate') || lower.includes('similarity_score')) {
      return JSON.stringify({
        isDuplicate: true,
        confidenceScore: 0.84,
        reasoning: 'Both defects describe the exact same error symptom in the authentication flow with identical stack trace patterns and failure preconditions.',
        matchingFactors: [
          'Identical endpoint path (/api/v1/auth/refresh)',
          'Matching error code: UNAUTHORIZED',
          'Same component and reproduction steps',
        ],
        differingFactors: [
          'Reported on different browser environments (Chrome vs Firefox)',
          'Slightly different user agent string',
        ],
        recommendedAction: 'MERGE',
      });
    }

    // 4. Risk Analysis
    if (lower.includes('risk') || lower.includes('overall_risk_score')) {
      return JSON.stringify({
        overallRiskScore: 68,
        riskLevel: 'HIGH',
        summary: 'High defect concentration identified in Authentication and Execution modules with a 24% test failure rate over recent runs.',
        componentRisks: [
          {
            component: 'Authentication & Session Management',
            riskScore: 82,
            reason: '3 critical defects open and recent token rotation changes.',
            recommendedTestFocus: ['Token rotation edge cases', 'Concurrent refresh requests', 'Session revocation'],
          },
          {
            component: 'Test Execution Engine',
            riskScore: 71,
            reason: 'Elevated flakiness observed during step execution and result calculation.',
            recommendedTestFocus: ['Concurrency stress tests', 'Execution summary calculations'],
          },
          {
            component: 'Defect Tracking',
            riskScore: 35,
            reason: 'Stable lifecycle transitions with comprehensive test coverage.',
            recommendedTestFocus: ['Duplicate cycle prevention smoke checks'],
          },
        ],
        testingRecommendations: [
          'Prioritize executing the Authentication regression suite before production release.',
          'Stabilize the Test Execution Engine by resolving open race conditions.',
          'Expand automated negative testing on new API endpoints.',
        ],
      });
    }

    // 5. QA Report Summary
    if (lower.includes('report') || lower.includes('executive summary') || lower.includes('executive_summary')) {
      return JSON.stringify({
        executiveSummary: 'The QA sprint has achieved 84% test completion with a 91% pass rate across active test suites. 5 high-priority defects were resolved, while 2 open blockers remain under active developer remediation.',
        keyHighlights: [
          'Core test plan execution is tracking on schedule for the targeted release.',
          'Authentication security suites passed with zero vulnerabilities detected.',
          'Execution engine flakiness decreased by 18% following atomic transaction refactoring.',
        ],
        qualityScore: 85,
        riskAssessment: 'Moderate risk pending resolution of the 2 open high-priority defects in reporting analytics.',
        releaseReadiness: 'CONDITIONAL_PASS',
        recommendations: [
          'Complete re-testing of the fixed defect items in staging.',
          'Execute a final smoke test run across all staging environments prior to production cutover.',
        ],
      });
    }

    // Default fallback structured JSON
    return JSON.stringify({
      result: 'Processed by Mock AI engine',
      timestamp: new Date().toISOString(),
    });
  }
}
