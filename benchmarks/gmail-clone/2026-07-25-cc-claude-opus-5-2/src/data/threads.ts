import type { Category } from '@/lib/types'
import type { PersonKey } from './people'

export interface SeedAttachment {
  name: string
  /** Bytes. */
  size: number
  text?: string
}

export interface SeedMessage {
  from: PersonKey
  to?: PersonKey[]
  cc?: PersonKey[]
  /** Minutes before "now". */
  ago: number
  body: string
  read?: boolean
  starred?: boolean
  att?: SeedAttachment[]
}

export interface SeedThread {
  subject: string
  cat?: Category
  labels?: string[]
  box?: 'inbox' | 'archive' | 'trash' | 'spam'
  important?: boolean
  /** Minutes in the future. */
  snooze?: number
  msgs: SeedMessage[]
}

const H = 60
const D = 1440

const sig = (name: string, role: string) =>
  `<p class="sig" style="color:#80868b;font-size:0.92em">${name} · ${role} · Meridian</p>`

const quote = (who: string, text: string) =>
  `<div class="quoted"><p>${who} wrote:</p><p>${text}</p></div>`

/* ========================================================================== */
/*  Inbox — Primary                                                            */
/* ========================================================================== */

const primary: SeedThread[] = [
  {
    subject: 'Design review: inbox density and the new label chips',
    labels: ['lb-work'],
    important: true,
    msgs: [
      {
        from: 'priya',
        to: ['me'],
        cc: ['luis', 'design'],
        ago: 38,
        read: false,
        att: [
          { name: 'inbox-density-v4.pdf', size: 2_842_112 },
          { name: 'label-chips.png', size: 486_233 },
        ],
        body: `<p>Avery —</p>
<p>I did another pass on row density last night and I think we finally have it. The short version: <strong>44px rows with a 14px sender column</strong> reads better than anything else we tried, and it survives at 320px because the date column collapses instead of the subject.</p>
<p>Three things I want your read on before Thursday:</p>
<ol>
  <li>The label chips now sit <em>inline after the subject</em> rather than trailing the snippet. It costs us ~60px of snippet on narrow screens but it stops the "where did my labels go" complaints.</li>
  <li>Unread rows use weight instead of a dot. Cleaner, but it leans on the font a lot — worth checking on Windows.</li>
  <li>I killed the hover background on the checkbox column. It was fighting the row hover.</li>
</ol>
<p>PDF attached with all three side by side. The PNG is just the chip states if you want to drop them straight into the component.</p>
${sig('Priya Raghavan', 'Head of Design')}`,
      },
      {
        from: 'me',
        to: ['priya'],
        cc: ['luis', 'design'],
        ago: 26,
        body: `<p>This is a big improvement. 44px feels right — dense without the "spreadsheet" feeling we had in v2.</p>
<p>On (1): agreed, keep them inline. I'd add a rule that we never render more than two chips before collapsing to "+N", otherwise a thread with five labels eats the whole row.</p>
<p>On (2): I'll check Windows this afternoon. If it's shaky I'd rather add a 6px accent bar on the left edge than bring the dot back.</p>
<p>On (3): 👍</p>`,
      },
      {
        from: 'priya',
        to: ['me'],
        cc: ['luis', 'design'],
        ago: 12,
        read: false,
        body: `<p>"+N" is right, I'll spec it. And yes to the accent bar over the dot — that also gives us somewhere to put the "important" marker without another glyph.</p>
<p>Thursday 2pm still good?</p>
${quote('Avery Chen', 'This is a big improvement. 44px feels right…')}`,
      },
    ],
  },
  {
    subject: 'Search indexing is 4× slower after the storage migration',
    labels: ['lb-work', 'lb-follow'],
    important: true,
    msgs: [
      {
        from: 'tom',
        to: ['me', 'jae'],
        ago: 5 * H,
        body: `<p>Heads up before you see the dashboards: full reindex went from 41 minutes to about 2h50m after we moved to the new storage layer. Nothing is on fire — incremental indexing is fine — but a cold rebuild is now a scary operation.</p>
<p>I bisected it to the batch reader. We're doing one round trip per document instead of per page.</p>
<pre><code>// before: 1 fetch per 500 docs
// after:  1 fetch per doc  ← this
for (const id of ids) await store.get(id)</code></pre>
<p>Fix is small. The annoying part is that our benchmark only ever measured incremental, so CI was green the whole way.</p>`,
      },
      {
        from: 'jae',
        to: ['tom', 'me'],
        ago: 4 * H + 20,
        body: `<p>Confirmed on my side — p99 read latency on the index workers is 6ms, so it's pure round-trip count, not the storage layer being slow.</p>
<p>I can put a cold-rebuild benchmark in the nightly job. It's 3 hours of compute a night, which is fine.</p>`,
      },
      {
        from: 'me',
        to: ['tom', 'jae'],
        ago: 3 * H,
        body: `<p>Nightly is worth it. Let's also add an alert if a rebuild crosses 60 minutes so we notice the next one within a day instead of a quarter.</p>
<p>Tom — do you want to land the batch fix, or should I? I have Thursday morning free.</p>`,
      },
      {
        from: 'tom',
        to: ['me', 'jae'],
        ago: 2 * H + 5,
        read: false,
        att: [{ name: 'reindex-flamegraph.svg', size: 1_204_882 }],
        body: `<p>I'll take it, it's ~30 lines. Flamegraph attached for posterity — the whole right half of that chart is round trips.</p>
<p>One thing I want to flag: the fix restores the 41-minute number but I think we can get under 20 if we parallelize by shard. Not urgent, just noting it so we don't forget there's headroom.</p>
${quote('Avery Chen', "Nightly is worth it. Let's also add an alert if a rebuild crosses 60 minutes…")}`,
      },
    ],
  },
  {
    subject: 'Q3 board deck — I need your slide by Thursday',
    labels: ['lb-work', 'lb-follow'],
    important: true,
    msgs: [
      {
        from: 'dana',
        to: ['me'],
        cc: ['luis'],
        ago: 3 * H + 40,
        read: false,
        starred: true,
        att: [{ name: 'Q3-board-deck-draft.key', size: 18_442_311 }],
        body: `<p>Avery,</p>
<p>Board is Tuesday the 4th. I need one slide from you: <strong>what shipped in Q3 and what it moved</strong>. One slide. Not three.</p>
<p>The framing I'm using for the rest of the deck is "we got faster at the boring parts so we could spend the quarter on search." If your slide can land that, it'll do a lot of work for me.</p>
<p>Numbers I'd love if you have them:</p>
<ul>
  <li>Median time-to-first-result, before and after</li>
  <li>Reindex duration (I hear this got worse — say so, boards trust people who volunteer bad news)</li>
  <li>Anything on support ticket volume for search complaints</li>
</ul>
<p>Draft deck attached so you can match the format. Thursday EOD, please — I write the narration Friday.</p>
<p>— D</p>`,
      },
    ],
  },
  {
    subject: '[P1] api-gateway p99 latency above 800ms for 10 minutes',
    cat: 'updates',
    msgs: [
      {
        from: 'datadog',
        to: ['eng'],
        ago: 4 * H + 12,
        read: false,
        body: `<p><strong>Monitor:</strong> api-gateway · p99 latency<br>
<strong>Status:</strong> Triggered → Recovered<br>
<strong>Duration:</strong> 11m 40s</p>
<table>
  <tr><th>Metric</th><th>Threshold</th><th>Peak</th></tr>
  <tr><td>trace.http.request p99</td><td>800ms</td><td>1,412ms</td></tr>
  <tr><td>error rate</td><td>1.0%</td><td>0.3%</td></tr>
  <tr><td>requests/s</td><td>—</td><td>4,180</td></tr>
</table>
<p>Correlated deploy: <code>atlas-gateway@a3f19c2</code> rolled out 6 minutes before the trigger.</p>
<p><a href="#">View in Datadog</a> · <a href="#">Silence this monitor</a></p>`,
      },
    ],
  },
  {
    subject: '[meridian/atlas] Virtualize the thread list (#4821)',
    cat: 'updates',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'github',
        to: ['me'],
        ago: 5 * H + 30,
        body: `<p><strong>tom-okafor</strong> requested your review on <strong>#4821 · Virtualize the thread list</strong></p>
<blockquote><p>Renders only the rows in view plus a 6-row overscan. Cuts initial paint on a 5,000-thread mailbox from 1.9s to 180ms. Keeps keyboard navigation working by measuring rows instead of assuming a fixed height.</p></blockquote>
<p><code>+412 −188</code> across 9 files · 12 comments · checks passing</p>
<hr>
<p><strong>priya</strong> commented:</p>
<blockquote><p>Scroll restoration when you come back from a thread is the thing I'd guard hardest here. Losing your place in the list is the kind of bug people quietly hate.</p></blockquote>
<p><a href="#">View pull request</a> · <a href="#">Unsubscribe</a></p>`,
      },
    ],
  },
  {
    subject: 'Spec: snooze + scheduled send',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'luis',
        to: ['me', 'priya'],
        cc: ['tom'],
        ago: 6 * H + 20,
        att: [{ name: 'snooze-scheduled-send-spec.pdf', size: 941_022 }],
        body: `<p>Spec is at v0.9 — attached. Summary of the decisions I'd like to lock today:</p>
<p><strong>Snooze.</strong> Presets are Later today (+3h), Tomorrow (8am), This weekend (Sat 8am), Next week (Mon 8am), and Pick date &amp; time. A snoozed thread leaves the inbox, lands in Snoozed, and returns to the top of the inbox marked unread. If a new reply arrives while snoozed, it comes back immediately.</p>
<p><strong>Scheduled send.</strong> Same preset shape. The message sits in Scheduled and can be cancelled up until it goes out. Cancelling puts it back in Drafts with everything intact.</p>
<p>Open question I keep going back and forth on: if you snooze a thread and then reply to it, does the snooze cancel? I think yes — replying means you're dealing with it.</p>`,
      },
      {
        from: 'me',
        to: ['luis', 'priya'],
        cc: ['tom'],
        ago: 5 * H + 50,
        body: `<p>Yes to cancelling the snooze on reply. Anything else is going to feel haunted.</p>
<p>One addition: when a snoozed thread comes back, we should say <em>why</em> it's back — "Snoozed until today, 8:00 AM" as a small line above the first message. Otherwise people think it's a new email and get confused about the date.</p>`,
      },
    ],
  },
  {
    subject: 'Contract renewal — can we push signature to Aug 14?',
    labels: ['lb-work', 'lb-follow'],
    important: true,
    msgs: [
      {
        from: 'harper',
        to: ['me'],
        cc: ['dana'],
        ago: 8 * H + 10,
        read: false,
        body: `<p>Hi Avery,</p>
<p>Our procurement lead is out until the 11th and I'd rather not have someone sign this who hasn't read it. Can we move the renewal date to <strong>August 14</strong>? Everything else in the terms is agreed on our side.</p>
<p>Separately — the team has been in the new search build for two weeks and the feedback is genuinely good. Two asks that came up repeatedly:</p>
<ol>
  <li>Search inside attachments (PDFs especially).</li>
  <li>Saved searches you can pin to the sidebar.</li>
</ol>
<p>Neither is a blocker for renewal. Just want them on your radar while people are enthusiastic.</p>
<p>Best,<br>Harper</p>
<p style="color:#80868b;font-size:0.92em">Harper Ellis · VP Operations · Northwind</p>`,
      },
    ],
  },
  {
    subject: 'Sunday dinner + your cousin’s graduation',
    cat: 'primary',
    labels: ['lb-personal'],
    msgs: [
      {
        from: 'mom',
        to: ['me', 'mei'],
        ago: 9 * H + 5,
        read: false,
        body: `<p>Hi sweetheart,</p>
<p>Two things and then I'll let you get back to work.</p>
<p>One — Sunday dinner is at 6 not 7 this week because your father has his cardiology follow-up Monday morning and wants an early night. Nothing to worry about, it's the routine one.</p>
<p>Two — Daniel's graduation is August 22nd at 10am and your Aunt Rose has asked me four separate times whether you're coming. I have been saying "I think so" in an increasingly unconvincing voice. Please email her yourself so she stops calling me.</p>
<p>Are you eating? You looked thin on the video call.</p>
<p>Love,<br>Mom</p>`,
      },
    ],
  },
  {
    subject: 'Postmortem: Tuesday’s partial outage (33 min, EU only)',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'jae',
        to: ['eng'],
        cc: ['dana'],
        ago: 11 * H,
        att: [{ name: 'postmortem-2026-07-21.md', size: 24_118, text: 'markdown' }],
        body: `<p>Writeup attached. The compressed version:</p>
<p><strong>What happened.</strong> A config push set the EU connection pool ceiling to 20 instead of 200 — a missing zero. EU requests queued, then timed out. 33 minutes, roughly 8% of total traffic.</p>
<p><strong>Why it took 33 minutes.</strong> 4 minutes to alert, 6 to page the right person, 19 to find it, 4 to roll back. The 19 is the interesting number: we were looking at the database because the symptom was connection timeouts, and nobody thought to diff the config.</p>
<p><strong>What we're changing.</strong></p>
<ul>
  <li>Config diffs get posted to #deploys with the values, not just the commit SHA. (Done.)</li>
  <li>Pool sizes get a sanity range in schema validation — a pool of 20 for EU is rejected at push time.</li>
  <li>The incident channel template now starts with "what changed in the last hour" as question one.</li>
</ul>
<p>No blame here — the push was reviewed by two people and we both read past it. That's exactly the class of error that validation exists for.</p>`,
      },
      {
        from: 'dana',
        to: ['jae'],
        cc: ['eng'],
        ago: 10 * H + 10,
        body: `<p>This is a good writeup. The "what changed in the last hour" question at the top of the template is the single highest-leverage thing in here — thank you for making the process change rather than just resolving to be more careful.</p>`,
      },
    ],
  },
  {
    subject: 'Invitation: Weekly design sync @ Mon Jul 27, 10:00 – 10:45',
    cat: 'updates',
    msgs: [
      {
        from: 'calendar',
        to: ['me'],
        ago: 12 * H,
        body: `<p><strong>Weekly design sync</strong></p>
<table>
  <tr><th>When</th><td>Monday Jul 27, 10:00 – 10:45</td></tr>
  <tr><th>Where</th><td>Meet · <a href="#">meet.meridian.io/design-sync</a></td></tr>
  <tr><th>Organiser</th><td>Priya Raghavan</td></tr>
  <tr><th>Guests</th><td>Priya Raghavan · Avery Chen · Luis Ferrer · Devon Wright · 4 more</td></tr>
</table>
<p><strong>Agenda</strong></p>
<ol>
  <li>Density v4 walkthrough (15m)</li>
  <li>Label chips + overflow behaviour (10m)</li>
  <li>Motion spec handoff from Parallax (10m)</li>
  <li>Open floor</li>
</ol>
<p><a href="#">Yes</a> · <a href="#">Maybe</a> · <a href="#">No</a> · <a href="#">More options</a></p>`,
      },
    ],
  },
  {
    subject: 'The churn cohort numbers you asked for',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'nina',
        to: ['me', 'luis'],
        ago: 1 * D + 2 * H,
        att: [
          { name: 'churn-cohorts-q2q3.csv', size: 88_402, text: 'csv' },
          { name: 'cohort-curves.png', size: 620_190 },
        ],
        body: `<p>Pulled these this morning. CSV has the raw cohorts, PNG is the retention curves if you want something to paste.</p>
<p>The finding that surprised me: <strong>accounts that used search in week one retain at 71% at day 90; accounts that didn't retain at 38%.</strong> That gap holds after controlling for seat count and plan, which I did not expect it to.</p>
<table>
  <tr><th>Cohort</th><th>D30</th><th>D60</th><th>D90</th></tr>
  <tr><td>Used search wk 1</td><td>88%</td><td>79%</td><td>71%</td></tr>
  <tr><td>Did not</td><td>64%</td><td>47%</td><td>38%</td></tr>
</table>
<p>Standard caveat: this is correlational and "used search in week one" is probably a proxy for "had enough mail in the account to need search." I'd be careful about turning it into "make people search in week one" as a growth tactic.</p>`,
      },
      {
        from: 'luis',
        to: ['nina', 'me'],
        ago: 1 * D + 40,
        body: `<p>The caveat is doing a lot of work but even so — 33 points is a big enough gap that I want to understand it properly. Nina, is there a version of this where you look at accounts with similar mail volume and split on search usage?</p>`,
      },
    ],
  },
  {
    subject: 'Top 5 support themes this week',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'marcus',
        to: ['eng'],
        cc: ['luis'],
        ago: 1 * D + 5 * H,
        body: `<p>412 conversations this week, down 6%. Themes, most to least:</p>
<ol>
  <li><strong>"Where did my email go?" (61)</strong> — almost all of these are archive-vs-delete confusion. People archive, then look in Trash, then panic. Undo helps but the toast is gone by the time they realise.</li>
  <li><strong>Search returns nothing for exact phrases (44)</strong> — quoting isn't supported and people expect it to be.</li>
  <li><strong>Attachment upload fails over 20MB (38)</strong> — the error just says "failed."</li>
  <li><strong>Mobile compose loses the draft on rotate (22)</strong> — reproduced, filed as ATL-1189.</li>
  <li><strong>Labels vs folders (19)</strong> — conceptual, not a bug, but our onboarding doesn't explain it.</li>
</ol>
<p>My ask for the quarter is #1 and #3. Both are cheap and both make people feel like the product lost their stuff, which is the worst feeling an email client can produce.</p>`,
      },
    ],
  },
  {
    subject: 'found the photos from Lisbon 😭',
    labels: ['lb-personal'],
    msgs: [
      {
        from: 'mei',
        to: ['me'],
        ago: 1 * D + 7 * H,
        att: [
          { name: 'alfama-rooftop.jpg', size: 3_402_118 },
          { name: 'the-terrible-fish.jpg', size: 2_881_004 },
          { name: 'you-asleep-on-tram-28.jpg', size: 4_118_930 },
        ],
        body: `<p>was cleaning out my phone and found the whole Lisbon folder. attaching the greatest hits</p>
<p>1. the rooftop where we decided we lived there now<br>
2. the fish. the FISH. you said "how bad can it be"<br>
3. you asleep on tram 28 with your mouth open, which I have been saving for a moment exactly like this one</p>
<p>anyway I'm putting the third one on the family group chat unless you call me back</p>`,
      },
    ],
  },
  {
    subject: 'Security review needed before attachments ship',
    labels: ['lb-work', 'lb-follow'],
    important: true,
    msgs: [
      {
        from: 'ravi',
        to: ['me', 'tom'],
        ago: 2 * D + 3 * H,
        read: false,
        body: `<p>Saw the attachment work in the release candidate. Before this goes to anyone outside the company I need an hour with it. Specifically:</p>
<ul>
  <li><strong>Rendering.</strong> We're putting message HTML on the page. I want to see the sanitizer's allow-list and confirm it's an allow-list and not a block-list.</li>
  <li><strong>Filenames.</strong> Uploaded names go into the DOM and into the download header. Both need escaping; the download header needs it more than people think.</li>
  <li><strong>SVG.</strong> If we accept <code>.svg</code> as an image we're accepting scripts. Either render it inside a sandboxed frame or serve it as a download only.</li>
  <li><strong>Size limits.</strong> Enforced server-side, not just in the picker.</li>
</ul>
<p>None of this is speculative — the first three are how this goes wrong in every mail client that has gotten it wrong. Thursday or Friday works for me.</p>`,
      },
    ],
  },
  {
    subject: 'Candidate loop: Staff Frontend — Thursday 1:00pm',
    labels: ['lb-recruiting', 'lb-work'],
    msgs: [
      {
        from: 'sofia',
        to: ['me'],
        ago: 2 * D + 6 * H,
        att: [{ name: 'candidate-brief-staff-fe.pdf', size: 318_442 }],
        body: `<p>You're on the loop Thursday for the Staff Frontend role — 1:00pm, 60 minutes, <strong>practical craft</strong> interview.</p>
<p>Brief attached. Short version: 9 years, last four at a design-tooling company, went deep on canvas rendering and accessibility. Strong written communication in the take-home. The panel wants your read on whether they can hold a large frontend codebase's architecture in their head, not whether they can invert a tree.</p>
<p>Please leave feedback within 24 hours — we're moving fast on this one and they have another offer in play.</p>`,
      },
    ],
  },
  {
    subject: 'Parallax → Meridian: motion spec handoff',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'devon',
        to: ['me', 'priya'],
        ago: 2 * D + 9 * H,
        att: [{ name: 'meridian-motion-spec-v2.pdf', size: 5_119_003 }],
        body: `<p>Handoff doc attached. It covers the six transitions we agreed on, with durations, easing curves, and — importantly — the rules for when <em>not</em> to animate.</p>
<p>The philosophy in one line: <strong>motion should explain where something came from, and nothing else.</strong> If a transition isn't answering "where did this come from" or "where did it go," we cut it.</p>
<p>Durations we landed on:</p>
<table>
  <tr><th>Transition</th><th>Duration</th><th>Curve</th></tr>
  <tr><td>List → thread</td><td>180ms</td><td>cubic-bezier(.2,0,0,1)</td></tr>
  <tr><td>Compose open</td><td>200ms</td><td>cubic-bezier(.2,0,0,1)</td></tr>
  <tr><td>Menu / popover</td><td>140ms</td><td>ease-out</td></tr>
  <tr><td>Toast in</td><td>240ms</td><td>cubic-bezier(.2,0,0,1)</td></tr>
  <tr><td>Row removal</td><td>0ms</td><td>—</td></tr>
</table>
<p>Row removal being 0ms is deliberate and I'll defend it: when you archive something you want it gone, and an exit animation on a list you're working through quickly turns into visual debt.</p>
<p>Everything respects <code>prefers-reduced-motion</code>; the spec has the fallback for each.</p>`,
      },
    ],
  },
  {
    subject: 'Atlas Freight integration — auth questions',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'yusuf',
        to: ['me'],
        ago: 4 * D + 2 * H,
        body: `<p>Avery — we're wiring up the integration this sprint and hit two things the docs don't cover.</p>
<p>1. Do refresh tokens rotate on every use, or only near expiry? Our client assumes the latter and I want to be sure before we ship it.</p>
<p>2. The webhook signature header — is that HMAC over the raw body or the parsed-and-reserialized JSON? We're getting mismatches roughly 1 in 200, which smells like key ordering.</p>`,
      },
      {
        from: 'me',
        to: ['yusuf'],
        ago: 3 * D + 20 * H,
        body: `<p>Good questions, and the second one is a docs bug on our side.</p>
<p>1. They rotate on <strong>every</strong> use. The old token is valid for a 60-second grace window so a retry doesn't lock you out, but you should persist the new one immediately.</p>
<p>2. HMAC over the <strong>raw bytes</strong>, before any parsing. Your 1-in-200 is almost certainly reserialization changing key order or number formatting. Capture the raw body before your JSON middleware touches it.</p>
<p>I'll get the docs fixed this week — that's cost other people time too.</p>`,
      },
      {
        from: 'yusuf',
        to: ['me'],
        ago: 3 * D + 14 * H,
        body: `<p>Raw bytes fixed it. 4,000 webhooks, zero mismatches. Thank you.</p>
<p>One more, sorry: is there a sandbox that emits the full event catalogue on demand? Waiting for real shipments to test the rare events is slow.</p>`,
      },
      {
        from: 'me',
        to: ['yusuf'],
        ago: 3 * D + 10 * H,
        body: `<p>There is, and it's badly documented: <code>POST /v1/test/events</code> with <code>{"type": "shipment.delayed"}</code> emits any event in the catalogue to your registered endpoint. Sandbox keys only.</p>
<p>Full list is at <a href="#">docs.meridian.io/events</a> — I'll add the test endpoint to that page too.</p>`,
      },
      {
        from: 'yusuf',
        to: ['me'],
        ago: 3 * D + 3 * H,
        body: `<p>Perfect. That unblocks the whole test suite. We should be live by the 6th.</p>`,
      },
    ],
  },
  {
    subject: 'DPA redlines — light this round',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'clara',
        to: ['me'],
        cc: ['dana'],
        ago: 3 * D + 5 * H,
        att: [{ name: 'meridian-northwind-DPA-redline.pdf', size: 1_802_441 }],
        body: `<p>Northwind's counsel came back and it's a light round — three changes, none structural.</p>
<ol>
  <li><strong>§4.2 breach notification</strong> — they want 48 hours, we drafted 72. Accept it; 48 is achievable and it's a cheap win.</li>
  <li><strong>§7.1 subprocessors</strong> — 30 days' notice before adding one, up from 14. Accept.</li>
  <li><strong>§9 audit rights</strong> — they want on-site audit rights with 5 days' notice. <em>Do not accept as drafted.</em> Counter with an annual SOC 2 report plus a remote audit on 30 days' notice. On-site with a week's notice is operationally impossible for a company your size.</li>
</ol>
<p>If you're good with that I'll send the counter today and we should be signable by the 14th.</p>`,
      },
    ],
  },
  {
    subject: 'climbing sat? gunks weather looks perfect',
    labels: ['lb-personal'],
    msgs: [
      {
        from: 'jordan',
        to: ['me', 'sam'],
        ago: 3 * D + 8 * H,
        body: `<p>72 and dry saturday, first weekend in a month that isn't a swamp. gunks?</p>
<p>thinking leave the city at 6, on the rock by 8:30, out before the afternoon crowds. I have a rope and my rack, we'd need a second rope if anyone wants to do anything long.</p>`,
      },
      {
        from: 'sam',
        to: ['jordan', 'me'],
        ago: 3 * D + 6 * H,
        body: `<p>in. I have the second rope.</p>
<p>can we please not do High Exposure again. I love it. I have done it eleven times. there are two thousand other routes.</p>`,
      },
      {
        from: 'me',
        to: ['jordan', 'sam'],
        ago: 3 * D + 5 * H,
        body: `<p>In, and seconding the High E moratorium.</p>
<p>6am is aggressive but correct. I'll bring coffee for the drive and the good crash pad. Someone else is on snacks — last time I brought a single bag of almonds and Jordan has not let it go.</p>`,
      },
    ],
  },
  {
    subject: 'Deployment ready: atlas-web (Production)',
    cat: 'updates',
    msgs: [
      {
        from: 'vercel',
        to: ['me'],
        ago: 4 * D + 4 * H,
        body: `<p><strong>atlas-web</strong> deployed to Production</p>
<table>
  <tr><th>Commit</th><td><code>a3f19c2</code> perf: virtualize thread list</td></tr>
  <tr><th>Branch</th><td>main</td></tr>
  <tr><th>Build</th><td>1m 14s</td></tr>
  <tr><th>Status</th><td>Ready</td></tr>
</table>
<p><a href="#">Visit deployment</a> · <a href="#">View build logs</a> · <a href="#">Instant rollback</a></p>`,
      },
    ],
  },
  {
    subject: 'New sign-in to your 1Password account',
    cat: 'updates',
    msgs: [
      {
        from: 'onepassword',
        to: ['me'],
        ago: 4 * D + 9 * H,
        body: `<p>A new device signed in to your account.</p>
<table>
  <tr><th>Device</th><td>MacBook Pro · Chrome 141</td></tr>
  <tr><th>Location</th><td>Brooklyn, NY, United States</td></tr>
  <tr><th>Time</th><td>Approximately 4 days ago</td></tr>
</table>
<p>If this was you, no action is needed. If it wasn't, <a href="#">change your password</a> and sign out all devices immediately.</p>`,
      },
    ],
  },
  {
    subject: 'Lease renewal — two options for you',
    labels: ['lb-personal', 'lb-finance'],
    snooze: 14 * H,
    msgs: [
      {
        from: 'landlord',
        to: ['me'],
        ago: 5 * D + 3 * H,
        att: [{ name: 'renewal-options-411-carroll.pdf', size: 442_881 }],
        body: `<p>Hi Avery,</p>
<p>Your lease is up October 31. You've been a good tenant and I'd like you to stay, so here are two options rather than one:</p>
<table>
  <tr><th>Term</th><th>Monthly</th><th>Change</th></tr>
  <tr><td>12 months</td><td>$3,150</td><td>+4.1%</td></tr>
  <tr><td>24 months</td><td>$3,050</td><td>+0.8%, fixed both years</td></tr>
</table>
<p>The two-year is genuinely the better deal if you're planning to stay — I'd rather have certainty than an extra hundred a month.</p>
<p>Either way I need to know by <strong>August 15</strong>. The radiator in the back room is on my list regardless; the plumber has been avoiding me since March.</p>
<p>Corinne</p>`,
      },
    ],
  },
  {
    subject: 'Reminder: cleaning appointment Aug 6, 9:00 AM',
    cat: 'updates',
    labels: ['lb-personal'],
    msgs: [
      {
        from: 'clinic',
        to: ['me'],
        ago: 5 * D + 8 * H,
        body: `<p>Hello Avery,</p>
<p>This is a reminder of your appointment:</p>
<table>
  <tr><th>Service</th><td>Cleaning &amp; exam</td></tr>
  <tr><th>Date</th><td>Thursday, August 6</td></tr>
  <tr><th>Time</th><td>9:00 AM</td></tr>
  <tr><th>Provider</th><td>Dr. Anselm</td></tr>
</table>
<p>Please arrive ten minutes early. If you need to reschedule, <a href="#">use our booking page</a> or call the office — 48 hours' notice avoids the missed-appointment fee.</p>`,
      },
    ],
  },
  {
    subject: 'Weekend read: how a mail client got to 100ms',
    labels: ['lb-reading'],
    msgs: [
      {
        from: 'tom',
        to: ['me'],
        ago: 6 * D + 2 * H,
        body: `<p>You'll like this one. The thesis is that "fast" isn't one number, it's a discipline: every interaction gets a budget in milliseconds, the budget is written down, and shipping something over budget is treated as a bug rather than a tradeoff.</p>
<p>The part I keep thinking about is that they optimistically render every mutation and reconcile after. Archiving is instant because the row is gone before the request leaves the machine. If the request fails you get it back with a toast.</p>
<p>We do this in two places and not in six others, which is why the app feels fast on Tuesday and slow on Wednesday.</p>
<p><a href="#">https://blog.example.com/100ms</a></p>`,
      },
    ],
  },
  {
    subject: 'that job you mentioned',
    labels: ['lb-personal'],
    msgs: [
      {
        from: 'sam',
        to: ['me'],
        ago: 7 * D + 5 * H,
        body: `<p>ok I actually looked at the Meridian posting properly and I have questions before I put myself through an interview loop</p>
<p>1. is the "we don't do on-call" thing real or is it real until it isn't<br>
2. how much of the frontend is the old codebase. be honest<br>
3. would we be on the same team, because that's either a strong pro or a strong con and I genuinely don't know which</p>
<p>no rush, but if the answer to 2 is "most of it" I'd rather know now</p>`,
      },
    ],
  },
  {
    subject: 'Welcome Nina to the data team',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'dana',
        to: ['eng'],
        ago: 8 * D + 6 * H,
        body: `<p>Team —</p>
<p>Nina Sokolova starts Monday as our first dedicated data scientist. She spent the last five years at a logistics company building the forecasting that decided where trucks went, which is a job where being wrong is extremely visible.</p>
<p>Nina's first project is retention: not "what is our churn number" but "what actually predicts whether an account is still here in ninety days." She'll be asking a lot of questions in her first month. Please answer them properly — the quality of what she finds depends entirely on the quality of what we tell her.</p>
<p>Welcome, Nina.</p>
<p>— D</p>`,
      },
    ],
  },
  {
    subject: 'Priya shared “Inbox v4 — density explorations”',
    cat: 'updates',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'figma',
        to: ['me'],
        ago: 9 * D + 3 * H,
        body: `<p><strong>Priya Raghavan</strong> shared a file with you.</p>
<blockquote><p>Inbox v4 — density explorations</p><p>Page 3 has the 44px option. Ignore pages 5–7, those are dead ends I'm keeping for the record.</p></blockquote>
<p>You have <strong>can edit</strong> access.</p>
<p><a href="#">Open in Figma</a></p>`,
      },
    ],
  },
  {
    subject: 'August route setting + potluck (bring something)',
    cat: 'forums',
    labels: ['lb-personal'],
    msgs: [
      {
        from: 'climbing',
        to: ['me'],
        ago: 10 * D + 4 * H,
        body: `<p>Hey climbers,</p>
<p>Route setting for August happens the weekend of the 8th. The whole left wall is coming down, including — yes — the blue V4 that everyone has an opinion about. It has been up for fourteen months. It has to go.</p>
<p>Potluck after, 6pm. The sign-up sheet is by the front desk and it is currently seven desserts and one bag of chips. We are begging someone to bring a vegetable.</p>
<p>Also: the club is buying new crash pads and we're voting on brands at the September meeting. If you have strong feelings, come have them out loud.</p>`,
      },
    ],
  },
  {
    subject: 'Your wheel-throwing class starts Tuesday',
    cat: 'updates',
    labels: ['lb-personal'],
    snooze: 3 * D,
    msgs: [
      {
        from: 'school',
        to: ['me'],
        ago: 12 * D + 5 * H,
        body: `<p>Hi Avery,</p>
<p>You're enrolled in <strong>Wheel Throwing I</strong>, Tuesdays 7–9pm for six weeks, starting July 28. Studio 2, second floor.</p>
<p>Bring: an apron or clothes you're prepared to ruin, and short nails. Everything else is provided. Don't bring your own clay.</p>
<p>A gentle expectation-setting note we send everyone: in week one almost nobody centers the clay. This is normal and not a sign you should quit. Most people get it in week two or three.</p>`,
      },
    ],
  },
  {
    subject: 'RFC: drop the legacy polyfill bundle',
    cat: 'forums',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'tom',
        to: ['eng'],
        ago: 14 * D + 6 * H,
        body: `<p><strong>Proposal:</strong> delete the legacy polyfill bundle.</p>
<p>It's 84KB gzipped, it loads for every user, and per our own analytics it is required by <strong>0.19%</strong> of sessions — almost all of them automated. We are paying 84KB on every first paint to support browsers that are, statistically, scrapers.</p>
<p>Proposed: serve it conditionally via a feature-detect that costs one blocking script tag of about 200 bytes. Old browsers get one extra round trip. Everyone else saves 84KB.</p>
<p>Objections by Friday, otherwise I'll take silence as consent and land it Monday.</p>`,
      },
      {
        from: 'jae',
        to: ['eng'],
        ago: 14 * D + 3 * H,
        body: `<p>Support, with one condition: the feature-detect has to be inline in the HTML, not a separate request. A blocking round trip before first paint for 99.8% of users would be worse than the 84KB.</p>`,
      },
      {
        from: 'me',
        to: ['eng'],
        ago: 13 * D + 20 * H,
        body: `<p>Agreed on both counts. Inline detect, conditional load.</p>
<p>One ask: put the 0.19% number and the date in a comment above the detect. In two years someone will find this and wonder whether it's still needed, and the comment is the difference between a five-minute answer and an afternoon.</p>`,
      },
    ],
  },
  {
    subject: 'Your receipt from Apple',
    cat: 'updates',
    labels: ['lb-receipts', 'lb-finance'],
    msgs: [
      {
        from: 'apple',
        to: ['me'],
        ago: 16 * D + 2 * H,
        body: `<p><strong>Receipt</strong> · Order ML8K2P9XQ4</p>
<table>
  <tr><th>Item</th><th>Type</th><th>Price</th></tr>
  <tr><td>iCloud+ 2TB</td><td>Monthly</td><td>$9.99</td></tr>
  <tr><td>Things 3</td><td>App</td><td>$49.99</td></tr>
</table>
<p><strong>Total: $59.98</strong> · Billed to Visa •••• 4419</p>
<p><a href="#">Report a problem</a> · <a href="#">Manage subscriptions</a></p>`,
      },
    ],
  },
  {
    subject: 'Invoice INV-2026-0847 is available',
    cat: 'updates',
    labels: ['lb-receipts', 'lb-finance'],
    msgs: [
      {
        from: 'stripe',
        to: ['me'],
        ago: 20 * D + 4 * H,
        att: [{ name: 'invoice-2026-0847.pdf', size: 148_223 }],
        body: `<p>An invoice is available for <strong>Meridian</strong>.</p>
<table>
  <tr><th>Invoice</th><td>INV-2026-0847</td></tr>
  <tr><th>Amount due</th><td>$0.00 — paid</td></tr>
  <tr><th>Period</th><td>Jun 1 – Jun 30, 2026</td></tr>
  <tr><th>Payment</th><td>Visa •••• 4419</td></tr>
</table>
<p><a href="#">View invoice</a> · <a href="#">Download PDF</a></p>`,
      },
    ],
  },
]

