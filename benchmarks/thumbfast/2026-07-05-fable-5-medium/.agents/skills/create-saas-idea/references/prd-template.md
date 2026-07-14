# Elite PRD Framework

The ultimate framework for Product Requirements Documents.
Combines: **Amazon's Working Backwards** + **Lenny Rachitsky's 1-Pager** + **Shape Up Pitch**.

---

## PRD Philosophy

> "If you can't explain it simply, you don't understand it well enough."
> — Einstein

### The 3 Principles of Great PRDs:

1. **Problem Before Solution** — Force understanding of WHY before WHAT
2. **Explicit Non-Goals** — Define what you WON'T build to prevent scope creep
3. **Living Document** — Update as you learn, not a static spec

---

## The PRD Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                  1. THE PROBLEM                     │  ← Start here
│            (Why does this need to exist?)           │
├─────────────────────────────────────────────────────┤
│                  2. THE CUSTOMER                    │  ← Who exactly?
│            (Specific, named persona)                │
├─────────────────────────────────────────────────────┤
│                  3. THE VALUE PROP                  │  ← Why they'd pay
│            (One sentence, compelling)               │
├─────────────────────────────────────────────────────┤
│                  4. SUCCESS METRICS                 │  ← How you'll know
│            (Quantifiable, time-bound)               │
├─────────────────────────────────────────────────────┤
│                  5. THE SOLUTION                    │  ← Finally, what to build
│            (Features, flows, scope)                 │
└─────────────────────────────────────────────────────┘
```

---

## Framework 1: Amazon's Working Backwards (PR/FAQ)

### The Concept

Write the **press release** and **FAQ** as if the product already launched successfully. This forces clarity on:
- Who cares about this?
- What's the headline benefit?
- What questions will people ask?

### Template

```markdown
# [PRODUCT NAME] Launch Press Release

## Headline
[City, Date] — [Company] today announced [Product], [one-sentence benefit].

## First Paragraph (The Hook)
[Product] helps [target customer] [accomplish goal] by [unique approach].
Unlike [alternatives], [Product] [key differentiator].

## Problem Statement
[2-3 sentences on the problem. Include customer quote if possible.]

> "Before [Product], I had to [painful current state]. Now I can [desired outcome]."
> — [Persona Name], [Role]

## Solution Overview
[Product] provides [core capability] through [how it works].
Key features include:
- [Feature 1]: [Benefit]
- [Feature 2]: [Benefit]
- [Feature 3]: [Benefit]

## Customer Quote
> "[Compelling testimonial about the transformation]"
> — [Early Adopter Name], [Company/Role]

## Getting Started
[Product] is available now at [price]. To get started, [simple action].

---

# FAQ

## External FAQ (Customers Would Ask)

**Q: How is this different from [Competitor]?**
A: [Clear differentiation]

**Q: How much does it cost?**
A: [Pricing model and specific numbers]

**Q: How long does it take to get value?**
A: [Time to first value]

**Q: What if I need help?**
A: [Support approach]

## Internal FAQ (Stakeholders Would Ask)

**Q: Why now?**
A: [Timing rationale]

**Q: What are we NOT building?**
A: [Explicit scope boundaries]

**Q: What are the biggest risks?**
A: [Top 3 risks and mitigations]

**Q: How will we measure success?**
A: [Specific metrics and targets]
```

---

## Framework 2: Lenny Rachitsky's 1-Pager

### The Concept

Everything fits on ONE PAGE. Ruthlessly prioritized. Forces clarity.

### Template

```markdown
# [Product Name] — 1-Pager

## Problem Statement (2-3 sentences)
[Who] struggles with [what problem] because [root cause].
This results in [negative outcome] and costs them [quantified impact].

## Target User
**Persona:** [Specific name and role]
**Characteristics:** [3-5 bullets]
**Current Solution:** [How they handle it today]
**Switching Motivation:** [What would make them switch]

## Value Proposition (1 sentence)
[Product] helps [target user] [achieve outcome] by [unique mechanism].

## Core Features (Max 3)
| Feature | User Benefit | Success Metric |
|---------|--------------|----------------|
| [Feature 1] | [Why they care] | [How to measure] |
| [Feature 2] | [Why they care] | [How to measure] |
| [Feature 3] | [Why they care] | [How to measure] |

