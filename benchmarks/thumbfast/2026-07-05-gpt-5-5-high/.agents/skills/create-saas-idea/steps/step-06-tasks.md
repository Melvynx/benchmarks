---
name: step-06-tasks
description: Create actionable implementation tasks from PRD and Architecture
prev_step: steps/step-05-architecture.md
next_step: null
---

# Step 6: Task Creation

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER create vague tasks - each must be actionable
- ✅ ALWAYS base tasks on PRD features and Architecture
- ✅ ALWAYS respond in `{user_language}`
- 📋 YOU ARE A project manager, breaking work into doable chunks
- 💬 FOCUS on tasks that can be done in 1-4 hours each
- 🚫 FORBIDDEN to create tasks not traceable to PRD/Architecture

## EXECUTION PROTOCOLS:

- 🎯 Create tasks folder with numbered task files
- 💾 Each task has: context, requirements, acceptance criteria
- 📖 Tasks should be completable by Claude Code
- 🚫 FORBIDDEN to skip task file creation (if save_mode)

## CONTEXT BOUNDARIES:

- Variables from previous steps: `{validated_idea}`, `{prd_content}`, `{architecture}`, `{user_language}`, `{output_dir}`, `{save_mode}`
- Tasks should reference PRD features and Architecture decisions

## REFERENCE:

Load `../references/task-template.md` for:
- Task file structure
- Standard task categories
- Task sizing guide
- Acceptance criteria patterns

## YOUR TASK:

Create a structured set of implementation tasks that Claude Code can execute to build the MVP.

---

## TASK STRUCTURE:

### Task File Template

Each task file follows this structure:

```markdown
---
task_id: {NN}
title: {Task Title}
status: pending
priority: P0|P1|P2
estimated_hours: {1-4}
prd_features: [{feature references}]
archi_sections: [{architecture references}]
depends_on: [{task_ids}]
---

# Task {NN}: {Title}

## Context

{Brief context from PRD and Architecture - what this task is building and why}

## Requirements

- [ ] {Specific requirement 1}
- [ ] {Specific requirement 2}
- [ ] {Specific requirement 3}

## Technical Details

{Any specific technical instructions from Architecture}

**Files to create/modify:**
- `{file path 1}` - {purpose}
- `{file path 2}` - {purpose}

## Acceptance Criteria

- [ ] {Criterion 1 - testable}
- [ ] {Criterion 2 - testable}
- [ ] {Criterion 3 - testable}

## Notes

{Any additional context or gotchas}
```

---

## STANDARD TASK CATEGORIES (NowStack):

### Category 1: Foundation (Tasks 01-03)

**Task 01: Project Initialization**
- Run `/init-project` (collect product brief, update AGENTS.md + site config, shadcn theme, landing copy)
- Verify `pnpm start-all` boots Convex + Vite cleanly (logs in `.logs/web.txt`, `.logs/convex.txt`)
- Configure Convex env vars listed in the architecture (`pnpm exec convex env set KEY value`)

**Task 02: Convex Schema**
- Add feature tables to `convex/schema.ts` with proper `organizationId` + `by_org` indexes
- Run `pnpm convex:dev` to validate schema
- Add DTO mapper stubs in `convex/<feature>/dto/`

**Task 03: Auth Configuration**
- Pick enabled methods in the Better Auth Convex component (email/password, magic link, OAuth)
- If org-scoped: verify member/role checks in queries/mutations
- Smoke-test signup + login through the UI

### Category 2: Core Feature (Tasks 04-06)

**Task 04: {Core Feature} - Convex Functions**
- Create `convex/{feature}/queries.ts` and `convex/{feature}/mutations.ts`
- Add identity + org checks at the top of each function
- Add DTO mappers in `convex/{feature}/dto/`

**Task 05: {Core Feature} - UI Routes & Components**
- Add route(s) under `src/routes/...` with custom `pendingComponent` (skeleton)
- Build feature components in `src/features/{feature}/`
- Wire `useQuery` / `useMutation` against the new Convex functions
- Forms via TanStack Form + Zod

**Task 06: {Core Feature} - Polish**
- Empty state, error state, optimistic updates where it matters
- Confirm reactivity works (mutate from one tab → other tab updates)

### Category 3: Supporting Features (Tasks 07-09)

**Task 07: {Supporting Feature 1}**
- Convex functions + DTO + route per NowStack conventions

