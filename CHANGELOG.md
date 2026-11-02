# Changelog

All notable changes to the Artificial Intelligence QA Platform will be documented here.

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
