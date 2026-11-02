# Deployment Guide

## 1. Container Architecture
The platform is deployed using Docker containers orchestrated via Docker Compose or Kubernetes:
- `postgres`: PostgreSQL 16 image with volume persistence (`postgres_data`).
- `redis`: Redis 7 Alpine with volume persistence (`redis_data`).
- `api`: Node.js Express server (`apps/api/Dockerfile`).
- `worker`: BullMQ background job processor (`apps/worker/Dockerfile`).
- `web`: Next.js 16 standalone runner (`apps/web/Dockerfile`).

## 2. Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure credentials:
   - `DATABASE_URL`: PostgreSQL connection string.
   - `REDIS_URL`: Redis connection string.
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: Cryptographically secure random tokens.
3. Start dependencies:
   ```bash
   docker-compose up -d postgres redis
   ```
4. Run migrations:
   ```bash
   pnpm db:generate
   pnpm --filter @ai-qa/api prisma:migrate
   ```
