import type { Account, Attachment, Category, Contact, Invite, Message, Thread, UserLabel } from "./types";
import { at, DAY, MINUTE, nextWeekday } from "./date";
import { artSvg, svgDataUrl } from "./files";
import { colorFor, hashString, htmlToText, kindFromName } from "./utils";

export const ME: Account = { name: "Alex Morgan", email: "alex.morgan@fieldwork.co", color: "#0b57d0" };

const c = (name: string, email: string, extra: Partial<Contact> = {}): Contact => ({ name, email, ...extra });

export const CONTACTS = {
  me: c(ME.name, ME.email),
  priya: c("Priya Raman", "priya@fieldwork.co", { title: "Head of Product", company: "Fieldwork", phone: "(415) 555-0142" }),
  marcus: c("Marcus Chen", "marcus@fieldwork.co", { title: "Engineering Lead", company: "Fieldwork" }),
  sofia: c("Sofia Alvarez", "sofia@fieldwork.co", { title: "Product Designer", company: "Fieldwork" }),
  dan: c("Dan Okafor", "dan@fieldwork.co", { title: "CEO", company: "Fieldwork" }),
  hannah: c("Hannah Lee", "hannah@fieldwork.co", { title: "People Operations", company: "Fieldwork" }),
  theo: c("Theo Martin", "theo@fieldwork.co", { title: "Frontend Engineer", company: "Fieldwork" }),
  team: c("Fieldwork Team", "team@fieldwork.co"),
  rachel: c("Rachel Kim", "rachel.kim@bloomly.com", { title: "VP Customer Experience", company: "Bloomly", phone: "(212) 555-0188" }),
  jonas: c("Jonas Weber", "jonas@weberstudio.de", { title: "Illustrator", company: "Weber Studio" }),
  nadia: c("Nadia Haddad", "nadia@tandemtalent.com", { title: "Senior Recruiter", company: "Tandem" }),
  mom: c("Linda Morgan", "linda.morgan54@gmail.com"),
  dad: c("Robert Morgan", "bob.morgan@outlook.com"),
  jamie: c("Jamie Morgan", "jamie.morgan@icloud.com"),
  chris: c("Chris Patel", "chrispatel.photo@gmail.com"),
  emma: c("Emma Rodriguez", "emma.rod@outlook.com"),
  olivia: c("Olivia Brooks", "olivia.brooks@hey.com"),
  landlord: c("Greenpoint Property Management", "leasing@greenpointpm.com"),
  dentist: c("Bayside Dental", "appointments@baysidedental.com"),
  kestrel: c("Kestrel Outdoor Co.", "hello@kestreloutdoor.com"),
  coffee: c("Fieldnotes Coffee Roasters", "brew@fieldnotescoffee.com"),
  tunewave: c("Tunewave", "no-reply@tunewave.fm"),
  staybright: c("Staybright Hotels", "offers@staybright.com"),
  forkful: c("Forkful", "orders@forkful.app"),
  lumen: c("Lumen Books", "picks@lumenbooks.com"),
  northwind: c("Northwind Airlines", "reservations@northwindair.com"),
  canvasly: c("Canvasly", "team@canvasly.design"),
  connectly: c("Connectly", "notifications@connectly.com"),
  meetwell: c("Meetwell", "events@meetwell.com"),
  lumio: c("Lumio", "no-reply@lumio.social"),
  ridewell: c("Ridewell", "kudos@ridewell.app"),
  forge: c("GitForge", "notifications@gitforge.dev"),
  tracklane: c("Tracklane", "digest@tracklane.io"),
  bank: c("Harbor Bank", "statements@harborbank.com"),
  parcel: c("Parcelpoint", "tracking@parcelpoint.com"),
  power: c("Bright Power & Gas", "billing@brightpower.com"),
  security: c("Fieldwork Workspace", "no-reply@accounts.fieldwork.co"),
  guild: c("Design Guild", "design-guild@groups.fieldwork.co"),
  ux: c("UX Collective Forum", "digest@forum.uxcollective.org"),
  spam1: c("Rewards Center", "claim@prize-rewardz.biz"),
  spam2: c("Account Services", "security@fieldw0rk-verify.com"),
  spam3: c("Mark Davidson", "mark.d.wealth@cryptogains.top"),
  spam4: c("Accounts Payable", "billing@invoice-center.co"),
  webinar: c("Opsly Events", "webinars@opsly.io"),
} satisfies Record<string, Contact>;

type Key = keyof typeof CONTACTS;

export const DEFAULT_LABELS: UserLabel[] = [
  { id: "lbl_work", name: "Work", color: "#4a86e8" },
  { id: "lbl_personal", name: "Personal", color: "#16a766" },
  { id: "lbl_family", name: "Family", color: "#e07798" },
  { id: "lbl_travel", name: "Travel", color: "#ffad47" },
  { id: "lbl_finance", name: "Finance", color: "#a479e2" },
  { id: "lbl_receipts", name: "Receipts", color: "#8e9aaf" },
];

const L = { work: "lbl_work", personal: "lbl_personal", family: "lbl_family", travel: "lbl_travel", finance: "lbl_finance", receipts: "lbl_receipts" };

interface SeedAtt {
  name: string;
  size: number;
  hue?: number;
  title?: string;
  lines?: string[];
  rows?: string[][];
}

interface SeedMsg {
  from: Key;
  to?: Key[];
  cc?: Key[];
  t: number;
  body: string;
  att?: SeedAtt[];
  invite?: Omit<Invite, "organizer" | "guests"> & { guests: Key[] };
  status?: Message["status"];
}

interface SeedThread {
  subject: string;
  cat?: Category;
  labels?: string[];
  inbox?: boolean;
  star?: boolean;
  imp?: boolean;
  unread?: boolean;
  trash?: boolean;
  spam?: boolean;
  snooze?: number;
  msgs: SeedMsg[];
}

const p = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join("");

