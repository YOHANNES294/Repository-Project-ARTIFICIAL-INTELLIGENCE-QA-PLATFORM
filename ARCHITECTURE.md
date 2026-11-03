# Architecture Specification

## 1. Modular Monorepo Design
The system uses a modular monolithic architecture with dedicated background processing:
1. **API Gateway & Core Service (`apps/api`)**:
   - Handles REST requests at `/api/v1`.
   - Correlation IDs (`x-request-id`) injected on every request and bound to Winston structured logs.
   - Enforces strict tenant isolation via organization context.
   - Centralized error handler transforms domain errors into standard JSON envelopes.
2. **Background Processing Service (`apps/worker`)**:
   - Asynchronous job execution using BullMQ over Redis.
   - Handles long-running AI inferences, test result parsing, notifications, and scheduled aggregations.
3. **Frontend Application (`apps/web`)**:
   - Next.js 16 with App Router and React Server/Client Components.
   - TanStack Query for server state management and caching.
   - Real-time status and telemetry dashboard.

## 2. Shared Packages
- `@ai-qa/shared-types`: Canonical domain models, DTOs, and enums.
- `@ai-qa/validation`: Zod schemas shared between frontend and backend.
- `@ai-qa/api-client`: Type-safe fetch client for communication with backend.
- `@ai-qa/ui`: Shared design tokens and utility functions.
- `@ai-qa/config`: Base compiler options and shared standards.

## 3. Reliability & Probes
- `GET /api/v1/health`: Overall health assessment combining process, database, and Redis checks.
- `GET /api/v1/health/live`: Process liveness probe.
- `GET /api/v1/health/ready`: Database and dependency readiness probe.

---

## 4. AI Intelligence Engine Architecture (Milestone 07)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Intelligence Pipeline                         │
├──────────────┬──────────────────┬─────────────────┬────────────────────┤
│ 1. AI Gateway│ 2. Sanitization  │ 3. LLM Adapters │ 4. Output Validator│
│   & Tenant   │   & Injection    │   (OpenAI, Anth,│   & Human Review   │
│   Resolution │     Defense      │    Gemini, Mock)│     Commitment     │
└──────────────┴──────────────────┴─────────────────┴────────────────────┘
```

### 4.1 Provider-Agnostic Gateway & Adapters
The platform supports multiple LLM providers through a unified `AIProviderAdapter` interface:
- **`OpenAIAdapter`**: Connects to OpenAI Chat Completions API with JSON mode (`response_format: { type: "json_object" }`).
- **`AnthropicAdapter`**: Connects to Anthropic Messages API with structured JSON system prompts.
- **`GeminiAdapter`**: Connects to Google Gemini API (`generateContent`) using `application/json` response MIME types.
- **`MockAIAdapter`**: Deterministic, offline provider adapter requiring no external network or API keys. Used for zero-cost testing, CI verification, and offline operation.

### 4.2 Security, Credential Protection & Prompt Sanitization
- **Credential Encryption**: Provider API keys are encrypted at rest using AES-256-GCM with distinct IV and Auth Tag columns (`apiKeyEncrypted`, `apiKeyIv`, `apiKeyTag`). Plaintext keys are never saved, returned over API endpoints, or written to system logs.
- **Prompt Sanitization**: All prompts pass through `PromptSanitizer.sanitize()`, which:
  1. Redacts sensitive credentials (bearer tokens, JWTs, private keys, passwords, API keys).
  2. Neutralizes prompt injection patterns (`ignore previous instructions`, `system prompt override`, `jailbreak delimiters`).
  3. Enforces length boundaries to prevent context-overflow vulnerabilities.

### 4.3 Structured Output Validation & Schema Enforcement
LLM responses are parsed and strictly validated against domain Zod schemas before being persisted:
- Malformed or invalid JSON triggers clean fallback handling rather than unhandled server exceptions.
- Domain outputs are typed into strict TypeScript interfaces before delivery to callers.

### 4.4 Human-in-the-Loop Review Pipeline
The platform enforces human agency and verification for all AI-generated test artifacts:
- Generated test cases are initially persisted with status `PROPOSED`.
- QA engineers can review each item individually (`ACCEPTED`, `REJECTED`, `EDITED`) or batch-accept candidate groups.
- Official `TestCase` records and immutable `TestCaseVersion` entries are **only** created once a human approves the proposal.
- Every accepted test case maintains bidirectional traceability to the AI generation item and session.

### 4.5 Graceful Degradation & High Availability
- If an AI provider is unreachable, times out, or encounters rate limits, core QA workflows (manual test authoring, test execution, defect tracking, and release management) remain 100% operational.
- The system logs an `AIUsageLog` entry indicating the error code and gracefully informs the user without impacting surrounding operations.

---

## 5. Automation & CI/CD Integration Architecture (Milestone 08)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Automation Ingestion Pipeline                         │
├──────────────┬──────────────────┬─────────────────┬────────────────────┤
│ 1. External  │ 2. Scoped Token  │ 3. Mapping &    │ 4. Execution       │
│    Runners   │    Auth & HMAC   │    Unmapped     │    Attempt History │
│  (Playwright,│    Verification  │    Resolution   │    & Defect AI     │
│   Newman, CI)│   (aiqa_auto_*)  │  (@AIQA-101)    │    Linkage         │
└──────────────┴──────────────────┴─────────────────┴────────────────────┘
```

