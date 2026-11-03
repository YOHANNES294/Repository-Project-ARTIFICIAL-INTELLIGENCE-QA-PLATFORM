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
