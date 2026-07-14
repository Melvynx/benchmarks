# Plan 004: Surface errors (and guard double-clicks) when deleting generations and thumbnails

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 360148f0..HEAD -- src/features/editor/generation-gallery.tsx`
> If the file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `360148f0`, 2026-06-12

## Why this matters

Deleting a generation or a thumbnail from the gallery `await`s a Convex
mutation inside a confirm-dialog action with **no error handling**. If the
mutation fails (network drop, permission error, item already deleted), the
user gets no feedback at all — no error toast, the dialog just closes, and an
unhandled promise rejection lands in the console. The item then "reappears"
on the next refresh, which reads as data corruption to the user. The same
file already contains the correct pattern (`handleToggleStar` reverts state
and toasts on failure) — these two handlers just never got it.

## Current state

Single file: `src/features/editor/generation-gallery.tsx`.

- Mutation wiring (for orientation):
  - line 22: `import { useMutation as useConvexMutation } from "convex/react";`
  - line 27: `import { toast } from "sonner";`
  - line 229: `const deleteGeneration = useConvexMutation(deleteGenerationRef);`
  - line 426: `const deleteThumbnail = useConvexMutation(deleteThumbnailRef);`

- Broken handler #1 — generation delete, inside a `dialogManager.confirm`
  action (lines ~375-390):

  ```tsx
  action: {
    label: "Delete",
    variant: "destructive",
    onClick: async () => {
      await deleteGeneration({
        orgSlug,
        generationId: generation.id,
      });
      toast.success("Generation deleted");
      onDataChange?.();
    },
  },
  ```

- Broken handler #2 — thumbnail delete (lines ~501-515):

  ```tsx
  dialogManager.confirm({
    title: "Delete thumbnail",
    description: "Are you sure you want to delete this thumbnail?",
    variant: "destructive",
    action: {
      label: "Delete",
      variant: "destructive",
      onClick: async () => {
        await deleteThumbnail({ orgSlug, thumbnailId: thumbnail.id });
        toast.success("Thumbnail deleted");
        onDataChange?.();
      },
    },
  });
  ```

- The in-file exemplar to imitate — `handleToggleStar` (lines ~480-497):

  ```tsx
  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStarring) return;
    setIsStarring(true);
    setIsStarred(!isStarred);
    try {
      const result = await toggleThumbnailStar({ orgSlug, thumbnailId: thumbnail.id });
      setIsStarred(result.isStarred);
    } catch {
      setIsStarred(isStarred);
      toast.error("Failed to update star");
    } finally {
      setIsStarring(false);
    }
  };
  ```

Repo conventions: toasts via `sonner` (`toast.success` / `toast.error`);
dialogs via `dialogManager` from `src/features/dialog-manager/`; prefer `??`
over `||`; project rule: `CHANGELOG.md` entry (`FIX:` prefix) for every code
change.

Note on the dialog API: `dialogManager.confirm`'s `action.onClick` may be
async; check `src/features/dialog-manager/dialog-types.ts` if unsure — the
fix below keeps the async signature and simply adds try/catch inside, which
is API-agnostic.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm ts` | exit 0 |
| Lint | `pnpm lint` | exit 0 (runs `eslint --fix`) |
| Unit tests | `pnpm test:ci` | all pass |
| Dev servers | `pnpm start-all` | web on http://localhost:3000 (may already be running) |

## Scope

**In scope** (the only file you should modify):

- `src/features/editor/generation-gallery.tsx`
- `CHANGELOG.md` (one entry)

**Out of scope** (do NOT touch, even though they look related):

- `convex/editor.ts` (`deleteGeneration`/`deleteThumbnail` mutations) — server
  behavior is correct; this is a client-feedback fix.
- `src/features/dialog-manager/**` — do not change the dialog API.
- `handleToggleStar` — already correct.
- The optimistic image-rename issue in `editor-form.tsx` — known, separately
  tracked (rejected for planning this round; see `plans/README.md`).

## Git workflow

- Branch: `advisor/004-delete-error-feedback`
- One commit: `fix(editor): show error toast and guard double-submit when deleting generations/thumbnails`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Wrap the generation-delete action