### 5.1 External Runner Isolation Principle
To ensure cloud infrastructure security and prevent remote code execution (RCE), the platform strictly adheres to an **External Runner Architecture**:
- Customer-supplied test scripts, Playwright specs, Newman collections, and arbitrary binaries are **never executed** within the primary API process or background worker nodes.
- Execution happens strictly on the customer's CI/CD runners (e.g. GitHub Actions, GitLab CI, local dev machines).
- External runners stream structured execution results, step breakdowns, console logs, and attachments to the platform's authenticated ingestion API via specialized reporters and adapters.

### 5.2 Scoped Automation Authentication & Token Lifecycle
- Dedicated project-scoped tokens (`AutomationApiToken`) prefixed with `aiqa_auto_`.
- Raw token keys are generated using 32 bytes of cryptographically secure random entropy (`crypto.randomBytes(32)`), shown exactly once upon creation, and hashed at rest using SHA-256 (`tokenHash`).
- Dual-mode authentication middleware (`authenticateAutomationOrUser`) accepts either user session cookies or automation tokens in the `Authorization: Bearer aiqa_auto_...` or `x-automation-token` headers.
- Tokens can be instantly revoked (`isRevoked: true`), have configurable expiration dates, and enforce granular permission scopes (`AUTOMATION_INGEST`, `AUTOMATION_READ`, `AUTOMATION_ADMIN`).

### 5.3 Test Case Mapping & Unmapped Test Queue
The mapping service resolves automated test cases to platform `TestCase` entities using a 3-tier deterministic strategy:
1. **Explicit Annotation Extraction**: Checks test titles or properties for canonical tags (e.g. `@AIQA-101` or `{ type: 'testCaseId', description: '101' }`).
2. **Persistent External Mapping**: Matches framework-specific identifier pairs (`framework` + `externalId`) in `AutomationTestMapping`.
3. **Exact Title Matching**: Case-insensitive lookup against active test case titles within the project.
- **Unmapped Test Queue**: Unmatched automated tests are ingested without data loss into `AutomationUnmappedTest`, tracking execution frequency, framework details, and last seen timestamps.
- **1-Click Conversion & Linking**: QA engineers can review unmapped tests and either link them to existing manual test cases or automatically generate new formal test cases with one click.

### 5.4 Execution Sessions, Idempotency & Retry Tracking
- Automated runs are organized into `AutomationSession` records linked directly to canonical `TestRun` entities with `isAutomated: true`.
- **Idempotency Protection**: Duplicate session creation requests with the same `idempotencyKey` return existing sessions cleanly, preventing duplicate test runs during CI retry cascades.
- **Retry Attempt Preservation**: When test runners retry flaky tests (e.g. Playwright retries 1, 2), results are recorded with distinct `attemptNumber` values without overwriting prior execution failure evidence.