/* ========================================================================== */
/*  Updates                                                                    */
/* ========================================================================== */

const updates: SeedThread[] = [
  {
    subject: 'Your flight to Lisbon is confirmed — DL 244',
    cat: 'updates',
    labels: ['lb-travel'],
    msgs: [
      {
        from: 'delta',
        to: ['me'],
        ago: 5 * D + 1 * H,
        att: [{ name: 'boarding-pass-DL244.pdf', size: 96_442 }],
        body: `<p><strong>Confirmation JKQ4M2</strong></p>
<table>
  <tr><th>Flight</th><th>Route</th><th>Depart</th><th>Arrive</th></tr>
  <tr><td>DL 244</td><td>JFK → LIS</td><td>Sep 12, 10:35 PM</td><td>Sep 13, 10:15 AM</td></tr>
  <tr><td>DL 245</td><td>LIS → JFK</td><td>Sep 21, 12:05 PM</td><td>Sep 21, 3:40 PM</td></tr>
</table>
<p>Seat 14A · Main Cabin · 1 checked bag included</p>
<p>Check-in opens 24 hours before departure. <a href="#">Manage trip</a></p>`,
      },
    ],
  },
  {
    subject: 'Reservation confirmed: Alfama loft, Sep 13–21',
    cat: 'updates',
    labels: ['lb-travel'],
    msgs: [
      {
        from: 'airbnb',
        to: ['me'],
        ago: 5 * D + 30,
        body: `<p>Your trip to <strong>Lisbon</strong> is booked.</p>
<table>
  <tr><th>Place</th><td>Bright loft in Alfama, two terraces</td></tr>
  <tr><th>Dates</th><td>Sep 13 – Sep 21 (8 nights)</td></tr>
  <tr><th>Guests</th><td>2</td></tr>
  <tr><th>Host</th><td>Teresa · responds within an hour</td></tr>
  <tr><th>Total</th><td>$1,284.00</td></tr>
</table>
<p>Teresa left you a note: <em>"The stairs are steep and there are 47 of them. I say this so nobody is surprised."</em></p>
<p><a href="#">View itinerary</a> · <a href="#">Message host</a></p>`,
      },
    ],
  },
  {
    subject: 'Your AWS bill for June is ready',
    cat: 'updates',
    labels: ['lb-finance'],
    msgs: [
      {
        from: 'aws',
        to: ['me'],
        ago: 6 * D + 7 * H,
        body: `<p>Your invoice for <strong>June 2026</strong> is available.</p>
<table>
  <tr><th>Service</th><th>Cost</th></tr>
  <tr><td>Amazon EC2</td><td>$4,218.40</td></tr>
  <tr><td>Amazon S3</td><td>$1,904.22</td></tr>
  <tr><td>Amazon RDS</td><td>$1,102.90</td></tr>
  <tr><td>Data transfer</td><td>$688.15</td></tr>
  <tr><td>Other</td><td>$412.08</td></tr>
  <tr><th>Total</th><th>$8,325.75</th></tr>
</table>
<p>This is 12% above last month, driven mostly by S3 requests during the storage migration.</p>`,
      },
    ],
  },
  {
    subject: 'Your package has shipped',
    cat: 'updates',
    msgs: [
      {
        from: 'amazon',
        to: ['me'],
        ago: 2 * D + 11 * H,
        body: `<p>Arriving <strong>tomorrow by 8 PM</strong></p>
<ul>
  <li>Anker 140W USB-C charger</li>
  <li>Moleskine ruled notebook, large, 2-pack</li>
  <li>Hario V60 filters (100 ct)</li>
</ul>
<p>Tracking: 1Z999AA10123456784 · <a href="#">Track package</a></p>`,
      },
    ],
  },
  {
    subject: 'Your June statement is ready',
    cat: 'updates',
    labels: ['lb-finance'],
    msgs: [
      {
        from: 'chase',
        to: ['me'],
        ago: 7 * D + 9 * H,
        body: `<p>Your statement for the period ending June 30 is available in online banking.</p>
<table>
  <tr><th>Account</th><td>Everyday Checking •••• 8820</td></tr>
  <tr><th>Ending balance</th><td>$12,441.09</td></tr>
  <tr><th>Deposits</th><td>$9,120.00</td></tr>
  <tr><th>Withdrawals</th><td>$7,884.31</td></tr>
</table>
<p>We will never ask for your password or one-time code by email or phone.</p>`,
      },
    ],
  },
  {
    subject: 'The case for boring infrastructure',
    cat: 'updates',
    labels: ['lb-reading'],
    msgs: [
      {
        from: 'pragmatic',
        to: ['me'],
        ago: 3 * D + 13 * H,
        body: `<p><strong>This week:</strong> why the teams shipping fastest are usually running the least interesting stack.</p>
<p>I spent the last month talking to engineering leaders at eleven companies about their platform decisions. The pattern that emerged was uncomfortable for anyone who enjoys technology: the teams with the highest deploy frequency were, almost without exception, running the most conventional infrastructure available to them.</p>
<p>Not because boring is virtuous. Because <em>novel infrastructure spends your debugging budget</em>, and debugging budget is the scarcest resource an engineering team has. When your queue is the same queue ten thousand other companies run, your weird production incident has already been written up by someone else.</p>
<p>The counter-argument I got most often, and I think it's a fair one: sometimes the boring option genuinely cannot do the thing. The test I'd propose is whether you can articulate the specific limit you're hitting, in numbers. "It won't scale" is not that. "We're at 40,000 writes per second and the ceiling is 50,000" is.</p>
<p><a href="#">Read the full issue</a> · <a href="#">Unsubscribe</a></p>`,
      },
    ],
  },
  {
    subject: 'The attention economy has a supply problem',
    cat: 'updates',
    labels: ['lb-reading'],
    msgs: [
      {
        from: 'stratechery',
        to: ['me'],
        ago: 6 * D + 14 * H,
        body: `<p>For twenty years the strategic question in consumer software was how to capture attention. The assumption underneath — that attention was abundant and the constraint was your ability to grab it — has quietly stopped being true.</p>
<p>The evidence is in the numbers nobody wants to headline: time spent per user is flat or declining across every major platform, while the number of things competing for that time keeps climbing. When supply is fixed and demand rises, you get an auction. That's what the last two years of feed products have been.</p>
<p>What this changes strategically: products that <em>save</em> time are, for the first time in a while, structurally advantaged over products that <em>consume</em> it. This is a reversal of the last decade's logic and most incumbents are organizationally incapable of acting on it, because their metrics are built the other way around.</p>
<p><a href="#">Continue reading</a></p>`,
      },
    ],
  },
  {
    subject: 'Your workspace’s week in review',
    cat: 'updates',
    msgs: [
      {
        from: 'slack',
        to: ['me'],
        ago: 8 * D + 10 * H,
        body: `<p><strong>Meridian</strong> · week of July 13</p>
<table>
  <tr><th>Messages sent</th><td>14,882 <span style="color:#1e8e3e">↑ 4%</span></td></tr>
  <tr><th>In channels</th><td>61%</td></tr>
  <tr><th>Most active channel</th><td>#atlas-search</td></tr>
  <tr><th>Your reading time</th><td>3h 41m</td></tr>
</table>
<p>Three hours and forty-one minutes. We're not going to editorialize.</p>`,
      },
    ],
  },
  {
    subject: 'Your July receipt from Spotify',
    cat: 'updates',
    labels: ['lb-receipts'],
    msgs: [
      {
        from: 'spotify',
        to: ['me'],
        ago: 11 * D + 6 * H,
        body: `<p>Premium Duo · $16.99 · Visa •••• 4419</p>
<p>Next billing date: August 22, 2026.</p>
<p><a href="#">View receipt</a> · <a href="#">Manage plan</a></p>`,
      },
    ],
  },
  {
    subject: 'What’s new in Notion this month',
    cat: 'updates',
    msgs: [
      {
        from: 'notion',
        to: ['me'],
        ago: 13 * D + 8 * H,
        body: `<p>Three things shipped this month:</p>
<ul>
  <li><strong>Database charts</strong> — bar, line, and donut, straight off any view.</li>
  <li><strong>Faster search</strong> — results now stream as you type instead of waiting for the full query.</li>
  <li><strong>Offline for desktop</strong> — read and edit without a connection; changes sync when you're back.</li>
</ul>
<p><a href="#">See everything new</a></p>`,
      },
    ],
  },
]

