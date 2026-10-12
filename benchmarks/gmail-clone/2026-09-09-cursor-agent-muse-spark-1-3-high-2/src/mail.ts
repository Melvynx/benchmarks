export interface Attachment {
  id: string;
  name: string;
  size: string;
  kind: "pdf" | "img" | "doc" | "xls" | "zip" | "slides";
}

export interface Message {
  id: string;
  from: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  date: number;
  body: string;
  attachments?: Attachment[];
}

export interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  labels: string[];
  category: "primary" | "promotions" | "social" | "updates" | "forums";
  snippet: string;
  unread: boolean;
  starred: boolean;
  important: boolean;
  hasAttachment: boolean;
  draft?: boolean;
  draftBody?: string;
  draftTo?: string;
  snoozedUntil?: number | null;
  archived?: boolean;
  trashed?: boolean;
  spam?: boolean;
  sent?: boolean;
  muted?: boolean;
}

export const ME = "Alex Morgan";
export const MY_EMAIL = "alex.morgan@gmail.com";

export const CONTACTS = [
  { name: "Priya Nair", email: "priya.nair@northwind.io" },
  { name: "Daniel Kim", email: "daniel.kim@figma.design" },
  { name: "Sofia Reyes", email: "sofia.reyes@acme.co" },
  { name: "Marcus Chen", email: "marcus.chen@datadoghq.com" },
  { name: "Elena Petrova", email: "elena.p@spotify.design" },
  { name: "James Okafor", email: "j.okafor@stripe.com" },
  { name: "Hana Sato", email: "hana.sato@notion.so" },
  { name: "Tom Becker", email: "tom.becker@linear.app" },
  { name: "Amara Diallo", email: "amara.d@airbnb.com" },
  { name: "Leo Fournier", email: "leo.fournier@qonto.eu" },
  { name: "Grace Liu", email: "grace.liu@vercel.com" },
  { name: "Omar Haddad", email: "omar.h@careem.com" },
  { name: "Nina Rossi", email: "nina.rossi@github.com" },
  { name: "Chris Evans", email: "chris.evans@freelance.dev" },
  { name: "Yuki Tanaka", email: "yuki.t@sony.jp" },
  { name: "Rachel Green", email: "rachel@bloomstudio.co" },
  { name: "David Park", email: "david.park@openai.dev" },
  { name: "Ingrid Berg", email: "ingrid@fjordhotels.no" },
  { name: "Sam Wilson", email: "sam.wilson@deltatrips.com" },
  { name: "Ava Stone", email: "ava@lumenfashion.com" },
];

export const LABEL_DEFS: Record<string, { color: string; bg: string }> = {
  Work: { color: "#174ea6", bg: "#d2e3fc" },
  Personal: { color: "#0d652d", bg: "#ceead6" },
  Finance: { color: "#7a5100", bg: "#feefc3" },
  Travel: { color: "#681da8", bg: "#e8def8" },
  Projects: { color: "#b06000", bg: "#fdd663" },
  Receipts: { color: "#0b57d0", bg: "#e1e3e1" },
};

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.now();

const att = (id: string, name: string, size: string, kind: Attachment["kind"]): Attachment => ({ id, name, size, kind });

function msg(
  id: string, from: string, fromEmail: string, to: string[], date: number, body: string,
  attachments?: Attachment[], cc?: string[],
): Message {
  return { id, from, fromEmail, to, date, body, attachments, cc };
}

