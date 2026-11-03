# Artificial Intelligence QA Platform
## Production Security Audit & Vulnerability Assessment

**Document Version:** 1.0.0  
**Audit Standard:** OWASP Top 10 (2021/2025), NIST SP 800-53, CIS Benchmarks  
**Classification:** Confidential / Internal Security Documentation  
**Audit Date:** November 3, 2026  
**Auditor:** Principal DevSecOps Lead & Security Architecture Team  
**Status:** **APPROVED FOR PRODUCTION RELEASE**

---

## 1. Threat Model & Perimeter Definition

The Artificial Intelligence QA Platform is an enterprise multi-tenant software-as-a-service (SaaS) application that processes sensitive software engineering assets, including test cases, requirements, defects, CI/CD telemetry, and AI credentials.

### Primary Threat Vectors Evaluated:
1. **Cross-Tenant Data Exposure (IDOR):** An authenticated tenant attempting to read or modify another organization's projects, test cases, or defects.
2. **Privilege Escalation:** An organization owner attempting to access platform super-admin endpoints (`/api/v1/platform/*`).
3. **Server-Side Request Forgery (SSRF):** Malicious outbound webhooks targeting internal cloud metadata services (`169.254.169.254`) or VPC internal services.
4. **CSV / Spreadsheet Formula Injection (CWE-1236):** Malicious payloads embedded in test case names or defect descriptions executed in Microsoft Excel or Google Sheets.
5. **Credential & Secret Compromise:** Plaintext exposure of third-party AI keys (OpenAI, Anthropic, Gemini) or payment provider secrets.

---

## 2. OWASP Top 10 Compliance Verification

### A01: Broken Access Control
- **Mitigation:**
  - Multi-tenant isolation is enforced at the database query level via `organizationId` filter injection on every Prisma operation.
  - The `requireTenantAccess` middleware verifies that the requesting user has an active membership in the target organization.
  - Organization and user suspension flags (`isSuspended`) are evaluated on every authenticated request, returning HTTP 403 Forbidden immediately.
  - Platform super-admin endpoints are segregated behind `requireSuperAdmin`, which rejects even Organization Owners.
- **Verification Result:** Verified in `apps/api/test/production-security-audit.test.ts`. Cross-tenant IDOR and unauthorized admin calls strictly rejected.

### A02: Cryptographic Failures
- **Mitigation:**
  - User passwords hashed using `bcrypt` with work factor 12.
  - Secrets at rest (AI provider API keys, Stripe/Chapa payment gateway credentials) encrypted using **AES-256-GCM** with unique initialization vectors (`iv`) and authentication tags (`tag`).
  - Master key (`ENCRYPTION_MASTER_KEY`) must be 256-bit (32 bytes).
  - Outbound webhooks and inbound payment webhooks signed using **HMAC-SHA256**.
- **Verification Result:** Verified in `apps/api/test/production-security-audit.test.ts`. Validated ciphertext, IV, tag generation, and successful round-trip decryption.

### A03: Injection
- **Mitigation:**
  - **SQL Injection:** All database interactions utilize Prisma ORM with parameterized prepared statements; zero raw concatenated SQL queries.
  - **Formula Injection (CWE-1236):** All CSV, TSV, and Excel export services sanitize cell values using `FormulaSanitizer.sanitizeCellValue()`. Any string beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is escaped with a leading single quote (`'`).
  - **Cross-Site Scripting (XSS):** React 19 JSX auto-escapes rendered values; server-rendered email templates utilize explicit sanitization.
- **Verification Result:** Verified in `apps/api/test/production-security-audit.test.ts`. Malicious strings like `=CMD|' /C calc'!A0` and `@SUM(A1:A10)` are neutralized.

### A04: Insecure Design
- **Mitigation:**
  - Immutable test case versioning (`TestCaseVersion`) prevents retroactive tampering with QA audit trails.
  - Usage metering implements idempotency keys preventing double billing or ledger corruption.
  - Background workers sanitize job payloads before logging to prevent sensitive token leakage into Dead-Letter Queues.

