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

## 4. Defense-in-Depth Protections
- **Rate Limiting**: `express-rate-limit` enforces strict limits on authentication endpoints (30 requests / 15 minutes) to protect against brute force and credential stuffing.
- **Timing-Attack Protection**: Password reset requests do not disclose whether an email address exists in the system.
- **Audit Logging**: All authentication, organization, project, member, and environment operations create structured entries in `AuditLog`.
- **HTTP Security Headers**: Powered by `helmet`, including CSP, HSTS, frame protection, and content type sniffing prevention.
