# Execution Checklist & Must Criteria

Status Legend:
- [ ] Not Started
- [x] Completed
- [-] In Progress / Blocked

---

## Milestone 01 — Foundation and Architecture
- [x] Environment inspection (Node.js v24.18.0, pnpm 9.15.9, Git, Docker, Docker Compose)
- [x] Create monorepo directory structure according to specification (`apps/*`, `packages/*`, `database/*`, `integrations/*`, `infrastructure/*`, `docs/*`, `tests/*`, `scripts/*`)
- [x] Configure pnpm workspace (`pnpm-workspace.yaml`, `.npmrc`, root `package.json`)
- [x] Configure shared TypeScript configs (`packages/config/tsconfig.base.json` etc.)
- [x] Setup shared packages (`packages/shared-types`, `packages/validation`, `packages/config`, `packages/api-client`, `packages/ui`)
- [x] Setup backend API app (`apps/api` with Express.js, TypeScript, Winston structured logging, request correlation IDs, centralized error handling)
- [x] Setup database layer (`database/prisma/schema.prisma` with complete domain models, client generation script, Docker Postgres integration)
- [x] Setup Redis and background worker app (`apps/worker` with BullMQ, Redis connection, worker health checking)
- [x] Setup frontend app (`apps/web` with Next.js 16 / App Router, TypeScript, Tailwind CSS, Lucide icons, TanStack Query)
- [x] Setup Docker & Docker Compose (`docker-compose.yml`, Dockerfiles for API, Worker, Web, PostgreSQL, Redis)
- [x] Implement Health and Readiness probes (`/api/v1/health`, `/api/v1/health/ready`, `/api/v1/health/live`)
- [x] Establish CI pipeline configuration (`.github/workflows/ci.yml`)
- [x] Verify builds, type checks, linting, and health endpoints (100% passing across all packages and apps)

---

## Milestone 02 — Authentication and SaaS Foundation
- [x] Multi-tenant data models: User, Organization, OrganizationMember, Role, Permission, Session/RefreshToken, VerificationToken, Invitation
- [x] Password hashing with Argon2id & secure HTTP-only cookie session handling
- [x] User registration, login, logout, refresh tokens, password reset flows
- [x] Refresh-token rotation and reuse detection with family-wide revocation
- [x] Tenant resolution middleware and strict organization isolation
- [x] Role-Based Access Control (RBAC) middleware with granular roles (Owner, Admin, QA Manager, QA Engineer, Automation, Developer, Viewer)
- [x] Automated tests for auth, session security, and cross-tenant data leakage prevention (100% passing)

---

## Milestone 03 — Project Management
- [x] Project, ProjectMember, Environment domain models & CRUD operations
- [x] Project keys generation & uniqueness per organization (uppercase, alphanumeric, 2-10 chars)
- [x] Environment management (Development, Staging, Production, QA, Custom with secret masking)
- [x] Project-specific roles (PROJECT_LEAD, MEMBER, VIEWER) & cross-org membership prevention
- [x] Project archiving, restoration, and deletion safeguards
- [x] Project activity history & audit logs
- [x] Frontend project management screens with real API integration (Overview, Details, Environments, Members, Settings)
- [x] Automated tests for project lifecycle, environments, members, and tenant isolation (100% passing)

---

## Milestone 04 — Milestone and Test Management
- [x] Milestone domain models & status workflows (PLANNED, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED)
- [x] Dynamic milestone progress calculation based on real associated test runs, executions, and defects (no hardcoded metrics)
- [x] Date range validation for milestones (dueDate >= startDate)
- [x] Hierarchical Test Suites (nested folders/subfolders with circular reference and self-parenting prevention)
- [x] Test Cases with sequential keys (`PROJECT-101`), priorities, types, statuses, preconditions, objectives, estimated time, and author tracking
- [x] Ordered Test Steps with actions, test data, expected results, and dynamic reordering
- [x] Immutable test case versioning (`TestCaseVersion`) generated on meaningful content changes with version comparison diff engine
- [x] Project-scoped Tags with usage counts and multi-tag filtering
- [x] CSV Import engine with pre-validation and interactive preview table before transaction commit
- [x] CSV Export engine with RFC 4180 compliance and Spreadsheet Formula Injection Sanitization (`=`, `+`, `-`, `@`, `\t`, `\r` escaped with single quote)
- [x] Data integrity safeguard: prevents deleting test cases with executed run history
- [x] Frontend Next.js 16 UI: Milestones list & details, Hierarchical Test Suites explorer, Test Case repository, Step editor, Version comparison viewer, CSV Import/Export modals
- [x] Automated unit and integration test suite (100% passing across 50 tests)

