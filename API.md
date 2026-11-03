# API Specification (/api/v1)

## 1. Conventions
- Base Path: `/api/v1`
- Content Type: `application/json`
- Session Security: HTTP-only, Secure, SameSite=Strict cookies (`accessToken`, `refreshToken`), plus optional `Authorization: Bearer <token>` support.
- Tenant Header: `x-organization-id` (explicitly validated against user's server-side memberships).

### Standard Response Envelopes
Success:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```
Error:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

---

## 2. Health Endpoints
- `GET /api/v1/health`: Overall health assessment (Database, Redis, Worker).
- `GET /api/v1/health/live`: Process liveness probe.
- `GET /api/v1/health/ready`: Database connectivity readiness probe.

---

## 3. Authentication Endpoints (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Create user, default organization, ownership (`OWNER`), set HTTP-only cookies.
- `POST /api/v1/auth/login`: Authenticate with Argon2id, create refresh family, set cookies.
- `POST /api/v1/auth/refresh`: Rotate refresh token with reuse breach detection.
- `POST /api/v1/auth/logout`: Revoke active session and clear cookies.
- `POST /api/v1/auth/forgot-password`: Timing-safe password reset token generation.
- `POST /api/v1/auth/reset-password`: Reset password with verification token & invalidate sessions.
- `POST /api/v1/auth/verify-email`: Verify user email with token.
- `GET /api/v1/auth/me`: Authenticated user profile and active tenant.

---

## 4. Organization Endpoints (`/api/v1/organizations`)
- `POST /api/v1/organizations`: Create additional organization (caller assigned `OWNER`).
- `GET /api/v1/organizations`: List user's organizations and roles.
- `POST /api/v1/organizations/switch`: Switch active organization context.
- `GET /api/v1/organizations/:orgId/members`: List organization members.
- `POST /api/v1/organizations/:orgId/invitations`: Invite new member (`OWNER` or `ADMINISTRATOR`).
- `POST /api/v1/organizations/invitations/accept`: Accept invitation.
- `PATCH /api/v1/organizations/:orgId/members/:memberId`: Update member role.
- `DELETE /api/v1/organizations/:orgId/members/:memberId`: Remove member.

---

## 5. Project Management Endpoints (`/api/v1/projects`)

### `GET /api/v1/projects`
List projects for the active tenant organization with search, filtering, and pagination.
- **Query Parameters**:
  - `search`: Filter by name, key, or description substring.
  - `status`: `ACTIVE` | `ON_HOLD` | `COMPLETED` | `ARCHIVED`.
  - `isArchived`: `true` | `false`.
  - `page`: Page number (default: 1).
  - `limit`: Page size (default: 20, max: 100).
  - `sortBy`: `name` | `key` | `createdAt` | `updatedAt`.
  - `sortOrder`: `asc` | `desc`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "name": "Core Banking Platform",
      "key": "CORE",
      "description": "Main transaction processing system",
      "objectives": "Zero regression bugs",
      "status": "ACTIVE",
      "isArchived": false,
      "_count": { "members": 3, "environments": 3, "testCases": 45, "testRuns": 8, "defects": 2 }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### `POST /api/v1/projects`
Create a new project. Auto-initializes default environments (`Development`, `Staging`, `Production`) and assigns caller as `PROJECT_LEAD`.
- **Security**: Requires `QA_MANAGER`, `ADMINISTRATOR`, or `OWNER`.
- **Request Body**:
```json
{
  "name": "Core Banking Platform",
  "key": "CORE",
  "description": "Main platform",
  "objectives": "99.9% pass rate on core flows"
}
```
- **Response (201 Created)**

### `GET /api/v1/projects/:projectId`
Get project details, environments, and aggregate counts.
- **Security**: Verified member of the project's parent organization (Strict Tenant Isolation).
- **Response (200 OK)**

### `PATCH /api/v1/projects/:projectId`
Update project details, objectives, or status (`ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`).
- **Security**: Requires `QA_MANAGER`, `ADMINISTRATOR`, or `OWNER`.
- **Request Body**:
```json
{
  "name": "Updated Name",
  "status": "ON_HOLD",
  "objectives": "Updated targets"
}
```
- **Response (200 OK)**

### `POST /api/v1/projects/:projectId/archive`
Archives the project (`isArchived: true`, `status: ARCHIVED`).
- **Security**: Requires `QA_MANAGER`, `ADMINISTRATOR`, or `OWNER`.
- **Response (200 OK)**

### `POST /api/v1/projects/:projectId/restore`
Restores an archived project (`isArchived: false`, `status: ACTIVE`).
- **Security**: Requires `QA_MANAGER`, `ADMINISTRATOR`, or `OWNER`.
- **Response (200 OK)**

### `DELETE /api/v1/projects/:projectId`
Permanently deletes a project. Safeguard: project must be archived first.
- **Security**: Requires `ADMINISTRATOR` or `OWNER`.
- **Response (200 OK)**

### `GET /api/v1/projects/:projectId/activity`
Retrieves chronological audit log entries for project modifications.
- **Response (200 OK)**

---

## 6. Project Members Endpoints (`/api/v1/projects/:projectId/members`)
- `GET /api/v1/projects/:projectId/members`: Lists project team members with user details and project roles.
- `POST /api/v1/projects/:projectId/members`: Adds an existing organization member to the project. Cross-organization member addition is strictly denied with `403 Forbidden`.
  - Roles: `PROJECT_LEAD`, `MEMBER`, `VIEWER`.
- `PATCH /api/v1/projects/:projectId/members/:memberId`: Updates project member role.
- `DELETE /api/v1/projects/:projectId/members/:memberId`: Removes member from the project.

---

## 7. Project Environments Endpoints (`/api/v1/projects/:projectId/environments`)
- `GET /api/v1/projects/:projectId/environments`: Lists project deployment targets. Redacts sensitive configuration variables (`••••••••`).
- `POST /api/v1/projects/:projectId/environments`: Creates a new environment (`DEVELOPMENT`, `TESTING`, `STAGING`, `PRODUCTION`, `CUSTOM`).
- `PATCH /api/v1/projects/:projectId/environments/:envId`: Updates environment URL, description, variables, or active status.
- `DELETE /api/v1/projects/:projectId/environments/:envId`: Deletes environment.

---

## 8. Milestone Management Endpoints (`/api/v1/projects/:projectId/milestones`)
- `GET /api/v1/projects/:projectId/milestones`: Lists project milestones with search, status filtering, priority filtering, and dynamic QA progress calculation (completion %, passed/failed/blocked test runs, open defects).
- `GET /api/v1/projects/:projectId/milestones/:milestoneId`: Returns milestone details and full execution progress breakdown.
- `GET /api/v1/projects/:projectId/milestones/:milestoneId/progress`: Returns granular progress metrics.
- `POST /api/v1/projects/:projectId/milestones`: Creates a new milestone. Validates `dueDate >= startDate`.
  - Roles: `QA_MANAGER`, `ADMINISTRATOR`, `OWNER`.
  - Statuses: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, `CANCELLED`.
  - Priorities: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- `PATCH /api/v1/projects/:projectId/milestones/:milestoneId`: Updates milestone. Setting status to `COMPLETED` automatically timestamps `completedAt`.
- `DELETE /api/v1/projects/:projectId/milestones/:milestoneId`: Deletes milestone and writes audit log.

---

## 9. Hierarchical Test Suite Endpoints (`/api/v1/projects/:projectId/suites`)
- `GET /api/v1/projects/:projectId/suites`: Returns hierarchical folder tree (root suites with recursively nested `children` arrays, case counts, and child suite counts).
- `GET /api/v1/projects/:projectId/suites/:suiteId`: Retrieves suite details, parent reference, and sub-suites.
- `POST /api/v1/projects/:projectId/suites`: Creates a root or child test suite.
  - Roles: `QA_ENGINEER`, `AUTOMATION_ENGINEER`, `QA_MANAGER`, `ADMINISTRATOR`, `OWNER`.
- `PATCH /api/v1/projects/:projectId/suites/:suiteId`: Updates test suite. Features circular reference prevention (blocks moving a suite into its own descendant or setting itself as parent).
- `DELETE /api/v1/projects/:projectId/suites/:suiteId`: Deletes test suite.

---

## 10. Tag Management Endpoints (`/api/v1/projects/:projectId/tags`)
- `GET /api/v1/projects/:projectId/tags`: Lists project-scoped tags with usage counts (`_count.testCases`).
- `POST /api/v1/projects/:projectId/tags`: Creates unique tag within project.
- `PATCH /api/v1/projects/:projectId/tags/:tagId`: Updates tag name or hex color.
- `DELETE /api/v1/projects/:projectId/tags/:tagId`: Deletes tag.

---

## 11. Test Case Management & Versioning (`/api/v1/projects/:projectId/test-cases`)
- `GET /api/v1/projects/:projectId/test-cases`: Lists test cases with search (key e.g. `CORE-1`, title, description), multi-filter (suite, milestone, priority, type, status, tag), pagination, and sorting.
- `GET /api/v1/projects/:projectId/test-cases/:caseId`: Retrieves full test case with latest version snapshot, ordered steps, suite, milestone, author, and tags.
- `POST /api/v1/projects/:projectId/test-cases`: Creates a new test case. Automatically generates project-scoped sequential key (`PROJECT-1`), creates version 1 (`TestCaseVersion`), and snapshots initial ordered steps (`TestStep`).
  - Roles: `QA_ENGINEER`, `AUTOMATION_ENGINEER`, `QA_MANAGER`, `ADMINISTRATOR`, `OWNER`.
- `PATCH /api/v1/projects/:projectId/test-cases/:caseId`: Updates test case. If title, description, priority, type, status, or steps change, automatically increments version number and creates a new immutable `TestCaseVersion` snapshot.
- `POST /api/v1/projects/:projectId/test-cases/:caseId/archive`: Archives test case.
- `POST /api/v1/projects/:projectId/test-cases/:caseId/restore`: Restores archived test case.
- `DELETE /api/v1/projects/:projectId/test-cases/:caseId`: Permanently deletes test case. **Integrity Rule**: Blocked with `400 Bad Request` if test case has historical test run execution results to safeguard audit traceability.
- `GET /api/v1/projects/:projectId/test-cases/:caseId/versions`: Lists all historical immutable version snapshots with author and change summaries.
- `GET /api/v1/projects/:projectId/test-cases/:caseId/versions/:versionNumber`: Returns specific immutable version snapshot.
- `GET /api/v1/projects/:projectId/test-cases/:caseId/versions/compare?v1=1&v2=2`: Computes diff between two versions, highlighting changes in title, priority, type, status, and individual steps.

---

## 12. CSV Import & Export Engine (`/api/v1/projects/:projectId/test-cases/csv/*`)
- `POST /api/v1/projects/:projectId/test-cases/csv/preview`: Parses uploaded RFC 4180 CSV text and returns validation report (`totalRows`, `validRows`, `invalidRows`, and row-by-row error diagnostics) prior to importing.
- `POST /api/v1/projects/:projectId/test-cases/csv/import`: Bulk imports valid rows inside a database transaction, auto-generating sequential keys, creating suites/tags, versions, and steps.
- `GET /api/v1/projects/:projectId/test-cases/csv/export`: Streams RFC 4180 CSV file filtered by query parameters. **Formula Injection Sanitization**: Prepends single quote `'` to any cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r`.

---

## 7. Milestone 05 — Test Planning & Execution APIs

Base route: `/api/v1/projects/:projectId`

### 7.1 Test Plans (`/test-plans`)

- `GET /test-plans`: List test plans with filtering (`status`, `priority`, `milestoneId`, `search`), sorting, and pagination.
- `POST /test-plans`: Create a test plan with project-scoped key (`KEY-TP-1`), dates validation (`endDate >= startDate`), priority, scope, strategy, and entry/exit criteria.
- `GET /test-plans/:planId`: Get test plan details including linked milestone, environment, manager, and selected test case version snapshots.
- `PATCH /test-plans/:planId`: Update test plan properties.
- `POST /test-plans/:planId/duplicate`: Clone test plan and optionally duplicate selected test cases.
- `DELETE /test-plans/:planId`: Delete test plan. Blocked if any active test runs are linked to this plan.
- `POST /test-plans/:planId/cases`: Add test cases in bulk or individually. Stores the exact immutable `testCaseVersionId` snapshot.
- `DELETE /test-plans/:planId/cases/:caseId`: Remove test case from test plan.

### 7.2 Test Runs (`/test-runs`)

- `GET /test-runs`: List test runs with filtering (`status`, `milestoneId`, `environmentId`, `assignedToId`, `search`). Returns dynamic execution summaries.
- `POST /test-runs`: Create a test run with project-scoped key (`KEY-TR-1`). Automatically populates test cases if created from a test plan or specific suites.
- `GET /test-runs/:runId`: Get test run details, linked cases, assigned testers, latest execution attempts, and dynamic execution summary.
- `PATCH /test-runs/:runId`: Update run metadata, milestone, environment, or lead tester.
- `POST /test-runs/:runId/status`: Transition run status (`NOT_STARTED` -> `IN_PROGRESS` -> `COMPLETED`, `ABORTED`). Automatically tracks `startedAt` and `completedAt`.
- `POST /test-runs/:runId/cases/assign`: Assign or reassign lead testers to specific run cases.
- `DELETE /test-runs/:runId`: Delete test run. Historical deletion safeguard: Blocked with HTTP 400 if any execution results exist.

### 7.3 Test Execution & Retest (`/test-runs/:runId/cases/:runCaseId`)

- `GET /test-runs/:runId/cases/:runCaseId`: Fetch run case details, steps from version snapshot, and latest execution result.
- `POST /test-runs/:runId/cases/:runCaseId/execute`: Submit test execution attempt #1. Step execution engine calculates overall status:
  - Any step `FAILED` -> Overall status `FAILED`.
  - Any step `BLOCKED` -> Overall status `BLOCKED`.
  - All steps `SKIPPED` -> Overall status `SKIPPED`.
  - All steps `PASSED` -> Overall status `PASSED`.
  - Auto-starts test run to `IN_PROGRESS` if currently `NOT_STARTED`.
- `POST /test-runs/:runId/cases/:runCaseId/retest`: Submit a retest attempt (`attemptNumber: 2, 3...`). Creates a new immutable `TestResult` record preserving previous attempts and history.
- `GET /test-runs/:runId/cases/:runCaseId/history`: Retrieve full chronological audit trail of all execution attempts for this run case.

### 7.4 Attachments & Defect Evidence (`/attachments`)

- `POST /attachments`: Upload defect evidence, logs, or screenshots (multipart/form-data). Validates MIME types (PNG, JPEG, WebP, GIF, TXT, CSV, LOG, JSON, PDF, MP4, WebM) and strictly enforces 10MB size limit. Saves with random UUID nonce keys to prevent traversal/collision.
- `GET /attachments/:attachmentId/download`: Stream authenticated attachment with safe content disposition.

### 7.5 Execution Analytics (`/execution-analytics`)

- `GET /execution-analytics`: Computes quality metrics across executed tests:
  - Pass rate strictly among executed tests: `(passed / executed) * 100` (`NOT_RUN` is never counted as passed/failed).
  - Completion rate: `(executed / total) * 100`.
  - Suite-level pass/fail breakdown.
  - Environment-level execution breakdown.
  - Tester workload and execution breakdown.
  - Recent real-time execution activity stream.

---

## 8. Milestone 06 — Defect Management & Bug Tracking APIs

Base route: `/api/v1/projects/:projectId`

### 8.1 Defect Lifecycle & Management (`/defects`)

- `GET /defects`: List defects with filtering (`search`, `status`, `severity`, `priority`, `type`, `assigneeId`, `qaOwnerId`, `reporterId`, `environmentId`, `milestoneId`, `component`), pagination (`page`, `limit`), and sorting.
- `POST /defects`: Create a defect with project-scoped sequential identifier (e.g. `CORE-BUG-1`). Automatically associates reporter, optional developer assignee, QA owner, environment, and milestone. When created from test execution, auto-creates `DefectTestLink`.
- `GET /defects/:defectId`: Retrieve full defect workbench details, including relations to reporter, assignee, QA owner, environment, milestone, duplicate relations, linked tests, and comments.
- `PATCH /defects/:defectId`: Update defect fields (title, description, stepsToRepro, expectedResult, actualResult, severity, priority, component, environment, milestone, device, browser, OS, appVersion, dueDate, rootCause, resolution). Logs all field modifications to `DefectHistory`.
- `DELETE /defects/:defectId`: Delete defect. Requires `QA_MANAGER`, `ADMINISTRATOR`, or `OWNER` role.

### 8.2 Defect Status Transitions & State Machine (`/defects/:defectId/status`)

- `POST /defects/:defectId/status`: Validated lifecycle transition with strict state machine enforcement:
  - Allowed transitions:
    - `NEW` / `OPEN` / `REOPENED` -> `IN_PROGRESS`, `FIXED`, `REJECTED`, `DUPLICATE`
    - `IN_PROGRESS` -> `FIXED`, `REJECTED`
    - `FIXED` -> `READY_FOR_RETEST`, `REOPENED`
    - `READY_FOR_RETEST` -> `VERIFIED`, `REOPENED`
    - `VERIFIED` -> `CLOSED`, `REOPENED`
    - `CLOSED`, `REJECTED`, `DUPLICATE` -> `REOPENED`
  - Validation rules:
    - Moving to `FIXED` requires non-empty `resolution` notes and automatically sets `resolvedAt`.
    - Moving to `REJECTED` or `REOPENED` requires a descriptive `reason`.
    - Moving to `CLOSED` sets `closedAt`.
    - Moving to `DUPLICATE` requires valid `duplicateOfId` in the same project and prevents circular reference chains (e.g. A -> B -> A).

### 8.3 Assignments & Duplicate Candidate Engine

- `POST /defects/:defectId/assign`: Assign or update developer assignee and/or QA owner.
- `GET /defects/duplicate-candidates`: Similarity search engine comparing incoming defect title, component, and environment with existing defects. Returns candidate duplicates with confidence percentage scores (0-100%) and matching rationales.

### 8.4 Test Traceability Linking (`/defects/:defectId/links`)

- `POST /defects/:defectId/links`: Link defect to test case, test run, or specific test execution result. Cross-project linking is strictly prevented.
- `DELETE /defects/:defectId/links/:linkId`: Remove test traceability link.

### 8.5 Threaded Comments & Internal Notes (`/defects/:defectId/comments`)

- `GET /defects/:defectId/comments`: Retrieve discussion comments with nested threaded replies. **Security rule**: If requesting user has `VIEWER` role, internal staff notes (`isInternal: true`) are strictly filtered out from the response.
- `POST /defects/:defectId/comments`: Add comment or internal staff note. Supports threaded replies via `parentId`.
- `DELETE /defects/:defectId/comments/:commentId`: Delete comment. Allowed for comment author or QA Manager/Admin/Owner.

### 8.6 Defect Audit Trail & History (`/defects/:defectId/history`)

- `GET /defects/:defectId/history`: Retrieve full chronological audit log of all property modifications and status transitions with timestamp, actor, old value, new value, and reason.

### 8.7 Defect Analytics & Metrics (`/defects/analytics`)

- `GET /defects/analytics`: Database-backed defect metrics and KPIs:
  - Total defects, open defects, resolved defects, closed defects, critical/high defects.
  - Average time to resolution in hours (`avgTimeToResolutionHours`).
  - Defect reopen rate percentage (`reopenedRate`).
  - Distribution by status, severity, priority, developer, component, and milestone.
  - Aging buckets: `< 7 days`, `7 - 30 days`, `> 30 days`.
  - Empty dataset safety: returns 0 and empty collections with zero divide-by-zero errors.

---

## 9. Milestone 07 — AI Intelligence Engine APIs

### 9.1 Organization Provider Configuration & Telemetry (`/api/v1/organizations/:orgId/ai`)

- `GET /provider`: Get the organization's active AI provider configuration (`provider`, `model`, `maxTokens`, `temperature`, `hasKey`, `maskedApiKey`, `isEnabled`, `rateLimitPerMinute`, `rateLimitPerDay`). API keys are never exposed in plaintext.
- `PUT /provider`: Update the organization's AI provider (`MOCK`, `OPENAI`, `ANTHROPIC`, `GEMINI`). Encrypts credentials with AES-256-GCM (`apiKeyEncrypted`, `apiKeyIv`, `apiKeyTag`).
- `POST /provider/test`: Test connection and verification ping to the active AI provider adapter.
- `GET /usage`: Retrieve token usage metrics, total estimated cost (USD), generation counts, and detailed query logs for the organization.

### 9.2 Project AI Operations (`/api/v1/projects/:projectId/ai`)

- `POST /generate-tests`: Generate structured test cases (Positive, Negative, Boundary, Security) from requirements or user stories. Proposes candidates with `PROPOSED` review status requiring human approval before official commitment.
- `GET /generations`: List AI generation history for the project with task type and item counts.
- `GET /generations/:generationId`: Retrieve details of an AI generation session and proposed items.
- `POST /generations/:generationId/items/:itemId/review`: Human review for a proposed test case (`ACCEPTED`, `REJECTED`, `EDITED`). When accepted, atomically creates an official `TestCase` record with immutable `v1` version and traceability to the generation item.
- `POST /generations/:generationId/batch-review`: Batch accept or reject multiple proposed items in a single atomic transaction.
- `POST /failure-analysis`: Root-cause failure analysis for failed test runs and defect logs. Strictly separates observed facts from diagnostic hypotheses, identifies affected components, confidence level, and actionable debug recommendations.
- `GET /duplicate-intelligence`: Lexical and semantic duplicate detection comparing defect details with existing open defects. Categorizes recommendations as `MARK_DUPLICATE`, `LINK_RELATED`, or `KEEP_SEPARATE` with similarity scores.
- `GET /risk-analysis`: Risk-based testing assessment grounded in real database defect densities, test execution pass/fail ratios, and module failure histories. Calculates overall quality score and prioritized testing areas.
- `GET /qa-report`: Grounded executive QA status summary for release stakeholders. Computes real execution rates, blocker defects, release readiness indicator (`HIGH`, `MEDIUM`, `LOW`), and key quality recommendations.
- `POST /feedback`: Record human feedback (`HELPFUL`, `NOT_HELPFUL`, `INACCURATE`, `INCOMPLETE`, comments) on AI outputs for quality tracking.
- `GET /feedback`: Retrieve logged feedback and rating metrics for the project.

---

## 10. Milestone 08 — Automation & CI/CD Integration APIs

Base route: `/api/v1/projects/:projectId/automation`

### 10.1 Overview & Telemetry
- `GET /overview`: Returns high-level metrics for the automation dashboard: total automated sessions, total mapped tests, pending unmapped tests, active API tokens, and recent sessions.

### 10.2 Automation API Tokens (`/tokens`)
- `GET /tokens`: List all active and revoked automation tokens for the project (prefixes, creation date, last used date, expiration).
- `POST /tokens`: Generate a new scoped Automation API Token (`aiqa_auto_<prefix>_<secret>`). The complete secret is returned **only once** upon creation; only the SHA-256 hash is persisted at rest.
- `DELETE /tokens/:tokenId`: Revoke an automation token, immediately blocking any CI runner attempting to use it.

### 10.3 Ingestion Sessions & Batch Uploads (`/sessions`)
- `POST /sessions`: Initialize a new automated ingestion session. Supports `Idempotency-Key` header or body parameter to prevent duplicate runs. Automatically creates and links an automated [`TestRun`](file:///c:/Users/Yoni/Documents/Repository%20Project/ARTIFICIAL%20INTELLIGENCE%20QA%20PLATFORM/database/prisma/schema.prisma) (`isAutomated: true`).
- `GET /sessions`: List all automation execution sessions with pagination and status filters.
- `GET /sessions/:sessionId`: Retrieve full session details, CI metadata, and test execution statistics.
- `POST /sessions/:sessionId/results`: Batch ingest test results. Automatically resolves test case mappings, links exact [`TestCaseVersion`](file:///c:/Users/Yoni/Documents/Repository%20Project/ARTIFICIAL%20INTELLIGENCE%20QA%20PLATFORM/database/prisma/schema.prisma) snapshots, creates [`TestResult`](file:///c:/Users/Yoni/Documents/Repository%20Project/ARTIFICIAL%20INTELLIGENCE%20QA%20PLATFORM/database/prisma/schema.prisma) records with retry attempts preserved (`attemptNumber = 1, 2...`), creates execution steps, uploads attachments/screenshots, and records unmapped tests.
- `POST /sessions/:sessionId/finalize`: Finalize an execution session (`COMPLETED`, `FAILED`, `ABORTED`), atomically completing the linked platform `TestRun`.

### 10.4 1-Step Report Ingestion (`/ingest`)
- `POST /ingest/newman`: Accepts raw Newman JSON report format (`newman run ... -r json`), parses collections, requests, response times, and assertion outcomes, creates session, ingests results, and finalizes in a single step.
- `POST /ingest/playwright`: Accepts raw Playwright JSON report (`playwright test --reporter=json`), parses suites, specs, retries, duration, and error stacks, and finalizes the session.

### 10.5 Test Case Mappings & Unmapped Reviews (`/mappings`, `/unmapped`)
- `GET /mappings`: List mapped tests with search and framework filters (`PLAYWRIGHT`, `NEWMAN`, `GENERIC`).
- `POST /mappings`: Explicitly map an external test ID to a repository `TestCase`.
- `PATCH /mappings/:mappingId`: Update mapping attributes or verification status.
- `DELETE /mappings/:mappingId`: Remove test mapping.
- `GET /unmapped`: List unmapped tests discovered during automated test runs.
- `POST /unmapped/:unmappedId/resolve`: Resolve an unmapped test by either linking to an existing `TestCase` or auto-creating a new `TestCase` and mapping it.

### 10.6 Webhooks & CI/CD Triggers (`/webhooks`)
- `POST /webhooks/github`: Ingests GitHub Actions webhook events (`workflow_run`, `check_run`). Verifies HMAC-SHA256 signature using `X-Hub-Signature-256`. Deduplicates events using `X-GitHub-Delivery` GUID idempotency.
- `GET /webhooks`: List received webhook event history.


---

## 11. Advanced Analytics & Reporting Endpoints

**Base Path:** `/api/v1/projects/:projectId/analytics`  
**Authentication:** Required (`Bearer` access token in cookie or header).  
**Authorization:** RBAC enforced; scoped to the user's current active organization and project.

### 11.1 Executive QA Dashboard
- `GET /executive`: Returns high-level executive metrics for leadership and release sign-off:
  - Overall test pass rate %, failure rate %, and execution volume
  - Test case counts and execution coverage percentage
  - Open, critical, and high defect counts with defect resolution rate %
  - Automation pass rate and automated execution count
  - Release readiness score (0–100%) and advisory verdict (`READY`, `WARNING`, `NOT_READY`)
  - Previous period trend deltas (`passRateDelta`, `defectDelta`, `coverageDelta`, `executionVolumeDelta`)
  - Query parameters: `startDate`, `endDate`, `environmentId`, `milestoneId`

### 11.2 Detailed Execution Analytics
- `GET /executions`: Comprehensive execution activity and reliability diagnostics:
  - Status summary (passed, failed, blocked, skipped, pass rate, avg duration)
  - Daily time-series trends (outcomes per day)
  - Environment outcome breakdown
  - Test suite performance leaderboard
  - **Flaky Test Candidates**: Identified by outcome flip algorithm across consecutive runs, complete with flip counts and flakiness scores
  - **Repeated Consecutive Failures**: Identified persistent failure streaks across execution attempts
  - Tester workload leaderboard (executions, pass/fail counts, pass rates)
  - Query parameters: `startDate`, `endDate`, `environmentId`, `milestoneId`

### 11.3 Multi-Dimensional Coverage Matrix
- `GET /coverage`: 4-pillar test coverage analytics:
  - **Existence Coverage**: Active, draft, and deprecated test cases
  - **Execution Coverage**: Executed eligible cases vs total active cases
  - **Requirement Coverage**: Cases mapped to requirement reference IDs (`requirementRef`)
  - **Automation Coverage**: Automated cases with code mappings vs total active cases
  - Suite coverage breakdown table
  - Milestone coverage breakdown table
  - Query parameter: `milestoneId`

### 11.4 Defect Lifecycle & MTTR Analytics
- `GET /defects`: Deep defect operational metrics:
  - Summary: Total created, resolved, open count, closed count, reopen rate %, critical/high counts
  - Mean Time to Repair (MTTR): Average resolution time in hours
  - Severity and priority distribution percentages
  - **Defect Aging Buckets**: Active open defects categorized by duration (`< 3 days`, `3–7 days`, `8–14 days`, `15–30 days`, `> 30 days`)
  - Component, environment, and milestone breakdowns
  - **Test Traceability Rate**: Proportion of defects linked directly to test executions or test cases
  - Query parameters: `startDate`, `endDate`, `environmentId`, `milestoneId`, `component`

### 11.5 CI/CD Automation Analytics (M08 Integration)
- `GET /automation`: Ingested CI/CD execution metrics:
  - Session counts (total, completed, failed)
  - Real test outcome pass rate % (distinguishing platform ingestion success from test assertion success)
  - Framework breakdown (Playwright, Cypress, Jest, Newman)
  - Browser matrix breakdown (Chromium, Firefox, WebKit)
  - CI provider distribution (GitHub Actions, GitLab CI, Jenkins, CircleCI)
  - Query parameters: `startDate`, `endDate`, `framework`, `ciProvider`

### 11.6 Milestone Release Governance & Quality Gates
- `GET /milestones/:milestoneId`: Computes release readiness score and rule-by-rule quality gate verification:
  - Milestone test run progress, total cases, pass rate, open defects, critical defects
  - Evaluates against active `ProjectQualityGate` policy
  - Returns rule results (min pass rate, max critical defects, max high defects, min coverage, zero blockers)
  - Release recommendation verdict: `READY_FOR_RELEASE`, `WARNING_NEEDS_REVIEW`, `BLOCKED_DO_NOT_RELEASE`
- `GET /quality-gates`: List configured quality gate policies for the project.
- `POST /quality-gates`: Create a custom quality gate policy with configurable thresholds.
- `PUT /quality-gates/:gateId`: Update quality gate thresholds and enforcement rules.
- `DELETE /quality-gates/:gateId`: Remove quality gate policy.

### 11.7 AI Intelligence & Cost Telemetry (M07 Integration)
- `GET /ai`: Generative AI performance and usage analytics:
  - Generation volume, total proposed test cases, accepted cases, rejected cases
  - Human acceptance rate %
  - Token consumption (prompt + completion) and estimated USD billing cost
  - Task breakdown by feature (generation, RCA, duplicate detection, risk analysis)
  - Provider and model telemetry (calls, tokens, cost, latency, errors)
  - QA user satisfaction ratings (helpful count, not helpful count, satisfaction rate)
  - Query parameters: `startDate`, `endDate`, `provider`

### 11.8 Custom Reports, Snapshots & Schedules
- `GET /reports`: List saved report definitions.
- `POST /reports`: Create a new custom report definition with metric selections and filters.
- `GET /reports/:reportId`: Retrieve a specific report definition.
- `PUT /reports/:reportId`: Update an existing report definition.
- `DELETE /reports/:reportId`: Delete a report definition.
- `POST /reports/run`: Dynamically execute and calculate report data based on report type and filter payload.
- `GET /reports/snapshots/list`: List frozen historical report snapshots.
- `POST /reports/snapshots`: Create an immutable point-in-time snapshot of report data for audit trails.
- `GET /reports/snapshots/:snapshotId`: Retrieve frozen snapshot data.
- `GET /reports/schedules/list`: List automated report schedules.
- `POST /reports/schedules`: Create a recurring report schedule (`DAILY`, `WEEKLY`, `MONTHLY`).
- `POST /reports/schedules/:scheduleId/run`: Trigger immediate execution of a scheduled report.
- `DELETE /reports/schedules/:scheduleId`: Delete a report schedule.

### 11.9 Multi-Format Export Engine
- `POST /export`: Generates binary file exports with **OWASP Formula Injection Defense (CWE-1236)**:
  - Formats: `CSV`, `XLSX` (Excel), `PDF` (Executive Scorecard)
  - Supported report types: `EXECUTIVE_SUMMARY`, `TEST_EXECUTION`, `DEFECT_SUMMARY`, `COVERAGE_MATRIX`, `AUTOMATION_METRICS`, `QUALITY_GATE_AUDIT`, `AI_USAGE`
  - Headers set appropriately: `Content-Disposition: attachment; filename="..."`, `Content-Type: text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | application/pdf`

---

## 12. Notifications, Preferences, Integrations & Webhooks (Milestone 10)

### 12.1 In-App Notifications & Real-Time SSE
- `GET /api/v1/notifications`: List notifications for current user with category and read status filtering:
  - Query parameters: `page`, `limit`, `isRead` (`all` | `true` | `false`), `category`, `priority`, `search`
  - Includes delivery status records (`IN_APP`, `EMAIL`, `SLACK`, `TEAMS`, `WEBHOOK`)
- `GET /api/v1/notifications/unread-count`: Returns `{ count: number }` for top-bar badge display.
- `PATCH /api/v1/notifications/:id/read`: Marks a single notification as read and updates timestamp.
- `POST /api/v1/notifications/mark-all-read`: Marks all unread notifications as read.
- `DELETE /api/v1/notifications/:id`: Dismisses/deletes a notification.
- `GET /api/v1/notifications/stream`: Server-Sent Events (SSE) connection endpoint delivering real-time `notification` and `unread_count` pushes with 25-second keepalive heartbeats.
- `POST /api/v1/notifications/test-dispatch`: Dispatches an immediate test notification for diagnostics.
- `GET /api/v1/notifications/admin/stats`: Aggregates delivery performance across in-app, emails, and webhooks.

### 12.2 User Notification Preferences & Quiet Hours
- `GET /api/v1/notifications/preferences`: Retrieves user preference configuration (creates defaults if missing).
- `PUT /api/v1/notifications/preferences`: Updates delivery channel toggles, event categories, and quiet hours:
  - Channels: `inAppAlerts`, `emailAlerts`
  - Categories: `defectUpdates`, `testAssignment`, `executionAlerts`, `automationAlerts`, `aiAlerts`, `reportingAlerts`, `mentionAlerts`
  - Scheduled Digest: `digestFrequency` (`NONE` | `DAILY` | `WEEKLY`), `digestTimezone`
  - Quiet Hours: `quietHoursEnabled`, `quietHoursStart` (`HH:MM`), `quietHoursEnd` (`HH:MM`)
- `POST /api/v1/notifications/preferences/reset`: Resets all preferences back to factory defaults.
- **Mandatory Security Exemption**: Security notifications (`password changes`, `auth events`, `token revocations`) bypass quiet hours and category opt-outs unconditionally.

### 12.3 External Chat & App Integrations
- `GET /api/v1/projects/:projectId/integrations`: Lists active team integrations for the project.
- `POST /api/v1/projects/:projectId/integrations`: Creates a new integration with strict SSRF pre-flight validation.
- `GET /api/v1/projects/:projectId/integrations/:id`: Retrieves integration metadata with masked webhook secrets.
- `PATCH /api/v1/projects/:projectId/integrations/:id`: Updates integration configuration or event subscriptions.
- `DELETE /api/v1/projects/:projectId/integrations/:id`: Removes an integration.
- `POST /api/v1/projects/:projectId/integrations/test`: Performs a live connectivity test with latency metrics.

### 12.4 Outbound Webhooks & HMAC-SHA256 Delivery
- `GET /api/v1/projects/:projectId/webhooks`: Lists registered outbound webhooks for the project.
- `POST /api/v1/projects/:projectId/webhooks`: Registers a webhook; generates a secure secret and returns it once in plain text.
- `GET /api/v1/projects/:projectId/webhooks/:id`: Retrieves webhook details with masked secret.
- `PATCH /api/v1/projects/:projectId/webhooks/:id`: Updates webhook destination URL or subscribed event list.
- `DELETE /api/v1/projects/:projectId/webhooks/:id`: Deletes an outbound webhook and cascades deliveries.
- `POST /api/v1/projects/:projectId/webhooks/:id/rotate-secret`: Rotates signing secret and returns the new secret.
- `GET /api/v1/projects/:projectId/webhooks/:id/deliveries`: Lists delivery logs including payload, status, HTTP code, latency, and error message.
- `POST /api/v1/projects/:projectId/webhooks/:id/deliveries/:deliveryId/retry`: Retries a failed or dead-letter delivery.

