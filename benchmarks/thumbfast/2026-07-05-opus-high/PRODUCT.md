# Product

## Register

product

## Users

YouTube creators and agencies who generate thumbnails with AI. They work fast, in batches, and care about output quality more than tooling. A secondary internal user is the admin (founder) who monitors generations, billing, referrals, and abuse from the `/admin` area.

## Product Purpose

Thumbfa.st generates YouTube thumbnails with AI (Gemini and GPT image models). Users describe or import a video, pick inspirations and faces, and get production-ready thumbnails. Success means a creator ships a thumbnail in minutes and comes back for every video. Credits gate generation; subscriptions (free, pro, ultra) refill them.

## Brand Personality

Fast, confident, creator-native. The app should feel like a sharp internal tool: dense where data matters, calm everywhere else. No hype language.

## Anti-references

- Over-decorated SaaS dashboards: gradients, glassmorphism, hero metrics with glow.
- Generic AI-tool aesthetics (sparkle icons everywhere, purple gradients).
- Marketing tone inside the product or admin surfaces.

## Design Principles

- Shadcn tokens are the source of truth; semantic variants over hardcoded color.
- Tables, stat cards, and badges from the shared admin kit (`src/routes/admin/_components/admin-shared.tsx`); never one-off variants.
- Skeletons mirror the real layout; every async surface has a pending component.
- Edits happen in dialogs (`dialogManager` + TanStack Form); reading stays inline and dense.
- Lucide icons only, no emojis, no gradients.

## Accessibility & Inclusion

No formal WCAG target declared. Baseline expectations: visible focus states, labeled inputs (TanStack Form fields), aria-labels on icon-only buttons, contrast via theme tokens.