**Task 08: {Supporting Feature 2}**
- Same pattern

**Task 09: Dashboard / Overview**
- Org-scoped landing view inside `src/routes/orgs/$orgSlug/(navigation)/...`
- Reactive queries for the main metrics

### Category 4: Pages & UI (Tasks 10-12)

**Task 10: Landing Page**
- Update the landing route copy / hero (use the typography components in `@/components/nowts/typography.tsx`)
- No emojis, no gradients (project rules)

**Task 11: Settings**
- Plug into the existing `src/routes/(logged-in)/account/...` flows
- Add any feature-specific preferences as Convex mutations

**Task 12: Navigation & Skeletons**
- Update org sidebar entries
- Make sure every new route has a `pendingComponent` skeleton

### Category 5: Integration (Tasks 13-15)

**Task 13: Email Notifications** (if needed)
- React Email template in `emails/`
- Trigger from a Convex action / mutation (via `internal.email.*`)
- Preview with `pnpm email`

**Task 14: Payments** (if needed)
- Run `/setup-stripe` to collect keys + products
- Edit `src/lib/auth/stripe/auth-plans.ts` (plan names, limits, price IDs, free trial)
- Confirm webhook is registered against the Convex deployment URL

**Task 15: Final Polish & Launch**
- SEO meta in `__root.tsx` / route heads
- Playwright happy-path test in `e2e/`
- Run `/publish-to-production`

---

## EXECUTION SEQUENCE:

### 1. Analyze PRD and Architecture

**Extract from PRD:**
- All must-have features
- User flows
- Pages required

**Extract from Architecture:**
- Implementation order
- Technical decisions
- Folder structure

### 2. Create Tasks Folder

**If `{save_mode}` = true:**

```bash
mkdir -p {output_dir}/tasks
```

### 3. Generate Task Files

**Create each task file:**

