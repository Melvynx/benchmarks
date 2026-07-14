# Brainstorm: Convex Database pour thumbfa.st

**Date:** 2026-02-16
**Mode:** Standard (4 phases, 5 agents parallels, 30+ sources)

---

## Research Summary

**Process completed:**

- **Phase 1 (Exploration):** 30+ sources, 3 agents paralleles (web, docs, codebase)
- **Phase 2 (Challenge):** 5 findings majeurs challenges, 3 revises a la baisse, 1 completement inverse
- **Phase 3 (Synthesis):** 5 perspectives analysees, convergence unanime sur "ne pas migrer"

**Domaines investigues:**

- Architecture Convex (jobs, crons, real-time, file storage, auth)
- Architecture actuelle thumbfa.st (generation loop, credits, Stripe, Better Auth)
- Alternatives ciblees (Inngest, Trigger.dev, Prisma Pulse, SSE, Vercel Cron)
- Cas reels d'echecs/succes Convex en production

---

## Key Insights

### 1. NE PAS migrer vers Convex - Confidence: **High**

- Better Auth + Convex = bugs documentes multiples (token explosion, plugins casses)
- Migration de 50+ server actions + Prisma schema + Stripe webhooks = 2-3 mois de risque
- T3 Chat outage June 2025 = preuve que Convex a des problemes de scale
- Le ratio risque/benefice est clairement negatif pour un projet existant

### 2. Inngest = meilleur ROI pour les background jobs - Confidence: **High**

- Resout le vrai probleme (timeout generation AI 30-60s) sans migration DB
- S'integre en ~2h dans Next.js existant, serverless-native sur Vercel
- Free tier 500K runs/mois, Pro ~$10/mois
- Retry automatique, observabilite, durable execution inclus
- Reversible: si ca ne convient pas, on retire Inngest sans impact

### 3. Le polling 500ms n'est probablement pas le vrai bottleneck - Confidence: **Medium**

- La question du Beginner expose un biais: on cherche une solution technique a un probleme UX
- Un polling a 2-3s + un bon loading state suffit probablement pour le volume actuel
- SSE = upgrade simple si le polling devient un vrai probleme (>200 users concurrents)

### 4. Convex ferait sens sur un nouveau projet, pas pour migrer - Confidence: **High**

- Convex est genuinement bon pour: real-time, TypeScript-first, MVP rapide
- Mais la migration d'un projet existant Prisma + Better Auth + Stripe + Orgs est un piege
- Si tu lances un nouveau SaaS from scratch, Convex serait un candidat serieux

### 5. Les vrais quick wins sont chirurgicaux - Confidence: **High**

- Inngest pour background jobs (resout timeout)
- Unique constraint `webhookEvent` pour idempotency Stripe
- Vercel Cron pour monthly credits (deja supporte)
- Chacun = quelques heures, zero risque, reversible

---

## Recommendation

**Recommandation principale:**
Ne PAS migrer vers Convex. Ajouter Inngest pour les background jobs de generation AI, et garder PostgreSQL + Prisma + Better Auth.

**Rationale:**
Convex resout des vrais problemes (real-time, background jobs, crons) mais le cout de migration d'un projet existant avec Better Auth, Prisma, Stripe, et multi-tenancy org est disproportionne par rapport aux benefices. Inngest resout 80% des pain points en 2h d'integration, sans toucher a la DB.

**Tradeoffs acceptes:**

- On garde le polling (ameliorable en SSE plus tard) plutot que le real-time natif de Convex
- On ajoute une dependance (Inngest) plutot que tout centraliser dans Convex
- On accepte que la stack soit "composee" plutot qu'un "monolithe BaaS"

**Overall Confidence: High**

- Monterait si: tu confirmes que le polling cause des problemes reels en production
- Descendrait si: Better Auth sortait un adapter Convex officiel stable ET Convex resolvait les bandwidth issues

---

## Vue Contrarian

**L'argument le plus fort POUR Convex:**

Convex offre un modele mental unifie. Au lieu de jongler entre Prisma, Inngest, SSE, Vercel Cron, Redis, et TanStack Query, tout vit dans un seul systeme. Les subscriptions real-time eliminent 100% du code de polling et cache invalidation. Pour un solo dev, cette simplicite a une valeur reelle: moins de services a monitorer, moins de points de failure, moins de factures a tracker.

**Pourquoi quelqu'un pourrait raisonnablement choisir differemment:**

- Si tu es pret a investir 2-3 mois pour une architecture "parfaite"
- Si tu prevois un volume massif de real-time (collaboration, live preview multi-user)
- Si tu lances un nouveau produit from scratch sans legacy

**Quand la vue contrarian aurait raison:**

- Si thumbfa.st pivot vers un outil collaboratif temps reel (plusieurs users editent ensemble)
- Si Better Auth + Convex devient stable et documente
- Si tu fais un rewrite complet de toute facon pour d'autres raisons

