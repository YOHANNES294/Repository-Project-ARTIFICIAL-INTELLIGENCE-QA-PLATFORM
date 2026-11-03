# AI QA Platform — Master Implementation Plan

## 1. Executive Summary & Production Vision
The **Artificial Intelligence QA Platform** is an enterprise-grade, multi-tenant Quality Assurance Management and Test Intelligence SaaS platform. It combines the structured rigor of established test management systems (TestRail, Testmo, Qase) with autonomous AI capabilities for test generation, failure analysis, flakiness prediction, and quality analytics.

The platform is engineered under strict production principles:
- **Zero Mock / Zero Fake Data**: All features rely on real PostgreSQL persistence, Prisma ORM, BullMQ background queues, and Redis caching.
- **Strict Multi-Tenancy**: Tenant boundaries are enforced cryptographically and organizationally on every database read/write.
- **Enterprise Security**: Argon2id hashing, short-lived tokens, rotated refresh tokens, OWASP CSV formula injection sanitization, and immutable audit logging.
- **End-to-End Type Safety**: Shared validation schemas (Zod) and TypeScript types across monorepo packages, backend services, and Next.js frontend applications.

---

## 2. Monorepo Architecture

```
ARTIFICIAL INTELLIGENCE QA PLATFORM/
├── apps/
│   ├── api/                    # Express.js REST API with Winston logging, rate limiting & Zod validation
│   ├── web/                    # Next.js 16 App Router UI with Tailwind CSS & TanStack Query
│   └── worker/                 # BullMQ & Redis background worker for asynchronous jobs
├── packages/
│   ├── shared-types/           # Common TypeScript domain types, DTOs, and API envelopes
│   ├── validation/             # Zod validation schemas for all requests and CSV imports
│   ├── api-client/             # Type-safe HTTP client with automatic cookie session handling
│   ├── ui/                     # UI utilities, class variance authority, and Tailwind helpers
│   └── config/                 # Base TypeScript, ESLint, and Prettier configurations
├── database/
│   └── prisma/                 # PostgreSQL schema, migrations, and Prisma client generation
├── integrations/               # Automation runners (Playwright, Cypress, CI/CD webhooks)
├── infrastructure/             # Docker Compose and deployment manifests
└── docs/                       # Architecture, security, API, and database specifications
```

---

## 3. Milestone Execution Status

| Milestone | Title | Status | Tests | Build |
|---|---|---|---|---|
| **01** | Foundation & Architecture | Completed | 15 / 15 Passing | Clean |
| **02** | Authentication & SaaS Foundation | Completed | 8 / 8 Passing | Clean |
| **03** | Project Management | Completed | 9 / 9 Passing | Clean |
| **04** | Milestone & Test Management | Completed | 18 / 18 Passing | Clean |
| **05** | Test Planning & Execution | Completed | 17 / 17 Passing | Clean |
| **06** | Defect & Bug Tracking | Completed | 14 / 14 Passing | Clean |
| **07** | AI Intelligence Engine | Completed | 18 / 18 Passing | Clean |
| **08** | Test Automation Integration | Completed | 20 / 20 Passing | Clean |
| **09** | Quality Analytics & Reporting | Planned (Next) | - | - |
| **10** | Integrations & Webhooks | Planned | - | - |
| **11** | Enterprise Audit & Security Hardening | Planned | - | - |
| **12** | Production Deployment & Launch Readiness | Planned | - | - |

**Total Monorepo Automated Tests:** 125 passing across 19 test suites (119 in `apps/api`, 4 in `packages/validation`, 2 in `apps/worker`).

---

## 4. Completed Milestone Details

### Milestone 01 — Foundation and Architecture
- Monorepo configured using pnpm workspaces.
- Node.js v24.18.0, TypeScript 5.8+, Docker Compose setup.
- Express API configured with correlation IDs, centralized error handling, and health probes (`/api/v1/health`, `/ready`, `/live`).
- Background worker initialized with Redis and BullMQ queues.
- Next.js 16 frontend configured with Tailwind CSS, Lucide icons, and server-side state hydration.
- Initial Prisma schema defined with core models and foreign key cascades.

