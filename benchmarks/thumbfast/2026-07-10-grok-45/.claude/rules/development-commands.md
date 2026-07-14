## Commands

- `pnpm ts` - TypeScript type checking
- `pnpm lint` - ESLint with auto-fix
- `pnpm clean` - Lint + type check + format
- `pnpm prisma:seed` - Seed database
- `pnpm better-auth:migrate` - Generate better-auth Prisma schema
- `pnpm knip` - Unused code detection

## Testing

**CRITICAL - ALWAYS use CI commands:**

- `pnpm test:ci` - Unit tests (`__tests__/`)
- `pnpm test:e2e:ci` - E2E tests, headless (`e2e/`)

**NEVER** run `pnpm test` or `pnpm test:e2e` — interactive mode, incompatible with Claude Code.
