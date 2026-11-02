# Architecture Specification

## 1. Modular Monorepo Design
The system uses a modular monolithic architecture with dedicated background processing:
1. **API Gateway & Core Service (`apps/api`)**:
   - Handles REST requests at `/api/v1`.
   - Correlation IDs (`x-request-id`) injected on every request and bound to Winston structured logs.
   - Enforces strict tenant isolation via organization context.
   - Centralized error handler transforms domain errors into standard JSON envelopes.
2. **Background Processing Service (`apps/worker`)**:
   - Asynchronous job execution using BullMQ over Redis.
   - Handles long-running AI inferences, test result parsing, notifications, and scheduled aggregations.
3. **Frontend Application (`apps/web`)**:
   - Next.js 16 with App Router and React Server/Client Components.
   - TanStack Query for server state management and caching.
   - Real-time status and telemetry dashboard.

## 2. Shared Packages
- `@ai-qa/shared-types`: Canonical domain models, DTOs, and enums.
- `@ai-qa/validation`: Zod schemas shared between frontend and backend.
- `@ai-qa/api-client`: Type-safe fetch client for communication with backend.
- `@ai-qa/ui`: Shared design tokens and utility functions.
- `@ai-qa/config`: Base compiler options and shared standards.

## 3. Reliability & Probes
- `GET /api/v1/health`: Overall health assessment combining process, database, and Redis checks.
- `GET /api/v1/health/live`: Process liveness probe.
- `GET /api/v1/health/ready`: Database and dependency readiness probe.