/* ========================================================================== */
/*  Social                                                                     */
/* ========================================================================== */

const social: SeedThread[] = [
  {
    subject: 'You appeared in 14 searches this week',
    cat: 'social',
    msgs: [
      {
        from: 'linkedin',
        to: ['me'],
        ago: 1 * D + 12 * H,
        body: `<p>Your profile showed up in <strong>14 searches</strong> — up 27% from last week.</p>
<p>Searchers worked at: Vercel, Linear, Ramp, and 6 other companies.</p>
<p>Most common search terms: <em>staff frontend engineer</em>, <em>design systems</em>, <em>New York</em>.</p>
<p><a href="#">See all searchers</a></p>`,
      },
    ],
  },
  {
    subject: 'Sofia Lindqvist and 3 others viewed your profile',
    cat: 'social',
    msgs: [
      {
        from: 'linkedin',
        to: ['me'],
        ago: 4 * D + 15 * H,
        body: `<p><strong>Sofia Lindqvist</strong> · Talent at Meridian<br>
<strong>Rafael Ortiz</strong> · Engineering Manager at Linear<br>
<strong>Ada Nwosu</strong> · Recruiter at Ramp<br>
<strong>Someone at a technology company</strong> · viewed in private mode</p>
<p><a href="#">See all 12 viewers</a></p>`,
      },
    ],
  },
  {
    subject: 'Your 2026 in Photos memory is ready',
    cat: 'social',
    msgs: [
      {
        from: 'apple',
        to: ['me'],
        ago: 9 * D + 11 * H,
        body: `<p>We made you a memory: <strong>“Lisbon, September”</strong> — 84 photos, 6 videos, set to something with a lot of guitar.</p>
<p><a href="#">Watch memory</a></p>`,
      },
    ],
  },
]

