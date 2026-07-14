---
name: sync-with-nowstack
description: Sync an app fork with the latest NowStack boilerplate changes from melvynx/nowstack. Use when the user types /sync-with-nowstack, asks to pull the latest NowStack changes, or wants to update a fork from the boilerplate.
argument-hint: "[--dry-run] [--rebase] [--merge] [--remote <name>] [--repo <owner/name-or-url>] [--branch <name>] [--allow-dirty] [--no-install] [--no-verify]"
---

# Sync With NowStack

<objective>
Bring a project fork up to date with the canonical NowStack boilerplate while preserving local product changes.
</objective>

<when_to_use>
Use this workflow when:

- The user types `/sync-with-nowstack`.
- A project fork needs the latest boilerplate fixes/features from `melvynx/nowstack`.
- A collaborator has access to the canonical repository and wants to merge those changes into their app.

Do not use this for normal feature branches that should only pull from their own app repository.
</when_to_use>

<quick_start>
Run the bundled script from the repository root:

```bash
.agents/skills/sync-with-nowstack/scripts/sync-with-nowstack.sh
```

Common options:

```bash
.agents/skills/sync-with-nowstack/scripts/sync-with-nowstack.sh --dry-run
.agents/skills/sync-with-nowstack/scripts/sync-with-nowstack.sh --rebase
.agents/skills/sync-with-nowstack/scripts/sync-with-nowstack.sh --branch main
.agents/skills/sync-with-nowstack/scripts/sync-with-nowstack.sh --repo your-org/nowstack
```

</quick_start>

<workflow>
1. Read `AGENTS.md` and the current `git status --short --branch`.
2. Run the script with any user-provided flags.
3. If the script reports conflicts, inspect them and resolve normally with Git.
4. After a successful sync, review the diff and run any extra checks needed for changed areas.
5. Add a `CHANGELOG.md` entry for local fixes made by the agent. Do not add one for upstream-only changes unless the sync itself required local edits.
</workflow>

<defaults>
| Setting | Default |
| --- | --- |
| Remote name | `nowstack` |
| Repository | `melvynx/nowstack` |
| Integration mode | `merge` |
| Branch | upstream default branch |
| Install | enabled when dependency files change |
| Verify | `pnpm ts` when `package.json` is present |
</defaults>

<safety>
- The script creates a local backup branch before merge/rebase.
- It refuses to continue during an existing merge, rebase, cherry-pick, or revert.
- It refuses to run with uncommitted changes unless `--allow-dirty` is passed.
- It does not stash or discard local changes.
- It stops on conflicts and prints the exact Git continuation command.
- It never uses destructive cleanup commands.
</safety>

<repo_access>
The canonical repository is expected to be available at `https://github.com/melvynx/nowstack.git`.
If GitHub returns `Repository not found`, confirm the collaborator has access or pass an accessible repo with `--repo owner/name` or `--repo https://github.com/owner/name.git`.
</repo_access>
