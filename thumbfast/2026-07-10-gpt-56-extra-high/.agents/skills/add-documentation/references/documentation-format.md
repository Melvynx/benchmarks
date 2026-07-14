# Documentation Format Reference

Complete guide for creating documentation in NowStack.

## File Location

All documentation files go in `content/docs/` with `.mdx` extension.

```
content/docs/
├── getting-started.mdx      # Guide subcategory
├── dialog-manager.mdx       # Components subcategory
├── api-testimonials-*.mdx   # API subcategory
└── your-new-doc.mdx         # Add new docs here
```

## Complete Frontmatter Example

```mdx
---
title: "Dialog Manager"
description: "Global dialog system for confirmation, input, and custom modals with automatic loading states"
keywords: ["dialog", "modal", "confirmation", "components"]
tags: ["developer", "components"]
order: 5
subcategory: "Components"
---
```

### Field Descriptions

| Field | Type | Required | Example | Description |
|-------|------|----------|---------|-------------|
| `title` | `string` | Yes | `"Dialog Manager"` | H1 title displayed on the page |
| `description` | `string` | Yes | `"Global dialog system..."` | SEO description, shown in search results |
| `keywords` | `string[]` | Yes | `["dialog", "modal"]` | Search keywords for discovery |
| `tags` | `string[]` | Yes | `["developer", "components"]` | Categories for filtering |
| `order` | `number` | Yes | `5` | Sort order in sidebar (lower = higher) |
| `subcategory` | `string` | Yes | `"Components"` | Grouping in navigation |

### Subcategories

| Subcategory | Use For | Order Range |
|-------------|---------|-------------|
| `Guide` | Getting started, tutorials, workflows | 1-10 |
| `Components` | UI components, dialog system | 11-50 |
| `API` | REST endpoints, Convex functions/actions | 51-80 |
| `Tools` | CLI, development utilities | 81-99 |

### Tags

| Tag | Description |
|-----|-------------|
| `developer` | For developers building with NowStack |
| `guide` | Tutorial or walkthrough content |
| `api` | API reference documentation |
| `components` | UI component documentation |
| `basics` | Foundational concepts |

## Document Structure Template

```mdx
---
title: "Feature Name"
description: "One-line description of the feature"
keywords: ["keyword1", "keyword2"]
tags: ["developer", "components"]
order: 15
subcategory: "Components"
---

One paragraph introduction explaining:
- What this feature does
- Why it's useful
- When to use it

## Installation

Skip if feature is built-in. Otherwise:

\`\`\`bash
pnpm add package-name
\`\`\`

Or explain configuration needed.

## Import

\`\`\`tsx
import { Feature } from "@/features/feature-name";
\`\`\`

## Usage

### Basic Example

Start with the simplest possible working example:

\`\`\`tsx
<Feature prop="value" />
\`\`\`

### With Options

Add complexity incrementally:

\`\`\`tsx
<Feature
  prop="value"
  variant="outlined"
  onAction={() => console.log("clicked")}
/>
\`\`\`

### Advanced Usage

Show real-world patterns:

\`\`\`tsx
function MyComponent() {
  const handleAction = async () => {
    await saveData();
    toast.success("Saved!");
  };

  return (
    <Feature
      prop="value"
      onAction={handleAction}
    />
  );
}
\`\`\`

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `prop` | `string` | - | Required prop description |
| `variant` | `"default" \| "outlined"` | `"default"` | Visual variant |
| `onAction` | `() => void` | - | Callback when action occurs |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `doSomething()` | `id: string` | `Promise<void>` | Does something |

## Best Practices

- Always wrap in error boundary for production
- Use with Suspense for loading states
- Prefer composition over configuration

## Troubleshooting

### Common Issue 1

**Problem**: Description of what goes wrong
**Solution**: How to fix it

### Common Issue 2

**Problem**: Another common issue
**Solution**: Step by step fix
```

## Writing Guidelines

### Voice and Tone

- **Be direct**: "Use `dialogManager.confirm()`" not "You can use..."
- **Be specific**: Show exact code, not pseudo-code
- **Be concise**: No filler words or redundant explanations

### Code Examples

1. **Always include imports** in the first example
2. **Use TypeScript** with proper types
3. **Show async patterns** with try/catch when relevant
4. **Make examples copy-paste ready**

Good:
```tsx
import { dialogManager } from "@/features/dialog-manager/dialog-manager";

dialogManager.confirm({
  title: "Delete",
  action: {
    label: "Delete",
    onClick: async () => {
      await deleteItem();
    },
  },
});
```

Bad:
```tsx
// Import the dialog manager
import { dialogManager } from "...";

// Call confirm with your options
dialogManager.confirm({ /* options */ });
```

### Tables

Use tables for:
- Props/options reference
- Comparison of approaches
- Method signatures

Keep table cells concise. Use descriptions in prose if needed.

## Thinking Before Writing

Before creating documentation, answer these questions:

### 1. Who is the audience?

| Audience | Focus On |
|----------|----------|
| New developers | Step-by-step, explain concepts |
| Experienced devs | Quick reference, advanced patterns |
| End users | Screenshots, no code jargon |

### 2. What's the minimum viable example?

Find the simplest code that demonstrates the feature:
- Remove all optional props
- Use hardcoded values
- Skip error handling

### 3. What mistakes will people make?

Document:
- Common configuration errors
- Type mismatches
- Missing dependencies

### 4. What's the "why"?

Don't just show how to use it—explain when and why:
- "Use this when you need user confirmation before destructive actions"
- "Prefer this over useState when state is shared across components"

## Checklist Before Submitting

- [ ] File is in `content/docs/` with `.mdx` extension
- [ ] All frontmatter fields are present and valid
- [ ] Introduction explains what and why
- [ ] First code example is minimal and working
- [ ] All code examples include necessary imports
- [ ] API reference table covers all props/options
- [ ] No placeholder text or TODO comments
- [ ] Matches formatting of existing docs