export function seedThreads(): Thread[] {
  const t: Thread[] = [];
  let n = 0;
  const id = () => `t${++n}`;
  const ago = (ms: number) => NOW - ms;

  const push = (th: Thread) => { t.push(th); };

  push({ id: id(), subject: "Q3 launch plan — final review before Friday", messages: [
    msg("m1", "Priya Nair", "priya.nair@northwind.io", [MY_EMAIL], ago(22 * MIN), `Hi Alex,\n\nThe Q3 launch plan is ready for final review. Key changes since yesterday:\n\n1. Moved the beta rollout to Sept 18 (infra needs the extra week)\n2. Pricing page copy is locked — legal signed off\n3. Added the customer advisory board quotes\n\nCan you approve the comms timeline by EOD? The draft is in the shared doc and I've attached the one-pager.\n\nThanks!\nPriya`, [att("a1", "Q3-launch-onepager.pdf", "248 KB", "pdf")]),
    msg("m2", ME, MY_EMAIL, ["priya.nair@northwind.io"], ago(9 * MIN), `Approved with one tweak — let's move the customer email to Tuesday morning instead of Monday. Open rates are ~22% better.\n\nOtherwise ship it. 🚀\n\n— Alex`),
  ], labels: ["Work", "Projects"], category: "primary", snippet: "Approved with one tweak — let's move the customer email…", unread: true, starred: true, important: true, hasAttachment: true });

  push({ id: id(), subject: "Your receipt from Lumen Fashion (#LF-88412)", messages: [
    msg("m1", "Lumen Fashion", "orders@lumenfashion.com", [MY_EMAIL], ago(48 * MIN), `Thanks for your order!\n\nOrder #LF-88412 — Merino crew sweater (Charcoal, M) — $128.00\nShipping: Express (2–3 days) — $6.90\nTotal charged: $134.90\n\nTrack your package anytime. Reply to this email if anything looks off.\n\n— Team Lumen`, [att("a2", "receipt-LF-88412.pdf", "96 KB", "pdf")]),
  ], labels: ["Receipts"], category: "promotions", snippet: "Order #LF-88412 — Merino crew sweater — $134.90", unread: true, starred: false, important: false, hasAttachment: true });

  push({ id: id(), subject: "Design sync notes + Figma links", messages: [
    msg("m1", "Daniel Kim", "daniel.kim@figma.design", [MY_EMAIL], ago(1.4 * HOUR), `Hey Alex — notes from today's design sync:\n\n• Onboarding flow v3 tested at 94% completion (up from 81%)\n• Empty-state illustration needs one more pass\n• Motion spec for the compose sheet is in Figma\n\nLinks:\n→ Onboarding v3 prototype\n→ Motion spec (compose sheet)\n→ Icon audit board\n\nNext sync Thursday 10:00. Bring the density study?`),
  ], labels: ["Work"], category: "primary", snippet: "Onboarding flow v3 tested at 94% completion…", unread: true, starred: false, important: true, hasAttachment: false });

  push({ id: id(), subject: "Sofia mentioned you in “Website copy — final”", messages: [
    msg("m1", "Sofia Reyes", "sofia.reyes@acme.co", [MY_EMAIL], ago(2.1 * HOUR), `@alex Can you sanity-check the hero headline? Options:\n\nA) "Email that keeps up with you"\nB) "The calm inbox for busy teams"\nC) "Less noise. More signal."\n\nI'm leaning B. Doc link inside. Need your vote by 3pm!`),
  ], labels: [], category: "social", snippet: "@alex Can you sanity-check the hero headline?", unread: true, starred: false, important: false, hasAttachment: false });

  push({ id: id(), subject: "Board deck draft — feedback needed", messages: [
    msg("m1", "Marcus Chen", "marcus.chen@datadoghq.com", [MY_EMAIL], ago(3 * HOUR), `Alex,\n\nBoard deck draft is ready. Slides 8–12 (growth + retention) need your numbers. A few callouts:\n\n• NRR at 121% — best quarter yet\n• CAC payback down to 5.4 months\n• Churn concentrated in <10-seat segment\n\nI've attached the deck. Comments inline please.`, [att("a3", "board-deck-q3-draft.pptx", "4.2 MB", "slides")]),
    msg("m2", "Elena Petrova", "elena.p@spotify.design", [MY_EMAIL], ago(2.4 * HOUR), `Adding my +1 — slides 10/11 look great. One suggestion: split the retention chart by cohort. The blended number hides the enterprise story.`),
    msg("m3", ME, MY_EMAIL, ["marcus.chen@datadoghq.com"], ago(2 * HOUR), `Numbers for slides 8–12 are in. NRR 121% confirmed, and I added the cohort split Elena suggested. Deck looks strong.`),
  ], labels: ["Work", "Finance"], category: "primary", snippet: "Numbers for slides 8–12 are in. NRR 121% confirmed…", unread: true, starred: true, important: true, hasAttachment: true });

  push({ id: id(), subject: "Your Delta trip to Tokyo is confirmed ✈️", messages: [
    msg("m1", "Delta Trips", "noreply@deltatrips.com", [MY_EMAIL], ago(4 * HOUR), `You're going to Tokyo! 🇯🇵\n\nSFO → HND · Oct 14, 11:20 AM · Seat 14A (Premium)\nHND → SFO · Oct 24, 6:45 PM · Seat 14A\nConfirmation: DT-7XKQ2P\n\nCheck-in opens 24h before departure. Baggage: 2 × 23kg included.`, [att("a4", "e-ticket-DT-7XKQ2P.pdf", "182 KB", "pdf")]),
  ], labels: ["Travel"], category: "updates", snippet: "SFO → HND · Oct 14 · Confirmation DT-7XKQ2P", unread: true, starred: false, important: false, hasAttachment: true });

  push({ id: id(), subject: "Invoice #INV-2026-0917 — $4,800 due Sept 30", messages: [
    msg("m1", "Bloom Studio", "rachel@bloomstudio.co", [MY_EMAIL], ago(5 * HOUR), `Hi Alex,\n\nInvoice #INV-2026-0917 for brand illustration sprint ($4,800) is attached. Net-21, due Sept 30.\n\nPayment details on page 2. Let me know if you need a W-9 — happy to resend.\n\nThanks so much!\nRachel`, [att("a5", "INV-2026-0917.pdf", "112 KB", "pdf")]),
  ], labels: ["Finance"], category: "primary", snippet: "Invoice #INV-2026-0917 for brand illustration sprint…", unread: true, starred: false, important: true, hasAttachment: true });

  push({ id: id(), subject: "Re: Offer letter — Senior Frontend Engineer", messages: [
    msg("m1", "James Okafor", "j.okafor@stripe.com", [MY_EMAIL], ago(6 * HOUR), `Hi Alex,\n\nWe're thrilled to move forward! Attached is your offer letter:\n\n• Base: $192,000\n• Equity: 4,200 RSUs / 4yr\n• Start: Oct 6 (flexible)\n• Hybrid: 2 days in SF office\n\nQuestions? I'm around all week. We'd love your decision by Friday.`),
    msg("m2", ME, MY_EMAIL, ["j.okafor@stripe.com"], ago(5.2 * HOUR), `Hi James — thank you! Reviewing with my partner tonight. One question: is there flexibility on start date to Oct 13? Will confirm by Thursday.`),
    msg("m3", "James Okafor", "j.okafor@stripe.com", [MY_EMAIL], ago(4.6 * HOUR), `Oct 13 works perfectly. Take your time — excited about the possibility of working together!`),
  ], labels: ["Personal"], category: "primary", snippet: "Oct 13 works perfectly. Take your time…", unread: true, starred: true, important: true, hasAttachment: false });

  push({ id: id(), subject: "Hana shared “Product principles v2” with you", messages: [
    msg("m1", "Hana Sato", "hana.sato@notion.so", [MY_EMAIL], ago(7 * HOUR), `Hana shared a doc:\n\n“Product principles v2”\n\n> 1. Speed is a feature\n> 2. Density without clutter\n> 3. Every control earns its place\n> 4. Delight in the details\n\n23 comments since yesterday — you're mentioned in 2.`),
  ], labels: ["Work"], category: "social", snippet: "23 comments since yesterday — you're mentioned in 2.", unread: false, starred: false, important: false, hasAttachment: false });

  push({ id: id(), subject: "Action required: verify your Qonto account", messages: [
    msg("m1", "Qonto", "hello@qonto.eu", [MY_EMAIL], ago(8 * HOUR), `Hi Alex,\n\nTo keep your account active, please verify your identity before Sept 20:\n\n1. Upload a valid ID\n2. Confirm your business address\n\nTakes ~3 minutes. Start verification →`),
  ], labels: ["Finance"], category: "updates", snippet: "Please verify your identity before Sept 20", unread: false, starred: false, important: true, hasAttachment: false });

  push({ id: id(), subject: "Linear: 14 issues assigned to you this week", messages: [
    msg("m1", "Tom Becker", "tom.becker@linear.app", [MY_EMAIL], ago(9 * HOUR), `Weekly digest — 14 issues assigned to you:\n\n🔴 Overdue (2): AUTH-412, BILL-88\n🟡 Due Friday (5): INBOX-201…205\n🟢 Backlog (7)\n\nCycle velocity is up 18%. Nice work closing SEARCH-97 — that unblocked two others.`),
  ], labels: ["Work", "Projects"], category: "updates", snippet: "Weekly digest — 14 issues assigned to you", unread: false, starred: false, important: false, hasAttachment: false });

  push({ id: id(), subject: "Weekend in Big Sur? 🌊", messages: [
    msg("m1", "Amara Diallo", "amara.d@airbnb.com", [MY_EMAIL], ago(11 * HOUR), `Found the perfect cabin — redwoods, hot tub, 5 min to Pfeiffer Beach. $340/night, sleeps 4.\n\nOct 3–5 works for me + Jordan. You in? Need to book by Sunday, it's got 12 watchers!`),
    msg("m2", ME, MY_EMAIL, ["amara.d@airbnb.com"], ago(10 * HOUR), `YES. Book it!! I'll cover groceries. Can we bring Biscuit? 🐶`),
  ], labels: ["Personal", "Travel"], category: "primary", snippet: "YES. Book it!! I'll cover groceries…", unread: false, starred: true, important: false, hasAttachment: false });

  push({ id: id(), subject: "Vercel: Deployment “mail-ui” is ready", messages: [
    msg("m1", "Grace Liu", "grace.liu@vercel.com", [MY_EMAIL], ago(13 * HOUR), `✅ Production deployment succeeded.\n\nmail-ui · main @ a3f9c1e\nBuild: 48s · 0 errors, 2 warnings\nDomains: mail-ui.vercel.app (+2)\n\nPreview: https://mail-ui-a3f9c1e.vercel.app`),
  ], labels: ["Work"], category: "updates", snippet: "Production deployment succeeded · 48s", unread: false, starred: false, important: false, hasAttachment: false });

  push({ id: id(), subject: "Your GitHub security alert: 1 vulnerability found", messages: [
    msg("m1", "Nina Rossi", "nina.rossi@github.com", [MY_EMAIL], ago(15 * HOUR), `Dependabot found 1 high-severity vulnerability in mail-ui:\n\n• lodash-es < 4.17.23 (CVE-2026-0912) — prototype pollution\n\nPatched version available. Open a PR with one click.`),
  ], labels: ["Work"], category: "updates", snippet: "Dependabot found 1 high-severity vulnerability", unread: false, starred: false, important: true, hasAttachment: false });

  push({ id: id(), subject: "50% off fall boots — ends tonight", messages: [
    msg("m1", "Nordwind", "promo@nordwind.shop", [MY_EMAIL], ago(18 * HOUR), `FALL SALE — 50% off all boots, tonight only.\n\nChelsea, combat, hiking — from $59. Free returns through January.\n\nUse code STEPIN50 at checkout.`),
  ], labels: [], category: "promotions", snippet: "FALL SALE — 50% off all boots, tonight only.", unread: false, starred: false, important: false, hasAttachment: false });

  push({ id: id(), subject: "Photo dump: Lisbon offsite 📸", messages: [
    msg("m1", "Leo Fournier", "leo.fournier@qonto.eu", [MY_EMAIL], ago(1.05 * DAY), `30 new photos in “Lisbon offsite — Sept”!\n\nHighlights: sunset sail, the pastel de nata crawl (RIP diet), and Marcus falling off a paddleboard.\n\nComment your favorites — printing the top 10 for the office wall.`, [att("a6", "lisbon-30-photos.zip", "84 MB", "zip")]),
  ], labels: ["Personal"], category: "social", snippet: "30 new photos — sunset sail, pastel de nata crawl…", unread: false, starred: true, important: false, hasAttachment: true });

  push({ id: id(), subject: "Fjord Hotels: your stay in Bergen", messages: [
    msg("m1", "Ingrid Berg", "ingrid@fjordhotels.no", [MY_EMAIL], ago(1.2 * DAY), `Takk for your stay, Alex!\n\nBryggen View Hotel · Sept 2–4 · Room 312 (fjord view)\nHow was everything? A 60-second review helps us enormously.\n\nP.S. You left a grey scarf — reply and we'll ship it free.`),
  ], labels: ["Travel"], category: "updates", snippet: "Takk for your stay! How was Room 312?", unread: false, starred: false, important: false, hasAttachment: false });

  push({ id: id(), subject: "Contract for review: freelance SOW — Sept sprint", messages: [
    msg("m1", "Chris Evans", "chris.evans@freelance.dev", [MY_EMAIL], ago(1.4 * DAY), `Hi Alex,\n\nSOW for the September sprint attached:\n\n• 60 hrs @ $145/hr = $8,700 cap\n• Scope: search relevance + keyboard shortcuts\n• Term: Sept 9 – Oct 4\n\nRedlines welcome. Happy to jump on a 15-min call.`, [att("a7", "SOW-sept-sprint.docx", "64 KB", "doc")]),
  ], labels: ["Work", "Finance"], category: "primary", snippet: "SOW for the September sprint attached…", unread: false, starred: false, important: false, hasAttachment: true });

  push({ id: id(), subject: "Yuki tagged you in 4 photos", messages: [
    msg("m1", "Yuki Tanaka", "yuki.t@sony.jp", [MY_EMAIL], ago(1.6 * DAY), `Yuki tagged you in 4 photos from the Akihabara night walk.\n\nThat ramen spot at 1am was legendary. Next time: Golden Gai?`),
  ], labels: [], category: "social", snippet: "That ramen spot at 1am was legendary…", unread: false, starred: false, important: false, hasAttachment: false });

  push({ id: id(), subject: "GPT model update: faster responses, longer context", messages: [
    msg("m1", "David Park", "david.park@openai.dev", [MY_EMAIL], ago(1.8 * DAY), `New model preview is live in your workspace:\n\n• 2.1× faster median latency\n• 400k context window\n• 31% better on long-form coherence evals\n\nTry it with your inbox-summarization prompt — big difference.`),
  ], labels: ["Work"], category: "updates", snippet: "2.1× faster median latency · 400k context", unread: false, starred: false, important: false, hasAttachment: false });

  const moreSubjects: Array<[string, string, string, string, Thread["category"], string[], number, boolean, boolean]> = [
    ["Careem", "careem@careem.com", "Your ride receipt — Downtown → Marina", "Trip Sep 7 · 14.2 km · AED 48.60 · Driver: Ahmed ★5.0. Receipt attached.", "updates", ["Receipts"], 2.0, false, false],
    ["Spotify Design", "team@spotify.design", "Config 2026: your talk was accepted! 🎤", "Congrats! “Density without dread” — 25 min, main stage, Day 2. Speaker checklist + rehearsal slots inside.", "primary", ["Work"], 2.2, true, false],
    ["Notion", "notify@notion.so", "Weekly digest: 9 updates in Product Space", "Pricing page, launch checklist, and retros got the most edits. 3 docs mention you.", "updates", ["Work"], 2.4, false, false],
    ["Airbnb", "auto@airbnb.com", "Review your stay at Casa Miramar", "How was Casa Miramar (Sept 1–3)? Your host Elena already left you ★★★★★.", "updates", ["Travel"], 2.6, false, false],
    ["Mom", "mom.chen@family.org", "Fwd: Photos from grandma's 90th 🎂", "Sweetheart — finally got all the photos! Your speech made her cry (happy tears). Love, Mom.", "primary", ["Personal"], 2.8, true, true],
    ["Figma", "updates@figma.design", "New: variables collections just got faster", "Bulk-edit 100s of variables, plus code-connect snippets in inspect. Try it in your mail-ui file.", "promotions", [], 3.0, false, false],
    ["Stripe Atlas", "atlas@stripe.com", "Your 1099-K is ready for download", "2026 tax documents are available. Download before Oct 15. Questions? Reply here.", "updates", ["Finance"], 3.2, false, true],
    ["Omar Haddad", "omar.h@careem.com", "Re: API rate limits — proposal", "Proposal: raise search autosuggest to 40 rps with 5s burst. Cuts p99 from 900ms → 140ms. Doc attached for review.", "primary", ["Work", "Projects"], 3.4, false, false],
    ["Duolingo", "hello@duolingo.com", "You're on a 47-day streak! 🔥", "Don't break it now — 5 minutes of Japanese keeps the streak alive. 頑張って！", "promotions", [], 3.6, false, false],
    ["Rachel Green", "rachel@bloomstudio.co", "Moodboards for homepage refresh", "Three directions attached: Warm Minimal, Bold Editorial, Quiet Luxury. My vote: #2 with #1's palette.", "primary", ["Work"], 3.8, false, false],
    ["GitHub", "noreply@github.com", "[mail-ui] PR #482 merged: virtualized list", "10k-row render now 60fps. Bundle +3.2kb. Great work — 14 approvals, 0 change requests.", "updates", ["Work"], 4.0, false, false],
    ["Hana Sato", "hana.sato@notion.so", "Dinner Friday? Bringing mochi 🍡", "That little izakaya on Valencia — 7:30pm? Kenji and Mei are in. Say yes!", "primary", ["Personal"], 4.2, true, false],
    ["American Express", "statements@amex.com", "Your September statement is ready", "Balance: $3,214.09 · Due Oct 2 · Minimum: $96.00. 12,408 points earned this period.", "updates", ["Finance"], 4.4, false, true],
    ["Sam Wilson", "sam.wilson@deltatrips.com", "Price drop: SFO → Lisbon −$180", "You tracked SFO → LIS Nov 8. Now $612 roundtrip (was $792). 4 seats left at this fare.", "promotions", ["Travel"], 4.8, false, false],
    ["Ava Stone", "ava@lumenfashion.com", "Back in stock: the coat you loved", "The Camden wool coat (Camel, S) is back — 6 left. 20% off with COAT20 for 48h.", "promotions", [], 5.2, false, false],
    ["Tom Becker", "tom.becker@linear.app", "Sprint 34 retrospective notes", "What went well: search relevance shipped early. Fix next: flaky e2e on compose. Action items assigned.", "primary", ["Work", "Projects"], 5.6, false, false],
    ["Kickstarter", "no-reply@kickstarter.com", "“Meadow” — fully funded in 6 hours!", "The modular desk garden you backed hit 412% funded. Surveys go out next week.", "updates", [], 6.0, false, false],
    ["Grace Liu", "grace.liu@vercel.com", "Re: edge caching for attachments", "Set stale-while-revalidate to 24h + immutable hashes. Preview traffic p99 down 38%. Full writeup inside.", "primary", ["Work"], 6.4, false, false],
    ["LinkedIn", "invitations@linkedin.com", "You have 12 new invitations", "Including: ex-colleagues from Northwind, 2 recruiters, and a design lead at Linear.", "social", [], 6.8, false, false],
    ["Nina Rossi", "nina.rossi@github.com", "Release v2.14.0 is out 🎉", "Highlights: offline drafts, snooze v2, 40% faster search. Changelog + migration notes attached.", "updates", ["Work"], 7.2, false, false],
    ["Elena Petrova", "elena.p@spotify.design", "Portfolio review swap?", "Want to trade portfolio reviews before app season? I can do Thu/Fri afternoons. 30 min each?", "primary", ["Personal"], 7.6, false, false],
    ["NYTimes", "news@nytimes.com", "Your morning briefing — Sept 8", "Markets rally on rate-cut hopes · New high-speed rail breaks ground · Champions League draw tonight.", "promotions", [], 8.0, false, false],
    ["Omar Haddad", "omar.h@careem.com", "Expenses approved ✔", "Sept expenses ($1,204.33) approved. Reimbursement lands Friday. Nice job keeping receipts tidy.", "updates", ["Finance"], 8.5, false, false],
    ["Daniel Kim", "daniel.kim@figma.design", "Icon audit — 212 icons reviewed", "212 reviewed, 31 need redraws, 12 duplicates killed. Spreadsheet attached. Pizza owed: 2 slices.", "primary", ["Work", "Projects"], 9.0, false, false],
    ["Whole Foods", "receipts@wholefoods.shop", "Your receipt — $86.42", "Sept 5 · 24 items · You saved $14.20 with Prime. Biggest line: wild salmon $24.99.", "updates", ["Receipts"], 9.5, false, false],
    ["Priya Nair", "priya.nair@northwind.io", "Customer advisory board — Oct dates", "CAB session Oct 21–22 in Napa. 6 customers confirmed. Can you keynote the roadmap hour?", "primary", ["Work"], 10.0, true, false],
    ["Substack", "digest@substack.com", "This week in Dense Discovery", "Why great inboxes feel invisible · The 40ms rule · Interview: “Delete is a love language”.", "forums", ["Receipts"], 10.5, false, false],
    ["James Okafor", "j.okafor@stripe.com", "Welcome lunch — first week ideas", "No pressure — but the team already voted: Burma Superstar, day one. Dietary stuff? Just reply!", "social", ["Personal"], 11.0, false, false],
    ["United", " MileagePlus@united.com", "You earned 3,412 miles", "SFO→HND credited 3,412 PQM. 1,588 to Silver. Miles expire never. Nice.", "updates", ["Travel"], 12.0, false, false],
    ["Sofia Reyes", "sofia.reyes@acme.co", "Blog draft: “The 40ms inbox”", "Draft attached — 1,900 words. Needs your war stories from the virtualization sprint. Deadline Fri?", "primary", ["Work"], 13.0, false, false],
  ];

  moreSubjects.forEach(([from, email, subject, snippet, cat, labels, daysAgo, starred, important], i) => {
    const date = ago(daysAgo * DAY + (i * 37 * MIN));
    push({
      id: id(), subject,
      messages: [msg("m1", from, email, [MY_EMAIL], date, `${snippet}\n\n${secondParagraph(i)}\n\nBest,\n${from.split(" ")[0]}`)],
      labels, category: cat as Thread["category"], snippet,
      unread: daysAgo < 2.6 && i % 3 === 0,
      starred, important,
      hasAttachment: /attach|receipt|spreadsheet|draft|invoice|writeup|changelog/i.test(snippet),
    });
  });

  function secondParagraph(i: number): string {
    const pool = [
      "Full details and links are in the thread — let me know if anything needs a second look.",
      "I've kept this short on purpose. Happy to go deeper on any of these points on a call.",
      "PS: no action needed unless something looks wrong — just keeping you in the loop.",
      "If you're short on time, the first paragraph has everything; the rest is context.",
      "Flagging this now so it doesn't get buried — happy to adjust timing if needed.",
    ];
    return pool[i % pool.length];
  }

  // Sent items
  const sentDefs: Array<[string, string, number]> = [
    ["Re: Q3 launch plan — approved ✔", "priya.nair@northwind.io", 0.4],
    ["Portfolio review swap — Friday works!", "elena.p@spotify.design", 1.1],
    ["Re: SOW — signed, let's kick off Monday", "chris.evans@freelance.dev", 1.5],
    ["Big Sur cabin — I'm in! + groceries", "amara.d@airbnb.com", 2.3],
    ["Thanks for the CAB invite — honored to keynote", "priya.nair@northwind.io", 3.1],
  ];
  sentDefs.forEach(([subject, toEmail, daysAgo], i) => {
    push({
      id: id(), subject,
      messages: [msg("m1", ME, MY_EMAIL, [toEmail], ago(daysAgo * DAY), `Hi there,\n\n${secondParagraph(i + 2)}\n\nThanks!\nAlex`)],
      labels: [], category: "primary", snippet: "Sent message",
      unread: false, starred: false, important: false, hasAttachment: false, sent: true,
    });
  });

  // Drafts
  const draftDefs: Array<[string, string, string]> = [
    ["Re: Board deck — questions on slide 10", "marcus.chen@datadoghq.com", "Hi Marcus — quick question on slide 10: is the NRR chart gross or net of the mid-market churn?"],
    ["Weekend packing list 🏕️", "amara.d@airbnb.com", "Sleeping bag, headlamp, s'mores kit, Biscuit's treats…"],
    ["Intro: Grace <> David (search infra)", "grace.liu@vercel.com", "Grace — meet David, who led our search relevance work. David — Grace runs edge infra at Vercel…"],
  ];
  draftDefs.forEach(([subject, toEmail, body], i) => {
    push({
      id: id(), subject,
      messages: [msg("m1", ME, MY_EMAIL, [toEmail], ago((i + 1) * 5 * HOUR), body)],
      labels: ["Work"], category: "primary", snippet: body.slice(0, 60),
      unread: false, starred: false, important: false, hasAttachment: false,
      draft: true, draftBody: body, draftTo: toEmail,
    });
  });

  // Trash + Spam samples
  push({ id: id(), subject: "You won a FREE cruise!!! (claim now)", messages: [
    msg("m1", "Prize Center", "prizes@totally-legit.biz", [MY_EMAIL], ago(6 * DAY), "Congratulations!!! You've been selected for a FREE 7-night cruise. Just send your credit card to claim…")],
    labels: [], category: "promotions", snippet: "Congratulations!!! You've been selected…", unread: false, starred: false, important: false, hasAttachment: false, spam: true });
  push({ id: id(), subject: "Old newsletter — unsubscribe test", messages: [
    msg("m1", "Daily Deals", "deals@oldlist.shop", [MY_EMAIL], ago(9 * DAY), "Daily deals…")],
    labels: [], category: "promotions", snippet: "Daily deals…", unread: false, starred: false, important: false, hasAttachment: false, trashed: true });

  return t;
}