/* ========================================================================== */
/*  Promotions                                                                 */
/* ========================================================================== */

const promotions: SeedThread[] = [
  {
    subject: 'Worn Wear: 30% off repairs through August',
    cat: 'promotions',
    msgs: [
      {
        from: 'patagonia',
        to: ['me'],
        ago: 1 * D + 3 * H,
        body: `<p><strong>The best jacket is the one you already own.</strong></p>
<p>Through August 31, we're taking 30% off all repairs at our Worn Wear centers. Zippers, seams, down leaks, that tear you've been meaning to deal with since 2023.</p>
<p>Mail it in or bring it to a store. Most repairs come back in two weeks.</p>
<p><a href="#">Start a repair</a></p>`,
      },
    ],
  },
  {
    subject: 'Introducing the Tree Dasher 3',
    cat: 'promotions',
    msgs: [
      {
        from: 'allbirds',
        to: ['me'],
        ago: 2 * D + 16 * H,
        body: `<p>Lighter midsole, better grip, same eucalyptus upper.</p>
<p>Early access opens for you today — 24 hours before everyone else. Free shipping and returns, as always.</p>
<p><a href="#">Shop the Dasher 3</a></p>`,
      },
    ],
  },
  {
    subject: '48 hours: up to 60% off the summer edit',
    cat: 'promotions',
    msgs: [
      {
        from: 'huckberry',
        to: ['me'],
        ago: 3 * D + 18 * H,
        body: `<p>Two days. Then it's gone and we go back to full price and act like this never happened.</p>
<ul>
  <li>Flint and Tinder waxed trucker — <s>$198</s> $118</li>
  <li>Proof 72-hour merino tee — <s>$68</s> $38</li>
  <li>Topo Designs rover pack — <s>$139</s> $89</li>
</ul>
<p><a href="#">Shop the sale</a></p>`,
      },
    ],
  },
  {
    subject: 'New arrival: Kayon Mountain, Ethiopia',
    cat: 'promotions',
    msgs: [
      {
        from: 'ritual',
        to: ['me'],
        ago: 5 * D + 20 * H,
        body: `<p>Just landed. Washed, 1,900–2,200m, harvested in December.</p>
<p>Tasting: white peach, bergamot, a long finish that goes floral as it cools. This is a light roast and we'd encourage you to grind coarser than you think.</p>
<p>$22 / 12oz · <a href="#">Order now</a></p>`,
      },
    ],
  },
  {
    subject: 'Your subscription renews in 7 days',
    cat: 'promotions',
    msgs: [
      {
        from: 'nyt',
        to: ['me'],
        ago: 7 * D + 14 * H,
        body: `<p>Your All Access subscription renews on August 1 at $25.00/month.</p>
<p>This month you read 34 articles, finished 6 crosswords, and lost to Spelling Bee 11 times.</p>
<p><a href="#">Manage subscription</a></p>`,
      },
    ],
  },
]

