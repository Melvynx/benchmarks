import { Contact, CustomLabel, EmailThread, Attachment } from '../types/mail';

export const CURRENT_USER = {
  name: 'Alex Chen',
  email: 'alex.chen@argonlabs.io',
  role: 'VP of Engineering',
  avatarColor: '#1a73e8',
  storageUsedGb: 4.82,
  storageTotalGb: 15,
};

export const INITIAL_LABELS: CustomLabel[] = [
  { id: 'eng', name: 'Engineering', color: '#1a73e8' },
  { id: 'product', name: 'Product', color: '#9334e6' },
  { id: 'finance', name: 'Finance', color: '#188038' },
  { id: 'design', name: 'Design', color: '#e37400' },
  { id: 'urgent', name: 'Urgent', color: '#d93025' },
  { id: 'travel', name: 'Travel', color: '#007b83' },
  { id: 'exec', name: 'Executive', color: '#3f51b5' },
];

export const LABEL_COLOR_PALETTE = [
  '#1a73e8',
  '#9334e6',
  '#188038',
  '#e37400',
  '#d93025',
  '#007b83',
  '#3f51b5',
  '#c2185b',
  '#5f6368',
];

export const CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Elena Rostova',
    email: 'elena.rostova@argonlabs.io',
    role: 'Principal Systems Architect',
    company: 'Argon Labs',
    avatarColor: '#0f9d58',
  },
  {
    id: 'c2',
    name: 'Marcus Vance',
    email: 'marcus.vance@argonlabs.io',
    role: 'Chief Financial Officer',
    company: 'Argon Labs',
    avatarColor: '#4285f4',
  },
  {
    id: 'c3',
    name: 'Sora Takahashi',
    email: 'sora@argonlabs.io',
    role: 'Head of Product Design',
    company: 'Argon Labs',
    avatarColor: '#ab47bc',
  },
  {
    id: 'c4',
    name: 'Devon Brooks',
    email: 'devon.brooks@argonlabs.io',
    role: 'Staff SRE Lead',
    company: 'Argon Labs',
    avatarColor: '#ef6c00',
  },
  {
    id: 'c5',
    name: 'Priya Nair',
    email: 'priya.nair@argonlabs.io',
    role: 'VP of Product',
    company: 'Argon Labs',
    avatarColor: '#d81b60',
  },
  {
    id: 'c6',
    name: 'Claire Sterling',
    email: 'csterling@sequoia-cap.io',
    role: 'Managing Partner',
    company: 'Sequoia Capital',
    avatarColor: '#00897b',
  },
  {
    id: 'c7',
    name: 'Liam O’Connor',
    email: 'liam@veridiancloud.com',
    role: 'Enterprise Account Director',
    company: 'Veridian Cloud',
    avatarColor: '#3949ab',
  },
  {
    id: 'c8',
    name: 'Hannah Abbott',
    email: 'hannah.abbott@argonlabs.io',
    role: 'Head of Talent & People',
    company: 'Argon Labs',
    avatarColor: '#8e24aa',
  },
  {
    id: 'c9',
    name: 'GitHub Notifications',
    email: 'notifications@github.com',
    role: 'Code Review & CI',
    company: 'GitHub',
    avatarColor: '#24292f',
  },
  {
    id: 'c10',
    name: 'Stripe Billing',
    email: 'receipts@stripe.com',
    role: 'Automated Financial Operations',
    company: 'Stripe',
    avatarColor: '#635bff',
  },
  {
    id: 'c11',
    name: 'Figma Workspace',
    email: 'comments@figma.com',
    role: 'Design Collaboration',
    company: 'Figma',
    avatarColor: '#f24e1e',
  },
  {
    id: 'c12',
    name: 'United Airlines',
    email: 'confirmations@united.com',
    role: 'MileagePlus Premier Desk',
    company: 'United Airlines',
    avatarColor: '#005daa',
  },
  {
    id: 'c13',
    name: 'Linear',
    email: 'updates@linear.app',
    role: 'Cycle & Triage Digest',
    company: 'Linear',
    avatarColor: '#5e6ad2',
  },
  {
    id: 'c14',
    name: 'Jordan Mercer',
    email: 'jmercer@kpmg-audit.com',
    role: 'SOC2 Lead Auditor',
    company: 'KPMG Advisory',
    avatarColor: '#00338d',
  },
];

export const SAMPLE_ATTACHABLE_FILES: Attachment[] = [
  {
    id: 'sample-arch',
    name: 'Argon_v4_Edge_Architecture.pdf',
    size: '2.4 MB',
    type: 'pdf',
    previewTitle: 'Argon v4 Multi-Region Edge Architecture RFC',
    previewMeta: {
      Author: 'Alex Chen & Elena Rostova',
      Pages: '18 pages',
      Status: 'Approved for Q4 Rollout',
    },
    previewContent: `1. EXECUTIVE SUMMARY
Moving the inference router to regional Anycast PoPs reduces p99 cold-start latency from 142ms to 29ms across US-East, EU-Central, and AP-Northeast.

2. KEY BENCHMARKS
• US-East (Virginia): 118ms -> 24ms (-79.6%)
• EU-Central (Frankfurt): 154ms -> 31ms (-79.8%)
• Zero-downtime WAL replication verified under 45,000 req/s synthetic burst load.`,
  },
  {
    id: 'sample-budget',
    name: 'FY27_Infra_Forecast_Model.xlsx',
    size: '845 KB',
    type: 'spreadsheet',
    previewTitle: 'FY27 Cloud & GPU Cluster Commit Forecast',
    previewMeta: {
      Sheet: 'Summary_By_Quarter',
      FormulaAudit: 'Passed',
      Currency: 'USD ($)',
    },
    previewContent: `Quarter | Compute Spend | Reserved Savings | Net Margin Impact
--------+---------------+------------------+------------------
Q1 FY27 | $412,000      | -$88,400 (21.4%) | +340 bps
Q2 FY27 | $438,500      | -$104,200 (23.7%)| +410 bps
Q3 FY27 | $465,000      | -$118,000 (25.3%)| +460 bps
Q4 FY27 | $490,200      | -$131,500 (26.8%)| +505 bps`,
  },
  {
    id: 'sample-trace',
    name: 'p99_flamegraph_snapshot.png',
    size: '1.1 MB',
    type: 'image',
    previewTitle: 'Production Cluster p99 CPU Flamegraph (us-east-1a)',
    previewMeta: {
      Resolution: '2880 × 1640 px',
      Captured: 'Oct 14, 2026 06:55 UTC',
      Cluster: 'prod-router-pool-04',
    },
    previewContent: `Flamegraph visualization showing 94.2% of worker threads in non-blocking epoll wait after replacing mutex-locked connection pool with thread-local ring buffers.`,
  },
];

