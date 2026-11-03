# Security Policy & Architecture

## 1. Authentication & Cryptography
- **Password Hashing**: Implements **Argon2id** (`memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`), protecting against GPU and ASIC brute-force attacks.
- **Session Tokens**:
  - Short-lived Access Tokens (15 minutes).
  - Rotated Refresh Tokens (7 days) with **family tracking**.
  - Refresh tokens are never stored in plaintext — only cryptographic SHA-256 hashes are persisted in the database.
- **Token Reuse Detection & Breach Containment**:
  - When an already-revoked refresh token is presented, the system flags a token reuse attempt, immediately revokes all tokens within that session family, records a security alert in `AuditLog`, and clears cookies.
- **Cookie Security**:
  - `HttpOnly: true` (prevents JavaScript access & XSS token theft).
  - `SameSite: Strict` in production (prevents CSRF).
  - `Secure: true` in production (HTTPS enforcement).

## 2. Multi-Tenancy & Project Isolation
- **Strict Tenant Isolation**:
  - Organization IDs from client headers (`x-organization-id`) are **never trusted without verification**.
  - `requireTenant` middleware checks the database to verify the authenticated user is an active member of the requested organization before granting access. Cross-tenant access attempts immediately fail with `403 Forbidden`.
  - Projects can only be accessed by verified members of the parent organization. Cross-organization project lookups return `404 Not Found` (preventing ID enumeration).
- **Cross-Organization Membership Guard**:
  - Adding a member to a project requires that the target user is already an active member of that specific organization. Adding users from other organizations is denied with `403 Forbidden`.
- **Role-Based Access Control (RBAC)**:
  - Organization roles: `OWNER`, `ADMINISTRATOR`, `QA_MANAGER`, `QA_ENGINEER`, `AUTOMATION_ENGINEER`, `DEVELOPER`, `VIEWER`.
  - Project roles: `PROJECT_LEAD`, `MEMBER`, `VIEWER`.
  - Project creation, modification, environment management, and member assignment require `QA_MANAGER`, `ADMINISTRATOR`, or `OWNER` privileges.
  - Project deletion requires `ADMINISTRATOR` or `OWNER` privileges and enforces prior archival as a safety guardrail.

## 3. Environment Secret Protection
- Environment configuration dictionaries (`variables`) are sanitized by the backend service. Any sensitive key containing substrings such as `secret`, `key`, `pass`, `token`, or `auth` is masked (`••••••••`) before API delivery, preventing credential leakage in responses or browser state.

## 4. Test Management & Data Integrity Security

- **CSV / Spreadsheet Formula Injection (CSV Injection) Prevention**:
  - In accordance with OWASP guidelines, export routines in `csv.service.ts` sanitize all cell values against formula execution vulnerabilities.
  - Any field whose first character is `=`, `+`, `-`, `@`, `\t` (tab), or `\r` (carriage return) is prefixed with a single quotation mark (`'`), neutralizing macro execution and dynamic DDE evaluation in Microsoft Excel, LibreOffice, and Google Sheets.
- **Test Execution Deletion Safeguards**:
  - Test cases that have been executed in historical `TestRun` records cannot be deleted. The repository layer checks for linked execution records before executing any deletion, returning `409 Conflict` to preserve the non-repudiable audit trail of software release compliance.
- **Immutable Test Case Versioning**:
  - Test case steps and content are version-pinned in `TestCaseVersion`. Test executions link directly to specific version snapshots, guaranteeing that future edits to a test case cannot alter historical execution logs or audit compliance records.
- **Hierarchical Suite Cycle Prevention**:
  - Moving or reparenting a test suite executes recursive ancestor tree traversal. Any attempt to set a suite's parent to itself or to any of its descendant folders is blocked with `400 Bad Request`, preventing infinite recursion and denial-of-service in graph traversal algorithms.

## 5. Defense-in-Depth Protections
- **Rate Limiting**: `express-rate-limit` enforces strict limits on authentication endpoints (30 requests / 15 minutes) to protect against brute force and credential stuffing.
- **Timing-Attack Protection**: Password reset requests do not disclose whether an email address exists in the system.
- **Audit Logging**: All authentication, organization, project, member, environment, milestone, test suite, and test case operations create structured entries in `AuditLog`.
- **HTTP Security Headers**: Powered by `helmet`, including CSP, HSTS, frame protection, and content type sniffing prevention.

---

## 7. Milestone 05 — Test Planning & Execution Security

- **Execution Result Immutability**: `TestResult` records and their child `TestExecutionStep` records are append-only. Once an attempt is submitted, it is never modified or overwritten. Retests increment `attemptNumber` (`attemptNumber = 2, 3...`) in an explicit audit trail.
- **Historical Safeguards Against Data Deletion**: Test runs that have logged test executions cannot be hard deleted. Attempting to delete a run with execution records is rejected with HTTP 400 to prevent destruction of compliance records and QA audit trails.
- **Strict Evidence File Upload Controls**:
  - **MIME Type Allowlist**: Restricted strictly to safe formats: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `text/plain`, `text/csv`, `text/x-log`, `application/json`, `application/pdf`, `video/mp4`, `video/webm`.
  - **File Type Rejections**: Executable binaries (`.exe`, `.sh`, `.bat`, `.cmd`, `.dll`, `.com`, `.ps1`) and dangerous web scripts (`.html`, `.svg`, `.js`) are strictly rejected.
  - **Payload Size Enforcement**: Enforces a strict 10MB limit per file on multer and API layers.
  - **Nonce File Key Sanitization**: Uploaded files are stripped of path traversal characters (`..`, `/`, `\`) and stored with a cryptographically secure UUID nonce (`${uuidv4()}-${sanitizedFileName}`) in project-isolated directories (`uploads/attachments/[projectId]/`).
  - **Authenticated Streaming Downloads**: Files are not publicly exposed via open static directories. Download endpoints verify the user's organization and project membership before streaming the file.
- **Atomic Transaction Isolation**: Submitting an execution atomically creates the `TestResult`, persists step outcomes, updates the `TestRunCase` status, and transitions the `TestRun` status within a Prisma database transaction.
- **Strict RBAC Enforcement**: Only users with `OWNER`, `ADMIN`, `QA_MANAGER`, `QA_ENGINEER`, or `AUTOMATION_ENGINEER` roles can create or modify test plans, test runs, and submit executions. Users with `VIEWER` or `DEVELOPER` roles cannot perform destructive or execution state changes.