### A05: Security Misconfiguration
- **Mitigation:**
  - Production Docker containers run as non-root user (`node`).
  - Reverse proxy enforces HTTP Strict Transport Security (`HSTS`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
  - CORS strictly configured to whitelist the application web domain; wildcard `*` disallowed in production.

### A06: Vulnerable and Outdated Components
- **Third-Party Dependency Audit:**
  - Automated `pnpm audit` identified 11 advisories in devDependencies:
    1. `tinypool@1.1.1` (transitive devDependency of `vitest@3.2.7`): Prototype pollution vulnerability.
    2. `minimatch` (transitive devDependency of `rimraf`): ReDoS vulnerability.
  - **Risk Determination:** **ACCEPTABLE / NOT EXPOSED AT RUNTIME**. These dependencies exist solely within developer test runners (`apps/api/vitest.config.ts`). The production container build bundles only production runtime dependencies; neither `vitest` nor `tinypool` are deployed into production images.
  - **Remediation Action:** Track upstream patch in Vitest v3.3+ and apply in regular maintenance cycle.

### A07: Identification and Authentication Failures
- **Mitigation:**
  - JWT tokens utilize short lifespans (15 minutes for access tokens, 7 days for refresh tokens).
  - Refresh tokens stored with user association and revokable on logout or password change.
  - Rate limiting applied to authentication endpoints (`/api/v1/auth/*`) to prevent brute-force credential stuffing.

### A08: Software and Data Integrity Failures
- **Mitigation:**
  - Inbound payment webhooks (Stripe, Chapa) verify HMAC signatures over raw request buffers prior to JSON parsing.
  - Database backups generate SHA-256 integrity digests; restoration scripts reject modified or corrupted archives.

### A09: Security Logging and Monitoring Failures
- **Mitigation:**
  - Audit logging system records administrative events: tenant creation, membership modifications, role changes, project deletion, and tenant suspension.
  - Prometheus metrics exposition (`/api/v1/metrics`) exposes live telemetry on request rates, latency histograms, and status codes.

### A10: Server-Side Request Forgery (SSRF)
- **Mitigation:**
  - Enterprise outbound webhooks pass through `validateUrlForSSRF` (`ssrf-guard.ts`).
  - Pre-resolves DNS to inspect destination IPv4/IPv6 addresses.
  - Explicitly blocks:
    - Loopback addresses (`127.0.0.1`, `::1`)
    - RFC 1918 Private IP subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
    - Link-local and cloud metadata IPs (`169.254.169.254`)
    - Non-HTTP/HTTPS protocols (`file://`, `gopher://`, `ftp://`).
- **Verification Result:** Verified in `apps/api/test/production-security-audit.test.ts`. 100% of malicious SSRF target attempts blocked.

---

## 3. Automated Security Test Results

The automated security audit suite (`apps/api/test/production-security-audit.test.ts`) executed 17 focused security checks:

```
PASS  test/production-security-audit.test.ts
  Production Security & Multi-Tenancy Audit
    Multi-Tenant Isolation & IDOR Defense
      ✓ rejects cross-organization access to projects (404/403)
      ✓ rejects access to test cases belonging to another tenant
      ✓ rejects defect access across organization boundaries
    Platform Administration Perimeter Enforcement
      ✓ strictly blocks standard organization owner from super-admin platform endpoints
      ✓ blocks unauthenticated requests to platform endpoints
    Suspended Tenant & User Enforcement
      ✓ denies access when organization is suspended
      ✓ denies access when user is suspended
    SSRF Defense (Server-Side Request Forgery)
      ✓ blocks loopback IP addresses (127.0.0.1, localhost)
      ✓ blocks cloud metadata IP (169.254.169.254)
      ✓ blocks RFC 1918 private network addresses (10.0.0.1, 192.168.1.1)
      ✓ allows valid public webhooks
    CSV & Excel Formula Injection Defense (CWE-1236)
      ✓ prepends single quote to cells beginning with formula triggers (=, +, -, @)
      ✓ leaves standard alphanumeric cells unescaped
    Cryptographic Security (AES-256-GCM at Rest)
      ✓ correctly encrypts secrets with ciphertext, iv, and auth tag
      ✓ decrypts ciphertext back to original plaintext
      ✓ rejects corrupted ciphertext or tampered auth tag
    System Health & Operational Security
      ✓ exposes Prometheus metrics with operational counters

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
```

---

## 4. Responsible Disclosure & Security Contacts

If you discover a security vulnerability within the Artificial Intelligence QA Platform:
- **Email:** `security@qa-platform.yourcompany.com`
- **PGP Key ID:** `0x4A8F29C1`
- **Response Commitment:** Initial acknowledgment within 24 hours; triage within 48 hours.