export const EMAIL_TEMPLATES = [
  {
    id: 'tpl-approve',
    name: 'Approve & Sign-off',
    subject: 'Approved: Ready for production rollout',
    body: `Hi team,\n\nI reviewed the updated numbers and architecture notes. Everything looks solid on my end — you have my sign-off to proceed with the staged rollout.\n\nPlease keep an eye on the p99 latency dashboard during the first 30 minutes of traffic shifting and ping me in #eng-release if anything spikes.\n\nBest,\nAlex`,
  },
  {
    id: 'tpl-exec-sync',
    name: 'Executive Weekly Update',
    subject: 'Weekly Engineering & Infrastructure Executive Pulse',
    body: `Team,\n\nHere is our weekly engineering summary:\n\n• Reliability: 99.994% uptime across all core APIs over the past 7 days.\n• Velocity: Completed 42 story points in Cycle 18; multi-region edge caching is now at 50% traffic.\n• Hiring: Extending Staff Distributed Systems offer to Maya Lin today.\n• Next 48h Priority: Finalizing Q4 Board slide metrics with Finance.\n\nLet me know if you need deeper breakdowns on any metric.\n\nBest,\nAlex Chen`,
  },
  {
    id: 'tpl-reschedule',
    name: 'Quick Sync Request',
    subject: 'Quick 15-min sync on Q4 roadmap trade-offs?',
    body: `Hey,\n\nDo you have 15 minutes tomorrow between 10:30 AM and 12:00 PM PT to align on the Q4 scope items before we lock the sprint commitments?\n\nHappy to jump on a quick huddle whenever works best.\n\nThanks,\nAlex`,
  },
];