---

## Milestone 05 — Test Planning and Execution
- [x] Test Plans with project-scoped keys (`KEY-TP-1`), entry/exit criteria, scope, strategy, milestone/environment/manager links, date validation (`endDate >= startDate`), duplicate cloning, and deletion protection
- [x] Test Plan Test Case selection with exact immutable snapshot preservation (`testCaseVersionId`), bulk & single assignment, duplicate prevention
- [x] Test Runs generation with project-scoped keys (`KEY-TR-1`), environment assignment, lead tester assignment, lifecycle transitions (`NOT_STARTED` -> `IN_PROGRESS` -> `COMPLETED`, `ABORTED`), timestamps (`startedAt`, `completedAt`), dynamic summary calculation
- [x] Test execution engine (Step-level results with action/expected/actual/status, duration tracking in ms, execution notes, failure reason)
- [x] Step-based status resolution engine (any failed -> failed, any blocked -> blocked, all skipped -> skipped, all passed -> passed)
- [x] Historical execution attempt tracking (Attempt #1, #2, #3...) with retest mode preserving prior attempts and full audit history
- [x] Historical deletion safeguard: prevents deleting runs with execution records to preserve auditability
- [x] Defect evidence and attachment service: MIME type validation, 10MB size limit, UUID nonce filename sanitization, project isolation, authenticated streaming downloads
- [x] Database-backed execution analytics: pass rate calculated strictly among executed tests (`NOT_RUN` excluded from pass/fail denominator), completion rate, breakdowns by suite, environment, tester, and real-time activity feed
- [x] Frontend Next.js 16 UI: Test Plans overview & builder, plan case drawer, Test Runs overview, run creator, run workbench with dynamic multi-segment progress bar, interactive step runner with live timer, and analytics dashboard
- [x] Automated integration test suite: 100% passing across 12 test files and 67 tests

---

## Milestone 06 — Defect Management and Bug Tracking
- [x] Complete Defect CRUD with project-scoped sequential identifiers (e.g. `CORE-BUG-1`)
- [x] Defect classification (Severity, Priority, Defect Type, Environment, Milestone, Reporter, Assignee, QA Owner, Component, Due Date)
- [x] Full defect reproduction attributes (Title, Description, Steps to Reproduce, Expected Behavior, Actual Behavior, Browser, OS, App Version, Device)
- [x] Strict state machine lifecycle transitions (NEW, OPEN, IN_PROGRESS, FIXED, READY_FOR_RETEST, VERIFIED, CLOSED, REOPENED, REJECTED, DUPLICATE)
- [x] Mandatory resolution notes enforcement on transition to FIXED
- [x] Mandatory reason explanation enforcement on transition to REJECTED and REOPENED
- [x] Canonical duplicate defect linking with recursive cycle prevention (up to 25 hops)
- [x] Test execution integration: create defect directly from failed execution with prefill, auto-link `DefectTestLink`, multi-test linking & unlinking
- [x] Real-time duplicate defect candidate detection engine with confidence scoring and matching rationales
- [x] Threaded comments and discussions with "Internal Staff Notes" visibility isolation (hidden from VIEWER users)
- [x] Field-level defect audit trail and chronological history logging (`DefectHistory`)
- [x] Database-backed defect analytics (Total, Open, Critical/High, Resolved, Closed, Reopened Rate, Avg Resolution Time, aging, breakdowns by status, severity, priority, developer, component, milestone)
- [x] Frontend Next.js 16 UI: Defects listing with filters & search, defect creator with live duplicate detector, defect workbench with state action buttons & duplicate linking, edit form, threaded comments with internal notes toggle, test execution runner "Log Defect" button & known defects panel
- [x] Automated unit and integration test suite: 100% passing across 15 test files and 81 tests in `apps/api` (87 tests monorepo-wide)

---

## Milestone 07 — AI Intelligence Engine
- [x] Provider-agnostic AI Gateway & adapter interface (OpenAI, Anthropic, Gemini, deterministic offline MockLLM)
- [x] Structured output validation via shared Zod schemas and runtime verification
- [x] AI Test Case Generator from requirements with mandatory human-in-the-loop review and atomic TestCase conversion
- [x] AI Test Failure Analyzer (root cause analysis strictly separating observed facts from diagnostic hypotheses)
- [x] AI Defect Assistant (lexical and semantic duplicate detection with MARK_DUPLICATE, LINK_RELATED, KEEP_SEPARATE recommendations)
- [x] AI Risk Analysis & Executive QA summary report grounded in real database execution and defect metrics
- [x] Token/cost tracking, rate limiting, AES-256-GCM credential encryption, and prompt injection sanitization
- [x] Graceful degradation and zero platform downtime when AI providers are unavailable
- [x] Investigation & resolution of M06 verification items (concurrent defect ID generation safety, internal staff note privacy isolation)

---

## Milestone 08 — Test Automation Integration
- [x] Playwright custom reporter package (`integrations/playwright`) with step timing, browser metadata, and attachment streaming
- [x] Secure ingestion API for automated test results (`/automation/ingest`, `/automation/sessions`) with SHA-256 API token hashing at rest
- [x] Postman / Newman test results ingestion (`integrations/postman`) with collection schema validation and report parsing
- [x] GitHub Actions CI workflow integrations with HMAC-SHA256 signed webhook verification and delivery deduplication
- [x] Run history and automated result mapping to test case versions with retry attempt tracking and unmapped test queue review workbench
- [x] Investigation & resolution of M07 verification items (Next.js version audit, prompt injection defense review, live vs mock adapter documentation)

---

## Milestone 09 — Analytics and Reporting
- [x] Database-backed analytics queries with zero hardcoded statistics, multi-tenant isolation, and resilient empty dataset handling
- [x] Comprehensive executive QA metrics: execution pass rate, defect density, test coverage, milestone release readiness score, and historical previous period trend deltas
- [x] Detailed execution analytics: daily outcome trends, test suite performance, tester productivity leaderboard, repeated failure streaks, and explainable flaky test detection algorithm
- [x] Multi-dimensional test coverage matrix: existence coverage, execution coverage, requirement reference coverage, and automated code mapping coverage
- [x] Defect lifecycle analytics: MTTR (average resolution hours), reopen rate, test traceability rate, severity & priority distributions, and aging duration buckets (<3d, 3-7d, 8-14d, 15-30d, >30d)
- [x] Automation & CI/CD analytics (M08 Integration): real automated pass/fail outcome rates, Playwright & Newman session ingestion, browser matrices, and CI provider distributions
- [x] AI intelligence analytics (M07 Integration): generation volume, human acceptance rate %, token consumption, estimated USD billing cost, and user satisfaction metrics
- [x] Milestone release governance & configurable Quality Gates (`ProjectQualityGate`): rule-by-rule verification (min pass rate, max critical defects, max high defects, min coverage, zero blockers) with explainable advisory status (`READY_FOR_RELEASE`, `WARNING_NEEDS_REVIEW`, `BLOCKED_DO_NOT_RELEASE`)
- [x] Custom report builder, immutable point-in-time snapshots (`ReportSnapshot`), and automated recurring schedules (`ReportSchedule`)
- [x] Multi-format export engine (CSV, Excel XLSX, PDF scorecards) fortified with OWASP formula injection defense (CWE-1236)
- [x] Next.js 16.4.4 & React 19 compliance: verified with 0 TypeScript errors and clean production build output
- [x] Automated test suite: 100% passing across 18 test files and 139 tests in `apps/api` (145 tests monorepo-wide)

---

## Milestone 10 — Notifications and Integrations
- [x] In-app notification center & real-time Server-Sent Events (SSE) stream with polling fallback and unread counter badge
- [x] User notification preferences & quiet hours schedule with localized timezone calculations and mandatory security override
- [x] Resilient multi-channel delivery architecture (In-App, Email, Slack Block Kit, Microsoft Teams Adaptive Cards, Outbound Webhooks)
- [x] Provider-independent email delivery (Local Mock, Resend, SMTP) with responsive templates and XSS HTML injection protection
- [x] Enterprise outbound webhooks with HMAC-SHA256 signature signing, replay protection, secret rotation, and bounded retry dead-letter queue
- [x] Comprehensive Server-Side Request Forgery (SSRF) defense: DNS pre-resolution, loopback/private/metadata blocking (`169.254.169.254`), and redirect revalidation
- [x] Automated test suite: 100% passing across 19 test files and 175 tests in `apps/api` (zero regressions)
- [x] Next.js 16.4.4 & React 19 web pages: Notification Center (`/notifications`), Preferences (`/settings/notifications`), Project Integrations Hub (`/projects/[projectId]/integrations`) with clean production build

---

## Milestone 11 — Billing and SaaS Administration
- [x] Database-backed plan management (Free, Starter, Professional, Enterprise) and tenant subscription lifecycle state machine (Trialing, Active, Past Due, Paused, Cancelled, Expired)
- [x] Server-side entitlement enforcement engine (HTTP 402 Payment Required for exceeded quotas; HTTP 403 Forbidden for unincluded feature flags)
- [x] Strict non-destructive customer data guarantee: plan downgrades or cancellations never delete existing tenant projects, test cases, or defects
- [x] Auditable usage metering with immutable ledger entries (`UsageLedgerEntry`) protected against double-metering by idempotency keys, and manual adjustment records (`UsageAdjustment`)
- [x] Provider-independent payment gateway architecture (`PaymentProviderInterface`) with pluggable Stripe, Chapa (multi-currency USD, ETB, EUR), and Local Test providers
- [x] AES-256-GCM encryption for payment gateway secrets at rest (`secretKeyEncrypted`, `secretKeyIv`, `secretKeyTag`) with masked display
- [x] Secure inbound payment webhook processor (`/payment-webhooks/:provider`) with raw body HMAC signature verification, replay protection (`PaymentWebhookEvent`), and automatic subscription activation
- [x] Normalized invoice and payment models with test-mode badges (`isTestMode: true`), status tracking, and responsive HTML invoice statements (`generateInvoiceHtml`)
- [x] Organization billing workspace UI (`/settings/billing`, `/settings/billing/plans`, `/settings/billing/invoices`, `/settings/billing/usage`) with live quota meters and cancellation workflows
- [x] Platform Super Administration UI (`/platform`, `/platform/organizations`, `/platform/users`, `/platform/plans`, `/platform/system`) guarded by `requireSuperAdmin` (strictly rejecting standard organization owners with 403 Forbidden)
- [x] Tenant and user suspension enforcement with mandatory audit logging and reason recording
- [x] Automated test suite: 100% passing across 20 test files and 203 tests in `apps/api` (zero regressions, 28 dedicated billing/admin tests)
- [x] Next.js 16.4.4 & React 19 web pages with clean production build (`next build --webpack`)

---

## Milestone 12 — Production Readiness
- [ ] End-to-end integration test suite execution
- [ ] Security audits: OWASP checklist verification, rate limiting, CORS, CSRF, XSS
- [ ] Performance testing with k6, query optimization and index analysis
- [ ] Database backup and restore verification scripts
- [ ] Final production build and deployment validation
- [ ] Final Engineering Delivery Report