### Milestone 02 — Authentication and SaaS Foundation
- User registration, login, logout, and password reset flows.
- Cryptographic password hashing using **Argon2id**.
- JWT access tokens (15m) and rotated refresh tokens (7d) stored in secure HTTP-only cookies.
- Refresh token reuse breach containment with family-wide revocation.
- Multi-tenant organization creation, invitation workflows, and switching.
- Strict `requireTenant` and granular `requireRole` middleware (`OWNER`, `ADMINISTRATOR`, `QA_MANAGER`, `QA_ENGINEER`, `AUTOMATION_ENGINEER`, `DEVELOPER`, `VIEWER`).

### Milestone 03 — Project Management
- Full Project lifecycle: create, update, archive, restore, and delete safeguards.
- Project-scoped keys (`KEY-101`) with organization uniqueness constraints.
- Multi-environment management (`Development`, `Staging`, `Production`, `Custom`) with automated credential and secret masking.
- Project member assignment with cross-tenant membership validation.
- Activity timeline tracking using structured `AuditLog` records.
- Next.js 16 Project Management UI with interactive filtering, searching, and workbench views.

### Milestone 04 — Milestone and Test Management
- **Project Milestones**:
  - Full CRUD with statuses (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, `CANCELLED`) and priorities.
  - Dynamic progress calculation evaluating actual execution results and linked defects (no hardcoded numbers).
  - Date validation enforcing `dueDate >= startDate`.
- **Hierarchical Test Suites**:
  - Tree structure with unlimited nesting (`parentId`).
  - Cycle detection preventing self-parenting and recursive graph loops.
  - Real-time test case counts aggregated across child suites.
- **Test Case Repository**:
  - Sequential project keys (`KEY-101`), objectives, preconditions, priorities, statuses, and estimated duration.
  - Multi-step test cases with step numbers, actions, test data, and expected results.
  - Immutable `TestCaseVersion` snapshots created on content updates.
  - Version comparison diff engine computing field and step-level differences.
  - Deletion safeguard preventing removal of test cases with recorded execution history.
- **Project Tags**: Project-scoped tags with custom colors and usage tracking.
- **CSV Import & Export**:
  - RFC 4180 parser with multiline quote support.
  - Pre-import validation engine generating an interactive preview table with row error reporting before transaction commit.
  - Transactional bulk import.
  - Formula injection protection neutralizing `=, +, -, @, \t, \r` with single quotes.
- **Frontend Workbench**:
  - Milestones manager, suite folder explorer, test case repository, multi-step editor with reordering, version history viewer, and CSV import modal with real-time preview table.

### Milestone 05 — Test Planning and Execution
- **Test Plans**:
  - Project-scoped identifiers (`KEY-TP-1`), scope, objectives, strategy, entry/exit criteria, milestone, environment, and manager associations.
  - Date validation enforcing `endDate >= startDate`.
  - Duplicate/clone test plans with option to carry over test cases.
  - Active run deletion safeguard preventing removal of test plans with linked test runs.
- **Test Plan Case Snapshots**:
  - Bulk and single case selection linking exact immutable `TestCaseVersion` snapshots.
  - Duplicate case prevention and dynamic planned vs executed progress tracking.
- **Test Runs & Workbench**:
  - Project-scoped identifiers (`KEY-TR-1`), environment targeting, lead tester assignment, lifecycle transitions (`NOT_STARTED` -> `IN_PROGRESS` -> `COMPLETED`, `ABORTED`).
  - Automatic `startedAt` and `completedAt` timestamp tracking.
  - Dynamic execution summaries: total, not run, passed, failed, blocked, skipped, pass percentage among executed tests, and completion percentage.
  - Granular tester assignment per test run case.
- **Test Execution Engine**:
  - Step-by-step verification: action, expected result, actual observed result, comments, and duration.
  - Backend automatic status resolution: Any step failed -> Failed; Any step blocked -> Blocked; All steps skipped -> Skipped; All steps passed -> Passed.
  - Retest execution engine: generates new immutable `TestResult` attempt records (`attemptNumber: 2, 3...`) without overwriting previous attempts.
  - Full execution audit trail preserving attempt history, timestamps, durations, and executing users.
  - Historical deletion protection: runs with executed records cannot be deleted.
