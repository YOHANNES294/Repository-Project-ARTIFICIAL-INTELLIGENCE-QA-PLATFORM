# Security Policy & Architecture

## 1. Principles
- **Strict Multi-Tenancy**: Organization ID is never trusted from unauthenticated client input; all operations derive context from verified server-side sessions.
- **OWASP Compliance**:
  - Request validation via Zod schemas on all endpoints.
  - Strict Helmet security headers.
  - CORS restricted to configured domains.
  - Cookie flags: `HttpOnly`, `SameSite=Strict`, `Secure` in production.
  - Centralized error masking: Internal stack traces and DB errors are hidden in production responses.
- **Auditing**: All mutations produce structured audit records in `AuditLog`.
