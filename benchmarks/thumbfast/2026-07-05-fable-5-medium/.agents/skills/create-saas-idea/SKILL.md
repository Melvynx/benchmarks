---
name: create-saas-idea
description: NowStack-tailored SaaS ideation workflow - from idea discovery to task breakdown on the NowStack stack (TanStack Start + Convex + Better Auth)
argument-hint: "[project-name]"
---

<objective>
Guide the user through the complete SaaS creation journey on top of **NowStack**: from discovering the right idea, through validation and PRD creation, to a technical architecture wired to TanStack Start + Convex + Better Auth + Stripe + Resend + Cloudflare R2, then to actionable tasks.

This workflow responds in the user's language while prompts are in English. It is designed for solo developers shipping on the NowStack boilerplate who want to ship a monetizable SaaS in under 2 weeks.
</objective>

<quick_start>
**Start a new SaaS ideation (interactive discovery):**

```bash
/create-saas-idea
```

**With custom project name:**

```bash
/create-saas-idea my-awesome-saas
```

**Continue existing project:**

```bash
/create-saas-idea -c my-awesome-saas
```

**What it does:**

1. **Discovery**: Ask questions to understand your background
2. **Brainstorm**: Generate 3-6 validated SaaS ideas
3. **Validate**: Challenge and refine your chosen idea
4. **PRD**: Create a Product Requirements Document
5. **Architecture**: Design technical stack on NowStack (TanStack Start + Convex + Better Auth)
6. **Tasks**: Break down into actionable implementation tasks for the NowStack codebase

Outputs saved to `~/.claude/output/saas/{project-id}/`. Once tasks are ready, feed them into `/init-project` or APEX to start implementing on top of the NowStack boilerplate.
</quick_start>

<parameters>
**Arguments:**
- `[project-name]` - Optional project name (auto-generated if not provided)

**Flags:**

- `-a` / `-A` - Auto mode: skip confirmations (default: false)
- `-s` / `-S` - Save mode: save outputs to files (default: true)
- `-c <project-id>` - Continue mode: reload existing project and resume where you left off
  </parameters>

<state_variables>
**Core Variables (persist throughout all steps):**

| Variable          | Type    | Description                       |
| ----------------- | ------- | --------------------------------- |
| `{project_name}`  | string  | SaaS project name                 |
| `{project_id}`    | string  | Kebab-case identifier for folders |
| `{auto_mode}`     | boolean | Skip confirmations                |
| `{save_mode}`     | boolean | Save outputs to files             |
| `{output_dir}`    | string  | Path to output folder             |
| `{user_language}` | string  | User's preferred language         |

**Accumulated State (grows across steps):**

| Variable                 | Set In | Description                           |
| ------------------------ | ------ | ------------------------------------- |
| `{discovery_answers}`    | Step 1 | User's answers to discovery questions |
| `{has_previous_project}` | Step 1 | Whether user built a project before   |
| `{ideas}`                | Step 2 | List of 3-6 brainstormed ideas        |
| `{selected_idea}`        | Step 2 | User's chosen idea                    |
| `{validated_idea}`       | Step 3 | Fully developed and validated idea    |
| `{prd_content}`          | Step 4 | Product Requirements Document         |
| `{architecture}`         | Step 5 | Technical architecture decisions      |
| `{tasks}`                | Step 6 | List of implementation tasks          |

</state_variables>

<entry_point>
Load `steps/step-00-init.md`
</entry_point>

<step_files>
| Step | File | Description |
|------|------|-------------|
| 0 | `steps/step-00-init.md` | Initialize: parse flags, create output folder |
| 1 | `steps/step-01-discovery.md` | Discovery: ask questions to find the right idea |
| 2 | `steps/step-02-brainstorm.md` | Brainstorm: generate 3-6 ideas, user chooses one |
| 3 | `steps/step-03-validate.md` | Validate: research, challenge, develop the idea |
| 4 | `steps/step-04-prd.md` | PRD: create Product Requirements Document |
| 5 | `steps/step-05-architecture.md` | Architecture: design technical stack on NowStack |
| 6 | `steps/step-06-tasks.md` | Tasks: split into actionable implementation tasks |
</step_files>

<workflow_diagram>

```
┌──────────────┐     ┌───────────────┐     ┌───────────────┐
│  Step 0      │────►│   Step 1      │────►│   Step 2      │
│  Initialize  │     │  Discovery    │     │  Brainstorm   │
└──────────────┘     └───────────────┘     └───────┬───────┘
                                                    │
                           ┌────────────────────────┘
                           │         ▲
                           ▼         │ (if not validated)
                     ┌───────────────┴─┐
                     │    Step 3       │
                     │   Validate      │
                     └────────┬────────┘
                              │ (if validated)
                              ▼
                     ┌───────────────┐     ┌───────────────┐
                     │   Step 4      │────►│   Step 5      │
                     │    PRD        │     │ Architecture  │
                     └───────────────┘     └───────┬───────┘
                                                    │
                                                    ▼
                                           ┌───────────────┐
                                           │   Step 6      │
                                           │    Tasks      │
                                           └───────────────┘
```

</workflow_diagram>

<output_structure>
When `{save_mode}` = true, creates:

```
~/.claude/output/saas/{project_id}/
├── discovery.md     # Discovery answers and insights
├── idea.md          # Validated idea with all details
├── prd.md           # Product Requirements Document
├── archi.md         # Technical Architecture (NowStack-aware)
├── marketing.md     # Marketing strategy notes
└── tasks/           # Implementation tasks
    ├── 01-setup.md
    ├── 02-auth.md
    ├── ...
```

</output_structure>

<success_criteria>

- Discovery questions answered and insights captured
- 3-6 validated SaaS ideas generated
- One idea selected and validated against market
- PRD created with clear problem, solution, and user stories
- Technical architecture defined on NowStack (TanStack Start + Convex + Better Auth)
- Implementation tasks broken down and prioritized for the NowStack codebase
- All outputs saved to `~/.claude/output/saas/{project-id}/`
- Project ready to start implementation via `/init-project` or APEX
  </success_criteria>

<references>
**Local References (in `references/` folder):**
- `discovery-framework.md` - Mom Test + JTBD for idea discovery
- `challenge-framework.md` - Smart validation for indie hackers
- `prd-template.md` - Amazon + Lenny PRD frameworks
- `architecture-template.md` - Architecture patterns on NowStack
- `tools.md` - NowStack tech stack reference
- `task-template.md` - Task file structure

**Scripts:**

- `scripts/setup.sh <project_id>` - Creates output folder structure
- `scripts/rename-project.sh <old> <new>` - Renames project and updates all project_id references

**Base Project:**

- The current repository is the **NowStack** boilerplate. Use its conventions in `.agents/rules/` and `AGENTS.md` when generating architecture and tasks.
  </references>
