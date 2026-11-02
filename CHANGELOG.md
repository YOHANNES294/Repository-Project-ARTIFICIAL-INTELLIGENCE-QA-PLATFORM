# Changelog

All notable changes to the Artificial Intelligence QA Platform will be documented here.

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