/* ========================================================================== */
/*  Sent (no longer in the inbox)                                              */
/* ========================================================================== */

const sent: SeedThread[] = [
  {
    subject: 'Northwind onboarding checklist',
    box: 'archive',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'me',
        to: ['harper'],
        cc: ['marcus'],
        ago: 2 * D + 22 * H,
        att: [{ name: 'northwind-onboarding.pdf', size: 512_002 }],
        body: `<p>Harper — here's the checklist for the next two weeks, in the order I'd do it.</p>
<ol>
  <li><strong>Week 1:</strong> SSO wired up, admin accounts created, one pilot team of 8–10 people moved over completely. Not partially — completely. Partial migrations teach people the product doesn't work.</li>
  <li><strong>Week 1, day 4:</strong> 30-minute session with the pilot team. Marcus runs it. The goal is to surface confusion while it's cheap to fix.</li>
  <li><strong>Week 2:</strong> remaining teams in two waves, 48 hours apart.</li>
  <li><strong>Week 2, end:</strong> retro with you and me. What broke, what surprised you, what we should tell the next customer.</li>
</ol>
<p>Marcus is your named contact and answers within a business day, usually much faster.</p>`,
      },
    ],
  },
  {
    subject: 'Notes from the density review',
    box: 'archive',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'me',
        to: ['design', 'eng'],
        ago: 4 * D + 21 * H,
        body: `<p>Notes for anyone who missed it.</p>
<p><strong>Decided.</strong> 44px rows. Label chips inline after the subject, collapsing to "+N" past two. Unread shown by weight plus a left accent bar. No hover state on the checkbox column.</p>
<p><strong>Not decided.</strong> Whether the date column shows relative time under an hour ("14m") or always a clock time. Priya wants relative, I want clock. We're going to build both behind a flag and just look at them for a week.</p>
<p><strong>Dropped.</strong> The avatar column at compact density — it doesn't survive below 40px rows and half-size avatars look broken rather than dense.</p>`,
      },
    ],
  },
  {
    subject: 'Feedback: Staff FE candidate (practical craft)',
    box: 'archive',
    labels: ['lb-recruiting'],
    msgs: [
      {
        from: 'me',
        to: ['sofia'],
        ago: 6 * D + 20 * H,
        body: `<p><strong>Recommendation: hire.</strong></p>
<p>We spent the hour on a rendering problem — a list that had to stay smooth at 10,000 rows with variable heights. They got to virtualization in about four minutes, which is table stakes, but the interesting part was what they did next: they asked what the rows contained before choosing a measurement strategy.</p>
<p>The signal I care most about was how they handled being wrong. I pushed on their first approach to scroll restoration and they didn't defend it — they said "you're right, that breaks if the content above changes height" and rewrote it. No ego, fast recovery.</p>
<p>One reservation: light on the testing conversation. Not a blocker, but worth someone else probing.</p>`,
      },
    ],
  },
  {
    subject: 'Re: quarterly planning — my two asks',
    box: 'archive',
    labels: ['lb-work'],
    msgs: [
      {
        from: 'me',
        to: ['dana'],
        cc: ['luis'],
        ago: 9 * D + 19 * H,
        body: `<p>Two asks for Q4, both boring, both compounding.</p>
<p><strong>1. Two weeks of dedicated performance work.</strong> Not "as we go." Dedicated. We have a list of eleven things that each cost 20–100ms and we've been paying all eleven for a year because none of them individually justifies stopping.</p>
<p><strong>2. A permanent slot for support-reported bugs.</strong> One engineer, rotating weekly, whose whole job that week is the top of Marcus's list. The current model — everything gets triaged into the backlog and the backlog is a graveyard — is why the same five complaints repeat every month.</p>
<p>Neither is glamorous. Both are why the product feels like it does.</p>`,
      },
    ],
  },
  {
    subject: 'Re: found the photos from Lisbon 😭',
    box: 'archive',
    labels: ['lb-personal'],
    msgs: [
      {
        from: 'me',
        to: ['mei'],
        ago: 1 * D + 6 * H,
        body: `<p>Absolutely not on photo three. I will call you. I am calling you right now.</p>
<p>The fish was YOUR idea. You said, and I quote, "the ugly ones taste better." It had a face like a foreclosure notice.</p>
<p>Send me the rooftop one at full size though, I want it printed.</p>`,
      },
    ],
  },
]