## Non-Goals (Explicit)
- ❌ [What we're NOT building and why]
- ❌ [What we're NOT building and why]
- ❌ [What we're NOT building and why]

## Success Metrics
| Metric | Current | Target | Timeframe |
|--------|---------|--------|-----------|
| [Metric 1] | [Baseline] | [Goal] | [When] |
| [Metric 2] | [Baseline] | [Goal] | [When] |

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | H/M/L | H/M/L | [How to address] |
| [Risk 2] | H/M/L | H/M/L | [How to address] |
```

---

## Framework 3: Shape Up Pitch

### The Concept

From Basecamp's methodology. Focus on **appetite** (how much time you're willing to spend) and **shaped solution** (concrete enough to build, rough enough to adapt).

### Template

```markdown
# [Feature] Pitch

## Problem
[Raw idea or use case in 1-2 sentences]

## Appetite
**Time budget:** [X weeks/days]
**Team:** [Who's working on this]

## Solution
[Sketchy but specific solution — enough to start, not so much it's prescriptive]

### Key Elements
- [Element 1]: [What it does]
- [Element 2]: [What it does]
- [Element 3]: [What it does]

### Fat Marker Sketch
[Low-fidelity wireframe or flow description]

## Rabbit Holes (Risks)
- [Potential complexity 1] — Solution: [How to avoid]
- [Potential complexity 2] — Solution: [How to avoid]

## No-Gos
- [Explicit thing we're not doing]
- [Explicit thing we're not doing]
```

---

## The Complete SaaS PRD Template

Combining all frameworks into one comprehensive template:

```markdown
---
product: [Product Name]
version: 1.0
author: [Name]
created: [Date]
status: [Draft/In Review/Approved]
---

# [Product Name] — Product Requirements Document

## 1. Executive Summary

### The One-Liner
[Product] helps [target user] [achieve outcome] by [unique approach].

### Why Now?
[2-3 sentences on timing — why this opportunity exists today]

### Success Looks Like
- [Primary metric]: [Target] by [Date]
- [Secondary metric]: [Target] by [Date]

---

## 2. Problem Definition

### Problem Statement
[Who] struggles with [what problem] because [root cause].

**Current State:**
- [Pain point 1] — [Frequency/severity]
- [Pain point 2] — [Frequency/severity]
- [Pain point 3] — [Frequency/severity]

**Cost of Problem:**
- Time: [Hours/week wasted]
- Money: [$ lost or spent on workarounds]
- Emotion: [Frustration, stress, etc.]

### Evidence
- [Interview quote or data point 1]
- [Interview quote or data point 2]
- [Market research finding]

---

## 3. Target User

### Primary Persona: [Name]

**Demographics:**
- Role: [Job title or life situation]
- Context: [Where/when they encounter problem]
- Tech savvy: [Low/Medium/High]

**Psychographics:**
- Goals: [What they want to achieve]
- Fears: [What they want to avoid]
- Values: [What matters to them]

**Behavioral:**
- Current solution: [How they handle it today]
- Spending: [What they pay for alternatives]
- Switching motivation: [What would make them switch]

### Jobs to Be Done

**When** [situation/trigger]
**I want to** [motivation/goal]
**So I can** [expected outcome]

---

## 4. Solution Overview

### Value Proposition
[One sentence: what we do, for whom, that's different]

### Core Feature: [Feature Name] ⭐

**What it does:**
[2-3 sentences]

**Why it matters:**
[User benefit, not feature description]

**Success metric:**
[How we know it's working]

### Supporting Features

| Feature | Description | Priority | Success Metric |
|---------|-------------|----------|----------------|
| [Feature 2] | [What it does] | P1 | [Metric] |
| [Feature 3] | [What it does] | P1 | [Metric] |
| [Feature 4] | [What it does] | P2 | [Metric] |

---

## 5. User Flows

### Primary Flow: [Name]

```
1. User [action] → System [response]
   ↓
2. User [action] → System [response]
   ↓
3. User [action] → System [response]
   ↓
4. ✅ [Outcome achieved]
```

### Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| [Edge case 1] | [How to handle] |
| [Edge case 2] | [How to handle] |

---

## 6. Non-Goals (Explicit Scope Boundaries)

**We are NOT building:**

- ❌ [Feature/capability 1]
  - *Reason:* [Why it's out of scope]
  - *Revisit:* [When/if to reconsider]

- ❌ [Feature/capability 2]
  - *Reason:* [Why it's out of scope]
  - *Revisit:* [When/if to reconsider]

- ❌ [Feature/capability 3]
  - *Reason:* [Why it's out of scope]
  - *Revisit:* [When/if to reconsider]

---

## 7. Success Metrics

### Primary Metrics (Week 1-4)

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| [Activation] | [What counts] | [Number] | [How to track] |
| [Engagement] | [What counts] | [Number] | [How to track] |

### Secondary Metrics (Month 2+)

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| [Retention] | [What counts] | [Number] | [How to track] |
| [Revenue] | [What counts] | [Number] | [How to track] |

### Anti-Metrics (What We Don't Want)

- [Metric that would indicate wrong direction]
- [Vanity metric we're not optimizing for]

---

## 8. Risks & Assumptions

### Assumptions (To Validate)

| Assumption | Validation Method | Status |
|------------|-------------------|--------|
| [Assumption 1] | [How to test] | ⬜ |
| [Assumption 2] | [How to test] | ⬜ |

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Technical risk] | H/M/L | H/M/L | [Plan] |
| [Market risk] | H/M/L | H/M/L | [Plan] |
| [Execution risk] | H/M/L | H/M/L | [Plan] |

---

## 9. Open Questions

- [ ] [Question needing resolution] — Owner: [Name]
- [ ] [Question requiring validation] — Owner: [Name]
- [ ] [Decision pending input] — Owner: [Name]

---

## 10. Appendix

### Competitive Landscape
[Brief competitor summary or link to detailed analysis]

### User Research
[Link to interview notes or key findings]

### Technical Considerations
[Link to architecture doc or key constraints]
```

---

## PRD Best Practices

### Writing Quality

| Do | Don't |
|----|-------|
| Use specific numbers | Use vague qualifiers ("better", "faster") |
| Include user quotes | Assume motivations |
| Define success metrics | Leave success undefined |
| List explicit non-goals | Let scope creep happen |
| Update as you learn | Treat as static document |

### Common Mistakes

❌ **Feature list without priorities** — Everything can't be P0
❌ **No success metrics** — How do you know if it worked?
❌ **Missing non-goals** — Scope creep will kill you
❌ **Vague user description** — "Small businesses" isn't specific
❌ **Solution before problem** — Understand WHY first
❌ **Too long** — If it's over 5 pages, no one will read it

### Review Checklist

Before finalizing, confirm:

- [ ] Problem is clearly stated with evidence
- [ ] Target user is specific enough to name individuals
- [ ] Value prop fits in one sentence
- [ ] Features are prioritized (P0, P1, P2)
- [ ] Non-goals are explicit
- [ ] Success metrics are quantified with targets
- [ ] Major risks are identified with mitigations
- [ ] Open questions are listed with owners
