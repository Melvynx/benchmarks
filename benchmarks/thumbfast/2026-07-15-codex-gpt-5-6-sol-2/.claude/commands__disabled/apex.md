---
description: Systematic feature implementation using APEX methodology (Analyze, Plan, Execute, eXamine)
argument-hint: <feature-description>
---

<objective>
Implement #$ARGUMENTS using the APEX methodology - a structured 4-phase approach that ensures quality and alignment with user expectations.

APEX stands for:

- **A**nalyze - Understand the task and gather context
- **P**lan - Create a detailed implementation plan
- **E**xecute - Implement step by step with tracking
- **X**amine - Verify the implementation works correctly
  </objective>

<phase name="1-analyze">
## Phase 1: ANALYZE

**Goal**: Understand the task and gather all necessary context.

**Actions**:

1. Read the user's request carefully: #$ARGUMENTS
2. Identify related files in the codebase (read at least 3-5 relevant files)
3. Understand existing patterns, conventions, and architecture
4. Identify dependencies and potential impacts
5. List any unknowns or ambiguities

**Output**: Summary of understanding, key files identified, and any questions.

Use **AskUserQuestion** if you need clarification on requirements, scope, or technical decisions.
</phase>

<phase name="2-plan">
## Phase 2: PLAN

**Goal**: Create a detailed implementation plan.

**Actions**:

1. Break down the feature into specific, actionable tasks
2. Identify files to create/modify
3. Define the order of operations
4. Consider edge cases and error handling
5. Note any potential risks or challenges

**Output**: Numbered list of implementation steps with file references.
</phase>

<mandatory_stop>

## MANDATORY STOP - Plan Validation

After completing your plan, you MUST:

1. Present the complete plan to the user
2. Use **AskUserQuestion** with options:
   - "Approve plan" - Proceed to execution
   - "Modify plan" - Let user specify changes
   - "Add details" - Request more specifics on certain steps
3. **DO NOT proceed to Execute until the user explicitly approves**

Wait for user validation before continuing.
</mandatory_stop>

<phase name="3-execute">
## Phase 3: EXECUTE

**Goal**: Implement the approved plan step by step.

**Actions**:

1. Use **TodoWrite** to create tasks from the approved plan
2. Follow the plan in order, marking each task in_progress then completed
3. Write clean, consistent code following project conventions
4. Test as you go when possible
5. Never batch completions - mark each task done immediately

**Output**: Working implementation with all changes made.
</phase>

<phase name="4-examine">
## Phase 4: EXAMINE

**Goal**: Verify the implementation works correctly.

**Actions**:

1. Run type checking: `pnpm ts`
2. Run linting: `pnpm lint`
3. Run relevant tests if applicable: `pnpm test:ci`
4. Verify the feature works as expected
5. Check for any regressions or side effects
6. Update CHANGELOG.md with the changes

**Output**: Confirmation that all checks pass and feature is complete.
</phase>

<success_criteria>

- All 4 phases completed in order
- User approved the plan before execution
- All code changes follow project conventions
- Type checking passes (`pnpm ts`)
- Linting passes (`pnpm lint`)
- Tests pass if applicable (`pnpm test:ci`)
- CHANGELOG.md updated with changes
- Feature works as specified in #$ARGUMENTS
  </success_criteria>

<workflow_summary>

```
ANALYZE → Understand task, read files, ask questions
    ↓
PLAN → Create detailed implementation steps
    ↓
STOP → Ask user to validate plan (MANDATORY)
    ↓
EXECUTE → Implement with TodoWrite tracking
    ↓
EXAMINE → Verify with tests, lint, and changelog
```

</workflow_summary>

---

User request: #$ARGUMENTS
