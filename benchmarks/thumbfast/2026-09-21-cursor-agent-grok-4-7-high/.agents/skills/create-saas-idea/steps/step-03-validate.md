---
name: step-03-validate
description: Research, challenge, and fully develop the selected idea with honest assessment
prev_step: steps/step-02-brainstorm.md
next_step: steps/step-04-prd.md
---

# Step 3: Idea Validation & Development

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER sugarcoat - be brutally honest about weaknesses
- ✅ ALWAYS do web research for competitors
- ✅ ALWAYS respond in `{user_language}`
- 📋 YOU ARE A skeptical business analyst, not a cheerleader
- 💬 FOCUS on validating whether this idea is worth building
- 🚫 FORBIDDEN to proceed to PRD if idea isn't validated

## EXECUTION PROTOCOLS:

- 🎯 Research competitors FIRST using web search
- 💾 Challenge every assumption about the idea
- 📖 Ask clarifying questions with AskUserQuestion
- 🚫 FORBIDDEN to load step-04 until user explicitly validates the idea

## CONTEXT BOUNDARIES:

- Variables from previous steps: `{selected_idea}`, `{discovery_answers}`, `{user_language}`, `{output_dir}`, `{save_mode}`
- User is a solo indie hacker without funding or marketing budget
- MVP must be buildable in <2 weeks
- Target: Ship fast, learn from real users, iterate

## REFERENCE:

Load `../references/challenge-framework.md` for:
- Quick Sanity Check (5 questions)
- Speed Mode vs Thorough Mode validation
- Competitor research approach
- Viability scoring system
- Indie hacker mindset

## YOUR TASK:

Research competitors, challenge assumptions, develop all idea details, and get user validation before proceeding.

---

## VALIDATION FRAMEWORK:

### Phase 1: Competitor Research

**Use web search to find:**
- Direct competitors (same problem, same solution)
- Indirect competitors (same problem, different solution)
- Search queries:
  - "{problem} tool"
  - "{solution} software"
  - "{target user} platform"
  - Alternative.to, Product Hunt, Y Combinator

**For each competitor, document:**
| Field | Description |
|-------|-------------|
| Name | Company/product name |
| URL | Website |
| What they do | Brief description |
| Pricing | Free/Freemium/Paid (price if known) |
| Traction signals | Funding, team size, reviews |
| Positioning | How they position themselves |

**Find at least 3-5 competitors**

### Phase 2: Market Assessment

**Saturation level:**
- 10+ competitors = 🔴 Crowded (need strong differentiation)
- 3-9 competitors = 🟡 Moderate (validated demand, need positioning)
- 1-2 competitors = 🟢 Sparse (early market or weak demand)
- 0 competitors = ⚠️ Usually means no market

**Revenue signals:**
- Do people PAY for similar solutions?
- What price points exist in this market?
- Is there proof of willingness to pay?

### Phase 3: Idea Development

**Develop all aspects of the idea:**

| Aspect | Question to Answer |
|--------|-------------------|
| **Potential Names** | 3-5 name options for the app |
| **Business Model** | Subscription / One-time / Usage-based - with price range |
| **Target Sector** | B2B / B2C / Both |
| **Code Complexity** | 🟢/🟡/🔴 - honest assessment with Claude Code |
| **Marketing Complexity** | 🟢/🟡/🔴 - honest for solo dev without budget |
| **Main Marketing Channel** | Best channel to reach target users |
| **Customer Avatar** | Detailed description of ideal customer |
| **Unique Value Prop** | What makes this different from competitors |

### Phase 4: Clarifying Questions

**Use AskUserQuestion to clarify important aspects:**

```yaml
questions:
  - header: "Target"
    question: "Who is your primary target customer for this idea?"
    options:
      - label: "Individuals (B2C)"
        description: "Regular people for personal use"
      - label: "Small businesses"
        description: "Freelancers, solopreneurs, small teams"
      - label: "Companies (B2B)"
        description: "Larger organizations with budgets"
    multiSelect: false
```

```yaml
questions:
  - header: "Pricing"
    question: "What business model feels right for this idea?"
    options:
      - label: "Subscription (Recommended)"
        description: "Monthly/yearly recurring revenue"
      - label: "One-time purchase"
        description: "Pay once, use forever"
      - label: "Usage-based"
        description: "Pay per use (API calls, exports, etc.)"
      - label: "Freemium"
        description: "Free tier + paid upgrades"
    multiSelect: false
```

```yaml
questions:
  - header: "Marketing"
    question: "How would you reach your first customers?"
    options:
      - label: "Social media (Twitter, LinkedIn)"
        description: "Build in public, share progress"
      - label: "Communities (Discord, Reddit)"
        description: "Engage in relevant communities"
      - label: "Content marketing"
        description: "Blog posts, tutorials, SEO"
      - label: "Direct outreach"
        description: "Contact potential users directly"
    multiSelect: true
```

---

## EXECUTION SEQUENCE:

### 1. Research Competitors

**Use web search to find competitors:**
```
Search: "{selected_idea.problem} tool"
Search: "{selected_idea.solution} software"
Search: "{selected_idea.sector} app"
```

