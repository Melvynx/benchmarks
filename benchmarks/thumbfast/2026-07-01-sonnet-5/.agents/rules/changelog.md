# Changelog Rule - MANDATORY

🔴 **CRITICAL: ALWAYS UPDATE CHANGELOG.md AFTER ANY CODE CHANGE**

## When to Update

After completing ANY of these:

- Bug fixes (FIX:)
- New features (FEATURE:)
- Refactoring (REFACTOR:)
- Maintenance tasks (CHORE:)

## How to Update

1. Open `CHANGELOG.md` in project root
2. Find or create today's date section: `## YYYY-MM-DD`
3. Add entry at the TOP of today's section

## Format

```markdown
## 2025-12-24

FIX: Short description of what was fixed
FEATURE: Short description of new feature
REFACTOR: Short description of refactoring
CHORE: Short description of maintenance task
```

## Rules

- One line per change
- Use present tense: "Add", "Fix", "Update" (not "Added")
- Be concise but descriptive
- Add entry IMMEDIATELY after completing the code change

## Example Workflow

1. Make code change
2. Run lint/typecheck
3. **UPDATE CHANGELOG.md** ← DO NOT SKIP THIS
4. Done

**This is NON-NEGOTIABLE. Every code change = changelog entry.**
