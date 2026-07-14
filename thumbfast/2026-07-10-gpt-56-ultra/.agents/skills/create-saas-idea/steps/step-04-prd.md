---
name: step-04-prd
description: Create the Product Requirements Document from validated idea
prev_step: steps/step-03-validate.md
next_step: steps/step-05-architecture.md
---

# Step 4: PRD Creation

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER write PRD without completing ALL information gathering
- ✅ ALWAYS use the validated idea profile from step 3
- ✅ ALWAYS respond in `{user_language}`
- 📋 YOU ARE A product manager, creating a focused MVP spec
- 💬 FOCUS on essential features only - max 3-5 must-haves
- 🚫 FORBIDDEN to include nice-to-haves in MVP features

## EXECUTION PROTOCOLS:

- 🎯 Ask clarifying questions BEFORE writing the PRD
- 💾 PRD should be 2-3 pages max, not a 20-page spec
- 📖 Every feature needs: Description, User Value, Success Metric
- 🚫 FORBIDDEN to load step-05 until PRD is validated by user

## CONTEXT BOUNDARIES:

- Variables from previous steps: `{validated_idea}`, `{discovery_answers}`, `{user_language}`, `{output_dir}`, `{save_mode}`
- User is building MVP in <2 weeks
- Focus on THE ONE core feature + 2-3 supporting features max

## REFERENCE:

Load `../references/prd-template.md` for:
- Amazon's Working Backwards PR/FAQ approach
- Lenny Rachitsky's 1-Pager format
- Complete SaaS PRD Template
- Best practices and common mistakes

## YOUR TASK:

Create a focused, actionable Product Requirements Document that defines exactly what to build for the MVP.

---

## PRD FRAMEWORK:

### Phase 1: Information Gathering

**Before writing PRD, ensure we have answers for ALL 5 areas:**

#### Area 1: Problem & Vision
- ✅ What problem does this product solve?
- ✅ Who experiences this problem most acutely?
- ✅ What makes this solution unique or different?
- ✅ What does success look like?

*Most should be available from `{validated_idea}`*

#### Area 2: Target Users
- ✅ Primary user persona (from customer avatar)
- ✅ Key characteristics (role, context, pain points)
- ✅ What motivates them to use this product?
- ✅ What would make them stop using it?

#### Area 3: Core Features
Use AskUserQuestion to clarify:
```yaml
questions:
  - header: "Core"
    question: "What is THE ONE thing your product absolutely must do?"
    options:
      - label: "{feature from validated_idea}"
        description: "The main feature we identified"
      - label: "Something else"
        description: "I want to define a different core feature"
    multiSelect: false
```

```yaml
questions:
  - header: "Support"
    question: "What 2-3 features support this core capability? (Select up to 3)"
    options:
      - label: "User authentication"
        description: "Login, signup, account management"
      - label: "Dashboard/Overview"
        description: "Main view to see status/data"
      - label: "Data input/Import"
        description: "Way to add or import data"
      - label: "Export/Share"
        description: "Export results or share with others"
    multiSelect: true
```

#### Area 4: Success Metrics
```yaml
questions:
  - header: "Success"
    question: "How will you measure if your product is working?"
    options:
      - label: "User signups"
        description: "Number of people creating accounts"
      - label: "Active usage"
        description: "Daily/weekly active users"
      - label: "Conversions"
        description: "Free to paid conversions"
      - label: "Retention"
        description: "Users coming back after 7/30 days"
    multiSelect: true
```

#### Area 5: Constraints & Scope
```yaml
questions:
  - header: "Timeline"
    question: "What's your target for MVP completion?"
    options:
      - label: "1 week (Recommended)"
        description: "Minimal viable, ship fast"
      - label: "2 weeks"
        description: "Slightly more polished"
      - label: "1 month"
        description: "More complete but still MVP"
    multiSelect: false
```

---

## EXECUTION SEQUENCE:

### 1. Review Validated Idea

**Summarize what we know from step 3:**
```
📋 **Building PRD for: {validated_idea.name}**

**Core Problem:** {problem}
**Target User:** {customer_avatar}
**Business Model:** {model} at {price}
**Unique Value:** {uvp}

Let me ask a few more questions to complete the PRD...
```

### 2. Ask Missing Information

**Ask only questions not already answered in previous steps**

### 3. Generate PRD

**Create `{output_dir}/prd.md` with this structure:**