function promo(o: {
  brand: string;
  color: string;
  hue: number;
  eyebrow?: string;
  headline: string;
  sub: string;
  cta: string;
  href: string;
  items?: { name: string; price: string; hue: number }[];
  footer?: string;
}) {
  const banner = svgDataUrl(artSvg(o.hue, "banner"));
  const items = o.items?.length
    ? `<table role="presentation" style="width:100%;border-collapse:separate;border-spacing:12px 0;margin:8px 0 16px"><tr>${o.items
        .map(
          (it) =>
            `<td style="width:${Math.floor(100 / o.items!.length)}%;vertical-align:top;text-align:center;font-family:Arial,sans-serif"><img alt="${it.name}" src="${svgDataUrl(artSvg(it.hue, "landscape"))}" style="width:100%;border-radius:10px;display:block"/><div style="font-size:13px;color:#202124;margin-top:8px;font-weight:bold">${it.name}</div><div style="font-size:13px;color:${o.color}">${it.price}</div></td>`,
        )
        .join("")}</tr></table>`
    : "";
  return `<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#202124;background:#ffffff;border:1px solid #ececec;border-radius:12px;overflow:hidden">
<div style="padding:18px 24px;font-weight:bold;font-size:18px;letter-spacing:.5px;color:${o.color}">${o.brand}</div>
<img alt="" src="${banner}" style="width:100%;display:block"/>
<div style="padding:24px 24px 8px">${o.eyebrow ? `<div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${o.color};font-weight:bold">${o.eyebrow}</div>` : ""}
<h1 style="font-size:26px;line-height:1.25;margin:8px 0 12px;color:#111">${o.headline}</h1>
<p style="font-size:15px;line-height:1.6;color:#3c4043;margin:0 0 20px">${o.sub}</p>
<a href="${o.href}" style="display:inline-block;background:${o.color};color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;font-size:14px">${o.cta}</a></div>
${items ? `<div style="padding:8px 12px 0">${items}</div>` : ""}
<div style="padding:18px 24px;font-size:11px;line-height:1.6;color:#80868b;border-top:1px solid #f1f3f4;margin-top:12px">${o.footer || `You're receiving this because you signed up for ${o.brand} emails.`}<br/><a href="#unsubscribe" style="color:#80868b">Unsubscribe</a> · <a href="${o.href}" style="color:#80868b">View in browser</a></div></div>`;
}

function notice(o: { brand: string; color: string; title: string; body: string; cta?: string; href?: string; meta?: string }) {
  return `<div style="max-width:560px;font-family:Arial,Helvetica,sans-serif;color:#202124">
<div style="font-weight:bold;font-size:15px;color:${o.color};margin-bottom:14px">${o.brand}</div>
<div style="border:1px solid #e0e0e0;border-radius:10px;padding:22px 24px">
<h2 style="font-size:19px;margin:0 0 10px;color:#202124;font-weight:normal">${o.title}</h2>
<div style="font-size:14px;line-height:1.6;color:#3c4043">${o.body}</div>
${o.cta ? `<p style="margin:18px 0 4px"><a href="${o.href || "#"}" style="display:inline-block;background:${o.color};color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:bold">${o.cta}</a></p>` : ""}
</div>
${o.meta ? `<p style="font-size:11px;color:#80868b;line-height:1.5;margin-top:14px">${o.meta}</p>` : ""}</div>`;
}

function forgeMail(repo: string, title: string, body: string, num: number) {
  return `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:14px;color:#1f2328;max-width:620px">
<p style="color:#59636e;font-size:12px;margin:0 0 6px">${repo} · #${num}</p>
<h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
${body}
<p style="font-size:12px;color:#59636e;border-top:1px solid #d1d9e0;padding-top:10px;margin-top:18px">— Reply to this email directly or <a href="https://gitforge.dev/${repo}/pull/${num}">view it on GitForge</a>.<br/>You are receiving this because you were mentioned.</p></div>`;
}

export function buildSeed(now = Date.now()) {
  const m = (mins: number) => now - mins * MINUTE;
  const d = (days: number, h: number, min = 0) => at(-days, h, min, now);
  const dentistAt = nextWeekday(2, 9, now + DAY) + 30 * MINUTE;

  const seeds: SeedThread[] = [
    /* ---------------- Primary ---------------- */
    {
      subject: "Can you look at the empty states before standup?",
      labels: [L.work],
      unread: true,
      imp: true,
      msgs: [
        {
          from: "marcus",
          t: m(12),
          body: p(
            "Hey Alex,",
            "Theo pushed the empty-state illustrations to staging last night. Could you give them a quick look before standup? Mostly checking that the copy matches what we agreed on for Search and Trash.",
            "Staging link is in the PR. No rush if you're slammed — after lunch works too.",
            "Thanks!<br>Marcus",
          ),
        },
      ],
    },
    {
      subject: "Q4 roadmap review — final deck",
      labels: [L.work],
      star: true,
      imp: true,
      unread: true,
      msgs: [
        {
          from: "priya",
          to: ["me", "marcus", "sofia"],
          cc: ["dan"],
          t: d(2, 9, 14),
          body: p(
            "Hi all,",
            "Attaching the draft deck for Thursday's Q4 roadmap review. The big themes are:",
            "<ul><li><b>Inbox speed</b> — p95 load under 400ms on mobile</li><li><b>Smarter triage</b> — categories v2 and snooze suggestions</li><li><b>Bloomly launch</b> — white-label theming and SSO</li></ul>",
            "Please leave comments by EOD Wednesday so I can consolidate. Marcus, can you sanity-check the engineering estimates on slide 9?",
            "Thanks,<br>Priya",
          ),
          att: [{ name: "Q4-Roadmap-draft.pdf", size: 2_412_000, hue: 214, title: "Q4 Roadmap Review (Draft)", lines: ["Fieldwork - Product & Engineering", "", "## Themes", "1. Inbox speed: p95 load under 400ms on mobile.", "2. Smarter triage: categories v2 and snooze suggestions.", "3. Bloomly launch: white-label theming and SSO.", "", "## Milestones", "Oct 20 - Design freeze for categories v2", "Nov 3 - Bloomly beta with 3 pilot teams", "Nov 24 - Performance budget enforced in CI", "Dec 8 - Q4 retro and planning"] }],
        },
        {
          from: "marcus",
          to: ["priya"],
          cc: ["me", "sofia", "dan"],
          t: d(2, 11, 2),
          body: p(
            "Estimates on slide 9 look about right. I'd bump SSO from 2 to 3 sprints — the SAML edge cases always bite us.",
            "Also we should call out the dependency on the new sync service for snooze suggestions.",
            "— M",
          ),
        },
        {
          from: "sofia",
          to: ["priya"],
          cc: ["me", "marcus", "dan"],
          t: d(1, 16, 40),
          body: p(
            "Love the framing. One suggestion: slide 4 would land better with the before/after of the inbox load times instead of the table. Happy to mock it up.",
            "Sofia",
          ),
        },
        {
          from: "priya",
          to: ["me", "marcus", "sofia"],
          cc: ["dan"],
          t: m(41),
          body: p(
            "Thanks everyone — final version attached. I took Marcus's estimate change and Sofia's chart (it's so much better).",
            "Alex, could you own the 5-minute demo of the new compose flow at the start? I think showing it live will set the tone.",
            "See you Thursday,<br>Priya",
          ),
          att: [
            { name: "Q4-Roadmap-v3-final.pdf", size: 2_874_000, hue: 220, title: "Q4 Roadmap Review", lines: ["Fieldwork - Product & Engineering - Final", "", "## Themes", "1. Inbox speed: p95 load under 400ms on mobile.", "2. Smarter triage: categories v2 and snooze suggestions.", "3. Bloomly launch: white-label theming and SSO (3 sprints).", "", "## Demo", "Alex - live walkthrough of the new compose flow (5 min).", "", "## Risks", "Sync service dependency for snooze suggestions.", "SAML edge cases for enterprise SSO."] },
            { name: "load-times-chart.png", size: 318_000, hue: 210, title: "p95 inbox load (ms)" },
          ],
        },
      ],
    },
    {
      subject: `Invitation: Design review — Bloomly onboarding @ ${new Date(at(1, 14, 0, now)).toLocaleDateString("en-US", { weekday: "short" })} 2pm`,
      labels: [L.work],
      unread: true,
      msgs: [
        {
          from: "priya",
          t: m(95),
          body: p("Let's walk through the onboarding prototype with Rachel's team before we lock scope. Agenda: current flow (10m), proposed changes (20m), open questions (15m)."),
          invite: {
            title: "Design review — Bloomly onboarding",
            start: at(1, 14, 0, now),
            end: at(1, 14, 45, now),
            location: "Fieldwork HQ · Room Juniper",
            videoLink: "meet.fieldwork.co/bloomly-review",
            guests: ["me", "sofia", "rachel", "marcus"],
          },
          att: [{ name: "invite.ics", size: 2_100 }],
        },
      ],
    },
    {
      subject: "Thanksgiving plans 🦃",
      labels: [L.family],
      unread: true,
      msgs: [
        {
          from: "mom",
          to: ["me", "jamie"],
          t: d(1, 19, 22),
          body: p(
            "Hi sweethearts,",
            "Dad and I were thinking we'd do Thanksgiving here this year, the usual 3pm. Grandma's coming up on Wednesday so we'll have a full house!",
            "Can you each let me know (1) when you're getting in and (2) what you want to bring? I'm doing the turkey and the stuffing, obviously.",
            "Love you both,<br>Mom ❤️",
          ),
        },
        {
          from: "me",
          to: ["mom", "jamie"],
          t: d(1, 21, 5),
          status: "sent",
          body: p("Count me in! I'm flying in Wednesday night, lands around 8:40pm. I'll bring the green bean thing and a couple bottles of wine.", "Alex"),
        },
        {
          from: "jamie",
          to: ["mom", "me"],
          t: m(190),
          body: p(
            "I can bring pie (apple AND pumpkin, I'm not choosing). Driving up Thursday morning, should be there by noon.",
            "Alex — want me to grab you from the airport Wed? I'll be in town for work anyway.",
            "J",
          ),
        },
      ],
    },
    {
      subject: "Re: Onboarding flow feedback",
      labels: [L.work],
      imp: true,
      unread: true,
      msgs: [
        {
          from: "me",
          to: ["rachel"],
          cc: ["priya"],
          t: d(3, 15, 30),
          status: "sent",
          body: p(
            "Hi Rachel,",
            "Thanks again for the session on Monday. I've summarized what we heard into three changes for the onboarding flow: shorter workspace setup, a skippable import step, and a progress checklist on the home screen.",
            "Could your team review the prototype and send back any concerns by Friday?",
            "Best,<br>Alex",
          ),
        },
        {
          from: "rachel",
          to: ["me"],
          cc: ["priya"],
          t: m(320),
          body: p(
            "Hi Alex,",
            "The team went through the prototype yesterday — overall really positive. A few notes:",
            "<ol><li>The skippable import is great, but we'd like a reminder after day 3 if they skipped it.</li><li>Our admins want to set the default workspace name from SSO.</li><li>Could the checklist be dismissible? Power users found it a bit persistent.</li></ol>",
            "Detailed notes from our support lead are attached. Happy to jump on a call Thursday if easier.",
            "Rachel Kim<br>VP Customer Experience, Bloomly",
          ),
          att: [{ name: "Bloomly-onboarding-notes.pdf", size: 486_000, hue: 330, title: "Onboarding Prototype - Feedback", lines: ["Bloomly Customer Experience", "", "## What worked", "Skippable import step - 9/10 testers completed setup faster.", "Progress checklist made next steps obvious.", "", "## Requests", "Reminder on day 3 if import was skipped.", "Default workspace name pulled from SSO.", "Dismissible checklist for power users.", "", "## Quotes", "\"This is the first setup flow I didn't have to read docs for.\""] }],
        },
      ],
    },
    {
      subject: "Design crit: new nav explorations",
      labels: [L.work],
      unread: true,
      msgs: [
        {
          from: "sofia",
          to: ["me", "theo"],
          t: m(380),
          body: p(
            "Hey! Three directions for the collapsed nav, attached. My favorite is B (the rail with hover-expand) but I want to hear your take before Thursday.",
            "Specifically: does the label section still make sense when collapsed, or do we hide it entirely?",
            "🙏 Sofia",
          ),
          att: [
            { name: "nav-explorations-A.png", size: 1_204_000, hue: 200 },
            { name: "nav-explorations-B.png", size: 1_388_000, hue: 260 },
            { name: "nav-explorations-C.png", size: 1_120_000, hue: 150 },
          ],
        },
      ],
    },
    {
      subject: "Photos from Big Sur 📸",
      labels: [L.personal],
      star: true,
      msgs: [
        {
          from: "chris",
          to: ["me", "emma"],
          t: d(1, 12, 48),
          body: p(
            "Finally edited the trip photos! The McWay Falls one came out unreal. Full album is on my drive but here are my favorites.",
            "Same time next year? I'm thinking Mendocino.",
            "Chris",
          ),
          att: [
            { name: "IMG_2041.jpg", size: 3_402_000, hue: 28 },
            { name: "IMG_2047-coast.jpg", size: 2_980_000, hue: 195 },
            { name: "IMG_2063.jpg", size: 3_115_000, hue: 12 },
            { name: "IMG_2088-beach.jpg", size: 2_744_000, hue: 210 },
          ],
        },
        {
          from: "me",
          to: ["chris", "emma"],
          t: d(1, 13, 30),
          status: "sent",
          body: p("These are incredible 😍 The coast one is going straight on my wall. Mendocino is a yes from me."),
        },
      ],
    },
    {
      subject: "Lease renewal for Unit 4B — action needed by Oct 31",
      labels: [L.finance],
      imp: true,
      unread: true,
      msgs: [
        {
          from: "landlord",
          t: d(1, 10, 5),
          body: p(
            "Dear Alex Morgan,",
            "Your current lease for <b>148 Franklin St, Unit 4B</b> ends on December 31, 2026. We're pleased to offer a renewal for a 12-month term at $3,240/month (a 2.8% adjustment), or a 24-month term at $3,180/month.",
            "Please review the attached renewal agreement and sign by <b>October 31</b> to lock in these rates. If you plan to move out, we require 60 days' written notice.",
            "Warm regards,<br>Greenpoint Property Management<br>(718) 555-0100",
          ),
          att: [{ name: "Lease-Renewal-4B-2027.pdf", size: 612_000, hue: 120, title: "Residential Lease Renewal Agreement", lines: ["Premises: 148 Franklin St, Unit 4B, Brooklyn, NY", "Tenant: Alex Morgan", "", "## Option A - 12 months", "Monthly rent: $3,240.00. Term: Jan 1, 2027 - Dec 31, 2027.", "", "## Option B - 24 months", "Monthly rent: $3,180.00. Term: Jan 1, 2027 - Dec 31, 2028.", "", "Please sign and return by October 31, 2026."] }],
        },
      ],
    },
    {
      subject: "All-hands moved to Thursday 4pm",
      labels: [L.work],
      msgs: [
        {
          from: "dan",
          to: ["team"],
          t: d(1, 8, 30),
          body: p(
            "Team —",
            "Quick logistics note: this month's all-hands moves to <b>Thursday at 4pm</b> so we don't collide with the Bloomly review. Same room, same snacks.",
            "We'll cover Q3 results, the hiring plan, and a sneak peek at what design has been cooking. Bring questions — the anonymous form is open until Wednesday.",
            "Dan",
          ),
          invite: {
            title: "Fieldwork all-hands",
            start: nextWeekday(4, 16, now),
            end: nextWeekday(4, 16, now) + 60 * MINUTE,
            location: "Fieldwork HQ · The Commons",
            videoLink: "meet.fieldwork.co/all-hands",
            guests: ["me", "priya", "marcus", "sofia", "hannah", "theo"],
          },
          att: [{ name: "invite.ics", size: 2_340 }],
        },
      ],
    },
    {
      subject: "Open enrollment closes Friday",
      labels: [L.work],
      msgs: [
        {
          from: "hannah",
          to: ["team"],
          t: d(2, 14, 0),
          body: p(
            "Hi everyone,",
            "Reminder that benefits open enrollment closes this <b>Friday at 5pm PT</b>. If you don't make changes, your current elections roll over — except FSA, which you need to re-elect every year.",
            "New this year: an additional vision plan and a $50/month wellness stipend. Details in the attached guide.",
            "Hannah · People Ops",
          ),
          att: [{ name: "2027-Benefits-Guide.pdf", size: 1_840_000, hue: 160, title: "2027 Benefits Guide", lines: ["Fieldwork People Operations", "", "## Enrollment window", "Closes Friday at 5pm PT.", "", "## What's new", "Additional vision plan (VSP Choice).", "$50/month wellness stipend.", "Expanded parental leave: 20 weeks."] }],
        },
      ],
    },
    {
      subject: "PR #482: Keyboard navigation for the inbox",
      labels: [L.work],
      msgs: [
        {
          from: "theo",
          to: ["me"],
          t: d(2, 17, 12),
          body: p(
            "Hey Alex — got j/k, x, s and e working. Two open questions before I merge:",
            "1. Should <code>Enter</code> on a focused row open the thread even when nothing is selected? (Gmail does.)<br>2. When you archive from inside a thread, do we go back to the list or auto-advance?",
            "Theo",
          ),
        },
        {
          from: "me",
          to: ["theo"],
          t: d(2, 18, 3),
          status: "sent",
          body: p("1. Yes — Enter and o both open.<br>2. Back to the list by default, but let's add a setting for auto-advance (newer/older). Power users love it.", "Ship it! 🚢"),
        },
        {
          from: "theo",
          to: ["me"],
          t: d(1, 9, 41),
          body: p("Done and merged. Also added <code>?</code> to show the shortcut cheat sheet. Let me know if anything feels off."),
        },
      ],
    },
    {
      subject: "Senior Product Designer role at Tandem",
      msgs: [
        {
          from: "nadia",
          t: d(4, 11, 20),
          body: p(
            "Hi Alex,",
            "I came across your work on the Fieldwork inbox redesign — really thoughtful stuff. I'm hiring a Senior Product Designer for Tandem's collaboration team (remote-friendly, NYC hub).",
            "Would you be open to a 20-minute chat next week? No pressure at all — happy to share more about the role over email first.",
            "Best,<br>Nadia Haddad<br>Senior Recruiter, Tandem",
          ),
        },
      ],
    },
    {
      subject: "Book club: November pick?",
      labels: [L.personal],
      msgs: [
        {
          from: "olivia",
          to: ["me", "emma", "chris"],
          t: d(3, 20, 10),
          body: p("Okay book people! Nominations for November. I'm putting forward <i>Tomorrow, and Tomorrow, and Tomorrow</i> — I know some of you read it but it's worth a reread.", "Vote by Sunday?"),
        },
        {
          from: "emma",
          to: ["olivia", "me", "chris"],
          t: d(3, 21, 48),
          body: p("I'd love something shorter after last month's 700-pager 😅 What about <i>Small Things Like These</i>?"),
        },
        {
          from: "chris",
          to: ["olivia", "me", "emma"],
          t: d(2, 8, 15),
          body: p("+1 to Small Things. Also volunteering my place for the meetup — I'll make the good lasagna."),
        },
      ],
    },
    {
      subject: "Invoice #2026-087 — Brand illustrations",
      labels: [L.finance, L.work],
      msgs: [
        {
          from: "jonas",
          t: d(5, 9, 0),
          body: p(
            "Hi Alex,",
            "Please find attached the invoice for the empty-state illustration set (12 illustrations, 2 revision rounds). Payment terms are net 15.",
            "It was a pleasure working on these — the team's feedback was super clear.",
            "Viele Grüße,<br>Jonas",
          ),
          att: [
            { name: "Invoice-2026-087.pdf", size: 98_000, hue: 40, title: "Invoice #2026-087", lines: ["Weber Studio - Jonas Weber", "Billed to: Fieldwork Inc.", "", "## Line items", "Empty-state illustrations (12) ........ EUR 3,600.00", "Revision rounds (2) ................... EUR 400.00", "", "Total due: EUR 4,000.00", "Terms: Net 15"] },
            { name: "illustrations-final.zip", size: 18_400_000 },
          ],
        },
        {
          from: "me",
          to: ["jonas"],
          t: d(4, 16, 22),
          status: "sent",
          body: p("Paid this morning — should land in 1–2 business days. Thanks Jonas, they look fantastic!"),
        },
      ],
    },
    {
      subject: "Did you see this?? 😂",
      labels: [L.family],
      msgs: [
        {
          from: "jamie",
          t: d(3, 13, 2),
          body: p("Dad tried to send me a voice memo and instead sent a 4-minute video of his pocket. He narrated the whole grocery trip. Iconic.", "Forwarding for posterity."),
        },
      ],
    },
    {
      subject: "Coffee next week?",
      labels: [L.personal],
      msgs: [
        {
          from: "olivia",
          t: d(5, 18, 30),
          body: p("Hey stranger! Want to grab coffee next week? I'm free Tuesday or Wednesday morning. Fieldnotes on Bedford?"),
        },
        {
          from: "me",
          to: ["olivia"],
          t: d(5, 19, 2),
          status: "sent",
          body: p("Yes!! Wednesday 9am at Fieldnotes works great. I'll be the one with three oat lattes."),
        },
        {
          from: "olivia",
          t: d(5, 19, 15),
          body: p("Perfect, see you then ☕"),
        },
      ],
    },
    {
      subject: "Car insurance renewal",
      snooze: at(1, 8, 0, now),
      inbox: false,
      msgs: [
        {
          from: "dad",
          t: d(6, 10, 12),
          body: p(
            "Hi kiddo,",
            "The car insurance renewal came to the house again (you're still on our multi-car policy). It's $412 for the six months. Can you Venmo me or do you want to switch it to your own policy?",
            "Love, Dad",
          ),
        },
      ],
    },
    {
      subject: "Ideas for the portfolio refresh",
      labels: [L.personal],
      msgs: [
        {
          from: "me",
          to: ["me"],
          t: d(6, 22, 40),
          status: "sent",
          body: p(
            "Notes to self:",
            "<ul><li>Lead with the inbox redesign case study — numbers first (38% faster triage)</li><li>Cut the 2019 projects</li><li>Add a short Loom walkthrough per case study</li><li>Ask Sofia for the before/after Figma frames</li></ul>",
          ),
        },
      ],
    },
    {
      subject: "Offsite recap + photos",
      labels: [L.work],
      inbox: false,
      msgs: [
        {
          from: "hannah",
          to: ["team"],
          t: d(21, 16, 0),
          body: p("What a week! Thank you all for making the Lisbon offsite so special. Photos are attached and the full album is in the shared drive. The feedback survey closes Friday."),
          att: [
            { name: "offsite-group.jpg", size: 4_200_000, hue: 34 },
            { name: "offsite-dinner.jpg", size: 3_800_000, hue: 15 },
          ],
        },
      ],
    },
    {
      subject: "Kickoff notes — Bloomly × Fieldwork",
      labels: [L.work],
      inbox: false,
      msgs: [
        {
          from: "rachel",
          to: ["me", "priya"],
          t: d(33, 11, 0),
          body: p("Thanks for a great kickoff! Notes and next steps attached. Looking forward to working together."),
          att: [{ name: "Kickoff-notes.pdf", size: 220_000, hue: 300, title: "Bloomly x Fieldwork Kickoff", lines: ["## Goals", "Launch white-labeled inbox for Bloomly's 2,400 support agents.", "", "## Timeline", "Discovery: 3 weeks", "Prototype: 4 weeks", "Pilot: Nov 3"] }],
        },
      ],
    },
    {
      subject: "Welcome to Fieldwork! 🎉",
      star: true,
      inbox: false,
      msgs: [
        {
          from: "hannah",
          t: at(-372, 9, 0, now),
          body: p("Hi Alex, welcome aboard! Your laptop will arrive Monday and your first week schedule is attached. We're so excited to have you on the design team."),
          att: [{ name: "First-week-schedule.pdf", size: 140_000, hue: 90, title: "Your First Week", lines: ["Monday - Laptop setup, team lunch", "Tuesday - Product deep dive with Priya", "Wednesday - Design system walkthrough", "Thursday - Shadow customer calls", "Friday - Coffee chats + first retro"] }],
        },
      ],
    },
    {
      subject: "Apartment move checklist",
      labels: [L.family],
      inbox: false,
      msgs: [
        {
          from: "mom",
          t: at(-400, 18, 0, now),
          body: p("I made you a little checklist for the move, don't laugh. Utilities, change of address, renter's insurance. Call me when you're settled!"),
        },
      ],
    },
    {
      subject: "Lunch tomorrow?",
      inbox: false,
      trash: true,
      msgs: [{ from: "theo", t: d(8, 11, 30), body: p("Ramen at 12:30? Marcus is in.") }],
    },

    /* ---------------- Forums ---------------- */
    {
      subject: "[Design Guild] Proposal: shared icon library",
      cat: "forums",
      msgs: [
        {
          from: "guild",
          t: d(1, 15, 20),
          body: p("<b>Sofia Alvarez</b> posted:", "Proposal: let's consolidate our three icon sets into one shared library with 20/24px grids. I've drafted guidelines — comments welcome in the thread before Friday's guild sync."),
        },
      ],
    },
    {
      subject: "Weekly digest: 12 new discussions in Interaction Design",
      cat: "forums",
      unread: true,
      msgs: [
        {
          from: "ux",
          t: d(2, 6, 0),
          body: p("Top discussions this week:", "<ul><li>How do you handle undo for destructive bulk actions? (48 replies)</li><li>Hover-expand nav rails: delightful or disorienting? (31 replies)</li><li>Designing empty states that actually help (27 replies)</li></ul>"),
        },
      ],
    },

    /* ---------------- Promotions ---------------- */
    {
      subject: "48 hours only: 30% off shells & insulated jackets",
      cat: "promotions",
      unread: true,
      msgs: [
        {
          from: "kestrel",
          t: m(150),
          body: promo({ brand: "KESTREL OUTDOOR CO.", color: "#2f6b3a", hue: 140, eyebrow: "Fall layering event", headline: "Weatherproof everything. 30% off.", sub: "Our best-selling Alpine Shell and Ridgeline insulated jackets are 30% off for the next 48 hours. Free shipping and free returns, always.", cta: "Shop the sale", href: "https://kestreloutdoor.com/sale", items: [{ name: "Alpine Shell", price: "$168 $240", hue: 150 }, { name: "Ridgeline Puffer", price: "$203 $290", hue: 30 }, { name: "Trail Beanie", price: "$24 $34", hue: 200 }] }),
        },
      ],
    },
    {
      subject: "New harvest: Ethiopia Guji is back ☕",
      cat: "promotions",
      unread: true,
      msgs: [
        {
          from: "coffee",
          t: d(1, 7, 30),
          body: promo({ brand: "Fieldnotes Coffee", color: "#8a4b2a", hue: 25, eyebrow: "Limited release", headline: "Ethiopia Guji, washed. Notes of peach, jasmine & honey.", sub: "Our most-requested single origin is back for a few weeks only. Subscribers get first dibs — and 15% off their next bag with code GUJI15.", cta: "Order a bag", href: "https://fieldnotescoffee.com/guji" }),
        },
      ],
    },
    {
      subject: "Fall fare sale: Lisbon from $389 round trip",
      cat: "promotions",
      labels: [L.travel],
      msgs: [
        {
          from: "northwind",
          t: d(1, 6, 15),
          body: promo({ brand: "NORTHWIND", color: "#0b4f9c", hue: 205, eyebrow: "Fall fare sale", headline: "Europe is calling. Fares from $389.", sub: "Book by Sunday for travel November through March. Lisbon, Porto, Barcelona and more — with a free checked bag on every fare.", cta: "Find flights", href: "https://northwindair.com/deals" }),
        },
      ],
    },
    {
      subject: "Your weekend escape, from $129/night",
      cat: "promotions",
      msgs: [
        {
          from: "staybright",
          t: d(2, 10, 0),
          body: promo({ brand: "Staybright", color: "#c2185b", hue: 330, headline: "Hudson Valley weekends from $129", sub: "Fall foliage, fireplaces, and late checkout on us. Members save an extra 10%.", cta: "See hotels", href: "https://staybright.com/hudson" }),
        },
      ],
    },
    {
      subject: "$15 off your next 3 orders 🍜",
      cat: "promotions",
      unread: true,
      msgs: [
        {
          from: "forkful",
          t: d(2, 17, 45),
          body: promo({ brand: "forkful", color: "#e8590c", hue: 18, headline: "We miss you! Here's $15 off.", sub: "Your favorites from Pho Saigon and Sushi Ko are just a tap away. Offer applies to your next 3 orders over $25.", cta: "Order now", href: "https://forkful.app/promo" }),
        },
      ],
    },
    {
      subject: "Picked for you: 6 new releases in Design",
      cat: "promotions",
      msgs: [
        {
          from: "lumen",
          t: d(3, 9, 0),
          body: promo({ brand: "Lumen Books", color: "#5b3cc4", hue: 260, headline: "New in Design & Technology", sub: "From a history of the user interface to a field guide for calm software — six new books we think you'll love.", cta: "Browse picks", href: "https://lumenbooks.com/picks", items: [{ name: "Calm Interfaces", price: "$28", hue: 270 }, { name: "The Grid, Revisited", price: "$32", hue: 190 }, { name: "Small Software", price: "$24", hue: 340 }] }),
        },
      ],
    },
    {
      subject: "Introducing Canvasly 4: multiplayer prototyping",
      cat: "promotions",
      msgs: [
        {
          from: "canvasly",
          t: d(4, 12, 0),
          body: promo({ brand: "Canvasly", color: "#7c3aed", hue: 275, eyebrow: "Product update", headline: "Prototype together, in real time.", sub: "Canvasly 4 brings live cursors to prototypes, variables in interactions, and a brand-new dev handoff mode. Available today on all plans.", cta: "See what's new", href: "https://canvasly.design/4" }),
        },
      ],
    },
    {
      subject: "3 months of Premium for $0",
      cat: "promotions",
      msgs: [
        {
          from: "tunewave",
          t: d(6, 14, 0),
          body: promo({ brand: "Tunewave", color: "#1db954", hue: 150, headline: "Come back to Premium. On us.", sub: "Ad-free listening, offline downloads, and lossless audio — free for 3 months. Cancel anytime.", cta: "Get 3 months free", href: "https://tunewave.fm/premium" }),
        },
      ],
    },
    {
      subject: "Last chance: 50% off clearance",
      cat: "promotions",
      inbox: false,
      trash: true,
      msgs: [
        {
          from: "kestrel",
          t: d(9, 8, 0),
          body: promo({ brand: "KESTREL OUTDOOR CO.", color: "#2f6b3a", hue: 90, headline: "Clearance ends tonight", sub: "Up to 50% off last season's gear while it lasts.", cta: "Shop clearance", href: "https://kestreloutdoor.com/clearance" }),
        },
      ],
    },

    /* ---------------- Social ---------------- */
    {
      subject: "Priya Raman endorsed you for Interaction Design",
      cat: "social",
      unread: true,
      msgs: [
        {
          from: "connectly",
          t: m(260),
          body: notice({ brand: "connectly", color: "#0a66c2", title: "Priya Raman endorsed you for <b>Interaction Design</b>", body: "Priya Raman, Head of Product at Fieldwork, endorsed you. You now have 42 endorsements for Interaction Design.", cta: "View profile", href: "https://connectly.com/in/alexmorgan", meta: "You are receiving notification emails from Connectly. <a href='#unsubscribe'>Unsubscribe</a>." }),
        },
      ],
    },
    {
      subject: "You appeared in 34 searches this week",
      cat: "social",
      msgs: [
        {
          from: "connectly",
          t: d(2, 7, 0),
          body: notice({ brand: "connectly", color: "#0a66c2", title: "You appeared in 34 searches this week", body: "Recruiters from Tandem, Canvasly and 4 other companies found you through searches for <i>product designer</i>.", cta: "See all searches", href: "https://connectly.com/me/search-appearances" }),
        },
      ],
    },
    {
      subject: "Design Systems NYC: Fall meetup — are you going?",
      cat: "social",
      unread: true,
      msgs: [
        {
          from: "meetwell",
          t: d(1, 18, 0),
          body: notice({ brand: "Meetwell", color: "#e0245e", title: "Design Systems NYC — Fall Meetup", body: "<b>Thu, Oct 22 · 6:30 PM</b><br>Canvasly HQ, 200 Park Ave S<br><br>Talks on token pipelines, accessible color, and a panel on scaling design systems at startups. 142 people are going.", cta: "RSVP", href: "https://meetwell.com/dsnyc/fall" }),
        },
      ],
    },
    {
      subject: "chris.patel tagged you in a photo",
      cat: "social",
      unread: true,
      msgs: [
        {
          from: "lumio",
          t: d(1, 13, 5),
          body: notice({ brand: "Lumio", color: "#d6249f", title: "chris.patel tagged you in a photo", body: `<img alt="" src="${svgDataUrl(artSvg(195, "ocean"))}" style="width:100%;max-width:360px;border-radius:10px;display:block;margin:4px 0 10px"/>"Big Sur crew 🌊 #pch #roadtrip"`, cta: "See photo", href: "https://lumio.social/p/bigsur" }),
        },
      ],
    },
    {
      subject: "Emma gave you kudos on Morning Ride",
      cat: "social",
      msgs: [
        {
          from: "ridewell",
          t: d(4, 9, 30),
          body: notice({ brand: "Ridewell", color: "#fc4c02", title: "Emma Rodriguez gave you kudos 👏", body: "On your activity <b>Morning Ride</b> · 32.4 km · 1h 18m · 412 m elevation", cta: "View activity", href: "https://ridewell.app/activities/88231" }),
        },
      ],
    },

    /* ---------------- Updates ---------------- */
    {
      subject: "[fieldwork/web] Review requested: Empty state illustrations (#491)",
      cat: "updates",
      labels: [L.work],
      unread: true,
      msgs: [
        {
          from: "forge",
          t: m(55),
          body: forgeMail("fieldwork/web", "Empty state illustrations", "<p><b>@theo-martin</b> requested your review on this pull request.</p><p>Adds 12 illustrations from Weber Studio to the empty states for Inbox, Search, Trash, Spam, Snoozed and Drafts. Lazy-loaded, 18kb total.</p><p style='font-family:monospace;font-size:12px;background:#f6f8fa;padding:8px;border-radius:6px'>+ 412 −38 · 14 files changed</p>", 491),
        },
      ],
    },
    {
      subject: "[fieldwork/web] Merged: Keyboard navigation for the inbox (#482)",
      cat: "updates",
      labels: [L.work],
      msgs: [
        {
          from: "forge",
          t: d(1, 9, 44),
          body: forgeMail("fieldwork/web", "Keyboard navigation for the inbox", "<p>Merged #482 into <code>main</code>.</p><p>j/k navigation, x to select, s to star, e to archive, # to delete and ? for the shortcut sheet.</p>", 482),
        },
      ],
    },
    {
      subject: "Your package is out for delivery",
      cat: "updates",
      unread: true,
      msgs: [
        {
          from: "parcel",
          t: m(230),
          body: notice({ brand: "Parcelpoint", color: "#6d28d9", title: "Out for delivery today 🚚", body: "Your order from <b>Kestrel Outdoor Co.</b> (Alpine Shell, Moss, M) is out for delivery and should arrive by 8 PM.<br><br>Tracking number: <b>PP 4419 2087 6631</b>", cta: "Track package", href: "https://parcelpoint.com/t/PP441920876631" }),
        },
      ],
    },
    {
      subject: "Security alert: New sign-in on Mac",
      cat: "updates",
      unread: true,
      msgs: [
        {
          from: "security",
          t: m(480),
          body: notice({ brand: "Fieldwork Workspace", color: "#0b57d0", title: "New sign-in to your account", body: `We noticed a new sign-in to <b>${ME.email}</b> on a Mac device.<br><br><b>Brooklyn, NY, USA</b> · Chrome on macOS<br><br>If this was you, you don't need to do anything. If not, we'll help you secure your account.`, cta: "Check activity", href: "https://accounts.fieldwork.co/activity", meta: "You received this email to let you know about important changes to your account and services." }),
        },
      ],
    },
    {
      subject: "Your October statement is ready",
      cat: "updates",
      labels: [L.finance],
      msgs: [
        {
          from: "bank",
          t: d(2, 6, 30),
          body: notice({ brand: "Harbor Bank", color: "#004b87", title: "Your statement is ready", body: "Your October statement for Everyday Checking (····4821) is now available. Ending balance: <b>$8,214.37</b>.", cta: "View statement", href: "https://harborbank.com/statements" }),
          att: [{ name: "Statement-Oct-2026.pdf", size: 184_000, hue: 210, title: "Harbor Bank - Everyday Checking ****4821", lines: ["Statement period: Sep 14 - Oct 13, 2026", "", "Beginning balance: $7,902.11", "Deposits: $6,850.00", "Withdrawals: $6,537.74", "Ending balance: $8,214.37"] }],
        },
      ],
    },
    {
      subject: "Your bill of $84.12 is due Oct 28",
      cat: "updates",
      labels: [L.finance],
      msgs: [
        {
          from: "power",
          t: d(3, 8, 0),
          body: notice({ brand: "Bright Power & Gas", color: "#f59f00", title: "Your bill is ready: $84.12", body: "Billing period Sep 10 – Oct 9 · 312 kWh<br>Due date: <b>October 28</b><br><br>You used 8% less energy than last month. Nice!", cta: "Pay bill", href: "https://brightpower.com/pay" }),
        },
      ],
    },
    {
      subject: `Appointment reminder: ${new Date(dentistAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at 9:30 AM`,
      cat: "updates",
      msgs: [
        {
          from: "dentist",
          t: d(2, 12, 0),
          body: p("Hi Alex,", `This is a reminder of your cleaning appointment with Dr. Sandoval on <b>${new Date(dentistAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at 9:30 AM</b>.`, "Reply C to confirm or call (718) 555-0177 to reschedule.", "Bayside Dental · 410 Bay Ridge Pkwy"),
          invite: {
            title: "Dental cleaning — Dr. Sandoval",
            start: dentistAt,
            end: dentistAt + 45 * MINUTE,
            location: "Bayside Dental · 410 Bay Ridge Pkwy",
            guests: ["me"],
          },
        },
      ],
    },
    {
      subject: "Your trip to Lisbon: confirmation NW4K7Q",
      cat: "updates",
      labels: [L.travel],
      star: true,
      inbox: false,
      msgs: [
        {
          from: "northwind",
          t: d(40, 14, 0),
          body: notice({ brand: "NORTHWIND", color: "#0b4f9c", title: "You're going to Lisbon! ✈️", body: "<b>Confirmation: NW4K7Q</b><br><br>JFK → LIS · NW 84 · Sep 21, 7:45 PM<br>LIS → JFK · NW 85 · Sep 27, 12:10 PM<br><br>Passenger: Alex Morgan · Seat 14A", cta: "Manage booking", href: "https://northwindair.com/trips/NW4K7Q" }),
          att: [{ name: "E-ticket-NW4K7Q.pdf", size: 96_000, hue: 205, title: "Northwind E-Ticket NW4K7Q", lines: ["Passenger: Alex Morgan", "", "JFK -> LIS  NW 84  Sep 21  19:45  Seat 14A", "LIS -> JFK  NW 85  Sep 27  12:10  Seat 22C", "", "Baggage: 1 checked bag included"] }],
        },
      ],
    },
    {
      subject: "Your order from Pho Saigon",
      cat: "updates",
      labels: [L.receipts],
      inbox: false,
      msgs: [
        {
          from: "forkful",
          t: d(7, 19, 40),
          body: notice({ brand: "forkful", color: "#e8590c", title: "Receipt · Pho Saigon", body: "1× Pho Tai — $14.50<br>1× Spring rolls — $7.00<br>Delivery — $2.99<br>Tip — $4.00<br><b>Total — $28.49</b>" }),
        },
      ],
    },
    {
      subject: "Your receipt from Tunewave",
      cat: "updates",
      labels: [L.receipts],
      inbox: false,
      msgs: [
        {
          from: "tunewave",
          t: d(14, 3, 0),
          body: notice({ brand: "Tunewave", color: "#1db954", title: "Thanks for your payment", body: "Tunewave Duo · Monthly<br>Amount: <b>$14.99</b><br>Card ending 4821" }),
        },
      ],
    },
    {
      subject: "Tracklane: 3 issues assigned to you",
      cat: "updates",
      labels: [L.work],
      msgs: [
        {
          from: "tracklane",
          t: d(3, 7, 0),
          body: notice({ brand: "Tracklane", color: "#5e6ad2", title: "Your week in Tracklane", body: "<b>FW-1182</b> Snooze picker: custom date & time<br><b>FW-1190</b> Compose: recipient chips keyboard support<br><b>FW-1203</b> Dark mode contrast pass", cta: "Open Tracklane", href: "https://tracklane.io/fieldwork" }),
        },
      ],
    },
    {
      subject: "Webinar: Scaling design ops in 2027",
      cat: "promotions",
      inbox: false,
      trash: true,
      msgs: [
        {
          from: "webinar",
          t: d(10, 10, 0),
          body: promo({ brand: "Opsly", color: "#0f766e", hue: 170, headline: "Scaling design ops in 2027", sub: "Join 2,000+ design leaders for a live session on tooling, rituals and metrics that scale.", cta: "Save my seat", href: "https://opsly.io/webinar" }),
        },
      ],
    },

    /* ---------------- Spam ---------------- */
    {
      subject: "Congratulations!! You've been selected for a $1,000 gift card",
      spam: true,
      inbox: false,
      unread: true,
      msgs: [{ from: "spam1", t: d(1, 3, 12), body: p("<b>CONGRATULATIONS!!!</b>", "You have been randomly selected to receive a <b>$1,000 gift card</b>. Claim within 24 hours or your prize will be given to another winner.", "<a href='https://prize-rewardz.biz/claim'>CLAIM NOW &gt;&gt;</a>") }],
    },
    {
      subject: "Urgent: verify your account to avoid suspension",
      spam: true,
      inbox: false,
      msgs: [{ from: "spam2", t: d(2, 2, 40), body: p("Dear user,", "We detected unusual activity on your mailbox. Your account will be suspended in 12 hours unless you verify your identity.", "<a href='https://fieldw0rk-verify.com/login'>Verify now</a>") }],
    },
    {
      subject: "Make $5,000/week from home (no experience)",
      spam: true,
      inbox: false,
      msgs: [{ from: "spam3", t: d(4, 1, 5), body: p("Hi friend, I made $27,450 last month with this one simple crypto trick that banks HATE. Reply YES to get the free guide.") }],
    },
    {
      subject: "RE: Overdue invoice #88231",
      spam: true,
      inbox: false,
      msgs: [{ from: "spam4", t: d(5, 4, 20), body: p("Please see attached overdue invoice and remit payment immediately to avoid late fees."), att: [{ name: "Invoice_88231.zip", size: 41_000 }] }],
    },
  ];

  const threads: Record<string, Thread> = {};
  const messages: Record<string, Message> = {};
  const addr = (k: Key) => ({ name: CONTACTS[k].name, email: CONTACTS[k].email });

  seeds.forEach((s, i) => {
    const tid = `${(hashString(s.subject) >>> 0).toString(16).padStart(8, "0")}${(i * 2654435761 >>> 0).toString(16).padStart(8, "0")}`.slice(0, 16);
    const labels: string[] = [...(s.labels || [])];
    const allSent = s.msgs.every((mm) => mm.from === "me");
    const toSelf = s.msgs.some((mm) => mm.from === "me" && (mm.to || []).includes("me"));
    const inInbox = s.inbox ?? (!allSent || toSelf);
    if (inInbox && !s.spam && !s.trash && !s.snooze) labels.push("INBOX");
    if (s.snooze || (s.trash && s.inbox !== false)) labels.push("INBOX");
    if (s.spam) labels.push("SPAM");
    if (s.trash) labels.push("TRASH");
    if (s.imp) labels.push("IMPORTANT");
    const msgIds: string[] = [];
    s.msgs.forEach((sm, j) => {
      const id = `${tid}${j.toString(16)}`;
      const status = sm.status ?? (sm.from === "me" ? "sent" : "received");
      const atts: Attachment[] = (sm.att || []).map((a, k) => ({
        id: `${id}_a${k}`,
        name: a.name,
        size: a.size,
        mime: "",
        kind: kindFromName(a.name),
        seed: { hue: a.hue ?? hashString(a.name) % 360, title: a.title, lines: a.lines, rows: a.rows },
      }));
      const msg: Message = {
        id,
        threadId: tid,
        from: addr(sm.from),
        to: (sm.to || ["me"]).map(addr),
        cc: (sm.cc || []).map(addr),
        bcc: [],
        subject: j === 0 ? s.subject : s.subject.startsWith("Re:") ? s.subject : `Re: ${s.subject}`,
        date: sm.t,
        html: sm.body,
        text: htmlToText(sm.body),
        attachments: atts,
        status,
        invite: sm.invite
          ? { ...sm.invite, organizer: addr(sm.from), guests: sm.invite.guests.map(addr) }
          : undefined,
      };
      messages[id] = msg;
      msgIds.push(id);
    });
    threads[tid] = {
      id: tid,
      subject: s.subject,
      messageIds: msgIds,
      labels,
      category: s.cat || "primary",
      starred: !!s.star,
      unread: !!s.unread,
      snoozedUntil: s.snooze,
    };
  });

  /* Drafts, scheduled and other outgoing states */
  const addOutgoing = (o: {
    subject: string;
    to: Key[];
    cc?: Key[];
    html: string;
    t: number;
    status: "draft" | "scheduled";
    scheduledAt?: number;
    replyTo?: string;
    attach?: SeedAtt[];
  }) => {
    let tid = o.replyTo;
    if (!tid) {
      tid = `d${(hashString(o.subject) >>> 0).toString(16).padStart(8, "0")}${Math.floor(o.t / 1000).toString(16)}`.slice(0, 16);
      threads[tid] = { id: tid, subject: o.subject, messageIds: [], labels: [], category: "primary", starred: false, unread: false };
    }
    const id = `${tid}${o.status[0]}${threads[tid].messageIds.length}`;
    messages[id] = {
      id,
      threadId: tid,
      from: addr("me"),
      to: o.to.map(addr),
      cc: (o.cc || []).map(addr),
      bcc: [],
      subject: o.subject,
      date: o.t,
      html: o.html,
      text: htmlToText(o.html),
      attachments: (o.attach || []).map((a, k) => ({ id: `${id}_a${k}`, name: a.name, size: a.size, mime: "", kind: kindFromName(a.name), seed: { hue: a.hue ?? 200, title: a.title, lines: a.lines, rows: a.rows } })),
      status: o.status,
      scheduledAt: o.scheduledAt,
      replyKind: o.replyTo ? "reply" : "new",
    };
    threads[tid].messageIds.push(id);
  };

  const recruiterThread = Object.values(threads).find((t) => t.subject.startsWith("Senior Product Designer"))!;
  addOutgoing({
    subject: "Re: Senior Product Designer role at Tandem",
    to: ["nadia"],
    html: p("Hi Nadia,", "Thanks so much for reaching out — and for the kind words about the inbox work. I'm pretty happy at Fieldwork right now, but I'd be glad to"),
    t: d(3, 22, 10),
    status: "draft",
    replyTo: recruiterThread.id,
  });
  addOutgoing({
    subject: "Portfolio site — copy v2",
    to: [],
    html: p("<b>Hero:</b> I design calm, fast software for people who live in their inbox.", "<b>About:</b> Product designer at Fieldwork. Previously…"),
    t: d(6, 23, 5),
    status: "draft",
  });
  addOutgoing({
    subject: "Flight details for Thanksgiving",
    to: ["mom"],
    cc: ["dad"],
    html: p("Hi Mom & Dad,", "Here are my flight details: NW 1123, lands at 8:40pm on Wednesday the 25th. Jamie's picking me up so don't worry about the airport!"),
    t: m(1500),
    status: "draft",
  });
  addOutgoing({
    subject: "Design team update — week 42",
    to: ["team"],
    html: p(
      "Hi team,",
      "Here's what design shipped this week:",
      "<ul><li>New collapsed nav rail with hover-expand (thanks Sofia!)</li><li>Empty states for every folder, with illustrations from Jonas</li><li>Compose: recipient chips, scheduled send and undo send</li></ul>",
      "Next week: dark mode contrast pass and the Bloomly theming kit.",
      "Alex",
    ),
    t: m(70),
    status: "scheduled",
    scheduledAt: at(1, 8, 0, now),
    attach: [{ name: "week-42-highlights.png", size: 842_000, hue: 230 }],
  });

  const contacts: Record<string, Contact> = {};
  for (const ct of Object.values(CONTACTS)) {
    if (ct.email === ME.email) continue;
    contacts[ct.email.toLowerCase()] = { ...ct, color: colorFor(ct.email) };
  }

  return { threads, messages, contacts, labels: DEFAULT_LABELS.map((l) => ({ ...l })) };
}

/* Simulated incoming mail that arrives during a session. */
export interface LiveMail {
  id: string;
  delay: number;
  from: Key;
  subject: string;
  html: string;
  category: Category;
  labels?: string[];
}

export const LIVE_MAIL: LiveMail[] = [
  {
    id: "live_lunch",
    delay: 50_000,
    from: "sofia",
    subject: "Lunch? 🌮",
    category: "primary",
    html: p("Heading to the taco place at 12:30 with Theo — want us to grab you anything? Al pastor is back on the menu 👀"),
  },
  {
    id: "live_ci",
    delay: 2.5 * MINUTE,
    from: "forge",
    subject: "[fieldwork/web] All checks have passed on #491",
    category: "updates",
    labels: [L.work],
    html: forgeMail("fieldwork/web", "All checks have passed", "<p>✅ build · ✅ unit tests (412) · ✅ visual regression (38 snapshots)</p><p>This pull request is ready to merge once approved.</p>", 491),
  },
  {
    id: "live_shipped",
    delay: 5 * MINUTE,
    from: "parcel",
    subject: "Delivered: your Kestrel Outdoor order",
    category: "updates",
    html: notice({ brand: "Parcelpoint", color: "#6d28d9", title: "Delivered 📦", body: "Your package was left at the front desk at 148 Franklin St." }),
  },
];

export const REPLY_LINES: Record<string, string[]> = {
  default: [
    "Thanks Alex — got it. I'll take a look and get back to you later today.",
    "Sounds good to me! Let's go with that.",
    "Perfect, thank you! This is exactly what I needed.",
    "Appreciate it. Quick follow-up: can we sync for 10 minutes tomorrow to go over the details?",
  ],
  family: ["Love you! Can't wait to see you 🥰", "Sounds great sweetie, thanks for letting us know!", "Got it! Dad says hi."],
};

export const FAMILY_EMAILS = new Set([CONTACTS.mom.email, CONTACTS.dad.email, CONTACTS.jamie.email]);

/** Contacts that can plausibly answer a message (people, not services). */
export const PEOPLE = new Set(
  (["priya", "marcus", "sofia", "dan", "hannah", "theo", "rachel", "jonas", "nadia", "mom", "dad", "jamie", "chris", "emma", "olivia"] as Key[]).map(
    (k) => CONTACTS[k].email,
  ),
);
