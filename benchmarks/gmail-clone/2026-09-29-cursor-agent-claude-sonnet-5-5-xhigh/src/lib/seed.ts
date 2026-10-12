import type { Draft, MailData, Message, Thread } from './types';
import { BOTS, CONTACTS, ME, P, SEED_LABELS } from './people';
import { DAY, HOUR } from './date';
import { att, buildThread, makeClock, promo, quoteBlock, receipt } from './seed-kit';
import type { TS } from './seed-kit';
import { md } from './text';
import { fillThreads } from './seed-fill';

export function buildSeed(now = Date.now()): MailData {
  const at = makeClock(now);
  const list: TS[] = [];

  list.push({
    subject: 'Atlas onboarding flow: v3 prototypes ready for review',
    labels: ['l_work', 'l_atlas'],
    important: true,
    msgs: [
      {
        from: P.tom,
        to: [ME, P.priya],
        at: at(3, 5),
        body: `Hey both,\n\nKenji's team wants to see the onboarding flow before Friday's check-in. Can we lock the three-step version and drop the permissions pre-prompt? Analytics says 41% of testers bail right at the pre-prompt.\n\nPriya, can you get v3 into a clickable prototype? Avery, I need your call on the "skip for now" wording.\n\nTom`,
      },
      {
        from: ME,
        to: [P.tom, P.priya],
        at: at(3, 2, 40),
        body: `Agree on dropping the pre-prompt. Let's ask for permissions in context, right when the user first taps "Add a place".\n\nFor the skip wording I'd go with **"Not now"** instead of "Skip for now". It reads less like a failure and matches the tone we use elsewhere.\n\nPriya, if you can include both variants in the prototype we can A/B them with the next testing batch.`,
      },
      {
        from: P.priya,
        to: [ME, P.tom],
        cc: [P.marcus],
        at: at(0, 0, 14),
        unread: true,
        star: false,
        body: `Hi Avery, Tom,\n\nv3 is ready. Here is what changed since last week:\n\n- Onboarding is down to **three steps** (welcome, pick interests, first place)\n- Permission requests moved into context, with a friendly explainer sheet\n- Both "Not now" and "Skip for now" variants are wired up behind a toggle in the prototype settings\n- New empty states for the map tab\n\nThe PDF has annotated screens and the flow map shows every branch. Marcus, I copied you since the explainer sheet needs a native permission hook, so tell me if that's a problem.\n\nI'm around all morning if you want to walk through it live. It's on the calendar for 11:30 as well.\n\nPriya`,
        att: [
          att('Atlas-onboarding-v3-annotated.pdf', 4300, {
            title: 'Atlas onboarding v3',
            lines: ['Step 1 · Welcome', 'Step 2 · Pick your interests', 'Step 3 · Add your first place', 'Permissions requested in context'],
          }),
          att('flow-map.png', 1180, { art: 31 }),
        ],
      },
    ],
  });

  list.push({
    subject: '[brightlane/atlas-app] Pull request #482: Fix hydration mismatch on onboarding step 2',
    cat: 'updates',
    labels: ['l_work'],
    msgs: [
      {
        from: BOTS.stackhouse,
        at: at(0, 0, 53),
        unread: true,
        mailedBy: 'stackhouse.dev',
        html: `<div style="font-size:14px;line-height:1.55"><p><b>marcus-webb</b> requested your review on this pull request.</p>
<div style="border:1px solid #d0d7de;border-radius:8px;padding:14px 16px;margin:12px 0;background:#f6f8fa;color:#1f2328">
<div style="font-weight:600;font-size:16px">Fix hydration mismatch on onboarding step 2 <span style="color:#6e7781;font-weight:400">#482</span></div>
<div style="color:#57606a;margin-top:6px">marcus-webb wants to merge 3 commits into <code>main</code> from <code>fix/onboarding-hydration</code></div>
<div style="margin-top:10px"><span style="color:#1a7f37;font-weight:600">+42</span> <span style="color:#cf222e;font-weight:600">-17</span> · 4 files changed</div></div>
<p>The interest picker read <code>localStorage</code> during render, which made the server markup differ from the first client paint. This moves the read into an effect and adds a skeleton so the layout doesn't jump.</p>
<pre><code>- const saved = JSON.parse(localStorage.getItem('interests') ?? '[]');
+ const [saved, setSaved] = useState&lt;string[]&gt;([]);
+ useEffect(() =&gt; setSaved(readInterests()), []);</code></pre>
<p><a href="https://example.com" style="color:#0969da">View pull request</a> · <a href="https://example.com" style="color:#0969da">Unsubscribe</a></p></div>`,
      },
    ],
  });

  list.push({
    subject: 'Your September statement is ready',
    cat: 'updates',
    labels: ['l_finance'],
    msgs: [
      {
        from: BOTS.orbit,
        at: at(0, 1, 28),
        unread: true,
        mailedBy: 'orbitbank.com',
        html: receipt({
          brand: 'Orbit Bank',
          accent: '#0b7a5b',
          title: 'Your statement for September 2026',
          lines: [
            ['Checking ••4821 · closing balance', '$8,412.66'],
            ['Deposits', '$6,240.00'],
            ['Withdrawals', '$3,118.42'],
            ['Interest earned', '$4.18'],
          ],
          total: ['Available balance', '$8,412.66'],
          note: 'For your security, statements are never sent as attachments. Sign in to Orbit to download the full PDF.',
        }),
      },
    ],
  });

  list.push({
    subject: 'Postmortem: checkout latency spike (Sep 23)',
    labels: ['l_work'],
    important: true,
    msgs: [
      {
        from: P.marcus,
        to: [ME, P.priya, P.tom],
        at: at(5, 3),
        body: `Team,\n\nDraft postmortem for the Sep 23 checkout slowdown is below. Please add corrections before I publish it to the wiki on Wednesday.\n\n### Summary\np95 checkout latency went from 480 ms to 3.1 s between 14:07 and 14:52 UTC. No orders were lost, but 6.2% of sessions saw a spinner for more than 2 seconds.\n\n### Root cause\nA new promo-eligibility lookup ran once per line item instead of once per cart. With carts of 12+ items that meant a burst of sequential queries against the promotions table, which had no index on \`sku_id\`.\n\n### What went well\n- Alert fired in 3 minutes\n- Rollback took 4 minutes once we found the deploy\n\n### Follow-ups\n1. Add index on \`promotions(sku_id)\`\n2. Batch the eligibility lookup\n3. Add a load test for carts over 20 items to CI`,
      },
      {
        from: P.priya,
        to: [P.marcus, ME, P.tom],
        at: at(5, 1, 20),
        body: `Thanks Marcus. From the design side: the spinner had no timeout state, so people just stared at it. We should show a "still working…" message after 2 seconds and offer a way back to the cart. I can mock that this week.`,
      },
      {
        from: ME,
        to: [P.marcus, P.priya, P.tom],
        at: at(4, 22),
        body: `Great write-up. Two additions:\n\n- The support queue spiked +18 tickets during the window, so I'd list customer impact explicitly\n- Let's decide on a rule: any deploy touching checkout gets a canary at 5% for 30 minutes\n\nPriya, yes please on the timeout state.`,
      },
      {
        from: P.marcus,
        to: [ME, P.priya, P.tom],
        at: at(1, 6, 40),
        unread: true,
        body: `Updated the doc with both points, plus a timeline table. Canary rule is now action item #4 with me as owner.\n\nOne question: do we want to share a customer-facing note? I lean towards a short status page entry that says "resolved" plus a sentence on what we're changing. Thoughts?\n\n\`\`\`\nSELECT sku_id, COUNT(*)\nFROM promotions\nWHERE active = true\nGROUP BY sku_id\nORDER BY 2 DESC\nLIMIT 5;\n\`\`\``,
      },
    ],
  });

  list.push({
    subject: 'Board deck: need your product slides by Thursday EOD',
    labels: ['l_work', 'l_followup'],
    important: true,
    msgs: [
      {
        from: P.elena,
        to: [ME],
        cc: [P.diego],
        at: at(1, 22, 5),
        star: true,
        body: `Avery,\n\nThe board meets on Oct 8, and I'm consolidating the deck this week. I need your product section by **Thursday end of day**. Three slides max:\n\n1. Roadmap: shipped this quarter vs. next\n2. Atlas: status, risks, and the Tidepool timeline\n3. Metrics: activation, retention, and NPS trend\n\nI've attached the working draft so you can match the template. Diego will send the financial section tomorrow.\n\nThanks,\nElena`,
        att: [
          att('Board-Deck-Oct-DRAFT.pptx', 8400, {
            title: 'Brightlane · Board Update',
            lines: ['1. Company highlights', '2. Product (Avery)', '3. Finance (Diego)', '4. Hiring plan', '5. Asks of the board'],
          }),
        ],
      },
      {
        from: P.elena,
        to: [ME],
        at: at(0, 12, 45),
        unread: true,
        body: `Quick follow-up. Kenji asked whether he can sit in for the Atlas segment. I said probably not, but if you have a clean summary of the timeline it might be worth a short pre-read for him.\n\nAlso: are you still okay to present on Oct 8, or is Lisbon prep colliding?`,
      },
    ],
  });

  list.push({
    subject: 'Interview loop: Senior Product Designer (Fri Oct 2)',
    labels: ['l_work'],
    msgs: [
      {
        from: P.hannah,
        to: [ME, P.priya, P.tom],
        at: at(0, 16, 48),
        unread: true,
        body: `Hi all,\n\nMarisol Reyes is coming in on Friday for the final loop for the Senior Product Designer role. Avery, you have the **product sense** conversation. Priya has portfolio deep-dive, Tom covers collaboration.\n\nHer portfolio and the take-home write-up are on the hiring board. Please leave your scorecards within 24 hours of the session, as we debrief Monday.`,
        invite: {
          title: 'Interview: Marisol Reyes · Product sense',
          start: now + 2 * DAY + 2 * HOUR,
          end: now + 2 * DAY + 3 * HOUR,
          where: 'Room Lisbon (2nd floor) · Meet link included',
          organizer: P.hannah,
          attendees: [ME, P.priya, P.tom, P.hannah],
          rsvp: 'none',
        },
      },
    ],
  });

  list.push({
    subject: 'Your package from Kettle & Co was delivered',
    cat: 'updates',
    labels: ['l_receipts'],
    msgs: [
      {
        from: BOTS.parcel,
        at: at(1, 18),
        mailedBy: 'parcelpost.co',
        html: `<div style="max-width:520px;margin:0 auto;background:#fff;color:#1f1f1f;border-radius:12px;border:1px solid #e4e4e4;overflow:hidden">
<div style="background:#1f8a4c;color:#fff;padding:18px 24px;font-weight:700;font-size:18px">Delivered today at 12:41 PM</div>
<div style="padding:20px 24px;font-size:14px;line-height:1.6"><p style="margin:0 0 6px"><b>Kettle &amp; Co</b> · 2 items</p><p style="margin:0;color:#555">Left at front door. Signed by: Front desk.</p>
<p style="margin:16px 0 0;color:#555">Tracking number <b>PX 4420 1187 93</b></p></div></div>`,
      },
    ],
  });

  list.push({
    subject: 'Priya Nair and 4 others commented on your post',
    cat: 'social',
    msgs: [
      {
        from: BOTS.circle,
        at: at(1, 19, 30),
        unread: true,
        unsub: true,
        mailedBy: 'circle-social.com',
        html: promo({
          brand: 'Circle',
          accent: '#e0245e',
          headline: 'Your post is getting attention',
          sub: 'Priya Nair and 4 others commented on "What we learned shipping onboarding in three steps".',
          body: `<div style="border-left:3px solid #e0245e;padding:4px 12px;margin:12px 0;color:#444"><b>Priya Nair</b><br>Cutting the permission pre-prompt was the single biggest win. Data doesn't lie!</div><div style="border-left:3px solid #ddd;padding:4px 12px;margin:12px 0;color:#444"><b>Kenji Watanabe</b><br>Would love to hear how you decided on the copy for the skip button.</div>`,
          cta: 'See all 5 comments',
          footer: 'Circle · You can change how often we email you in your notification settings.',
        }),
      },
    ],
  });

  list.push({
    subject: 'Sunday dinner, and Dad’s old photos',
    labels: ['l_family'],
    msgs: [
      {
        from: P.grace,
        to: [ME, P.theo],
        at: at(2, 15),
        star: true,
        body: `Hello my darlings,\n\nDinner is at 6 on Sunday. I'm making the lamb you like, and Theo has promised to bring dessert (I will believe it when I see it).\n\nI found a box of your father's slides from the Cornwall trip, scanned a few. Look at the hair on him! Avery, you're in the third one, aged about 6, holding a very large crab.\n\nLove,\nMum`,
        att: [
          att('cornwall-1987-01.jpg', 2210, { art: 41 }),
          att('cornwall-1987-02.jpg', 1980, { art: 42 }),
          att('cornwall-1987-03.jpg', 2540, { art: 43 }),
        ],
      },
      {
        from: ME,
        to: [P.grace],
        cc: [P.theo],
        at: at(2, 11, 5),
        body: `Mum, these are wonderful. The crab looks smug about it.\n\nI'll bring wine and the good bread from the bakery near me. Should Nico bring anything?`,
      },
      {
        from: P.grace,
        to: [ME],
        cc: [P.theo],
        at: at(2, 9, 30),
        body: `Just himself! Tell him I've got the ginger cake he liked.\n\nAnd Avery, don't work through dinner this time. 😊`,
      },
    ],
  });

  list.push({
    subject: 'The Weekly Frame #212: The quiet return of skeuomorphism',
    cat: 'promotions',
    msgs: [
      {
        from: BOTS.frame,
        at: at(2, 16, 10),
        unsub: true,
        mailedBy: 'weeklyframe.email',
        html: promo({
          brand: 'The Weekly Frame',
          accent: '#7c4dff',
          headline: 'The quiet return of skeuomorphism',
          sub: 'Soft shadows, real materials, and the case for interfaces that feel touchable again.',
          art: 'art:waves-212-560x260',
          body: `<p style="margin:0 0 10px">This week, we look at why glass, paper, and brushed metal are creeping back into product design, and what it means for accessibility, performance, and delight.</p>`,
          cta: 'Read the essay',
          sections: [
            { title: 'Teardown: a calendar app that feels like a desk', text: 'Every pixel has a physical analogue. Here is what worked and what fell apart.', art: 'art:mesh-213-520x200' },
            { title: 'Tool of the week: variable fonts in Figma-likes', text: 'Ship one file, get nine weights. A practical walkthrough for small teams.' },
            { title: 'Job board', text: 'Design systems lead at a climate startup, staff designer at a fintech, and 14 more roles.' },
          ],
          footer: 'You are receiving The Weekly Frame because you subscribed at weeklyframe.email. Unsubscribe at any time.',
        }),
      },
    ],
  });

  list.push({
    subject: 'Trip confirmed: Lisbon · Oct 13–17',
    cat: 'updates',
    labels: ['l_travel', 'l_receipts'],
    important: true,
    msgs: [
      {
        from: BOTS.wanderly,
        at: at(3, 6, 20),
        mailedBy: 'wanderly.travel',
        html: `<div style="max-width:560px;margin:0 auto;background:#fff;color:#1f1f1f;border-radius:14px;border:1px solid #e4e4e4;overflow:hidden">
<img src="art:city-88-560x220" alt="" style="width:100%;display:block">
<div style="padding:22px 24px"><div style="color:#e66a00;font-weight:800;letter-spacing:.08em;font-size:12px">WANDERLY · CONFIRMATION WL-7Q2KX9</div>
<h2 style="margin:6px 0 4px;font-size:24px">You're going to Lisbon</h2><p style="margin:0 0 16px;color:#555">Oct 13 – Oct 17 · 1 traveler</p>
<table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>
<tr><td style="padding:10px 0;border-top:1px solid #eee;color:#777;width:110px">Outbound</td><td style="padding:10px 0;border-top:1px solid #eee"><b>NW 482</b> · Tue, Oct 13 · 9:45 AM → 1:20 PM<br><span style="color:#666">Seat 14C · 1 checked bag</span></td></tr>
<tr><td style="padding:10px 0;border-top:1px solid #eee;color:#777">Return</td><td style="padding:10px 0;border-top:1px solid #eee"><b>NW 483</b> · Sat, Oct 17 · 3:10 PM → 6:55 PM<br><span style="color:#666">Seat 14C</span></td></tr>
<tr><td style="padding:10px 0;border-top:1px solid #eee;color:#777">Stay</td><td style="padding:10px 0;border-top:1px solid #eee"><b>Casa do Príncipe Real</b>, 4 nights<br><span style="color:#666">Check-in from 3 PM</span></td></tr>
<tr><td style="padding:10px 0;border-top:1px solid #eee;color:#777">Total</td><td style="padding:10px 0;border-top:1px solid #eee"><b>€ 842.60</b></td></tr></tbody></table>
<p style="margin:18px 0 0"><a href="https://example.com" style="display:inline-block;background:#e66a00;color:#fff;padding:12px 24px;border-radius:24px;font-weight:600;text-decoration:none">Manage booking</a></p></div></div>`,
        att: [
          att('Itinerary-LIS-Oct13.pdf', 312, {
            title: 'Itinerary WL-7Q2KX9',
            lines: ['Traveler: Avery Quinn', 'NW 482 · Oct 13 · 09:45', 'NW 483 · Oct 17 · 15:10', 'Casa do Príncipe Real · 4 nights'],
          }),
          att('trip.ics', 3),
        ],
      },
    ],
  });

  list.push({
    subject: 'Invoice #2041 from Northlight Print: please approve',
    labels: ['l_finance', 'l_followup'],
    msgs: [
      {
        from: P.diego,
        to: [ME],
        at: at(3, 9),
        unread: true,
        body: `Hi Avery,\n\nNorthlight sent invoice #2041 for the printed offsite booklets. It's above the PO by €180 because of the rush fee. Can you approve or push back? I'd rather not pay the rush fee since they delivered late.\n\nDiego`,
        att: [
          att('Northlight-Invoice-2041.pdf', 148, {
            title: 'Invoice #2041',
            lines: ['Northlight Print Co.', 'Offsite booklets × 60 · €1,140.00', 'Rush fee · €180.00', 'Total due · €1,320.00'],
          }),
        ],
      },
    ],
  });

  list.push({
    subject: 'Atlas: scope change for phase 2',
    labels: ['l_work', 'l_atlas'],
    important: true,
    msgs: [
      {
        from: P.kenji,
        to: [ME],
        cc: [P.elena],
        at: at(6, 4),
        body: `Dear Avery,\n\nFollowing our product committee meeting, we would like to expand the phase 2 scope to include offline map downloads and shared lists. I understand this affects the timeline, so I would appreciate your estimate.\n\nBest regards,\nKenji Watanabe\nHead of Digital, Tidepool`,
      },
      {
        from: ME,
        to: [P.kenji],
        cc: [P.elena],
        at: at(5, 20),
        body: `Kenji, thanks for the clear note. Offline maps and shared lists are both meaningful. My initial view: offline maps add ~5 weeks, shared lists ~3 weeks, and they overlap on sync infrastructure so we save about a week doing them together.\n\nI'll prepare a formal estimate with options by Monday.`,
      },
      {
        from: ME,
        to: [P.kenji],
        cc: [P.elena, P.marcus],
        at: at(3, 22),
        body: `Kenji, the estimate is attached. Option B (both features, phased) is what we'd recommend. It keeps the October milestone intact for onboarding and moves offline maps to the first half of December.`,
        att: [
          att('Atlas-Phase2-Estimate.pdf', 690, {
            title: 'Atlas · Phase 2 options',
            lines: ['Option A · Offline maps only · 5 weeks', 'Option B · Both, phased · 7 weeks', 'Option C · Both, parallel · 6 weeks (higher risk)'],
          }),
        ],
      },
      {
        from: P.kenji,
        to: [ME],
        cc: [P.elena, P.marcus],
        at: at(2, 5, 30),
        body: `Avery, thank you. Option B looks sensible. Our finance team asks whether the phased approach affects the payment schedule. Could you propose milestones?`,
      },
      {
        from: P.kenji,
        to: [ME],
        cc: [P.elena],
        at: at(1, 3, 12),
        star: true,
        unread: true,
        body: `One more question: can you confirm the December date for offline maps assumes our API freeze on Nov 6? Our engineers say it may slip by a week.`,
      },
    ],
  });

  list.push({
    subject: 'Autumn roast: 25% off through Sunday',
    cat: 'promotions',
    msgs: [
      {
        from: BOTS.kettle,
        at: at(4, 8),
        unsub: true,
        mailedBy: 'kettleandco.coffee',
        html: promo({
          brand: 'Kettle & Co',
          accent: '#b45f06',
          headline: 'Autumn roast is here',
          sub: 'Notes of baked apple, cardamom, and dark honey. 25% off all whole beans through Sunday.',
          art: 'art:food-9-560x260',
          cta: 'Shop the roast',
          sections: [
            { title: 'Single origin: Huila, Colombia', text: 'Bright, syrupy, and dangerously drinkable.' },
            { title: 'Free shipping over $40', text: 'Automatically applied at checkout.' },
          ],
        }),
      },
    ],
  });

  list.push({
    subject: 'Hike Saturday? The weather looks perfect',
    labels: ['l_personal'],
    msgs: [
      {
        from: P.jules,
        to: [ME, P.nico],
        at: at(4, 22),
        body: `Okay, hear me out. Saturday, Ridgeline loop, leave at 7 so we beat the crowds, coffee and pastries after at that place in the village.\n\nForecast is 19°C and clear. I refuse to hear excuses.`,
      },
      {
        from: P.nico,
        to: [P.jules, ME],
        at: at(4, 20, 30),
        body: `I'm in. Avery, you're in too. It's decided.`,
      },
      {
        from: ME,
        to: [P.jules, P.nico],
        at: at(4, 19),
        body: `Fine, fine. I'm in. I'll bring the thermos and the good trail mix. Is 7 firm, or "Jules 7" (i.e. 7:40)?`,
      },
      {
        from: P.jules,
        to: [ME, P.nico],
        at: at(4, 18, 15),
        body: `7:00 sharp. Here's the view from last time, for motivation.`,
        att: [att('ridgeline-sunrise.jpg', 3120, { art: 57 })],
      },
    ],
  });

  list.push({
    subject: 'Priya Nair shared "Q4 Design Principles" with you',
    cat: 'updates',
    msgs: [
      {
        from: BOTS.slate,
        at: at(4, 23, 12),
        unsub: true,
        mailedBy: 'slatedocs.com',
        html: `<div style="max-width:520px;margin:0 auto;background:#fff;color:#1f1f1f;border-radius:12px;border:1px solid #e4e4e4;padding:24px;font-size:14px;line-height:1.6">
<div style="font-weight:800;letter-spacing:.08em;font-size:13px;color:#2563eb;margin-bottom:12px">SLATE DOCS</div>
<p style="margin:0 0 12px"><b>Priya Nair</b> (priya.nair@brightlane.io) invited you to <b>comment</b> on the document:</p>
<div style="border:1px solid #e0e0e0;border-radius:10px;padding:14px 16px;background:#fafafa"><div style="font-weight:700">Q4 Design Principles</div><div style="color:#666;margin-top:4px">"1. Make the next step obvious. 2. Prefer removing to adding. 3. Every empty state is a first impression."</div></div>
<p style="margin:16px 0 0"><a href="https://example.com" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:20px;font-weight:600;text-decoration:none">Open in Slate</a></p></div>`,
      },
    ],
  });

  list.push({
    subject: 'Redlines on MSA v3 (Tidepool)',
    labels: ['l_legal', 'l_atlas'],
    msgs: [
      {
        from: P.rachel,
        to: [ME],
        cc: [P.elena],
        at: at(6, 8),
        body: `Dear Avery,\n\nAttached is our redline of the Tidepool MSA (v3). Substantive changes are highlighted in the summary on page 1:\n\n- §7.2 limitation of liability: capped at 12 months of fees (they asked for uncapped)\n- §9 IP assignment: retained our background IP, granted a perpetual licence for deliverables\n- §11 termination for convenience: now 60 days' notice, with payment for work in progress\n\nI recommend a call before we return this. I have Thursday afternoon open.\n\nKind regards,\nRachel Stein\nStein & Larkin LLP`,
        att: [att('Tidepool-MSA-v3-redline.docx', 214, { title: 'Master Services Agreement', lines: ['§7.2 Limitation of liability', '§9 Intellectual property', '§11 Termination'] })],
      },
    ],
  });

  list.push({
    subject: 'New sign-in to your account from Chrome on macOS',
    cat: 'updates',
    msgs: [
      {
        from: BOTS.it,
        at: at(6, 10),
        mailedBy: 'brightlane.io',
        html: `<div style="max-width:520px;margin:0 auto;background:#fff;color:#1f1f1f;border-radius:12px;border:1px solid #e4e4e4;padding:24px;font-size:14px;line-height:1.6">
<h2 style="margin:0 0 10px;font-size:20px">New sign-in detected</h2>
<p style="margin:0 0 8px">We noticed a sign-in to <b>avery.quinn@brightlane.io</b>:</p>
<p style="margin:0;color:#555">Chrome on macOS · Lisbon, Portugal<br>Yesterday at 9:12 PM</p>
<p style="margin:14px 0 0;color:#555">If this was you, no action needed. If not, <a href="https://example.com" style="color:#0b57d0">secure your account</a>.</p></div>`,
      },
    ],
  });

  list.push({
    subject: 'Launch copy: three headline options',
    labels: ['l_work'],
    msgs: [
      {
        from: P.sofia,
        to: [ME, P.priya],
        at: at(7, 5),
        body: `Okay team, here are the finalists for the Atlas launch page hero. Vote with your hearts:\n\n1. **"Your city, remembered."**\n2. **"Places you love, in your pocket."**\n3. **"Never lose a good corner of the world again."**\n\nI'm partial to #1 (short, warm, and it works on a billboard). Priya wants #3 because it has a story. I have already lost this argument twice, so I'm outsourcing it.\n\nSofia 🥁`,
        star: false,
      },
      {
        from: ME,
        to: [P.sofia, P.priya],
        at: at(7, 3, 30),
        body: `#1 for the headline, #3 as the subhead. That way Priya gets her story and you get your billboard.`,
      },
      {
        from: P.sofia,
        to: [ME, P.priya],
        at: at(7, 2),
        body: `Diplomatic. Annoyingly correct. Shipping it.`,
      },
    ],
  });

  list.push({
    subject: 'Your invoice for September is available',
    cat: 'updates',
    labels: ['l_receipts', 'l_finance'],
    msgs: [
      {
        from: BOTS.nimbus,
        at: at(7, 9),
        mailedBy: 'nimbuscloud.com',
        html: receipt({
          brand: 'Nimbus Cloud',
          accent: '#2563eb',
          title: 'Invoice NC-2026-09-1184',
          lines: [
            ['Compute (4 instances)', '$212.40'],
            ['Managed Postgres', '$96.00'],
            ['Object storage · 1.8 TB', '$41.40'],
            ['Bandwidth', '$18.17'],
          ],
          total: ['Total charged', '$367.97'],
          note: 'Charged to Visa ending 1129 on Sep 23. Questions? Reply to this email.',
        }),
      },
    ],
  });

  list.push({
    subject: 'Mum’s 60th: gift ideas (do NOT reply all)',
    labels: ['l_family', 'l_personal'],
    important: true,
    msgs: [
      {
        from: P.theo,
        to: [ME, P.nico],
        at: at(8, 6),
        body: `Right. Mum's 60th is Oct 12. I have spent three weeks pretending not to have ideas, and I have no ideas.\n\nShortlist so far:\n\n1. A weekend in Cornwall (the crab connection is strong)\n2. That framed print of the harbour from her favourite painter\n3. A pottery class for two (but she has to actually go)\n\nOpinions? Nico, you get a vote because you're the favourite.`,
      },
      {
        from: P.nico,
        to: [P.theo, ME],
        at: at(8, 4),
        body: `Cornwall weekend, hands down. If we book the cottage in Port Isaac we can do the family dinner there. I can handle the logistics.`,
      },
      {
        from: ME,
        to: [P.theo, P.nico],
        at: at(8, 1),
        body: `Cornwall + the framed print as a "bonus" gift on the day. I'll cover the print.\n\nAlso, Theo: please stop using reply-all in the family thread. Mum's phone shows the previews.`,
      },
      {
        from: P.theo,
        to: [ME, P.nico],
        at: at(7, 22),
        body: `That was ONE time.`,
      },
      {
        from: P.nico,
        to: [ME, P.theo],
        at: at(7, 21),
        body: `It was three times.`,
      },
      {
        from: P.theo,
        to: [ME, P.nico],
        at: at(7, 20, 5),
        star: true,
        body: `Fine. Booking Port Isaac Friday. Nico, send me dates that work. Avery, send me the print link. And nobody tell Mum. 🤐`,
      },
    ],
  });

  list.push({
    subject: 'Your week in motion: 4 workouts, 1 new record',
    cat: 'promotions',
    msgs: [
      {
        from: BOTS.pulse,
        at: at(9, 7),
        unsub: true,
        mailedBy: 'pulsefit.app',
        html: promo({
          brand: 'Pulse',
          accent: '#ef4444',
          headline: 'Your week in motion',
          sub: '4 workouts · 3h 12m active · a new 5 km personal best.',
          art: 'art:sun-4-560x240',
          body: `<div style="display:flex;gap:12px;margin:8px 0"><div style="flex:1;background:#fff4f4;border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#ef4444">24:18</div><div style="font-size:12px;color:#777">5 km PB</div></div><div style="flex:1;background:#f4f8ff;border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#2563eb">12</div><div style="font-size:12px;color:#777">day streak</div></div></div>`,
          cta: 'See your recap',
        }),
      },
    ],
  });

  list.push({
    subject: 'Quick intro: Head of Product at Lumen Labs',
    msgs: [
      {
        from: P.olivia,
        to: [ME],
        at: at(10, 3),
        unread: true,
        body: `Hi Avery,\n\nI'm a recruiter at TalentLoop, and I'm partnering with Lumen Labs, a Series B company building AI tooling for field teams. They're looking for a Head of Product, and your work on Atlas jumped out.\n\nCompensation is in the $230–260k band plus meaningful equity. Would you be open to a 20-minute intro this week?\n\nOlivia Grant\nTalentLoop`,
      },
    ],
  });

  list.push({
    subject: 'Weekly digest: 14 issues moved, 3 need your review',
    cat: 'updates',
    labels: ['l_work'],
    msgs: [
      {
        from: BOTS.relay,
        at: at(11, 2),
        unsub: true,
        mailedBy: 'relayapp.io',
        html: promo({
          brand: 'Relay',
          accent: '#5b5bd6',
          headline: 'Your week in Atlas',
          sub: '14 issues moved to Done, 6 new, 3 waiting on you.',
          body: `<table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>
<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>ATL-212</b> Permission explainer sheet</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;color:#b45309">In review</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>ATL-207</b> Offline tiles: cache eviction</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;color:#b45309">Needs decision</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>ATL-198</b> Shared lists: invite flow</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;color:#16a34a">Done</td></tr></tbody></table>`,
          cta: 'Open Relay',
        }),
      },
    ],
  });

  list.push({
    subject: 'Sprint 42 planning: notes and action items',
    labels: ['l_work'],
    msgs: [
      {
        from: P.tom,
        to: [ME, P.marcus, P.priya],
        at: at(12, 3),
        body: `Notes from planning:\n\n**Committed (34 pts)**\n- ATL-212 Permission explainer sheet\n- ATL-215 Empty states for map tab\n- ATL-219 Fix hydration mismatch (Marcus)\n- ATL-221 Analytics events for onboarding\n\n**Stretch**\n- ATL-207 Offline tiles cache eviction\n\n**Action items**\n1. Avery: decide on the offline cache size limit by Wednesday\n2. Priya: hand off final empty-state assets\n3. Marcus: add canary check to the deploy pipeline`,
      },
      {
        from: ME,
        to: [P.tom],
        at: at(12, 0, 30),
        body: `Thanks Tom. I'd default the cache limit to 500 MB with a user-configurable option later. Will confirm after I talk to Kenji.`,
      },
    ],
  });

  list.push({
    subject: 'Lease renewal: proposed terms for 2027',
    labels: ['l_finance', 'l_personal'],
    msgs: [
      {
        from: P.sam,
        to: [ME, P.nico],
        at: at(13, 5),
        body: `Dear Avery and Nico,\n\nYour lease ends Jan 31. We'd like to offer a 12-month renewal at $2,140/month (currently $2,050), effective Feb 1. Please let us know by Oct 31 whether you wish to renew.\n\nBest,\nSam Patel\nOakridge Properties`,
      },
    ],
  });

  list.push({
    subject: 'Fable 4.0 is here: variables, dev mode, and more',
    cat: 'updates',
    msgs: [
      {
        from: BOTS.fable,
        at: at(15, 4),
        unsub: true,
        mailedBy: 'fable.design',
        html: promo({
          brand: 'Fable',
          accent: '#f24e1e',
          headline: 'Fable 4.0 is here',
          sub: 'Design variables, a dev mode that speaks fluent CSS, and 30% faster boards.',
          art: 'art:grid-77-560x240',
          cta: 'See what is new',
          sections: [
            { title: 'Variables everywhere', text: 'Colour, spacing, typography, and even booleans.' },
            { title: 'Dev mode', text: 'Inspect, measure, and export straight to code.' },
          ],
        }),
      },
    ],
  });

  list.push({
    subject: 'Your policy renews on Oct 20',
    cat: 'updates',
    labels: ['l_finance'],
    msgs: [
      {
        from: BOTS.harbor,
        at: at(19, 6),
        mailedBy: 'harborinsure.com',
        html: receipt({
          brand: 'Harbor Insurance',
          accent: '#0f766e',
          title: 'Renters policy HR-2210948',
          lines: [
            ['Coverage period', 'Oct 20, 2026 – Oct 19, 2027'],
            ['Personal property', '$30,000'],
            ['Liability', '$100,000'],
          ],
          total: ['Annual premium', '$214.00'],
          note: 'Your premium will be charged automatically. No action is needed.',
        }),
      },
    ],
  });

  list.push({
    subject: 'Offsite agenda: first draft',
    labels: ['l_work'],
    inbox: false,
    msgs: [
      {
        from: P.elena,
        to: [ME, P.priya, P.marcus, P.tom, P.sofia],
        at: at(31, 2),
        body: `Team,\n\nFirst pass at the Lisbon offsite agenda (Oct 14–16):\n\n**Wed:** Company state of the union, Atlas retro, dinner\n**Thu:** Strategy 2027 (workshop), team lightning talks\n**Fri:** Planning and a long lunch\n\nPlease send comments by Friday.`,
      },
      {
        from: ME,
        to: [P.elena],
        at: at(30, 21),
        body: `Looks good. Could we block half a day for product/design/engineering roadmapping on Thursday afternoon rather than a full-group session? Also, can we leave Friday morning unscheduled for jet-lagged people?`,
      },
      {
        from: P.elena,
        to: [ME],
        at: at(30, 18),
        body: `Both fair. Updated. Thank you.`,
      },
    ],
  });

  list.push({
    subject: 'Reminder: renew passport (expires Jan 2027)',
    labels: ['l_personal', 'l_followup'],
    inbox: true,
    snoozeUntil: now + 20 * HOUR,
    msgs: [
      {
        from: ME,
        to: [ME],
        at: at(1, 4),
        body: `Passport expires January 2027. Renewal takes 6–8 weeks, so start now.\n\n- Photo\n- Form DS-82\n- Old passport\n\nBook the appointment before the Lisbon trip.`,
      },
    ],
  });

  const hand = list.map(buildThread);
  const filled = fillThreads(now);
  const all = [...hand, ...filled.threads];

  const threads: Record<string, Thread> = {};
  const messages: Record<string, Message> = {};
  for (const { thread, messages: ms } of all) {
    threads[thread.id] = thread;
    for (const m of ms) messages[m.id] = m;
  }

  const drafts: Record<string, Draft> = {};
  const elenaThread = hand.find((h) => h.thread.subject.startsWith('Board deck'));
  if (elenaThread) {
    const last = elenaThread.messages[elenaThread.messages.length - 1];
    drafts.d_seed_1 = {
      id: 'd_seed_1',
      kind: 'reply',
      mode: 'inline',
      threadId: elenaThread.thread.id,
      replyToId: last.id,
      to: [P.elena],
      cc: [],
      bcc: [],
      subject: 'Re: Board deck: need your product slides by Thursday EOD',
      html: md(`Elena, yes, I'm still good to present on the 8th. I'll have the three slides to you Thursday afternoon, and I'll add a one-page Atlas timeline for Kenji as a pre-read.`),
      quoteHtml: quoteBlock(last),
      attachments: [],
      updatedAt: at(0, 3),
      createdAt: at(0, 3),
    };
  }
  drafts.d_seed_2 = {
    id: 'd_seed_2',
    kind: 'new',
    mode: 'window',
    to: [P.diego],
    cc: [],
    bcc: [],
    subject: 'Budget for the Lisbon offsite',
    html: md(`Diego, quick question on the offsite budget: are we allowed to go over the per-head cap if we cut the second dinner? I'd like to book the workshop room at the hotel (€900 for the day), but I'll…`),
    quoteHtml: '',
    attachments: [],
    updatedAt: at(2, 6),
    createdAt: at(2, 6),
  };
  drafts.d_seed_3 = {
    id: 'd_seed_3',
    kind: 'new',
    mode: 'window',
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    html: md(`Ideas for the surprise dinner:\n\n- book the long table at the harbour restaurant\n- ask Grace's neighbour for the photo album\n- playlist`),
    quoteHtml: '',
    attachments: [],
    updatedAt: at(5, 1),
    createdAt: at(5, 1),
  };
  drafts.d_seed_4 = {
    id: 'd_seed_4',
    kind: 'new',
    mode: 'window',
    to: [P.priya],
    cc: [],
    bcc: [],
    subject: 'Happy work anniversary, Priya!',
    html: md(`Priya, three years! Thank you for making everything we ship better-looking, kinder, and slightly more opinionated. Coffee's on me this week.\n\nAvery`),
    quoteHtml: '',
    attachments: [],
    updatedAt: at(0, 5),
    createdAt: at(0, 5),
    sendAt: now + 1 * DAY + 0 * HOUR + 30 * 60_000,
  };

  return {
    threads,
    messages,
    drafts,
    labels: SEED_LABELS.map((l) => ({ ...l })),
    contacts: CONTACTS.map((c) => ({ ...c })),
    pending: [],
    recentSearches: ['from:priya has:attachment', 'invoice', 'is:unread newer_than:3d'],
  };
}