**Present findings in `{user_language}`:**
```
🔍 Competitor Research for "{selected_idea.name}"

| Competitor | What They Do | Pricing | Traction |
|------------|--------------|---------|----------|
| {name1} | {description} | {pricing} | {signals} |
| {name2} | {description} | {pricing} | {signals} |

Market Assessment: {Crowded/Moderate/Sparse}
Revenue Proof: {Yes/No} - {evidence}
```

### 2. Challenge the Idea

**Be brutally honest in `{user_language}`:**
```
⚠️ The Hard Truth About This Idea:

What's ACTUALLY unique:
{what truly differentiates this, if anything}

What's NOT unique (competitors already do this):
{what user might think is unique but isn't}

Biggest challenges:
1. {challenge 1}
2. {challenge 2}
3. {challenge 3}

Risk assessment: {Low/Medium/High}
```

### 3. Ask Clarifying Questions

**Use AskUserQuestion for:**
- Target customer clarity
- Business model preference
- Marketing channel preference
- Feature prioritization

### 4. Develop Full Idea Profile

**Create comprehensive idea profile in `{user_language}`:**
```
📋 Validated Idea Profile: {selected_idea.name}

| Aspect | Decision |
|--------|----------|
| Name Options | {name1}, {name2}, {name3} |
| Tagline | {one-line description} |
| Business Model | {model} at {price range} |
| Target | {B2B/B2C} |
| Customer Avatar | {detailed avatar} |

Code Complexity: {rating}
- {reason 1}
- {reason 2}

Marketing Complexity: {rating}
- {reason 1}
- {reason 2}

Recommended Marketing Channels:
1. {channel 1} - {why}
2. {channel 2} - {why}

MVP Core Feature:
{THE ONE thing this MVP must do}

What's NOT in MVP:
- {excluded feature 1}
- {excluded feature 2}
```

### 5. Viability Score

**Give honest viability assessment in `{user_language}`:**
```
📊 Viability Score: {X}/10

{2-3 sentences explaining the score - be direct, no fluff}

Would I build this? {Yes/No/Maybe}
Why: {honest opinion}
```

### 6. Save to idea.md (if save_mode)

**Replace content in `{output_dir}/idea.md`:**
```markdown
---
project_id: {project_id}
status: validated
validated_at: {timestamp}
viability_score: {X}/10
stepsCompleted: [0, 1, 2, 3]
---

# {selected_idea.name}

**Tagline:** {tagline}

## Overview

| Aspect | Value |
|--------|-------|
| Business Model | {model} |
| Target | {B2B/B2C} |
| Pricing | {price range} |
| Code Complexity | {rating} |
| Marketing Complexity | {rating} |
| Viability Score | {X}/10 |

## Customer Avatar

{detailed customer description}

## Competitor Landscape

| Competitor | What They Do | Pricing |
|------------|--------------|---------|
{competitor table}

**Market Assessment:** {assessment}

## Unique Value Proposition

{what makes this different}

## MVP Core Feature

{THE ONE feature}

## Marketing Strategy

{channels and approach}

## Challenges & Risks

{honest assessment}

---
*Validated: {timestamp}*
```

### 7. User Validation Decision

Use AskUserQuestion:
```yaml
questions:
  - header: "Validate"
    question: "Do you want to proceed with this idea and create the PRD?"
    options:
      - label: "Yes, let's build it! (Recommended)"
        description: "Proceed to PRD creation"
      - label: "I want to modify the idea"
        description: "Let me adjust some aspects"
      - label: "No, show me other ideas"
        description: "Go back to brainstorming"
    multiSelect: false
```

**Handle responses:**
- **Yes:** Set `{validated_idea}` = full idea profile, proceed to step-04
- **Modify:** Ask what to change, iterate on this step
- **No:** Return to step-02-brainstorm.md

---

## SUCCESS METRICS:

✅ At least 3 competitors researched with web search
✅ Market assessment provided (crowded/moderate/sparse)
✅ All idea aspects developed (name, model, avatar, etc.)
✅ Honest viability score given
✅ User validated the idea explicitly
✅ Full idea profile saved to idea.md (if save_mode)

## FAILURE MODES:

❌ Not doing web search for competitors
❌ Being too positive without honest criticism
❌ Proceeding without user explicitly validating
❌ Missing key aspects of idea development
❌ **CRITICAL**: Not using AskUserQuestion for validation decision
❌ **CRITICAL**: Not responding in user's detected language

## VALIDATION PROTOCOLS:

- Be brutally honest - users need truth
- Use evidence from research, not opinions
- Don't skip competitor research
- Challenge claims of "no competitors"
- Focus on whether people actually PAY for solutions
- If viability is low, recommend pivoting

---

## NEXT STEP:

**If validated:** Load `./step-04-prd.md`
**If needs modification:** Stay in step-03, iterate
**If rejected:** Load `./step-02-brainstorm.md`

<critical>
Remember: Never proceed to PRD if user hasn't explicitly validated the idea!
If viability is truly poor (3/10 or below), recommend going back to brainstorming.
</critical>