```markdown
---
project_id: {project_id}
created: {timestamp}
status: complete
stepsCompleted: [0, 1, 2, 3, 4]
---

# Product Requirements Document: {Product Name}

## Product Vision

**Problem Statement**
{2-3 sentences describing the core problem - be specific about who has it and when}

**Solution**
{2-3 sentences describing how this product solves it}

**Success Criteria**
- {Metric 1: quantitative measure} → Target: {number}
- {Metric 2: user behavior indicator} → Target: {number}
- {Metric 3: business outcome} → Target: {number}

## Target Users

### Primary Persona: {Name}

- **Role**: {User role/context}
- **Pain Points**:
  - {Pain point 1}
  - {Pain point 2}
  - {Pain point 3}
- **Motivations**: {What drives them to seek a solution}
- **Goals**: {What they want to accomplish}
- **Current Solution**: {How they handle this today}
- **Switching Cost**: {What would make them switch to your product}

## Core Features (MVP)

### Must-Have Features

#### 1. {Core Feature Name} ⭐ (Core)
**Description**: {What this feature does - 2-3 sentences. This is THE ONE thing your product must do.}
**User Value**: {Why this matters to users - specific benefit}
**Success Metric**: {How to measure if working}
**Priority**: P0 - Critical

#### 2. {Supporting Feature Name}
**Description**: {Feature explanation}
**User Value**: {Benefit to users}
**Success Metric**: {Measurement criteria}
**Priority**: P1 - Important

#### 3. {Supporting Feature Name}
**Description**: {Feature explanation}
**User Value**: {Benefit to users}
**Success Metric**: {Measurement criteria}
**Priority**: P1 - Important

### Should-Have Features (Post-MVP)
- {Feature 1}: {Brief description} - *Why deferred: {reason}*
- {Feature 2}: {Brief description} - *Why deferred: {reason}*
- {Feature 3}: {Brief description} - *Why deferred: {reason}*

## User Flows

### Primary User Journey

```
1. {User action} → {System response}
   ↓
2. {User action} → {System response}
   ↓
3. {User action} → {System response}
   ↓
4. {Outcome achieved}
```

### Authentication Flow
```
1. User lands on homepage
   ↓
2. Clicks "Sign up" / "Login"
   ↓
3. {Auth method - email/password, OAuth, magic link}
   ↓
4. Redirected to dashboard
```

## Out of Scope (v1)

**Explicitly NOT building in MVP:**
- ❌ {Feature/capability 1} - *Why: {reason}*
- ❌ {Feature/capability 2} - *Why: {reason}*
- ❌ {Feature/capability 3} - *Why: {reason}*

## Pages Required

| Page | Purpose | Features |
|------|---------|----------|
| Landing | Convert visitors | Hero, features, CTA |
| Auth | Login/Signup | {auth method} |
| Dashboard | Main interface | {core features} |
| Settings | User preferences | Profile, billing |

## Success Metrics

**Primary Metrics (Week 1-4)**:
- {Metric 1}: {Target}
- {Metric 2}: {Target}

**Secondary Metrics (Month 2+)**:
- {Metric 3}: {Target}

## Timeline

- **MVP Completion**: {target}
- **First User Testing**: {target}
- **Launch**: {target}

## Open Questions

- {Question 1 needing resolution}
- {Question 2 requiring validation}
```

### 4. Present Summary

**Display in `{user_language}`:**
```
📝 PRD Summary for {Product Name}

The ONE thing it does:
{core feature description}

Must-have features (MVP):
1. {feature 1}
2. {feature 2}
3. {feature 3}

NOT building in MVP:
- {excluded 1}
- {excluded 2}

Success looks like:
- {metric 1}
- {metric 2}

Target timeline: {timeline}
```

### 5. User Validation

Use AskUserQuestion:
```yaml
questions:
  - header: "Approve"
    question: "Does this PRD capture what you want to build?"
    options:
      - label: "Yes, let's proceed to architecture (Recommended)"
        description: "PRD is complete, move to technical design"
      - label: "I want to modify something"
        description: "Let me adjust some aspects"
      - label: "Start over"
        description: "This isn't right, go back to ideation"
    multiSelect: false
```

**Handle responses:**
- **Yes:** Proceed to step-05
- **Modify:** Ask what to change, iterate
- **Start over:** Return to step-02

---

## SUCCESS METRICS:

✅ All 5 information areas completed
✅ 1-3 must-have features defined with metrics
✅ Clear "Out of Scope" section
✅ User flows documented
✅ PRD saved to prd.md (if save_mode)
✅ User explicitly approved PRD

## FAILURE MODES:

❌ Including too many features (>5 must-haves)
❌ Vague feature descriptions without metrics
❌ No "Out of Scope" section
❌ Missing user flows
❌ **CRITICAL**: Not using AskUserQuestion for approval
❌ **CRITICAL**: Not responding in user's detected language

## PRD PROTOCOLS:

- Keep it to 2-3 pages max
- Every feature must have measurable success criteria
- Be ruthless about scope - less is more for MVP
- User flows should be simple and clear
- "Out of Scope" is as important as "In Scope"

---

## NEXT STEP:

After user approves PRD via AskUserQuestion, load `./step-05-architecture.md`

<critical>
Remember: A PRD with 3 well-defined features beats a PRD with 10 vague features.
Focus on THE ONE thing the product must do, then 2-3 supporting features max.
</critical>