/* ========================================================================== */
/*  Trash & spam                                                               */
/* ========================================================================== */

const trash: SeedThread[] = [
  {
    subject: 'Last chance: your cart is expiring',
    cat: 'promotions',
    box: 'trash',
    msgs: [
      {
        from: 'huckberry',
        to: ['me'],
        ago: 6 * D + 22 * H,
        body: `<p>You left three things in your cart and we are choosing to take it personally.</p>
<p><a href="#">Return to cart</a></p>`,
      },
    ],
  },
  {
    subject: 'Weekly digest: 41 unread notifications',
    cat: 'updates',
    box: 'trash',
    msgs: [
      {
        from: 'linkedin',
        to: ['me'],
        ago: 8 * D + 16 * H,
        body: `<p>You have 41 unread notifications, 12 invitations, and 4 people you may know.</p>
<p><a href="#">Catch up</a></p>`,
      },
    ],
  },
  {
    subject: 'Re: lunch thursday',
    box: 'trash',
    msgs: [
      {
        from: 'jordan',
        to: ['me'],
        ago: 12 * D + 5 * H,
        body: `<p>never mind, I'm out of town thursday. next week?</p>`,
      },
    ],
  },
  {
    subject: 'Reminder: complete your Q2 compliance training',
    cat: 'updates',
    box: 'trash',
    msgs: [
      {
        from: 'eng',
        to: ['me'],
        ago: 21 * D + 8 * H,
        body: `<p>Our records show you have not completed the Q2 compliance module. It takes approximately 45 minutes.</p>
<p>Deadline: June 30. <a href="#">Start training</a></p>`,
      },
    ],
  },
]

