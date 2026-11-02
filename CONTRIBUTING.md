# Contributing Guidelines

## Development Workflow
1. Use Node.js >= 20 and pnpm >= 9.
2. Follow strict TypeScript conventions.
3. Keep logic modular within appropriate packages:
   - Shared contracts -> `packages/shared-types`
   - Validation schemas -> `packages/validation`
   - UI primitives -> `packages/ui`
   - API endpoints -> `apps/api`
   - Background jobs -> `apps/worker`
   - Frontend views -> `apps/web`
4. Always run verification before committing:
   ```bash
   pnpm typecheck
   pnpm test
   pnpm build
   ```
