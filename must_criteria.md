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
- [ ] Provider-agnostic AI Gateway & adapter interface (support OpenAI, Anthropic, Gemini, local/custom)
- [ ] Structured output validation via Zod schemas
- [ ] AI Test Case Generator from user stories / requirements
- [ ] AI Test Failure Analyzer (root cause analysis from stack traces, logs, error messages)
- [ ] AI Defect Assistant (duplicate detection, severity recommendation, reproduction steps refinement)
- [ ] AI Risk Analysis & QA summary report generation
- [ ] Token/cost tracking, rate limiting, and prompt injection sanitization
- [ ] Graceful degradation when AI providers are unavailable

---

## Milestone 08 — Test Automation Integration
- [ ] Playwright custom reporter package (`integrations/playwright`)
- [ ] Secure ingestion API for automated test results, screenshots, and traces
- [ ] Postman / Newman test results ingestion (`integrations/postman`)
- [ ] GitHub Actions CI workflow integrations with signed webhook verification
- [ ] Run history and automated result mapping to test case versions

---

## Milestone 09 — Analytics and Reporting
- [ ] Database-backed analytics queries (no hardcoded statistics)
- [ ] Metrics: execution pass rate, defect density, milestone progress, test coverage, release readiness
- [ ] Interactive charts (Recharts) with date and project filtering
- [ ] Exportable reports (CSV, PDF generation)

---

## Milestone 10 — Notifications and Integrations
- [ ] In-app notification feed & user notification preferences
- [ ] Background worker notification delivery (Email via Nodemailer/SES, Webhooks)
- [ ] Event dispatchers on test assignment, failure alerts, milestone reminders, defect updates
- [ ] Webhook signature verification and idempotency protection

---

## Milestone 11 — Billing and SaaS Administration
- [ ] Billing plans (Free, Starter, Professional, Enterprise) and tenant subscription models
- [ ] Quota and plan limit enforcement (projects, test runs, storage, AI tokens, members)
- [ ] Super-Admin portal for platform management, tenant oversight, audit logs, system health

---

## Milestone 12 — Production Readiness
- [ ] End-to-end integration test suite execution
- [ ] Security audits: OWASP checklist verification, rate limiting, CORS, CSRF, XSS
- [ ] Performance testing with k6, query optimization and index analysis
- [ ] Database backup and restore verification scripts
- [ ] Final production build and deployment validation
- [ ] Final Engineering Delivery Report