const spam: SeedThread[] = [
  {
    subject: 'CONGRATULATIONS - your account selected for 4.2 BTC payout',
    box: 'spam',
    cat: 'promotions',
    msgs: [
      {
        from: 'spam1',
        to: ['me'],
        ago: 2 * D + 19 * H,
        body: `<p>Dear Valued Client,,</p>
<p>Your email adress has been selected in our quarterly YIELD DISTRIBUTION programme. Amount reserved: <strong>4.2 BTC</strong> (approx $284,000 USD).</p>
<p>To recieve funds you must verify identity within 24 hour or amount is forfeit and redistribute to other client.</p>
<p><a href="#">CLICK HERE TO CLAIM NOW</a></p>
<p>Regards,<br>Dr. Michael Sterling, Senior Payout Officer</p>`,
      },
    ],
  },
  {
    subject: 'Unusual sign-in attempt — action required within 24 hours',
    box: 'spam',
    cat: 'updates',
    msgs: [
      {
        from: 'spam2',
        to: ['me'],
        ago: 4 * D + 22 * H,
        body: `<p>We detect unusual activity on you account from device located in Country.</p>
<p>Your account will be permanently suspend unless you confirm your credential using the secure form below.</p>
<p><a href="#">Verify account now</a></p>
<p>Do not reply this email.</p>`,
      },
    ],
  },
  {
    subject: 'Your domain meridian.io is expiring — final notice',
    box: 'spam',
    cat: 'promotions',
    msgs: [
      {
        from: 'spam1',
        to: ['me'],
        ago: 10 * D + 12 * H,
        body: `<p>FINAL NOTICE regarding domain registration meridian.io.</p>
<p>Failure to remit payment of $89.00 will result in loss of domain and search engine de-listing. This is not a bill, this is a solicitation for services.</p>
<p><a href="#">Renew immediately</a></p>`,
      },
    ],
  },
]