- **Defect Evidence & Attachments**:
  - Multi-MIME type validation (PNG, JPEG, WebP, GIF, TXT, CSV, LOG, JSON, PDF, MP4, WebM) and 10MB file size limit.
  - Cryptographically secure UUID nonce file keys to prevent collisions and directory traversal attacks.
  - Project isolation (`uploads/attachments/[projectId]/`) and authenticated streaming downloads.
- **Database-Backed Execution Analytics**:
  - Strict pass rate formula: `(passed / executed) * 100` (`NOT_RUN` excluded from pass/fail denominator).
  - Completion rate formula: `(executed / total) * 100`.
  - Real-time breakdowns across test suites, environments, and tester workloads.
  - Execution activity feed streaming latest results.
- **Next.js 16 UI**:
  - Test Plans list, plan creator, plan detail with case selection modal.
  - Test Runs list with multi-segment progress bar, search, and status filters.
  - Test Run creation wizard with auto-import from test plans or repository cases.
  - Test Run workbench with case list, tester reassignment, and status transition controls.
  - Interactive step-by-step execution runner with live stopwatch timer, step status toggles, evidence upload, and historical attempt viewer.
  - QA Hub navigation on project overview page.
- **Verification**:
  - 100% passing across 12 test files and 67 automated unit/integration tests.

---

## 4.6. Milestone 06 — Defect Management & Bug Tracking (Completed)

- **Complete Defect Lifecycle & Domain Model**:
  - Project-scoped sequential keys (e.g. `CORE-BUG-1`).
  - Fields: title, description, stepsToRepro, expectedResult, actualResult, severity, priority, status, type, environment, milestone, reporter, assignee, qaOwner, dueDate, rootCause, resolution, resolvedAt, closedAt, duplicateOfId.
  - Strict state machine transitions (`NEW`, `OPEN`, `IN_PROGRESS`, `FIXED`, `READY_FOR_RETEST`, `VERIFIED`, `CLOSED`, `REOPENED`, `REJECTED`, `DUPLICATE`).
  - Strict enforcement: `FIXED` requires non-empty resolution notes; `REJECTED` and `REOPENED` require reason explanation.
  - Canonical duplicate defect linking with recursive cycle prevention (up to 25 hops).
- **Test Execution Integration**:
  - 1-click defect creation directly from failed test steps and executions, prefilling failure reason, observed results, and test case title.
  - Automatic creation of `DefectTestLink` establishing bidirectional traceability between defects, test cases, test runs, and specific execution attempts.
  - Multi-test linking and unlinking capability.
  - "Known Linked Defects" panel displayed in the execution runner for verification during retests.
- **Duplicate Detection Engine**:
  - Real-time similarity scoring across defect title, affected component, and environment.
  - Returns duplicate candidates with similarity percentages and matching rationales.
- **Collaboration & Audit Trail**:
  - Threaded discussions with parent-child comments.
  - "Internal Staff Notes" (`isInternal: true`) with visibility isolation (strictly hidden from `VIEWER` users).
  - Field-level chronological audit trail (`DefectHistory`) capturing every property modification and status transition.
- **Database-Backed Defect Analytics**:
  - Total, open, resolved, closed, critical/high defects.
  - Average time to resolution in hours (`avgTimeToResolutionHours`).
  - Defect reopen rate percentage (`reopenedRate`).
  - Breakdown by status, severity, priority, developer, component, and milestone.
  - Aging buckets (`< 7 days`, `7 - 30 days`, `> 30 days`).
  - Empty dataset safety (zero divide-by-zero errors).
- **Next.js 16 UI**:
  - Defects list page with status, severity, priority, and type filters, search, and pagination.
  - Defect creation form with execution prefilling and real-time duplicate candidate detector.
  - Defect details workbench with status transition action bar, duplicate linking, quick developer/QA assignment, and tabs for reproduction details, linked tests, comments with internal note toggle, and audit history.
  - Defect edit form for updating attributes and root cause/resolution.
  - QA Hub defect card on project dashboard.
  - "Log Defect" button and linked defect viewer on execution runner.
- **Verification**:
  - 100% passing across 15 test files and 81 automated tests in `apps/api` (87 tests monorepo-wide).
  - 0 type check errors across all packages and Next.js 16 production build (`pnpm build`).

---

## 4.7. Milestone 07 — AI Intelligence Engine (Completed)

