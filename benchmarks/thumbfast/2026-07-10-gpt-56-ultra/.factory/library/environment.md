# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

- Package manager: pnpm
- Framework: Next.js with App Router
- UI: shadcn/ui (new-york style) with Radix primitives
- State: TanStack Query for server state
- Forms: TanStack Form (never React Hook Form)
- Styling: Tailwind CSS v4
- TypeScript 5.9.3