Replace the `onClick` body of the generation delete action (lines ~381-388)
with:

```tsx
onClick: async () => {
  try {
    await deleteGeneration({
      orgSlug,
      generationId: generation.id,
    });
    toast.success("Generation deleted");
    onDataChange?.();
  } catch {
    toast.error("Failed to delete generation");
  }
},
```

(`onDataChange` stays inside the `try` so a failed delete doesn't trigger a
refresh that pretends success.)

**Verify**: `pnpm ts` → exit 0.

### Step 2: Wrap the thumbnail-delete action

Same transformation for the thumbnail delete (lines ~508-512):

```tsx
onClick: async () => {
  try {
    await deleteThumbnail({ orgSlug, thumbnailId: thumbnail.id });
    toast.success("Thumbnail deleted");
    onDataChange?.();
  } catch {
    toast.error("Failed to delete thumbnail");
  }
},
```

**Verify**: `pnpm ts` → exit 0; `pnpm lint` → exit 0.

### Step 3: Double-click guard (only if trivially supported)

Check `src/features/dialog-manager/` for a built-in pending/loading state on
confirm actions (e.g. the dialog disabling its action button while the
`onClick` promise is in flight). 

- If the dialog manager ALREADY awaits `onClick` and disables the button →
  nothing to do; note it in the commit message.
- If not, do NOT redesign the dialog manager (out of scope). Instead add a
  module-level in-flight guard in each handler, mirroring the `isStarring`
  pattern: a `useRef(false)` (e.g. `isDeletingRef`) checked-and-set at the top
  of `onClick`, cleared in `finally`.

**Verify**: `pnpm ts` → exit 0.

### Step 4: Manual check in the UI

With dev servers running and a signed-in account (email OTP; code in
`.logs/convex.txt`): open a prompt's gallery under
`/orgs/{slug}/thumbnails/{promptId}`, delete a thumbnail — success toast and
removal. To see the failure path: stop the Convex dev process (or disconnect
network) and attempt a delete — expected: red "Failed to delete …" toast, no
success toast, no unhandled-rejection in console.

**Verify**: both toasts behave as described.

### Step 5: Changelog

Add under today's section in `CHANGELOG.md`:

```
FIX: Deleting a generation or thumbnail from the gallery now shows an error toast when the mutation fails (and no longer fires a success refresh) instead of failing silently with an unhandled rejection.
```

**Verify**: `git diff CHANGELOG.md` shows only this addition.

## Test plan

- No new unit tests: the change is a try/catch around a Convex mutation call
  inside dialog config; the repo's component-test pattern
  (`__tests__/dialog-manager.test.tsx`) tests the dialog manager itself, not
  feature galleries, and mocking `useConvexMutation` for this would test the
  mock. Step 4's manual failure-path check is the acceptance test.
- `pnpm test:ci` → existing suite passes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm ts` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:ci` exits 0
- [ ] `grep -n "Failed to delete generation\|Failed to delete thumbnail" src/features/editor/generation-gallery.tsx`
      returns both new toasts
- [ ] Both `await deleteGeneration(`/`await deleteThumbnail(` call sites are
      inside a `try` block (inspect the diff)
- [ ] `git status` shows no modified files outside the in-scope list (besides
      pre-existing unrelated worktree changes)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The handlers no longer match the "Current state" excerpts (drift).
- Implementing the double-click guard appears to require changing
  `src/features/dialog-manager/**` — report the dialog API gap instead.
- The failure-path manual test shows the dialog manager itself swallowing the
  rejection before your catch runs (would mean the fix belongs elsewhere).

## Maintenance notes

- Other `dialogManager.confirm` destructive actions across the repo may share
  this pattern — a follow-up sweep (`grep -rn "onClick: async" src/features`)
  is deferred; this plan fixes the two confirmed sites only.
- If the dialog manager later gains first-class pending/error handling for
  async actions, these try/catch blocks can be simplified to use it.
- Reviewer should scrutinize: `onDataChange?.()` must remain inside `try` in
  both handlers.