### 5.5 GitHub Actions & Signed Webhook Ingestion
- `POST /api/v1/projects/:projectId/automation/webhooks/github` ingests GitHub `workflow_run`, `workflow_job`, and `check_run` events.
- **HMAC-SHA256 Signature Verification**: Validates the `X-Hub-Signature-256` header against the organization or project webhook secret.
- **Deduplication**: Ingested webhooks log delivery IDs (`X-GitHub-Delivery`) in `AutomationWebhookEvent` to guarantee idempotent processing.


---

## 6. Advanced Analytics & Reporting Architecture (Milestone 09)

### 6.1 Database-Backed Aggregation Pipeline
The platform avoids cached or hardcoded dashboard metrics by computing analytics on-demand using optimized PostgreSQL database queries scoped to the tenant:
1. **Tenant Isolation Enclosure**: All analytics queries strictly enforce `projectId` and `organizationId` scoping, preventing cross-tenant data leakage.
2. **Dynamic Period Aggregation**: Computes both active period metrics and historical comparison deltas (e.g. current 30d vs previous 30d) within single round-trip database queries.
3. **Empty Dataset Resiliency**: All aggregation queries implement fallback zero-divisions and null-safe guards to guarantee 200 OK responses with clean JSON even on freshly created, unexecuted projects.

### 6.2 Flaky Test Detection & Status Flip Algorithm
To combat non-deterministic tests in CI/CD pipelines, the analytics engine implements an explainable **Status Flip Algorithm**:
- Analyzes chronological execution attempt histories for test cases.
- Computes state flips: occurrences where an outcome changes from `PASSED` to `FAILED` or `FAILED` to `PASSED` across contiguous attempts within the same scope.
- Calculates an explainable `flakinessScore`:
  $$\text{Flakiness Score} = \min\left(100, \text{round}\left(\frac{\text{Flips} \times 2}{\text{Attempts}} \times 100\right)\right)$$
- Highlights high-risk tests with intermittent behavior for engineer refactoring.

### 6.3 Algorithmic Release Quality Gates
Quality gates govern continuous delivery by verifying release criteria:
- Evaluates active `ProjectQualityGate` thresholds:
  - `minTestPassRate` (e.g. $\ge 95\%$)
  - `maxCriticalDefects` (e.g. $\le 0$)
  - `maxHighDefects` (e.g. $\le 2$)
  - `minExecutionCoverage` (e.g. $\ge 90\%$)
  - `requireZeroBlockers` (strict boolean enforcement)
- Generates an explainable release recommendation:
  - `READY_FOR_RELEASE`: All gate thresholds satisfied.
  - `WARNING_NEEDS_REVIEW`: Non-blocking thresholds missed.
  - `BLOCKED_DO_NOT_RELEASE`: Blocking criteria or blocker defects present.

### 6.4 Immutable Snapshots & Scheduled Reports
- `ReportSnapshot`: Captures a frozen point-in-time snapshot of live aggregated data for audits, executive sign-off, or regulatory compliance.
- `ReportSchedule`: Recurring background jobs triggering periodic report generation and email notifications (`DAILY`, `WEEKLY`, `MONTHLY`) with audit trail logging in `ReportDelivery`.

### 6.5 Export Architecture & Formula Injection Defense
- **Multi-Format Streaming**: Generates sanitized CSVs, multi-worksheet Excel spreadsheets via SheetJS (`xlsx`), and branded corporate scorecard PDFs via `pdfkit` (valid `%PDF-` signature).
- **OWASP CWE-1236 Sanitization**: The `FormulaSanitizer` utility neutralizes dynamic formula execution triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending a single quote before file compilation.

---

