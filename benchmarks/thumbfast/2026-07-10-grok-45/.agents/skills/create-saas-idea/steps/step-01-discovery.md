---
name: step-01-discovery
description: Ask discovery questions to find the right SaaS idea based on user's experience
prev_step: steps/step-00-init.md
next_step: steps/step-02-brainstorm.md
---

# Step 1: Idea Discovery

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER suggest ideas in this step - only gather information
- 🛑 NEVER ask all questions at once - ONE category at a time!
- ✅ ALWAYS respond in `{user_language}` detected in step 0
- ✅ Be flexible with answers - don't force the user
- 📋 YOU ARE A curious interviewer, not a business advisor (yet)
- 💬 FOCUS on gathering context about user's experiences
- 🚫 FORBIDDEN to brainstorm or evaluate ideas in this step

## EXECUTION PROTOCOLS:

- 🎯 **ONE CATEGORY AT A TIME** - Ask category 1, wait for response, then category 2, etc.
- 💾 Store all answers in `{discovery_answers}` for step 2
- 📖 Go through all 5 question categories progressively
- ✅ Move on when user has shared enough

## CONTEXT BOUNDARIES:

- Variables from step-00: `{project_id}`, `{save_mode}`, `{auto_mode}`, `{user_language}`, `{output_dir}`
- Don't assume knowledge about user's background
- User is building on top of the NowStack boilerplate (TanStack Start + Convex + Better Auth + Stripe + Resend + Cloudflare R2)
- Goal: SaaS that can be built in <2 weeks with 1 core feature

## YOUR TASK:

Gather rich context about user's experiences, pain points, and tool usage to fuel the brainstorming phase.

---

## REFERENCE:

Load `../references/discovery-framework.md` for:
- The Mom Test questions and rules
- Jobs to Be Done (JTBD) interview framework
- The Magic Questions for deep discovery
- Red flags vs green flags

---

## DISCOVERY FLOW:

```
Introduction → Category 1 → wait → Category 2 → wait → ... → Category 5 → Summary
```

**CRITICAL: Send ONE category, wait for user response, then send next category.**

---

## STEP 1: Introduction

**Display in `{user_language}`:**
```
🔍 Let's find YOUR perfect SaaS idea!

The goal is to create a project that solves YOUR OWN problem.

I'll ask you 5 quick questions, one at a time. Ready?
```

**Then immediately ask Category 1 (in same message).**

---

## QUESTION CATEGORIES (ask ONE at a time):

### Category 1: Manual Tasks to Automate

**Question:**
> **What tasks do you do manually that could be automated with an app?**
>
> Examples:
> - Creating content on multiple platforms and publishing to each one separately
> - Managing accounting at the end of the month
> - Translating large amounts of text with AI
> - Scheduling social media posts manually
> - Tracking expenses in a spreadsheet
>
> Give me 3 examples:

**Store answers in:** `{discovery_answers.manual_tasks}`

### Category 2: Work/School Pain Points

**Question:**
> **If you have experience in a company or school: what tasks were done manually that took too much time?**
>
> Examples:
> - Teachers uploading grades to administration is complicated, we never get our grades on time
> - Customer service struggles to find user information quickly
> - Using an old WordPress plugin to manage appointments with psychiatrists
> - Onboarding new employees takes forever with manual processes
> - Tracking project progress across teams
>
> Give me 3 examples:

**Store answers in:** `{discovery_answers.work_pain_points}`

### Category 3: Paid Tools You Use

**Question:**
> **Have you paid for a tool recently? Why? And could you rebuild it simpler?**
>
> Examples:
> - I pay for MailerLite to manage emails but only use 3 features
> - I pay for Typefully only to schedule Twitter posts
> - I pay for Senja just to collect reviews for my course
> - I pay for Notion just for one specific workflow
> - I pay for Calendly but could use something simpler
>
> Give me 3 examples:

**Store answers in:** `{discovery_answers.paid_tools}`

### Category 4: Community Problems

**Question:**
> **Are you active in any community? (Slack, Discord, Reddit...) What problems do they have?**
>
> Examples:
> - I'm a member of a golf club and we struggle to track scores
> - I'm in a LinkedIn community and we'd like a way to automatically support each other's posts
> - I'm in a Bali community for playing Paddle but the app is really bad
> - My Discord server has no good way to organize events
> - Our running club has no good way to track group runs
>
> Give me 3 examples:

**Store answers in:** `{discovery_answers.community_problems}`

### Category 5: Complex Spreadsheets/Notion

