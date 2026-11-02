# Artificial Intelligence QA Platform

> Enterprise AI-Powered Software Quality Assurance and Test Management SaaS.

---

## 1. Overview
The **Artificial Intelligence QA Platform** provides an end-to-end quality engineering environment comparable to Testmo, TestRail, and Qase, augmented with intelligent AI-driven test case generation, failure root-cause analysis, and predictive risk management.

## 2. Architecture & Monorepo Structure
Managed via `pnpm` workspaces:

```
AI-QA-PLATFORM/
├── apps/
│   ├── web/           # Next.js 16 (App Router), React 19, Tailwind CSS, TanStack Query
│   ├── api/           # Express.js REST API (/api/v1), Zod, Winston logging, OpenAPI
│   └── worker/        # BullMQ background worker service backed by Redis
├── packages/
│   ├── shared-types/  # Domain models, enums (Roles, Statuses, Tiers), API envelopes
│   ├── validation/    # Shared Zod validation schemas
│   ├── api-client/    # Type-safe frontend client for backend endpoints
│   ├── ui/            # UI components and layout utilities
│   └── config/        # Base TypeScript and tooling configurations
├── database/
│   └── prisma/        # PostgreSQL schema, migrations, seed scripts
├── integrations/
│   ├── playwright/    # Playwright custom reporter package
│   └── postman/       # Postman & Newman ingestion adapters
├── infrastructure/
│   ├── docker/        # Containerization configurations
│   └── ci-cd/         # GitHub Actions workflows
└── docs/              # Architectural, Database, API, and Security guides
```

## 3. Technology Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide icons, TanStack Query.
- **Backend**: Node.js v24+, Express.js, TypeScript, Winston, Zod.
- **Database**: PostgreSQL 16, Prisma ORM 6.
- **Queue/Cache**: Redis 7, BullMQ.
- **Testing**: Vitest, Supertest.
- **Containerization**: Docker, Docker Compose.

## 4. Quickstart

### Prerequisites
- Node.js >= 20 (v24.18.0 tested)
- pnpm >= 9.0.0
- Docker & Docker Compose (optional for local standalone containers)

### Installation
```bash
# Install workspace dependencies
pnpm install

# Generate Prisma Client
pnpm db:generate

# Build all packages and applications
pnpm build

# Run all tests
pnpm test

# Run TypeScript type check
pnpm typecheck
```

### Running Locally
```bash
# Start backend API (Port 4000)
pnpm dev:api

# Start Next.js frontend (Port 3000)
pnpm dev:web

# Start background worker
pnpm dev:worker
```