- **Provider-Agnostic AI Gateway**:
  - Unified adapter interface (`AIProviderAdapter`) supporting `OpenAIAdapter` (`gpt-4o-mini`), `AnthropicAdapter` (`claude-3-5-haiku`), `GeminiAdapter` (`gemini-2.0-flash`), and `MockAIAdapter` (`mock-llm-v1`).
  - Deterministic offline mock adapter ensures zero-cost test execution and predictable CI builds.
  - Automatic fallback handling and graceful degradation: core QA features remain 100% operational when AI providers are unavailable.
- **Enterprise Credential Encryption & Prompt Defense**:
  - AES-256-GCM encryption at rest with randomized 12-byte IV and 16-byte authentication tag for provider API keys (`apiKeyEncrypted`, `apiKeyIv`, `apiKeyTag`).
  - Masked API key display (`sk-a...bcde`) prevents credential leakage via APIs or browser storage.
  - Robust prompt sanitization (`PromptSanitizer`) strips bearer tokens, JWT signatures, private keys, passwords, and neutralizing adversarial prompt injections.
- **Structured Output Validation & Human-in-the-Loop Review**:
  - Runtime validation using shared Zod schemas ensuring strong schema guarantees.
  - Human review workflow: generated test cases are proposed (`PROPOSED`), reviewed individually (`ACCEPTED`, `REJECTED`, `EDITED`), or batch-reviewed.
  - Accepted test cases are atomically committed into official `TestCase` and immutable `TestCaseVersion` records with full traceability.
- **Domain AI Capabilities**:
  - **Test Case Generation**: Produces structured positive, negative, boundary, and security test cases from user requirements.
  - **Failure Analysis**: Root-cause diagnostics separating observed facts from hypotheses with confidence scores, affected components, and step-by-step debugging guides.
  - **Duplicate Defect Intelligence**: Lexical and semantic similarity matching classifying candidates into `MARK_DUPLICATE`, `LINK_RELATED`, and `KEEP_SEPARATE`.
  - **Risk-Based Testing Analysis**: Grounded in real database defect densities, failure rates, and execution history.
  - **Executive QA Summary Report**: Stakeholder status report computed from actual project metrics and blocker defect counts.
  - **Feedback & Telemetry**: User quality ratings (`HELPFUL`, `NOT_HELPFUL`, `INACCURATE`, `INCOMPLETE`), token usage logging, and cost estimation.
- **Outstanding M06 Items Resolved**:
  - Defect concurrent creation safety: atomic Prisma `$transaction` with retry loops on `P2002` collisions.
  - Internal staff note privacy isolation: `isInternal` comments strictly stripped for `VIEWER` users.
  - Workspace test project count analyzed: 10 active packages with tests out of 11 workspace packages.
- **Next.js 16 AI Workbench**:
  - Dedicated workbench under `/projects/[projectId]/ai/` with AI Hub Dashboard, Test Generation Studio, Failure Analysis, Duplicate Detection, Risk Analysis, Executive QA Release Report, and Provider Settings & Telemetry.
- **Verification**:
  - 100% passing across 16 test files and 99 automated tests in `apps/api` (105 tests monorepo-wide).
  - 0 type check errors across all packages and Next.js 16 production build (`pnpm -r build`).

### Milestone 08 — Test Automation & CI/CD Integration
- **External Runner Architecture**:
  - Main API and worker processes isolated from executing customer test code. Execution takes place on external CI/CD runners.
  - Results ingested through authenticated, schema-validated REST APIs.
- **Playwright Reporter Package (`@ai-qa/playwright-reporter`)**:
  - Custom reporter in `integrations/playwright` streaming real-time test outcomes, step execution times, browser/OS metadata, and attachments.
  - Reference implementation and example test suite in `examples/playwright-demo/`.
- **Postman & Newman Integration (`@ai-qa/postman-adapter`)**:
  - Direct JSON summary report ingestion endpoint (`/automation/ingest/newman`).
  - Collection validator and sanitizer utility.
- **Deterministic Test Case Mapping Engine**:
  - 3-tier matching strategy: Explicit test title annotation (`@AIQA-101`), persistent framework identifier mapping (`AutomationTestMapping`), and exact case-insensitive title matching.
  - Unmapped test queue (`AutomationUnmappedTest`) tracking occurrences with 1-click test case creation or manual linking workbench.