**Question:**
> **Do you have a complex Google Sheet, Notion, or other system you could turn into an app?**
>
> Examples:
> - I use Notion to manage my content planning
> - I use Google Sheets to manage my accounting
> - I use Google Docs to manage copywriting
> - I have a spreadsheet tracking all my subscriptions
> - I use Airtable as a makeshift CRM
>
> Give me 3 examples:

**Store answers in:** `{discovery_answers.spreadsheet_tools}`

---

## BONUS QUESTIONS (for users who built projects before):

**First, check if user has previous project experience:**
Use AskUserQuestion:
```yaml
questions:
  - header: "Experience"
    question: "Have you already built a web application or SaaS project before?"
    options:
      - label: "Yes, I've built something"
        description: "I have experience building web apps"
      - label: "No, this is my first"
        description: "I'm new to building web applications"
    multiSelect: false
```

**If YES, ask these bonus questions:**

> **When building your previous project:**
> - Did you need an API or service that didn't exist or was too expensive?
> - What parts of the development were the most frustrating?
> - What would you build differently next time?

**Store in:** `{discovery_answers.previous_project_insights}`
**Set:** `{has_previous_project}` = true

---

## EXECUTION SEQUENCE:

### Message 1: Introduction + Category 1
- Display intro
- Ask Category 1 (Manual Tasks)
- **STOP and wait for user response**

### Message 2: Category 2
- Acknowledge their answer briefly
- Ask Category 2 (Work Pain Points)
- **STOP and wait for user response**

### Message 3: Category 3
- Acknowledge their answer briefly
- Ask Category 3 (Paid Tools)
- **STOP and wait for user response**

### Message 4: Category 4
- Acknowledge their answer briefly
- Ask Category 4 (Community Problems)
- **STOP and wait for user response**

### Message 5: Category 5
- Acknowledge their answer briefly
- Ask Category 5 (Spreadsheets)
- **STOP and wait for user response**

### Message 6: Summary

**Display summary in `{user_language}`:**
```
📝 **Great! Here's what I've learned about you:**

**Manual tasks you'd like to automate:**
- {answer1}
- {answer2}
- ...

**Pain points from work/school:**
- {answer1}
- ...

**Tools you pay for:**
- {answer1}
- ...

**Community problems:**
- {answer1}
- ...

**Spreadsheet/Notion systems:**
- {answer1}
- ...

{If has_previous_project:}
**Insights from previous projects:**
- {answer1}
- ...
```

### 7. Save to discovery.md (if save_mode)

**Update `{output_dir}/discovery.md` with all answers:**
```markdown
---
project_id: {project_id}
updated: {timestamp}
---

# Discovery Notes

## User Context
{Brief description of who the user is based on their answers}

## Discovery Answers

### Manual Tasks
{list all answers from category 1}

### Work/School Pain Points
{list all answers from category 2}

### Paid Tools
{list all answers from category 3}

### Community Problems
{list all answers from category 4}

### Spreadsheet Systems
{list all answers from category 5}

### Previous Project Insights
{list answers if applicable}

## Key Insights
{Patterns noticed across the answers - what problems keep coming up?}

## Selected Direction
*To be filled in step 2 after brainstorming*
```

### 6. Proceed to Brainstorm

**If `{auto_mode}` = true:**
→ Load step-02-brainstorm.md immediately

**If `{auto_mode}` = false:**
Use AskUserQuestion:
```yaml
questions:
  - header: "Continue"
    question: "I have enough context to brainstorm ideas. Ready to see what we can build?"
    options:
      - label: "Show me ideas! (Recommended)"
        description: "Proceed to brainstorming phase"
      - label: "I have more to add"
        description: "Let me add more context first"
    multiSelect: false
```

---

## SUCCESS METRICS:

✅ All 5 question categories asked
✅ At least 1 answer per category received
✅ Previous project experience checked
✅ All answers stored in `{discovery_answers}`
✅ Summary shown to user for confirmation
✅ Answers saved to idea.md (if save_mode)

## FAILURE MODES:

❌ Suggesting or evaluating ideas during discovery
❌ Proceeding with empty categories
❌ Not asking bonus questions when user has previous project
❌ **CRITICAL**: Not responding in user's detected language
❌ **CRITICAL**: Not using AskUserQuestion for confirmations

## DISCOVERY PROTOCOLS:

- Be encouraging - no answer is "too small"
- Ask follow-up questions if answers are vague
- Look for patterns across categories
- Store everything - more context = better brainstorming
- Keep the conversation flowing naturally

---

## NEXT STEP:

After user confirms via AskUserQuestion, load `./step-02-brainstorm.md`

<critical>
Remember: This step is ONLY about gathering information - don't evaluate or suggest ideas yet!
</critical>
