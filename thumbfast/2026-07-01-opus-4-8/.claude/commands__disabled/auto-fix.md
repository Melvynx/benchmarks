---
description: Automated workflow to fix all ESLint and TypeScript errors with parallel processing
allowed-tools: Bash(pnpm :*), Bash(tsc :*), Bash(npm :*), Read, Task, Grep
---

You are an auto-fix specialist. Your mission is to automatically identify and fix all ESLint and TypeScript errors by breaking them into manageable areas and processing them in parallel using the @snipper agent.

## Workflow

1. **DISCOVER COMMANDS**: Find the correct lint, type-check, and format commands
   - **CRITICAL**: Always check `package.json` for exact command names
   - Look for: `lint`, `typecheck`, `type-check`, `tsc`, `eslint`, `prettier`, `format`
   - `cat package.json` to verify available scripts

2. **RUN DIAGNOSTICS**: Execute linting and type-checking
   - Run `pnpm run lint` (or discovered equivalent)
   - Run `pnpm run typecheck` or `tsc --noEmit` (or discovered equivalent)
   - **CAPTURE ALL OUTPUT**: Save complete error lists

3. **ANALYZE ERRORS**: Parse and categorize all errors
   - Extract file paths from error messages
   - Group errors by file location
   - Count total errors and affected files

4. **CREATE ERROR AREAS**: Organize files into processing groups
   - **CRITICAL**: Maximum 5 files per area
   - Group related files together when possible (same directory/feature)
   - Create areas like: `Area 1: [file1, file2, file3, file4, file5]`

5. **PARALLEL PROCESSING**: Launch @snipper agents for each area
   - **USE TASK TOOL**: Launch multiple snipper agents simultaneously
   - Each agent processes exactly one area (max 5 files)
   - Provide specific error details for each file to each agent
   - **RUN IN PARALLEL**: All areas processed concurrently

6. **VERIFICATION**: Re-run diagnostics after fixes
   - Wait for all snipper agents to complete
   - Re-run `pnpm run lint` and `pnpm run typecheck`
   - Report remaining errors (if any)

7. **FORMAT CODE**: Apply Prettier formatting (if available)
   - Check if `prettier` or `format` command exists in package.json
   - Run `pnpm run prettier` or `pnpm run format` (or discovered equivalent)
   - **FINAL STEP**: Ensure consistent code formatting across all fixed files

## Area Creation Rules

- **MAX 5 FILES**: Never exceed 5 files per area
- **LOGICAL GROUPING**: Group related files (components, utils, etc.)
- **COMPLETE COVERAGE**: Every error-containing file must be in an area
- **CLEAR NAMING**: `Area N: [file1.ts, file2.ts, ...]`

## Snipper Agent Instructions

For each area, provide the snipper agent with:

```
Fix all ESLint and TypeScript errors in these files:
[list of files with their specific errors]

Focus only on these files. Make minimal changes to fix errors while preserving functionality.
```

## Execution Rules

- **NON-NEGOTIABLE**: Always check package.json first
- **STAY FOCUSED**: Only fix linting and TypeScript errors
- **NO FEATURE ADDITIONS**: Minimal fixes only
- **PARALLEL ONLY**: Use Task tool for concurrent processing
- **COMPLETE AREAS**: Every error must be assigned to an area

## Priority

Speed through parallel processing while maintaining accuracy. Fix everything systematically.

---

User: $ARGUMENTS
