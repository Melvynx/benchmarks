---
name: frontend-worker
description: Implements frontend UI features following existing codebase patterns
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that involve React component changes, UI additions, styling, and client-side logic in a Next.js app with shadcn/radix components.

## Work Procedure

1. **Read reference files first.** Before any code changes, read at least 3 similar files to understand the patterns. The feature description lists specific reference files — read ALL of them.

2. **Plan the changes.** Based on the reference files, plan exactly what imports, hooks, handlers, and JSX you need to add. Do not guess patterns — copy from existing code.

3. **Implement the changes.** Make the edits following the exact patterns found in reference files. Key rules:
   - Use `resolveActionResult` to call server actions
   - Use `useMutation` from `@tanstack/react-query` for mutations
   - Use `dialogManager.confirm()` for delete confirmations
   - Use `dialogManager.input()` for rename dialogs
   - Use `useQueryClient` + `invalidateQueries` for cache invalidation
   - Use `toast` from `sonner` for success/error messages
   - Stop event propagation on menu triggers inside Links: `e.preventDefault(); e.stopPropagation();`

4. **Run verification commands:**
   - `pnpm exec tsc --noEmit` — must pass with zero errors
   - `pnpm exec eslint . --fix` — must pass
   - `vitest run` — existing tests must pass

5. **Fix any errors** found in step 4 before completing.

## Example Handoff

```json
{
  "salientSummary": "Added ContextMenu and DropdownMenu with Rename/Delete to ThumbnailCard. Both menus share the same handlers using dialogManager.input() for rename and dialogManager.confirm() for delete. Ran tsc --noEmit (0 errors), eslint (clean), vitest run (all passing).",
  "whatWasImplemented": "Added hover-reveal '...' DropdownMenu button and right-click ContextMenu to ThumbnailCard in thumbnails-page-client.tsx. Rename uses dialogManager.input() + updatePromptNameAction. Delete uses dialogManager.confirm() + deletePromptAction. Both invalidate promptKeys.all on success.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm exec tsc --noEmit", "exitCode": 0, "observation": "No type errors" },
      { "command": "pnpm exec eslint . --fix", "exitCode": 0, "observation": "No lint errors" },
      { "command": "pnpm exec vitest run", "exitCode": 0, "observation": "All 12 tests passing" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A server action needed for the feature does not exist yet
- The UI component (e.g., context-menu.tsx) is missing and needs to be installed first
- TypeScript errors that cannot be resolved by reading existing patterns
- Import paths that don't resolve (missing modules/exports)
