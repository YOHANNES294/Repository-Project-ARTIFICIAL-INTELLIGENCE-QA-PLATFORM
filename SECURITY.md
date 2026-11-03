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

---

## 8. Milestone 06 — Defect Management & Bug Tracking Security

- **Strict State Machine Enforcement**:
  - Defect lifecycle transitions are strictly governed by a state transition matrix. Unauthorized jumps (e.g. `CLOSED` directly to `IN_PROGRESS` without intermediate reopening) are blocked with HTTP 400.
  - Moving to `FIXED` requires non-empty resolution notes (`resolution`), preventing unresolved bugs from being prematurely marked as resolved.
  - Moving to `REJECTED` or `REOPENED` requires a mandatory reason explanation.
  - Moving to `CLOSED` sets an immutable `closedAt` timestamp.
- **Duplicate Cycle Prevention**:
  - Marking a defect as a `DUPLICATE` requires referencing an existing canonical defect in the same project.
  - The service executes recursive duplicate chain traversal up to 25 hops to ensure no circular references can be established (e.g. A duplicates B, B duplicates A, or A -> B -> C -> A). Circular duplicate loops are rejected with HTTP 400.
- **Information Disclosure Isolation (Internal Staff Notes)**:
  - Discussions in `DefectComment` support an `isInternal` flag for staff-only root cause discussions and notes.
  - When a user with the `VIEWER` role queries defect comments, internal notes (`isInternal: true`) are systematically stripped at the backend service layer before the response is serialized, preventing information leakage to external or read-only stakeholders.
- **Tenant & Cross-Project Isolation**:
  - Defects, duplicate candidate lookups, test execution links, and defect analytics are isolated strictly by `projectId` and active verified `organizationId`.
  - Linking a defect to a test execution or test case from a different project or organization is strictly denied with HTTP 400.
- **Field-Level Audit Trail**:
  - Every update, state transition, and assignment change is logged to `DefectHistory` with the actor's user ID, field name, previous value, new value, and reason, ensuring comprehensive traceability and tamper-evident compliance.

---

## 9. Milestone 07 — AI Intelligence Engine Security

- **Credential Encryption at Rest (AES-256-GCM)**:
  - Third-party AI provider API keys (OpenAI, Anthropic, Google Gemini) are never stored in plaintext.
  - Keys are encrypted using AES-256-GCM with a randomized 12-byte initialization vector (`apiKeyIv`) and a 16-byte authentication tag (`apiKeyTag`) stored in separate columns.
  - When returning provider configuration over the API, keys are never decrypted or transmitted; instead, a masked hint (e.g. `sk-a...bcde`) is returned via `maskApiKey()`.
  - Logging interceptors and Winston formatters redact any credential strings matching secret patterns.
- **Prompt Injection Defense & Token Sanitization**:
  - All prompt inputs are processed by `PromptSanitizer.sanitize()` prior to adapter transmission.
  - Redaction rules detect and replace authorization bearer tokens, JWT signatures, RSA/EC private keys, passwords, and API key patterns with `<REDACTED>` placeholders.
  - Known prompt injection phrases (`ignore previous instructions`, `system prompt override`, `you are now DAN`, markdown delimiter jailbreaks) are neutralized.
- **Strict Multi-Tenant & RBAC Isolation**:
  - AI provider configurations, usage metrics, prompt templates, and generation histories are strictly scoped to the verified tenant (`organizationId` and `projectId`).
  - Cross-tenant queries are blocked at both route middleware and service layer query constraints.
  - Only users with `OWNER` or `ADMINISTRATOR` roles are authorized to configure organization AI provider credentials.
- **Human-in-the-Loop Agency & State Protection**:
  - AI generation outputs are untrusted inputs. Proposed test cases remain in `PROPOSED` review state until a human QA engineer explicitly accepts or edits them.
  - The system prevents AI from directly mutating canonical `TestCase` or `TestCaseVersion` records.
- **Cost & Quota Governance**:
  - Every LLM invocation logs prompt tokens, completion tokens, latency, and estimated cost in `AIUsageLog`.
  - Configurable rate limits (`rateLimitPerMinute`, `rateLimitPerDay`) enforce hard caps to prevent runaway consumption or denial-of-wallet attacks.

---

## 10. Milestone 08 — Automation & CI/CD Security

- **SHA-256 One-Way API Token Hashing**:
  - Automation ingestion tokens (`aiqa_auto_...`) are generated using 32 bytes of cryptographically secure random entropy (`crypto.randomBytes(32)`).
  - Raw tokens are returned to the user exactly once upon initial creation and are **never** stored in plaintext.
  - The database only stores a one-way SHA-256 hash (`tokenHash`) and a truncated display mask (`tokenMask`, e.g. `aiqa_auto_...382a`).
  - Constant-time hashing comparison is used to validate incoming tokens against database hashes, protecting against timing side-channel attacks.
- **Granular Token Scopes & Expiration**:
  - Tokens are scoped to a specific project (`projectId`) and organization (`organizationId`).
  - Scopes (`AUTOMATION_INGEST`, `AUTOMATION_READ`, `AUTOMATION_ADMIN`) restrict token capabilities; ingestion tokens cannot perform administrative or cross-tenant modifications.
  - Tokens can be instantly revoked (`isRevoked: true`), and expired tokens are rejected immediately with HTTP 401.
- **HMAC-SHA256 Webhook Signature Verification**:
  - GitHub Actions webhooks (`/automation/webhooks/github`) require an `X-Hub-Signature-256` header.
  - The backend computes the HMAC-SHA256 digest of the raw request payload using the project webhook secret and performs a constant-time comparison via `crypto.timingSafeEqual()`. Requests with mismatched signatures are rejected with HTTP 401.
- **Webhook Delivery Deduplication & Replay Protection**:
  - Delivery identifiers (`X-GitHub-Delivery`) are recorded in `AutomationWebhookEvent`.
  - Duplicate delivery attempts are recognized and acknowledged without duplicate processing or unintended state changes.
- **External Runner Isolation & Code Execution Defense**:
  - Customer test code, Playwright specifications, Newman collections, and arbitrary scripts are never executed within the SaaS backend or worker nodes.
  - All ingestion endpoints enforce strict schema validation via Zod, rejecting payloads containing unexpected properties or unauthorized script injections.
- **Tenant Isolation on Automated Assets**:
  - Test case mappings, automation sessions, unmapped tests, and webhook audit records enforce compound foreign key checks against `projectId` and `organizationId`, preventing cross-tenant leakage.
