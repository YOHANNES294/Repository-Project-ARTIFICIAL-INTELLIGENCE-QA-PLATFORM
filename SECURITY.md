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

## 2. Multi-Tenancy & Access Control
- **Strict Tenant Isolation**:
  - Organization IDs from client headers (`x-organization-id`) are **never trusted without verification**.
  - `requireTenant` middleware checks the database to verify the authenticated user is an active member of the requested organization before granting access. Cross-tenant access attempts immediately fail with `403 Forbidden`.
- **Role-Based Access Control (RBAC)**:
  - Supported roles: `OWNER`, `ADMINISTRATOR`, `QA_MANAGER`, `QA_ENGINEER`, `AUTOMATION_ENGINEER`, `DEVELOPER`, `VIEWER`.
  - Organization `OWNER` retains full control and cannot be removed or demoted if they are the sole owner.
  - Sensitive operations (invitations, role modifications, member removals) strictly require `OWNER` or `ADMINISTRATOR` privileges.

## 3. Defense-in-Depth Protections
- **Rate Limiting**: `express-rate-limit` enforces strict limits on authentication endpoints (30 requests / 15 minutes) to protect against credential stuffing and password guessing.
- **Timing-Attack Protection**: Password reset requests do not disclose whether an email address exists in the system.
- **Audit Logging**: All authentication and organization-level actions generate non-repudiable audit logs (`AuditLog`).
- **HTTP Security Headers**: Powered by `helmet`, including Content-Security-Policy, X-Content-Type-Options, Frameguard, and X-XSS-Protection.