export const INITIAL_THREADS: EmailThread[] = [
  {
    id: 'th-1',
    subject: 'Production rollout: Multi-region Rust edge router (p99 down 78%)',
    snippet: 'All canary checks in eu-central-1 and us-east-1 passed with zero packet drops. Ready to flip 100% traffic?',
    category: 'primary',
    folder: 'inbox',
    isUnread: true,
    isStarred: true,
    isImportant: true,
    labels: ['eng', 'urgent'],
    lastActivityAt: '2026-10-14T07:14:00Z',
    displayDate: '7:14 AM',
    smartReplies: [
      'Looks great, ship 100% now!',
      'Let’s hold at 50% until 10 AM PT.',
      'Awesome latency drop — thanks Elena & Devon!',
    ],
    messages: [
      {
        id: 'm-101',
        threadId: 'th-1',
        sender: {
          name: 'Elena Rostova',
          email: 'elena.rostova@argonlabs.io',
          avatarColor: '#0f9d58',
          role: 'Principal Systems Architect',
        },
        to: [
          { name: 'Alex Chen', email: 'alex.chen@argonlabs.io' },
          { name: 'Devon Brooks', email: 'devon.brooks@argonlabs.io' },
        ],
        timestamp: '2026-10-13T18:20:00Z',
        displayTime: 'Yesterday, 6:20 PM',
        fullDate: 'Tue, Oct 13, 2026, 6:20 PM',
        body: `<p>Hi Alex, Devon,</p>
<p>We wrapped up the 24-hour soak test on the new zero-copy Rust edge proxy in staging and shifted <strong>10% production traffic</strong> in <code>us-east-1</code> earlier this afternoon.</p>
<p>Initial telemetry across 18M requests:</p>
<ul>
  <li><strong>p50 latency:</strong> 14.2ms → 4.8ms</li>
  <li><strong>p99 latency:</strong> 142.0ms → 31.4ms (-77.8%)</li>
  <li><strong>Memory footprint per node:</strong> 4.1 GB → 920 MB</li>
</ul>
<p>I’ve attached the full benchmark report and flamegraph comparison. If overnight metrics stay flat, we’d like to ramp to 50% at 06:00 UTC and 100% shortly after.</p>
<p>— Elena</p>`,
        attachments: [
          {
            id: 'att-101a',
            name: 'edge_router_v4_benchmarks.pdf',
            size: '1.8 MB',
            type: 'pdf',
            previewTitle: 'Edge Router v4 Canary Benchmark Report',
            previewMeta: {
              Cluster: 'us-east-1 & eu-central-1',
              SampleSize: '18,420,000 requests',
              ErrorRate: '0.00012% (baseline: 0.00045%)',
            },
            previewContent: `CANARY METRICS SUMMARY (24H SOAK)
------------------------------------------------------------
Metric                Legacy Go Proxy    Rust Hyper/Tokio v4
------------------------------------------------------------
p50 Latency           14.2 ms            4.8 ms (-66.2%)
p95 Latency           68.5 ms            16.1 ms (-76.5%)
p99 Latency           142.0 ms           31.4 ms (-77.8%)
p99.9 Latency         390.0 ms           58.2 ms (-85.1%)
RSS Memory / Pod      4,120 MB           920 MB (-77.6%)
TLS Handshake Overhead 6.4 ms            1.9 ms (Session Ticket Ring)`,
          },
        ],
      },
      {
        id: 'm-102',
        threadId: 'th-1',
        sender: {
          name: 'Alex Chen',
          email: 'alex.chen@argonlabs.io',
          avatarColor: '#1a73e8',
          role: 'VP of Engineering',
        },
        to: [
          { name: 'Elena Rostova', email: 'elena.rostova@argonlabs.io' },
          { name: 'Devon Brooks', email: 'devon.brooks@argonlabs.io' },
        ],
        timestamp: '2026-10-13T21:05:00Z',
        displayTime: 'Yesterday, 9:05 PM',
        fullDate: 'Tue, Oct 13, 2026, 9:05 PM',
        body: `<p>That memory reduction alone is going to save us retiring 18 c6i.4xlarge nodes before the Q4 traffic peak.</p>
<p>Devon — how do the connection drain hooks behave during a forced rolling restart? Make sure we verify graceful WebSocket migration before going past 50%.</p>`,
      },
      {
        id: 'm-103',
        threadId: 'th-1',
        sender: {
          name: 'Devon Brooks',
          email: 'devon.brooks@argonlabs.io',
          avatarColor: '#ef6c00',
          role: 'Staff SRE Lead',
        },
        to: [
          { name: 'Alex Chen', email: 'alex.chen@argonlabs.io' },
          { name: 'Elena Rostova', email: 'elena.rostova@argonlabs.io' },
        ],
        timestamp: '2026-10-14T07:14:00Z',
        displayTime: '7:14 AM',
        fullDate: 'Wed, Oct 14, 2026, 7:14 AM',
        body: `<p>Morning both,</p>
<p>We ran three chaos node terminations at 50% traffic in both <code>eu-central-1</code> and <code>us-east-1</code> at 06:30 UTC. Zero dropped WebSocket frames — the <code>SO_REUSEPORT</code> socket handoff completed in under 11ms across all 64 worker processes.</p>
<p>All canary checks passed with green SLO burn rates. Ready for your final go-ahead to flip <strong>100% production traffic</strong> and decommission the legacy pool.</p>
<p>Best,<br/>Devon</p>`,
        attachments: [
          {
            id: 'att-103a',
            name: 'chaos_drain_trace.json',
            size: '412 KB',
            type: 'code',
            previewTitle: 'Chaos Drain & Socket Handoff Telemetry',
            previewMeta: {
              Region: 'eu-central-1',
              ActiveSocketsMigrated: '142,890',
              DroppedFrames: '0',
            },
            previewContent: `{
  "experiment_id": "chaos-socket-handoff-2026-10-14",
  "traffic_weight_pct": 50,
  "active_websocket_sessions": 142890,
  "sigterm_to_listener_handoff_ms": 10.8,
  "dropped_requests": 0,
  "tls_resumption_hit_rate": 0.9942,
  "slo_burn_rate_1h": 0.04,
  "verdict": "PASS_READY_FOR_100_PCT"
}`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-2',
    subject: 'Q4 Board Deck: Final R&D efficiency & gross margin slides',
    snippet: 'Claire asked for a slide breaking out inference cost per 1M tokens vs. cloud commit utilization before Friday’s board call.',
    category: 'primary',
    folder: 'inbox',
    isUnread: true,
    isStarred: true,
    isImportant: true,
    labels: ['finance', 'exec'],
    lastActivityAt: '2026-10-14T06:48:00Z',
    displayDate: '6:48 AM',
    smartReplies: [
      'I’ll drop the updated slide 14 numbers in by noon.',
      'Numbers on slide 12 look accurate to me.',
      'Let’s review live at 11:00 AM.',
    ],
    messages: [
      {
        id: 'm-201',
        threadId: 'th-2',
        sender: {
          name: 'Marcus Vance',
          email: 'marcus.vance@argonlabs.io',
          avatarColor: '#4285f4',
          role: 'Chief Financial Officer',
        },
        to: [
          { name: 'Alex Chen', email: 'alex.chen@argonlabs.io' },
          { name: 'Priya Nair', email: 'priya.nair@argonlabs.io' },
        ],
        cc: [{ name: 'Claire Sterling', email: 'csterling@sequoia-cap.io' }],
        timestamp: '2026-10-14T06:48:00Z',
        displayTime: '6:48 AM',
        fullDate: 'Wed, Oct 14, 2026, 6:48 AM',
        body: `<p>Alex, Priya,</p>
<p>I’ve attached v3 of the <strong>Q4 Board of Directors Deck</strong> ahead of our Thursday dry run. Gross margin improved from <strong>74.2% to 78.9%</strong> in Q3 thanks to the GPU batching optimizations and reserved instance restructuring.</p>
<p>Claire specifically asked if we can include a unit-economics table on <strong>Slide 14</strong> comparing:</p>
<ol>
  <li>Cost per 1M tokens routed (Q1 vs. Q3 actuals vs. Q4 forecast)</li>
  <li>Engineering headcount allocation between Core Infrastructure and Enterprise Workflows</li>
  <li>Net dollar retention impact from the new dedicated VPC tier</li>
</ol>
<p>Can you sanity-check the engineering metrics table in the attached deck before 2:00 PM PT today?</p>
<p>Thanks,<br/>Marcus</p>`,
        attachments: [
          {
            id: 'att-201a',
            name: 'ArgonLabs_Q4_2026_Board_Deck_v3.pdf',
            size: '6.2 MB',
            type: 'pdf',
            previewTitle: 'Argon Labs — Q4 2026 Board of Directors Presentation (v3)',
            previewMeta: {
              Classification: 'Board Confidential',
              Slides: '32 slides',
              LastModifiedBy: 'Marcus Vance (CFO)',
            },
            previewContent: `SLIDE 14: INFRASTRUCTURE UNIT ECONOMICS & GROSS MARGIN EXPANSION
-------------------------------------------------------------------
• ARR: $48.6M (+142% YoY) | Net Dollar Retention: 138%
• Gross Margin: 78.9% (+470 bps QoQ)
• Inference Cost / 1M Requests: $0.18 (down from $0.41 in Q1)
• Uptime SLA Attainment: 99.996% across 190 enterprise tenants`,
          },
          {
            id: 'att-201b',
            name: 'Unit_Economics_Appendix_Q3_Q4.xlsx',
            size: '1.1 MB',
            type: 'spreadsheet',
            previewTitle: 'Unit Economics & Cloud COGS Model (Q3 Actuals / Q4 Plan)',
            previewMeta: {
              Workbook: 'COGS_By_Service_Tier.xlsx',
              VerifiedBy: 'FP&A Team',
            },
            previewContent: `Tier             | Active Orgs | Monthly Rev | Infra COGS | Gross Margin
-----------------+-------------+-------------+------------+-------------
Enterprise VPC   | 64          | $2,480,000  | $372,000   | 85.0%
Pro Growth       | 812         | $1,210,000  | $290,400   | 76.0%
Self-Serve Usage | 3,490       | $360,000    | $190,800   | 47.0%
TOTAL            | 4,366       | $4,050,000  | $853,200   | 78.9%`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-3',
    subject: 'Design critique: Command Palette 2.0 & split-pane keyboard navigation',
    snippet: 'Sora shared 4 updated interactive prototypes in Figma with reduced visual noise and sub-16ms keyboard focus rings.',
    category: 'primary',
    folder: 'inbox',
    isUnread: true,
    isStarred: false,
    isImportant: true,
    labels: ['design', 'product'],
    lastActivityAt: '2026-10-14T05:32:00Z',
    displayDate: '5:32 AM',
    smartReplies: [
      'Option B with the compact pill badges feels super crisp.',
      'Left comments in Figma — love the new keyboard hints!',
      'Let’s ship this behind the beta flag today.',
    ],
    messages: [
      {
        id: 'm-301',
        threadId: 'th-3',
        sender: {
          name: 'Sora Takahashi',
          email: 'sora@argonlabs.io',
          avatarColor: '#ab47bc',
          role: 'Head of Product Design',
        },
        to: [
          { name: 'Alex Chen', email: 'alex.chen@argonlabs.io' },
          { name: 'Priya Nair', email: 'priya.nair@argonlabs.io' },
        ],
        timestamp: '2026-10-14T05:32:00Z',
        displayTime: '5:32 AM',
        fullDate: 'Wed, Oct 14, 2026, 5:32 AM',
        body: `<p>Hey Alex & Priya,</p>
<p>Following yesterday’s design review, we tightened up the information density across the main workspace table and refined the <strong>Command Palette 2.0</strong> tokens:</p>
<ul>
  <li>Reduced row vertical padding in <em>Compact</em> mode to fit 28 rows on a standard 1440p viewport without truncation.</li>
  <li>Added subtle keyboard shortcut kbd badges directly inside action tooltips (<code>e</code> to Archive, <code>#</code> to Delete, <code>s</code> to Star).</li>
  <li>Tuned dark mode surface contrast from pure black to elevated slate (<code>#1e1f23</code>) to prevent halation on OLED displays.</li>
</ul>
<p>Check out the attached spec sheet and let me know if you prefer <strong>Option A (Outlined chips)</strong> or <strong>Option B (Tonal Material pills)</strong>.</p>
<p>— Sora</p>`,
        attachments: [
          {
            id: 'att-301a',
            name: 'Design_System_Tokens_v4.2.fig',
            size: '14.6 MB',
            type: 'image',
            previewTitle: 'Figma Component Spec — Surface & Typography Tokens v4.2',
            previewMeta: {
              Artboards: '12 frames',
              DesignSystem: 'Argon Material 3',
              WCAGContrast: 'AAA Compliant (11.4:1 primary text)',
            },
            previewContent: `SURFACE PALETTE TOKENS
• Surface-Shell-Light: #F6F8FC | Surface-Card-Light: #FFFFFF
• Active-Nav-Pill: #D3E3FD (Text: #041E49)
• Primary-Compose-FAB: #C2E7FF (Text: #001D35)
• Unread-Row-Bg: #FFFFFF | Read-Row-Bg: #F2F6FC`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-4',
    subject: 'Offer Packet Approval: Maya Lin — Staff Distributed Systems Engineer (L7)',
    snippet: 'Maya crushed the architecture loop (4x Strong Hire). Comp committee approved the equity band — ready for your signature.',
    category: 'primary',
    folder: 'inbox',
    isUnread: false,
    isStarred: true,
    isImportant: true,
    labels: ['eng', 'exec'],
    lastActivityAt: '2026-10-13T22:15:00Z',
    displayDate: 'Oct 13',
    smartReplies: [
      'Signed and approved! Let’s schedule a welcome call with Maya.',
      'Happy to hop on a closing call with her this afternoon.',
    ],
    messages: [
      {
        id: 'm-401',
        threadId: 'th-4',
        sender: {
          name: 'Hannah Abbott',
          email: 'hannah.abbott@argonlabs.io',
          avatarColor: '#8e24aa',
          role: 'Head of Talent & People',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-13T22:15:00Z',
        displayTime: 'Oct 13, 10:15 PM',
        fullDate: 'Tue, Oct 13, 2026, 10:15 PM',
        body: `<p>Hi Alex,</p>
<p>Great news from the hiring debrief: the panel was unanimous (<strong>4x Strong Hire</strong>) on <strong>Maya Lin</strong> for the Staff Distributed Systems Engineer role on the Storage Engine squad.</p>
<p>Highlights from the packet:</p>
<ul>
  <li><strong>Systems Design (Elena):</strong> <em>"Best Raft consensus & WAL compaction walkthrough we’ve seen this year."</em></li>
  <li><strong>Code Debugging (Devon):</strong> Found the subtle lock-ordering deadlock in the benchmark harness in 14 minutes.</li>
  <li><strong>Target Start Date:</strong> November 9, 2026</li>
</ul>
<p>I’ve attached the formal offer letter and scorecard summary. Once you reply with approval, we’ll send the DocuSign out today.</p>
<p>Best,<br/>Hannah</p>`,
        attachments: [
          {
            id: 'att-401a',
            name: 'Offer_Packet_Maya_Lin_L7_Staff_Eng.pdf',
            size: '920 KB',
            type: 'pdf',
            previewTitle: 'Candidate Offer Packet & Debrief Scorecard — Maya Lin (L7)',
            previewMeta: {
              Role: 'Staff Distributed Systems Engineer (L7)',
              Team: 'Core Storage & Consensus',
              Decision: '4/4 Strong Hire',
            },
            previewContent: `CANDIDATE DEBRIEF SUMMARY: MAYA LIN
------------------------------------------------------------
Interviewer       Focus Area                  Rating
------------------------------------------------------------
Elena Rostova     Distributed Storage RFC     Strong Hire (4.0/4.0)
Devon Brooks      Production Concurrency      Strong Hire (3.9/4.0)
Priya Nair        Cross-Functional Product    Strong Hire (3.8/4.0)
Alex Chen         Executive & Architecture    Strong Hire (4.0/4.0)`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-5',
    subject: 'SOC2 Type II Annual Audit: Zero exceptions on final evidence walkthrough',
    snippet: 'Jordan Mercer (KPMG) confirmed all 114 controls passed testing with zero findings. Final signed attestation report attached.',
    category: 'primary',
    folder: 'inbox',
    isUnread: false,
    isStarred: false,
    isImportant: true,
    labels: ['eng', 'finance'],
    lastActivityAt: '2026-10-13T17:40:00Z',
    displayDate: 'Oct 13',
    smartReplies: [
      'Thank you Jordan! Huge milestone for the team.',
      'Sharing this with our Enterprise Trust Center now.',
    ],
    messages: [
      {
        id: 'm-501',
        threadId: 'th-5',
        sender: {
          name: 'Jordan Mercer',
          email: 'jmercer@kpmg-audit.com',
          avatarColor: '#00338d',
          role: 'SOC2 Lead Auditor, KPMG',
        },
        to: [
          { name: 'Alex Chen', email: 'alex.chen@argonlabs.io' },
          { name: 'Devon Brooks', email: 'devon.brooks@argonlabs.io' },
        ],
        timestamp: '2026-10-13T17:40:00Z',
        displayTime: 'Oct 13, 5:40 PM',
        fullDate: 'Tue, Oct 13, 2026, 5:40 PM',
        body: `<p>Dear Alex and Devon,</p>
<p>We have completed our independent examination of Argon Labs’ Security, Availability, and Confidentiality trust services criteria for the 12-month audit period ending September 30, 2026.</p>
<p>I am pleased to confirm that <strong>all 114 controls passed with zero exceptions noted</strong>. Automated continuous evidence collection from your GitHub branch protection rules, AWS IAM hardware MFA enforcement, and encrypted backup restoration drills made this one of the cleanest reviews of the quarter.</p>
<p>Please find the final signed <strong>SOC2 Type II Report</strong> attached for your customer Trust Portal.</p>
<p>Sincerely,<br/>Jordan Mercer, CPA, CISA</p>`,
        attachments: [
          {
            id: 'att-501a',
            name: 'ArgonLabs_SOC2_TypeII_2026_Final_Signed.pdf',
            size: '3.4 MB',
            type: 'pdf',
            previewTitle: 'SOC 2 Type II Independent Service Auditor’s Report (2026)',
            previewMeta: {
              Auditor: 'KPMG LLP',
              ControlsTested: '114 / 114',
              Exceptions: '0 (Unqualified Opinion)',
            },
            previewContent: `INDEPENDENT SERVICE AUDITOR'S OPINION
In our opinion, management's description of Argon Labs' system fairly presents the system that was designed and implemented throughout the period October 1, 2025 to September 30, 2026, and the controls operated effectively to provide reasonable assurance that the Trust Services Criteria were achieved.`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-6',
    subject: 'Flight Confirmation: SFO → JFK (United UA 1492 — Oct 19, 2026)',
    snippet: 'Confirmation #K8M4NP. Seat 2A (United Polaris Business). E-ticket receipt and calendar invite attached.',
    category: 'primary',
    folder: 'inbox',
    isUnread: false,
    isStarred: true,
    isImportant: false,
    labels: ['travel'],
    lastActivityAt: '2026-10-12T15:10:00Z',
    displayDate: 'Oct 12',
    messages: [
      {
        id: 'm-601',
        threadId: 'th-6',
        sender: {
          name: 'United Airlines',
          email: 'confirmations@united.com',
          avatarColor: '#005daa',
          role: 'MileagePlus Premier 1K Desk',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-12T15:10:00Z',
        displayTime: 'Oct 12, 3:10 PM',
        fullDate: 'Mon, Oct 12, 2026, 3:10 PM',
        body: `<p>Thank you for choosing United Airlines, <strong>Alex Chen</strong>.</p>
<p>Your reservation for New York/Newark is ticketed and confirmed.</p>
<p><strong>Confirmation Number:</strong> <code>K8M4NP</code><br/>
<strong>Outbound:</strong> Mon, Oct 19, 2026 • Flight UA 1492 (Boeing 787-10 Dreamliner)<br/>
<strong>Depart:</strong> San Francisco (SFO) Terminal 3 — 8:30 AM PT<br/>
<strong>Arrive:</strong> New York/Newark (EWR) Terminal C — 4:58 PM ET<br/>
<strong>Seat:</strong> 2A (United Polaris® Business)</p>
<p>Your e-ticket receipt and calendar itinerary are attached below for expense reporting.</p>`,
        attachments: [
          {
            id: 'att-601a',
            name: 'UA1492_SFO_EWR_Itinerary.ics',
            size: '18 KB',
            type: 'calendar',
            previewTitle: 'Calendar Event: Flight UA 1492 (SFO → EWR)',
            previewMeta: {
              Date: 'Mon, Oct 19, 2026, 8:30 AM – 4:58 PM',
              Location: 'San Francisco Intl (SFO) Gate F12',
              Confirmation: 'K8M4NP (Seat 2A)',
            },
            previewContent: `BEGIN:VCALENDAR
SUMMARY:Flight UA 1492 SFO to EWR (Seat 2A)
DTSTART:20261019T153000Z
DTEND:20261019T205800Z
LOCATION:San Francisco International Airport (SFO) - Terminal 3
DESCRIPTION:United Polaris Business | Confirmation: K8M4NP
END:VCALENDAR`,
          },
          {
            id: 'att-601b',
            name: 'United_eTicket_Receipt_K8M4NP.pdf',
            size: '245 KB',
            type: 'pdf',
            previewTitle: 'Passenger eTicket Receipt — Confirmation K8M4NP',
            previewMeta: {
              Passenger: 'CHEN / ALEX',
              TicketNumber: '0162498103942',
              TotalPaid: '$1,482.40 USD (Corporate Amex •••• 4019)',
            },
            previewContent: `UNITED AIRLINES PASSENGER RECEIPT
------------------------------------------------------------
Passenger: CHEN / ALEX (Premier 1K / Star Alliance Gold)
Flight: UA 1492 | SFO -> EWR | Class: J (Polaris Business)
Fare: $1,380.00 | Taxes & Carrier Fees: $102.40
Total Charged: $1,482.40 USD`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-7',
    subject: 'Enterprise Contract Expansion: Veridian Cloud (+450 seats, 3-year commit)',
    snippet: 'Liam signed the order form after we confirmed the dedicated KMS key rotation SLA. $640k ACV expansion locked.',
    category: 'primary',
    folder: 'inbox',
    isUnread: true,
    isStarred: false,
    isImportant: true,
    labels: ['finance', 'exec', 'product'],
    lastActivityAt: '2026-10-14T04:12:00Z',
    displayDate: '4:12 AM',
    smartReplies: [
      'Incredible close! Congrats to the whole solutions team.',
      'We’ll provision their dedicated KMS cluster this afternoon.',
    ],
    messages: [
      {
        id: 'm-701',
        threadId: 'th-7',
        sender: {
          name: 'Liam O’Connor',
          email: 'liam@veridiancloud.com',
          avatarColor: '#3949ab',
          role: 'Enterprise Account Director, Veridian Cloud',
        },
        to: [
          { name: 'Alex Chen', email: 'alex.chen@argonlabs.io' },
          { name: 'Priya Nair', email: 'priya.nair@argonlabs.io' },
        ],
        timestamp: '2026-10-14T04:12:00Z',
        displayTime: '4:12 AM',
        fullDate: 'Wed, Oct 14, 2026, 4:12 AM',
        body: `<p>Hi Alex and Priya,</p>
<p>Our CISO and VP of Platform signed off on the security addendum this morning. Attached is the countersigned <strong>3-Year Enterprise Master Order Form</strong> expanding our deployment by 450 engineering seats ($640,000 ACV).</p>
<p>Thank you for turning around the BYOK (Bring Your Own Key) AWS KMS architectural diagram so quickly yesterday — that sealed the deal with our compliance committee.</p>
<p>Looking forward to kicking off the dedicated cluster provisioning on Monday!</p>
<p>Best regards,<br/>Liam O’Connor</p>`,
        attachments: [
          {
            id: 'att-701a',
            name: 'Veridian_Cloud_Enterprise_Order_Form_Signed.pdf',
            size: '1.9 MB',
            type: 'pdf',
            previewTitle: 'Countersigned Enterprise Order Form — Veridian Cloud Inc.',
            previewMeta: {
              ContractValue: '$1,920,000 TCV ($640,000 ACV)',
              Term: '36 Months (Nov 1, 2026 – Oct 31, 2029)',
              Status: 'Fully Executed',
            },
            previewContent: `MASTER SUBSCRIPTION ORDER FORM
Customer: Veridian Cloud Inc.
Plan: Argon Enterprise Dedicated VPC + BYOK KMS Encryption
Included Seats: 750 Active Engineers (+450 Expansion)
Committed Uptime SLA: 99.99% Financial Credit Backed`,
          },
        ],
      },
    ],
  },
  // UPDATES CATEGORY INBOX THREADS
  {
    id: 'th-8',
    subject: '[argonlabs/edge-router] PR #1482 merged: Lock-free ring buffer for TLS session tickets',
    snippet: 'elena-rostova merged 6 commits into main from feat/ring-buffer-tickets. All 28 CI checks passed in 2m 14s.',
    category: 'updates',
    folder: 'inbox',
    isUnread: true,
    isStarred: false,
    isImportant: false,
    labels: ['eng'],
    lastActivityAt: '2026-10-14T06:58:00Z',
    displayDate: '6:58 AM',
    messages: [
      {
        id: 'm-801',
        threadId: 'th-8',
        sender: {
          name: 'GitHub Notifications',
          email: 'notifications@github.com',
          avatarColor: '#24292f',
          role: 'GitHub Actions & Pull Requests',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-14T06:58:00Z',
        displayTime: '6:58 AM',
        fullDate: 'Wed, Oct 14, 2026, 6:58 AM',
        body: `<p><strong>@elena-rostova</strong> merged pull request <strong>#1482</strong> into <code>main</code>:</p>
<p><strong>feat(tls): Lock-free per-core ring buffer for TLS 1.3 session ticket rotation</strong></p>
<ul>
  <li>Eliminates global <code>RwLock</code> contention during TLS 1.3 0-RTT resumption bursts.</li>
  <li>Adds Miri memory-safety verification step to GitHub Actions pipeline.</li>
  <li>Benchmarked at 1.42M handshakes/sec on 64-core Graviton4 instance.</li>
</ul>
<p>Commit SHA: <code>9f82c1d4e7a0</code> • 28 / 28 checks passed.</p>`,
      },
    ],
  },
  {
    id: 'th-9',
    subject: 'Stripe Payout Initiated: $184,920.00 USD arriving Oct 15, 2026',
    snippet: 'Your daily automated payout to Silicon Valley Commercial Bank (•••• 8821) is in transit. Reconciliation CSV attached.',
    category: 'updates',
    folder: 'inbox',
    isUnread: false,
    isStarred: false,
    isImportant: false,
    labels: ['finance'],
    lastActivityAt: '2026-10-14T03:00:00Z',
    displayDate: '3:00 AM',
    messages: [
      {
        id: 'm-901',
        threadId: 'th-9',
        sender: {
          name: 'Stripe Billing',
          email: 'receipts@stripe.com',
          avatarColor: '#635bff',
          role: 'Treasury & Payout Notifications',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-14T03:00:00Z',
        displayTime: '3:00 AM',
        fullDate: 'Wed, Oct 14, 2026, 3:00 AM',
        body: `<p>Hi Argon Labs Inc.,</p>
<p>A payout of <strong>$184,920.00 USD</strong> has been initiated to your bank account ending in <strong>•••• 8821</strong>.</p>
<ul>
  <li><strong>Payout ID:</strong> <code>po_1Q9xLm2eZvKYlo2C9812</code></li>
  <li><strong>Gross Volume:</strong> $186,410.00 USD (47 Enterprise invoices + 312 Pro subscriptions)</li>
  <li><strong>Processing Fees:</strong> -$1,490.00 USD</li>
  <li><strong>Expected Arrival:</strong> Thursday, Oct 15, 2026</li>
</ul>`,
        attachments: [
          {
            id: 'att-901a',
            name: 'stripe_payout_reconciliation_2026_10_14.csv',
            size: '128 KB',
            type: 'spreadsheet',
            previewTitle: 'Stripe Payout Reconciliation Ledger (Oct 14, 2026)',
            previewMeta: {
              PayoutID: 'po_1Q9xLm2eZvKYlo2C9812',
              NetAmount: '$184,920.00 USD',
              Transactions: '359 settled charges',
            },
            previewContent: `charge_id,customer_name,plan_tier,gross_usd,fee_usd,net_usd
ch_99281a,Veridian Cloud Inc,Enterprise Annual,48000.00,240.00,47760.00
ch_99282b,Kinetix AI Labs,Enterprise Quarterly,24500.00,122.50,24377.50
ch_99283c,Northstar FinTech,Enterprise Annual,62000.00,310.00,61690.00`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-10',
    subject: 'Linear Cycle 18 Digest: 94% completion rate, 3 carryover issues triaged',
    snippet: 'Core Platform completed 68 of 72 scoped points in Cycle 18. Cycle 19 kicks off today with focus on zero-downtime schema migrations.',
    category: 'updates',
    folder: 'inbox',
    isUnread: true,
    isStarred: false,
    isImportant: false,
    labels: ['eng', 'product'],
    lastActivityAt: '2026-10-14T02:15:00Z',
    displayDate: '2:15 AM',
    messages: [
      {
        id: 'm-1001',
        threadId: 'th-10',
        sender: {
          name: 'Linear',
          email: 'updates@linear.app',
          avatarColor: '#5e6ad2',
          role: 'Automated Workspace Digest',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-14T02:15:00Z',
        displayTime: '2:15 AM',
        fullDate: 'Wed, Oct 14, 2026, 2:15 AM',
        body: `<p><strong>Argon Labs — Cycle 18 Wrap-up Summary</strong></p>
<p>Your engineering teams closed <strong>54 issues (68 points, 94.4% completion)</strong> over the past two weeks.</p>
<ul>
  <li><strong>Edge & Networking:</strong> 100% completed (24/24 pts)</li>
  <li><strong>Storage & WAL Engine:</strong> 92% completed (22/24 pts)</li>
  <li><strong>Web Console & Design System:</strong> 91% completed (22/24 pts)</li>
</ul>`,
      },
    ],
  },
  // SOCIAL CATEGORY INBOX THREADS
  {
    id: 'th-11',
    subject: 'Keynote Panel Invite: QCon San Francisco — "Sub-30ms Global Edge Systems"',
    snippet: 'The QCon SF program committee would love to feature you on the Architecture Track keynote panel on Nov 17.',
    category: 'social',
    folder: 'inbox',
    isUnread: true,
    isStarred: true,
    isImportant: false,
    labels: ['eng', 'travel'],
    lastActivityAt: '2026-10-13T19:45:00Z',
    displayDate: 'Oct 13',
    smartReplies: [
      'I’d be honored to join the panel! Nov 17 works well.',
      'Looping in our comms team to coordinate speaker bio & slides.',
    ],
    messages: [
      {
        id: 'm-1101',
        threadId: 'th-11',
        sender: {
          name: 'Dr. Aris Thorne (QCon Program Chair)',
          email: 'aris@qconferences.com',
          avatarColor: '#00796b',
          role: 'Track Host — Modern Systems in Production',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-13T19:45:00Z',
        displayTime: 'Oct 13, 7:45 PM',
        fullDate: 'Tue, Oct 13, 2026, 7:45 PM',
        body: `<p>Hi Alex,</p>
<p>We read Argon Labs’ recent engineering post on migrating your global proxy fleet from Go to Rust with zero-copy ring buffers, and the community response has been phenomenal.</p>
<p>We would love to invite you to speak on our <strong>Systems at Scale Keynote Panel</strong> at <strong>QCon San Francisco</strong> on Tuesday, November 17, 2026 at Moscone West.</p>
<p>Let us know if you’re available and we’ll send over the speaker pass and stage schedule!</p>
<p>Warm regards,<br/>Dr. Aris Thorne</p>`,
      },
    ],
  },
  {
    id: 'th-12',
    subject: 'Figma comment from Sora on "Inbox Split-Pane Responsive Breakpoints"',
    snippet: '@Alex Chen I added the 3-way reading pane switcher in the top toolbar so power users can flip between Right Split and Bottom Split in 1 click.',
    category: 'social',
    folder: 'inbox',
    isUnread: false,
    isStarred: false,
    isImportant: false,
    labels: ['design'],
    lastActivityAt: '2026-10-13T14:22:00Z',
    displayDate: 'Oct 13',
    messages: [
      {
        id: 'm-1201',
        threadId: 'th-12',
        sender: {
          name: 'Figma Workspace',
          email: 'comments@figma.com',
          avatarColor: '#f24e1e',
          role: 'Design Collaboration Notification',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-13T14:22:00Z',
        displayTime: 'Oct 13, 2:22 PM',
        fullDate: 'Tue, Oct 13, 2026, 2:22 PM',
        body: `<p><strong>Sora Takahashi</strong> left a comment on frame <code>Reading Pane Layout Switcher</code>:</p>
<blockquote>"@Alex Chen I added the 3-way reading pane switcher in the top toolbar and Quick Settings drawer so power users can flip between No Split, Right Split, and Bottom Split in 1 click."</blockquote>`,
      },
    ],
  },
  // PROMOTIONS CATEGORY INBOX THREADS
  {
    id: 'th-13',
    subject: 'AWS re:Invent 2026 Executive Leadership Summit — VIP Pass Reserved',
    snippet: 'Your complimentary Executive Summit credential and Wynn Las Vegas suite block code expire this Friday.',
    category: 'promotions',
    folder: 'inbox',
    isUnread: true,
    isStarred: false,
    isImportant: false,
    labels: ['travel', 'exec'],
    lastActivityAt: '2026-10-13T16:10:00Z',
    displayDate: 'Oct 13',
    messages: [
      {
        id: 'm-1301',
        threadId: 'th-13',
        sender: {
          name: 'AWS Executive Programs',
          email: 'exec-summit@amazon.com',
          avatarColor: '#ff9900',
          role: 'Enterprise Partner Events',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-13T16:10:00Z',
        displayTime: 'Oct 13, 4:10 PM',
        fullDate: 'Tue, Oct 13, 2026, 4:10 PM',
        body: `<p>Hi Alex,</p>
<p>As a strategic AWS Compute Partner, we have reserved a complimentary <strong>Executive Summit Pass</strong> for you at AWS re:Invent 2026 (Nov 30 – Dec 4).</p>
<p>Your invitation includes private NDA roadmap briefings with the EC2 Silicon & Graviton5 engineering leadership team.</p>`,
      },
    ],
  },
  {
    id: 'th-14',
    subject: 'Tailscale Enterprise: Zero-Config SSH Session Recording is now GA',
    snippet: 'Stream live encrypted terminal sessions directly to your S3 audit bucket with zero bastion hosts.',
    category: 'promotions',
    folder: 'inbox',
    isUnread: false,
    isStarred: false,
    isImportant: false,
    labels: ['eng'],
    lastActivityAt: '2026-10-11T11:30:00Z',
    displayDate: 'Oct 11',
    messages: [
      {
        id: 'm-1401',
        threadId: 'th-14',
        sender: {
          name: 'Tailscale Product Team',
          email: 'product@tailscale.com',
          avatarColor: '#455a64',
          role: 'Product Announcements',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-11T11:30:00Z',
        displayTime: 'Oct 11, 11:30 AM',
        fullDate: 'Sun, Oct 11, 2026, 11:30 AM',
        body: `<p>Tailscale SSH Session Recording is now generally available for all Enterprise plans, with native WireGuard identity attestation and zero-latency audit streaming.</p>`,
      },
    ],
  },
  // SNOOZED THREAD
  {
    id: 'th-15',
    subject: 'Quarterly Hardware Refresh: MacBook Pro M4 Max fleet allocation for new hires',
    snippet: 'IT Procurement needs final approval on the 25-unit 16" M4 Max (128GB unified memory) order before the Q4 batch closes.',
    category: 'primary',
    folder: 'inbox',
    isUnread: false,
    isStarred: false,
    isImportant: true,
    isSnoozed: true,
    snoozedUntil: 'Tomorrow, 9:00 AM',
    labels: ['finance', 'eng'],
    lastActivityAt: '2026-10-12T10:15:00Z',
    displayDate: 'Oct 12',
    messages: [
      {
        id: 'm-1501',
        threadId: 'th-15',
        sender: {
          name: 'Hannah Abbott',
          email: 'hannah.abbott@argonlabs.io',
          avatarColor: '#8e24aa',
          role: 'Head of Talent & People',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-12T10:15:00Z',
        displayTime: 'Oct 12, 10:15 AM',
        fullDate: 'Mon, Oct 12, 2026, 10:15 AM',
        body: `<p>Hi Alex,</p>
<p>Apple Business Manager sent over the quote for our Q4 engineering onboarding stock: <strong>25x MacBook Pro 16" (M4 Max, 128GB RAM, 2TB SSD)</strong> with pre-enrolled MDM profiles.</p>
<p>Snoozed for Thursday morning review once the headcount plan is finalized.</p>`,
      },
    ],
  },
  // SCHEDULED THREAD
  {
    id: 'th-16',
    subject: 'All-Hands Engineering Announcement: Promoting Elena Rostova to Distinguished Engineer',
    snippet: 'Scheduled to send Friday, Oct 16 at 9:00 AM PT ahead of the company-wide Town Hall.',
    category: 'primary',
    folder: 'scheduled',
    isUnread: false,
    isStarred: true,
    isImportant: true,
    scheduledFor: 'Fri, Oct 16, 9:00 AM',
    labels: ['eng', 'exec'],
    lastActivityAt: '2026-10-14T06:00:00Z',
    displayDate: 'Scheduled',
    messages: [
      {
        id: 'm-1601',
        threadId: 'th-16',
        sender: {
          name: 'Alex Chen',
          email: 'alex.chen@argonlabs.io',
          avatarColor: '#1a73e8',
          role: 'VP of Engineering',
        },
        to: [{ name: 'All Engineering', email: 'eng-all@argonlabs.io' }],
        timestamp: '2026-10-14T06:00:00Z',
        displayTime: 'Scheduled for Oct 16',
        fullDate: 'Scheduled for Fri, Oct 16, 2026, 9:00 AM',
        body: `<p>Team,</p>
<p>I am thrilled to share that <strong>Elena Rostova</strong> is being promoted to <strong>Distinguished Engineer (L8)</strong> effective this quarter.</p>
<p>Over the past two years, Elena architected our multi-region consensus engine and led the zero-copy Rust edge router initiative that cut global p99 latency by nearly 80% while mentoring engineers across every squad.</p>
<p>Please join me in congratulating Elena at Friday’s Town Hall!</p>
<p>— Alex</p>`,
      },
    ],
  },
  // SENT THREADS
  {
    id: 'th-17',
    subject: 'Re: Sequoia Portfolio CTO Dinner — Oct 21 in Palo Alto',
    snippet: 'Count me in, Claire! Looking forward to comparing notes on multi-tenant GPU scheduling.',
    category: 'primary',
    folder: 'sent',
    isUnread: false,
    isStarred: false,
    isImportant: true,
    labels: ['exec'],
    lastActivityAt: '2026-10-13T20:10:00Z',
    displayDate: 'Oct 13',
    messages: [
      {
        id: 'm-1701',
        threadId: 'th-17',
        sender: {
          name: 'Claire Sterling',
          email: 'csterling@sequoia-cap.io',
          avatarColor: '#00897b',
          role: 'Managing Partner, Sequoia Capital',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-13T18:00:00Z',
        displayTime: 'Oct 13, 6:00 PM',
        fullDate: 'Tue, Oct 13, 2026, 6:00 PM',
        body: `<p>Hi Alex,</p>
<p>We’re hosting an intimate 12-person CTO & VP Eng dinner at Protege in Palo Alto next Wednesday, Oct 21 at 6:30 PM. Would love to have you there if you’re back from New York in time.</p>
<p>Best,<br/>Claire</p>`,
      },
      {
        id: 'm-1702',
        threadId: 'th-17',
        sender: {
          name: 'Alex Chen',
          email: 'alex.chen@argonlabs.io',
          avatarColor: '#1a73e8',
          role: 'VP of Engineering',
        },
        to: [{ name: 'Claire Sterling', email: 'csterling@sequoia-cap.io' }],
        timestamp: '2026-10-13T20:10:00Z',
        displayTime: 'Oct 13, 8:10 PM',
        fullDate: 'Tue, Oct 13, 2026, 8:10 PM',
        body: `<p>Count me in, Claire! My flight lands at SFO at 2:15 PM on Wednesday so I’ll easily make it to Palo Alto by 6:30. Looking forward to comparing notes on multi-tenant GPU scheduling.</p>
<p>Best,<br/>Alex</p>`,
      },
    ],
  },
  // DRAFTS THREADS
  {
    id: 'th-18',
    subject: 'RFC Feedback: Zero-Downtime Postgres 17 Logical Replication Cutover',
    snippet: 'Draft — Devon, I reviewed section 4 on sequence offset buffers. Before we run the dry-run on staging-db-02...',
    category: 'primary',
    folder: 'drafts',
    isUnread: false,
    isStarred: false,
    isImportant: false,
    labels: ['eng'],
    lastActivityAt: '2026-10-14T07:05:00Z',
    displayDate: '7:05 AM',
    messages: [
      {
        id: 'm-1801',
        threadId: 'th-18',
        sender: {
          name: 'Alex Chen',
          email: 'alex.chen@argonlabs.io',
          avatarColor: '#1a73e8',
          role: 'VP of Engineering',
        },
        to: [
          { name: 'Devon Brooks', email: 'devon.brooks@argonlabs.io' },
          { name: 'Elena Rostova', email: 'elena.rostova@argonlabs.io' },
        ],
        timestamp: '2026-10-14T07:05:00Z',
        displayTime: '7:05 AM',
        fullDate: 'Wed, Oct 14, 2026, 7:05 AM',
        isDraft: true,
        body: `Devon, Elena,\n\nI reviewed Section 4 of the Postgres 17 logical replication cutover plan. Before we run the dry-run on staging-db-02 tomorrow morning, let's make sure:\n\n1. PgBouncer pause_mode waits for all active read-write transactions > 250ms to drain cleanly.\n2. Sequence LSN offsets are advanced by +100,000 on the target primary prior to flipping DNS.\n\nLet me know once the runbook checklist is updated and I'll join the bridge.`,
      },
    ],
  },
  // SPAM THREAD
  {
    id: 'th-19',
    subject: 'URGENT: Confirm your domain SEO backlink authority package before expiration',
    snippet: 'Notice: Your complimentary search indexing listing is scheduled for suspension unless renewed immediately.',
    category: 'promotions',
    folder: 'spam',
    isUnread: true,
    isStarred: false,
    isImportant: false,
    labels: [],
    lastActivityAt: '2026-10-10T09:12:00Z',
    displayDate: 'Oct 10',
    messages: [
      {
        id: 'm-1901',
        threadId: 'th-19',
        sender: {
          name: 'Global Domain Registry Promo',
          email: 'no-reply@seo-domain-listings-247.biz',
          avatarColor: '#757575',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-10T09:12:00Z',
        displayTime: 'Oct 10',
        fullDate: 'Sat, Oct 10, 2026, 9:12 AM',
        body: `<p>Act now to secure 10,000 automated directory backlinks for your domain. Special limited time discount expires at midnight.</p>`,
      },
    ],
  },
  // TRASH THREAD
  {
    id: 'th-20',
    subject: 'Canceled: Old Legacy Monolith Deprecation Weekly Sync',
    snippet: 'Since we decommissioned the last monolith instance in September, we are reclaiming this recurring 30-minute slot!',
    category: 'updates',
    folder: 'trash',
    isUnread: false,
    isStarred: false,
    isImportant: false,
    labels: ['eng'],
    lastActivityAt: '2026-10-09T16:00:00Z',
    displayDate: 'Oct 9',
    messages: [
      {
        id: 'm-2001',
        threadId: 'th-20',
        sender: {
          name: 'Priya Nair',
          email: 'priya.nair@argonlabs.io',
          avatarColor: '#d81b60',
          role: 'VP of Product',
        },
        to: [{ name: 'Alex Chen', email: 'alex.chen@argonlabs.io' }],
        timestamp: '2026-10-09T16:00:00Z',
        displayTime: 'Oct 9',
        fullDate: 'Fri, Oct 9, 2026, 4:00 PM',
        body: `<p>Deleting this recurring meeting series since the legacy monolith was 100% sunset last month. Enjoy the extra 30 minutes back every Thursday!</p>`,
      },
    ],
  },
];