export const SEED_THREADS: SeedThread[] = [
  ...primary,
  ...updates,
  ...social,
  ...promotions,
  ...sent,
  ...trash,
  ...spam,
]

/* ========================================================================== */
/*  Drafts                                                                     */
/* ========================================================================== */

export interface SeedDraft {
  to?: PersonKey[]
  cc?: PersonKey[]
  subject: string
  body: string
  /** Minutes before "now". */
  ago: number
  /** Subject of the thread this replies to, if any. */
  replyToSubject?: string
  att?: SeedAttachment[]
}

export const SEED_DRAFTS: SeedDraft[] = [
  {
    replyToSubject: 'Q3 board deck — I need your slide by Thursday',
    to: ['dana'],
    cc: ['luis'],
    subject: 'Re: Q3 board deck — I need your slide by Thursday',
    ago: 2 * H + 10,
    body: `<p>Dana — one slide, understood. Draft framing:</p>
<p><strong>"We spent Q3 making search worth using, and paid down the cost of doing it."</strong></p>
<ul>
  <li>Median time-to-first-result: 940ms → 180ms</li>
  <li>Reindex: 41m → 2h50m → </li>
</ul>
<p>Still need the support ticket number from Marcus before I</p>`,
  },
  {
    to: ['devon'],
    subject: 'Motion spec — two questions before we build',
    ago: 1 * D + 4 * H,
    body: `<p>Devon — spec is excellent, especially the "motion only explains provenance" rule. Two things before we start building:</p>
<p>1. Row removal at 0ms — I agree for archive and delete. What about undo? When a row comes back I think it does need to</p>`,
  },
  {
    replyToSubject: 'Lease renewal — two options for you',
    to: ['landlord'],
    subject: 'Re: Lease renewal — two options for you',
    ago: 3 * D + 2 * H,
    body: `<p>Hi Corinne — thanks for laying out both. I'm leaning toward the 24-month but want to check one thing first:</p>`,
  },
  {
    to: ['jordan', 'sam'],
    subject: '',
    ago: 4 * D + 7 * H,
    body: `<p>ok so if we're leaving at 6 I need someone to confirm they are actually awake at 5:30 because last time</p>`,
  },
]

/* ========================================================================== */
/*  Scheduled send                                                             */
/* ========================================================================== */

export interface SeedScheduled {
  to: PersonKey[]
  subject: string
  body: string
  /** Minutes in the future. */
  inMinutes: number
}

export const SEED_SCHEDULED: SeedScheduled[] = [
  {
    to: ['harper'],
    subject: 'Re: Contract renewal — can we push signature to Aug 14?',
    inMinutes: 15 * H,
    body: `<p>Harper — August 14 works. I'd rather someone read it properly than sign it on time.</p>
<p>Both of your asks are on the roadmap. Search inside attachments is Q4 and already scoped; saved searches pinned to the sidebar is smaller and I'll see if it can jump the queue.</p>
<p>Clara is sending the DPA counter today — one substantive change on audit rights, everything else accepted.</p>`,
  },
  {
    to: ['eng'],
    subject: 'Perf budget: the numbers we’re holding ourselves to',
    inMinutes: 2 * D + 3 * H,
    body: `<p>Starting next sprint, every interaction has a written budget. Over budget is a bug, not a tradeoff.</p>
<table>
  <tr><th>Interaction</th><th>Budget</th></tr>
  <tr><td>Keystroke → search results</td><td>100ms</td></tr>
  <tr><td>Open a thread</td><td>150ms</td></tr>
  <tr><td>Archive / delete (optimistic)</td><td>16ms</td></tr>
  <tr><td>Cold first paint</td><td>800ms</td></tr>
</table>
<p>These are p95 on a mid-tier laptop, not p50 on mine.</p>`,
  },
]