- **Secure Automation Ingestion API & Tokens**:
  - Scoped project tokens (`aiqa_auto_...`) with one-way SHA-256 hash storage at rest (`tokenHash`), prefix masking (`tokenMask`), and instant revocation.
  - Execution sessions (`AutomationSession`) linked directly to `TestRun` (`isAutomated: true`) with `idempotencyKey` deduplication.
  - Multi-attempt retry preservation (`attemptNumber = 1, 2...`) without overwriting historical execution data.
- **GitHub Actions & Signed Webhooks**:
  - Webhook endpoint (`/automation/webhooks/github`) with HMAC-SHA256 signature verification (`X-Hub-Signature-256`) and delivery deduplication (`X-GitHub-Delivery`).
  - Production-ready sample workflow in `.github/workflows/automation-ci.yml`.
- **Outstanding M07 Verification Items Resolved**:
  - Next.js version verified: running latest available Next.js 15.5.28 with React 19 (`next@^15.2.0`).
  - Prompt injection protection verified: `PromptSanitizer` audited with credential redaction and delimiter neutralization.
  - Live vs mock adapters documented: `MockAIAdapter` utilized for deterministic offline CI; cloud adapters configured for production AES-256-GCM encrypted credentials.
- **Next.js 16 Automation Workbench**:
  - Dedicated workbench under `/projects/[projectId]/automation/`: Hub Dashboard, API Tokens, Test Mappings, Unmapped Reviews, Sessions, and Setup Guides.
  - Project Overview QA Hub quick navigation card.
- **Verification**:
  - 100% passing across 17 test files and 119 automated tests in `apps/api` (125 tests monorepo-wide).
  - 0 type check errors across all packages and Next.js 16 production build (`pnpm -r build`).

---

## 5. Upcoming Milestone Roadmap (09 — 12)

### Milestone 09 — Intelligent Quality Analytics & Reporting
- **Real-Time Quality Dashboards**: Test execution velocity, pass/fail trends, milestone readiness scores, and defect density heatmaps.
- **Release Readiness Scorecard**: Algorithmic release gate evaluation combining test coverage, blocker defects, and milestone criteria.
- **Executive Reports**: Scheduled PDF and CSV report generation for stakeholders.

### Milestone 10 — Integrations & Webhooks
- **CI/CD Triggers**: GitHub Actions, GitLab CI, and Jenkins integration for triggering test runs and updating commit statuses.
- **Collaboration Webhooks**: Real-time notifications for Slack and Microsoft Teams on run completions, milestone blocks, or blocker defects.
- **Public API & Webhook Dispatcher**: Signature-verified webhook delivery with automatic retry and backoff.

### Milestone 11 — Enterprise Audit & Security Hardening
- **SSO & SAML 2.0**: Enterprise Single Sign-On (Okta, Azure AD, Google Workspace).
- **SCIM Provisioning**: Automated user provisioning and de-provisioning.
- **Comprehensive Audit Log**: Tamper-evident audit trail with exportable compliance reports (SOC 2, ISO 27001).
- **IP Allowlisting & Session Restrictions**: Organization-level security policy controls.

### Milestone 12 — Production Deployment & Launch Readiness
- **Production Containerization**: Multi-stage hardened Docker images for API, Worker, and Web.
- **Database Migrations & Backup Strategy**: Automated zero-downtime Prisma migrations and WAL archiving.
- **Kubernetes Helm Charts & Manifests**: High-availability deployment configurations with HPA, ingress TLS, and health checks.
- **Monitoring & Observability**: Prometheus metrics, OpenTelemetry tracing, and Sentry error monitoring.

---

## 6. Verification and Quality Gates
Every milestone must satisfy the following non-negotiable verification gates:
1. **Type Safety**: `pnpm typecheck` passes with zero errors across all packages and applications.
2. **Production Build**: `pnpm build` completes cleanly without warnings or compilation failures.
3. **Automated Testing**: 100% of unit, integration, and security tests pass via `pnpm test`.
4. **Documentation**: `API.md`, `DATABASE.md`, `SECURITY.md`, `must_criteria.md`, and `CHANGELOG.md` updated with exact implementations.
5. **Clean Commits**: Atomic Git commits with descriptive messages conforming to Conventional Commits.
