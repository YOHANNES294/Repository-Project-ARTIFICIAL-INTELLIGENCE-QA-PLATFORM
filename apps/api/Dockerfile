FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY database/ ./database/
COPY apps/api/ ./apps/api/
RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm --filter @ai-qa/shared-types build
RUN pnpm --filter @ai-qa/validation build
RUN pnpm --filter @ai-qa/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm

COPY --from=builder /app /app

EXPOSE 4000
CMD ["pnpm", "--filter", "@ai-qa/api", "start"]
