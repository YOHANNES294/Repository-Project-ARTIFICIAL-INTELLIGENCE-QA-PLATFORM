# Changelog

All notable changes to the Artificial Intelligence QA Platform will be documented here.

## [0.4.0] - Milestone 04 Completion: Milestone & Test Management
### Added
- **Milestone Management**:
  - Domain model `Milestone` with statuses (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, `CANCELLED`) and priorities (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - Dynamic progress calculation evaluating actual execution results (`PASSED`, `FAILED`, `BLOCKED`, `SKIPPED`) and linked defect resolution states.
  - Date range validation (`dueDate >= startDate`) and owner assignment.
  - REST endpoints under `/api/v1/projects/:projectId/milestones` with search, filtering, and audit logging.
- **Hierarchical Test Suite Management**:
  - Reusable, nested test suite folders with self-referencing `parentId`.
  - Circular parenting and self-parenting prevention via recursive ancestor chain validation.
  - Real-time test case counts aggregated across child suites.
  - REST endpoints under `/api/v1/projects/:projectId/test-suites`.
- **Project-Scoped Tags**:
  - Tag entity with custom hex colors and usage counts per project.
  - REST endpoints under `/api/v1/projects/:projectId/tags`.
- **Test Case Management**:
  - Sequential case numbers (`KEY-101`) generated per project.
  - Detailed metadata: title, description, preconditions, objectives, type, priority, status (`DRAFT`, `ACTIVE`, `DEPRECATED`), estimated execution time.
  - Ordered test steps (`stepNumber`, `action`, `testData`, `expectedResult`) with step reordering.
  - Immutable test case versioning (`TestCaseVersion`) created on content changes with change summaries.
  - Version comparison diff engine computing additions, deletions, modifications, and step diffs.
  - Historical execution deletion safeguard preventing removal of test cases with execution history.
  - REST endpoints under `/api/v1/projects/:projectId/test-cases`.
- **CSV Import & Export Engine**:
  - RFC 4180 compliant CSV parser with quote escaping and multiline cell support.
  - Pre-import validation engine generating an interactive preview table with row error reporting before transaction commit.
  - Transactional bulk import creating test cases, version 1 records, and ordered test steps atomically.
  - CSV export with Spreadsheet Formula Injection (CSV Injection) sanitization (`=`, `+`, `-`, `@`, `\t`, `\r` escaped with single quote).
- **Frontend Next.js 16 UI**:
  - Milestones Management (`/projects/[projectId]/milestones`) with progress bars, status badges, and filter bars.
  - Hierarchical Test Suites Explorer (`/projects/[projectId]/test-suites`) with collapsible tree navigation.
  - Test Case Repository (`/projects/[projectId]/test-cases`) with full-text search, multi-filter dropdowns, and batch operations.
  - Multi-step Test Case Creator & Editor (`/projects/[projectId]/test-cases/new`, `.../[caseId]`) with step reordering.
  - Side-by-side Version History & Diff Viewer (`/projects/[projectId]/test-cases/[caseId]/versions`).
  - CSV Import modal with drag-and-drop file upload, real-time schema validation, and row preview table.
- **Automated Verification**:
  - 18 new automated unit & integration tests covering milestones, test suites, test cases, versioning, CSV formula injection, and bulk import.
  - Total test suite expanded to 50 passing tests across 8 test suites (100% success rate).

## [0.3.0] - Milestone 03 Completion: Project Management
### Added
- Project domain models (`Project`, `ProjectMember`, `Environment`) with `ProjectStatus` and `ProjectRole` enums.
- REST API endpoints under `/api/v1/projects`:
  - Project listing with full-text search, status filtering, and pagination.
  - Project creation with automatic default environments (`Development`, `Staging`, `Production`) and creator assigned as `PROJECT_LEAD`.
  - Project detail retrieval with aggregate statistics (test cases, test runs, defects, members).
  - Project updates, archiving, restoration, and deletion (with safety guardrail requiring prior archival).
  - Project activity history timeline via audit logs.
  - Project team members management with cross-organization tenant boundary verification.
  - Project deployment environments management with automatic credential and secret masking (`••••••••`).
- Frontend Next.js 16 pages and components:
  - Navigation bar with active route highlighting across all platform modules.
  - Projects Overview page (`/projects`) with live search, status filters, project cards, and New Project modal.
  - Project Detail Workbench (`/projects/[projectId]`) featuring Overview, Environments, Members, Activity History, and Settings tabs.
- Automated test suite in `apps/api/test/project.test.ts` (13 test scenarios covering key uniqueness, member management, environments, archiving, and cross-tenant access denial).

## [0.2.0] - Milestone 02 Completion: Authentication & SaaS Foundation
### Added
- Argon2id password hashing implementation with configurable memory and parallelism.
- Secure session management with short-lived JWTs (15 min) and rotated Refresh Tokens (7 days).
- HTTP-only, SameSite=Strict, Secure cookies for browser session management.
- Token rotation with family tracking and automatic token reuse breach detection.
- Authentication endpoints: `/register`, `/login`, `/refresh`, `/logout`, `/me`, `/forgot-password`, `/reset-password`, `/verify-email`.
- Rate limiting middleware using `express-rate-limit` for authentication protection.
- Multi-tenant Organization management endpoints: creation, switching, membership listing, invitations, role modification, and member deletion.
- Strict tenant isolation middleware (`requireTenant`) ensuring cross-organization access attempts are denied with `403 Forbidden`.
- Role-based access control middleware (`requireRole`) supporting `OWNER`, `ADMINISTRATOR`, `QA_MANAGER`, `QA_ENGINEER`, `AUTOMATION_ENGINEER`, `DEVELOPER`, `VIEWER`.
- Automated security, auth, and RBAC test suite with 100% pass rate.
- Extended database schema with `RefreshToken`, `VerificationToken`, and enriched `Invitation` models.

## [0.1.0] - Milestone 01 Completion
### Added
- Monorepo architecture with pnpm workspaces covering `apps/*`, `packages/*`, and `integrations/*`.
- Shared configuration (`@ai-qa/config`) with strict TypeScript base settings.
- Shared domain types (`@ai-qa/shared-types`) for roles, statuses, and API envelopes.
- Shared validation schemas (`@ai-qa/validation`) with Zod.
- Frontend API client package (`@ai-qa/api-client`).
- UI utilities package (`@ai-qa/ui`).
- Express.js API application (`@ai-qa/api`) with structured Winston logging, correlation IDs, centralized error handling, and health probes (`/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`).
- Background worker application (`@ai-qa/worker`) with BullMQ and Redis connection lifecycle.
- Next.js 16 frontend application (`@ai-qa/web`) with App Router, Tailwind CSS, TanStack Query, and live telemetry.
- Comprehensive PostgreSQL Prisma schema (`database/prisma/schema.prisma`) with all core domain models.
- Docker Compose configuration and production multi-stage Dockerfiles.
- GitHub Actions CI workflow (`.github/workflows/ci.yml`).
- Automated tests across API, worker, and validation schemas passing with 100% success rate.
