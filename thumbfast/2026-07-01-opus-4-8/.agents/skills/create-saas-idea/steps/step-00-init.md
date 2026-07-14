---
name: step-00-init
description: Initialize workflow - parse flags, detect language, create output folder structure
next_step: steps/step-01-discovery.md
---

# Step 0: Initialization

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER skip folder creation when save_mode is true
- ✅ ALWAYS detect user's language from their input
- 📋 YOU ARE A setup assistant, not an idea generator
- 💬 FOCUS on initialization only - don't start discovery yet
- 🚫 FORBIDDEN to ask idea questions in this step

## EXECUTION PROTOCOLS:

- 🎯 Parse arguments first, then create folders
- 💾 Create output structure: `~/.claude/output/saas/{project_id}/`
- 📖 Initialize all output files with frontmatter
- 🚫 FORBIDDEN to load step-01 until init complete

## CONTEXT BOUNDARIES:

- No previous context exists - this is the entry point
- User's language will be detected from their greeting/input
- All subsequent steps will respond in user's detected language

## YOUR TASK:

Initialize the SaaS creation workflow by parsing input, detecting language, and creating the output folder structure.

---

## DEFAULTS CONFIGURATION:

```yaml
save_mode: true    # -s: Save outputs to files (default ON)
auto_mode: false   # -a: Skip confirmations (default OFF)
base_output_dir: ~/.claude/output/saas
```

---

## INITIALIZATION SEQUENCE:

### 1. Parse Arguments and Flags

**Parse from user input:**
- `{project_name}` = first argument (optional)
- `{save_mode}` = true (default) | false if -S flag
- `{auto_mode}` = false (default) | true if -a flag
- `{continue_mode}` = false (default) | true if -c flag
- `{continue_project}` = project-id after -c flag

**Generate {project_id}:**
- If `-c <project-id>` → use that project-id
- If `{project_name}` provided → kebab-case it
- If nothing → use `01-to-be-defined`

### 2. Detect User Language

**Analyze user's input to detect language:**
- French indicators: "bonjour", "salut", "je", "un", "une", accents
- English indicators: "hello", "hi", "I", "a", "the"
- Default to English if unclear

**Store as `{user_language}`** for all subsequent responses

### 3. Handle Continue Mode OR Create New Project

**If `{continue_mode}` = true:**

1. Read all existing files from `~/.claude/output/saas/{continue_project}/`:
   - `discovery.md` → Load into context
   - `idea.md` → Load into context
   - `prd.md` → Load into context (if not empty)
   - `archi.md` → Load into context (if not empty)

2. Determine which step to resume from:
   - If `idea.md` is empty → Resume at step-01 (discovery)
   - If `idea.md` has content but `prd.md` empty → Resume at step-03 (validate) or step-04 (prd)
   - If `prd.md` has content but `archi.md` empty → Resume at step-05 (architecture)
   - If `archi.md` has content → Resume at step-06 (tasks)

3. Display in `{user_language}`:
   ```
   📂 Loaded project: {continue_project}

   Found:
   - discovery.md: {status}
   - idea.md: {status}
   - prd.md: {status}
   - archi.md: {status}

   Resuming from: {step_name}
   ```

**If `{continue_mode}` = false (new project):**

Run setup script with Bash tool (path is relative to this skill folder):
```bash
.agents/skills/create-saas-idea/scripts/setup.sh {project_id}
```

### 4. Confirm Initialization

**Display in `{user_language}`:**
```
✅ SaaS Creation Workflow Initialized

📁 Output folder: ~/.claude/output/saas/{project_id}/
📄 Files created: idea.md, prd.md, archi.md, marketing.md

⚙️ Configuration:
- Save mode: {save_mode}
- Auto mode: {auto_mode}

Ready to start the discovery phase!
```

### 5. Proceed to Discovery

**If `{auto_mode}` = true:**
→ Load step-01-discovery.md immediately

**If `{auto_mode}` = false:**
Use AskUserQuestion:
```yaml
questions:
  - header: "Start"
    question: "Ready to start discovering your SaaS idea?" # Translate to user's language
    options:
      - label: "Let's go! (Recommended)"
        description: "Start the discovery phase"
      - label: "Change settings"
        description: "Modify configuration before starting"
    multiSelect: false
```

---

## SUCCESS METRICS:

✅ User language correctly detected
✅ Project ID generated or parsed
✅ Output folder created (if save_mode)
✅ All 4 output files created with proper frontmatter
✅ Configuration confirmed with user

## FAILURE MODES:

❌ Proceeding without creating output folder when save_mode is true
❌ Not detecting user language
❌ Starting to ask discovery questions in this step
❌ **CRITICAL**: Not using AskUserQuestion for confirmation

## INIT PROTOCOLS:

- Always respond in the detected user language
- Keep initialization message concise
- Don't overwhelm with technical details
- Focus on getting ready to start, not on the SaaS idea itself

---

## NEXT STEP:

After user confirms via AskUserQuestion, load `./step-01-discovery.md`

<critical>
Remember: This step is ONLY about setup - don't start asking about SaaS ideas here!
</critical>