## 7. Notifications & External Integrations Architecture (Milestone 10)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Notification & Integration Pipeline                  │
├──────────────┬──────────────────┬─────────────────┬────────────────────┤
│ 1. Business  │ 2. Recipient     │ 3. User Prefs   │ 4. Multi-Channel   │
│    Event     │    Resolution    │    & Quiet Hours│    Dispatch Engine │
│    Trigger   │   (Deduplication │   (Security     │   (In-App, Email,  │
│  (Defect, TR)│    & Actor Drop) │    Override)    │    Slack, Webhook) │
└──────────────┴──────────────────┴─────────────────┴────────────────────┘
```

### 7.1 Central Event-Driven Architecture
The notification system is decoupled from core domain services through an asynchronous, event-driven pipeline:
1. **Business Event Emitted**: Domain actions (e.g., `createDefect`, `transitionStatus`, `completeTestRun`) emit a typed `NotificationEventPayload`.
2. **Recipient Resolution & Actor Exclusion**: `RecipientResolutionService` identifies relevant stakeholders based on defect assignees, test run owners, and entity creators. The actor who initiated the event is automatically omitted so users do not receive noise for their own actions.
3. **Preference & Quiet Hours Evaluation**:
   - `NotificationPreferenceService` evaluates category opt-ins (`defectUpdates`, `testAssignment`, etc.) and quiet hour intervals in the user's localized timezone.
   - **Mandatory Security Exemption**: Security notifications unconditionally bypass user quiet hours and preference suppressions.
4. **Channel Isolation & Fault Tolerance**: In-app notifications, emails, team messages, and outbound webhooks execute in isolated, guarded blocks. A failure or timeout in an external webhook endpoint or email provider will **never** cause a business transaction to fail or roll back.

### 7.2 Real-Time Server-Sent Events (SSE) Engine
- The API provides a real-time streaming endpoint at `/api/v1/notifications/stream`.
- Express manages persistent HTTP connections with `text/event-stream`, pushing discrete `notification` and `unread_count` event payloads immediately upon dispatch.
- Emits keepalive heartbeats every 25 seconds to keep proxies and firewalls open.
- The web frontend pairs SSE with automatic reconnection and a 30-second interval fallback poll to guarantee delivery under all network conditions.

### 7.3 Multi-Channel Email Architecture
- **Provider-Independent Adapters**: Unified `EmailProviderInterface` with pluggable implementations (`LocalMockEmailProvider` for testing and local dev; `ResendEmailProvider` and `SmtpEmailProvider` for cloud production).
- **Responsive HTML & Plain-Text Templates**: High-fidelity templates with strict HTML escaping (`escapeHtml`) to eradicate HTML injection and XSS from user-submitted defect descriptions or comments.
- **Delivery Audit Trail**: Every outbound email records an immutable `EmailDelivery` entry tracking provider message IDs, timestamps, and delivery states (`QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `BOUNCED`).
- **Scheduled Digests**: The `DigestService` compiles daily or weekly quality summaries for subscribed users.

### 7.4 SSRF Defense & Network Security
To prevent Server-Side Request Forgery (SSRF) when communicating with external URLs:
1. **Pre-flight Scheme & Credential Validation**: Strictly enforces `http:` and `https:`. Rejects embedded user credentials (`user:pass@host`).
2. **DNS Pre-Resolution**: Resolves hostnames to all IPv4 and IPv6 addresses prior to socket connection.
3. **Address Space Enforcement**: Rejects loopback (`127.0.0.0/8`, `::1`), private RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local and cloud metadata (`169.254.169.254`), multicast, and carrier-grade NAT ranges.
4. **Redirect Re-Validation**: `safeFetch` prevents redirect-based bypasses by manually inspecting and re-validating the `Location` header destination on every 3xx response.

### 7.5 Outbound Webhooks & HMAC-SHA256 Signing
- Project- and organization-scoped outbound webhooks allow customer systems to react to platform lifecycle events.
- Every HTTP POST payload is cryptographically signed using HMAC-SHA256:
  - Header `X-AIQA-Signature: sha256=<hex>`
  - Header `X-AIQA-Timestamp: <iso timestamp>`
  - Header `X-AIQA-Event-ID: <uuid>`
- Prevents replay attacks and verifies payload integrity.
- Failed webhook requests are recorded in `WebhookDelivery` and can be manually or programmatically retried. Retries exceeding 5 attempts transition to a `DEAD_LETTER` state.