---

## Questions Ouvertes

1. **Le polling 500ms cause-t-il des problemes reels?** - Impact: Si non, meme Inngest est optionnel
2. **Combien de generations concurrentes en peak?** - Impact: Determine si SSE/Inngest est prioritaire
3. **Les Stripe webhooks arrivent-ils en double?** - Impact: L'idempotency est critique ou nice-to-have?

**Assumptions a valider:**

- "Le timeout de generation est un vrai probleme" -> Verifier les logs de timeout en prod

---

## Actions Immediates

### Cette semaine:

1. **Ajouter Inngest** (`pnpm add inngest`) pour la generation AI -> remplace le endpoint `/api/orgs/.../generate` synchrone par un job durable
2. **Ajouter une table `webhookEvent`** avec unique constraint sur `stripeEventId` pour l'idempotency
3. **Augmenter l'interval de polling** de 500ms a 2000ms dans `use-generation-loop.ts` comme quick fix UX

### Avant de s'engager plus:

- Mesurer le nombre reel de timeouts de generation sur 1 semaine
- Si >5% de timeout -> confirme Inngest prioritaire
- Si <1% -> le polling ameliore suffit pour l'instant

---

## Comparison: Convex vs Stack actuelle + Inngest

| Requirement              | Convex          | PostgreSQL + Inngest     | Winner         |
| ------------------------ | --------------- | ------------------------ | -------------- |
| Background jobs (30-60s) | Built-in        | Inngest                  | Tie            |
| Real-time updates        | Built-in        | SSE/Prisma Pulse         | Tie            |
| Cron jobs                | Built-in        | Vercel Cron (free)       | Stack actuelle |
| PostgreSQL support       | BYOD            | Native                   | Stack actuelle |
| Webhook idempotency      | Built-in        | Prisma unique constraint | Stack actuelle |
| Type safety              | Full            | Prisma + Zod             | Tie            |
| Vendor lock-in           | High            | None                     | Stack actuelle |
| Cost at scale            | $$ (wall-time)  | $ (consumption)          | Stack actuelle |
| Migration effort         | 2-3 mois        | 2h (Inngest)             | Stack actuelle |
| Better Auth compat       | Bugs documentes | Native                   | Stack actuelle |

---

## Cost Comparison (100 active users, 500 gens/month)

### Convex Path:

- Starter plan: $0-50/month
- At scale (likely): $100-200/month
- Vendor risk: Can't easily migrate

### PostgreSQL + Inngest:

- PostgreSQL hosting: $25/month
- Inngest: $10/month (pro) or FREE tier
- Vercel deployment: $20/month (Pro)
- Total: $55-75/month, no lock-in

---

## Sources Cles

- **T3 Chat Postmortem** (news.convex.dev): Production reliability issues avec Convex a l'echelle
- **GitHub Issue #95** (convex-backend): Bandwidth spiral documentation (5MB DB -> 1GB bandwidth)
- **Better Auth Convex Issues** (github.com/better-auth): Token explosion, plugin incompatibilities
- **Inngest Documentation** (inngest.com): Background jobs serverless pour Next.js
- **Convex Docs** (docs.convex.dev): Scheduled functions, crons, actions limitations
- **Rafay99 Blog**: Real Convex scaling nightmare avec cache saturation
- **Convex vs Supabase 2025** (makersden.io): Comparison detaillee
- **Convex Self-Hosting** (news.convex.dev): Open source Feb 2025
- **Prisma Pulse** (prisma.io): Real-time CDC pour PostgreSQL

---

## Phase Details

### Phase 1: Expansive Exploration

- 3 agents paralleles: web search, docs research, codebase exploration
- Couverture: Convex features, thumbfa.st architecture, pain points actuels
- Resultat: Convex resout des vrais problemes mais la migration est massive

### Phase 2: Critical Challenge

- 5 findings challenges, 3 revises a la baisse
- T3 Chat outage = smoking gun contre la fiabilite Convex
- Better Auth + Convex = incompatibilites documentees
- Emergence: Inngest comme alternative chirurgicale

### Phase 3: Multi-Lens Synthesis (5 perspectives)

- **Pragmatiste**: Inngest + SSE = ship demain
- **Perfectionniste**: Convex sur nouveau projet, Inngest + Prisma Pulse sur existant
- **Skeptique**: Ne remplace jamais un truc qui marche par un truc plus sexy
- **Expert**: Inngest = plus haute valeur, moindre risque
- **Beginner**: Le polling 500ms est-il vraiment un probleme?
- **Convergence unanime**: Ne pas migrer vers Convex

### Phase 4: Action Crystallization

- Recommandation: Inngest + quick fixes chirurgicaux
- Confidence: High (3 insights), Medium (1 insight)
- Contrarian view: Convex = simplicite d'un systeme unifie (valide mais pas pour un projet existant)