**`{output_dir}/tasks/01-project-setup.md`:**
```markdown
---
task_id: 01
title: Project Setup
status: pending
priority: P0
estimated_hours: 1
prd_features: []
archi_sections: ["Foundation"]
depends_on: []
---

# Task 01: Project Initialization (NowStack)

## Context

The repo is already a NowStack fork. Run `/init-project` to apply the product brief, shadcn theme, and Convex env, then verify the dev loop works end to end.

## Requirements

- [ ] Run `/init-project` and complete each gate (product brief, shadcn theme, landing copy, env)
- [ ] `pnpm start-all` boots both Convex and Vite cleanly (check `.logs/web.txt` and `.logs/convex.txt`)
- [ ] All Convex env vars listed in `archi.md` set via `pnpm exec convex env set`
- [ ] `pnpm ts` and `pnpm lint:ci` pass

## Technical Details

**Project rules to respect (read these once):**
- `AGENTS.md`
- `.agents/rules/code-conventions.md`
- `.agents/rules/convex-imports.md` (always use `@convex/*` alias)
- `.agents/rules/start-commands.md`
- `.agents/rules/page-skeletons.md`

**Do NOT:**
- Edit `convex/_generated/**`
- Add Prisma / raw PostgreSQL / Upstash / Vercel Cron
- Use raw `fetch` (use `@/lib/up-fetch.ts`)

## Acceptance Criteria

- [ ] `pnpm start-all` runs Convex + Vite without errors
- [ ] `pnpm ts` passes
- [ ] Landing route renders with the updated product copy and theme
- [ ] `pnpm exec convex env list` shows all required env vars

## Notes

Skip this task only if the project was already initialized for this product.
```

**Continue for all tasks based on PRD features...**

### 4. Create Task Overview

**Generate `{output_dir}/tasks/README.md`:**

```markdown
# Implementation Tasks: {Product Name}

## Overview

Total tasks: {N}
Estimated total hours: {X}
Suggested timeline: {Y} days

## Task List

| # | Task | Priority | Hours | Depends On | Status |
|---|------|----------|-------|------------|--------|
| 01 | Project Setup | P0 | 1 | - | ⬜ |
| 02 | Database Setup | P0 | 2 | 01 | ⬜ |
| 03 | Authentication | P0 | 3 | 02 | ⬜ |
| 04 | {Core Feature} - Data | P0 | 3 | 03 | ⬜ |
| 05 | {Core Feature} - UI | P0 | 4 | 04 | ⬜ |
| ... | ... | ... | ... | ... | ⬜ |

## Dependency Graph

```
01 → 02 → 03 → 04 → 05 → 06
                ↓
               07 → 08
                    ↓
                   10 → 11 → 12
                         ↓
                        15
```

## How to Use

1. Work through tasks in order (respecting dependencies)
2. Use Claude Code to implement each task
3. Mark tasks as done: ⬜ → ✅
4. Reference PRD and Architecture for context

## Status Legend

- ⬜ Pending
- 🔄 In Progress
- ✅ Complete
- ⏸️ Blocked
```

### 5. Present Summary

**Display in `{user_language}`:**
```
📋 Tasks Created for {Product Name}

Total: {N} tasks
Estimated: {X} hours (~{Y} days)

Task breakdown:
- Foundation: {X} tasks ({Y} hours)
- Core Feature: {X} tasks ({Y} hours)
- Supporting: {X} tasks ({Y} hours)
- Polish: {X} tasks ({Y} hours)

Files created:
- tasks/README.md - Overview & tracking
- tasks/01-project-setup.md
- tasks/02-database-setup.md
- ... (all task files)

Suggested workflow:
1. Start with task 01, work sequentially
2. Use /apex or Claude Code for each task
3. Reference PRD.md and ARCHI.md for context
4. Update task status as you complete them
```

### 6. Provide Next Steps

**Display in `{user_language}`:**
```
🎉 SaaS Planning Complete!

You now have everything you need to build {Product Name}:

📁 Output folder: {output_dir}/
- idea.md - Validated idea with research
- prd.md - Product Requirements Document
- archi.md - Technical Architecture
- tasks/ - Implementation tasks

To start building (you're already inside the NowStack repo):
1. Run `/init-project` to apply the brief, theme, AGENTS.md, and Convex env
2. Open `{output_dir}/tasks/` and start with `01-project-setup.md`
3. Use `/apex` or APEX-style implementation: "Implement task 01 from {output_dir}/tasks/01-project-setup.md"
4. Work through tasks in order, respecting NowStack rules in `.agents/rules/`

Pro tips:
- Keep PRD and Architecture open for reference
- Mark tasks ✅ as you complete them
- Ship fast, iterate based on feedback

Good luck building {Product Name}! 🚀
```

### 7. Workflow Complete

**Update all document frontmatters with `stepsCompleted: [0, 1, 2, 3, 4, 5, 6]`**

**Final AskUserQuestion (optional):**
```yaml
questions:
  - header: "Start"
    question: "Would you like me to start implementing the first task?"
    options:
      - label: "Yes, start task 01"
        description: "Begin project setup immediately"
      - label: "No, I'll do it myself"
        description: "I'll implement tasks on my own"
      - label: "Review documents first"
        description: "Let me review the generated docs"
    multiSelect: false
```

---

## SUCCESS METRICS:

✅ All PRD features have corresponding tasks
✅ Tasks are in logical order with dependencies
✅ Each task is 1-4 hours of work
✅ Each task has clear acceptance criteria
✅ README.md with overview and tracking
✅ All task files created (if save_mode)

## FAILURE MODES:

❌ Creating vague tasks like "Build the app"
❌ Tasks not traceable to PRD features
❌ Missing dependencies between tasks
❌ Tasks too large (>4 hours)
❌ No acceptance criteria
❌ **CRITICAL**: Not creating task files when save_mode is true

## TASK CREATION PROTOCOLS:

- Every task must be actionable by Claude Code
- Include file paths where possible
- Reference PRD and Architecture sections
- Keep tasks focused on one thing
- Clear acceptance criteria = can be verified

---

## WORKFLOW COMPLETE

**This is the final step of the create-saas workflow.**

The user now has:
1. ✅ Validated idea with market research
2. ✅ Product Requirements Document
3. ✅ Technical Architecture
4. ✅ Implementation tasks

**Output folder structure:**
```
~/.claude/output/saas/{project_id}/
├── idea.md
├── prd.md
├── archi.md
├── marketing.md
└── tasks/
    ├── README.md
    ├── 01-project-setup.md
    ├── 02-database-setup.md
    ├── 03-authentication.md
    ├── 04-core-feature-data.md
    ├── 05-core-feature-ui.md
    └── ... (more tasks)
```

<critical>
Congratulations! The SaaS planning workflow is complete.
The user can now use Claude Code with /apex or similar to implement each task.
</critical>
