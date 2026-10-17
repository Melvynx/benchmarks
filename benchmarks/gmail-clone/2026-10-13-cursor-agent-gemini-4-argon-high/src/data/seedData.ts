import { Contact, CustomLabel, EmailThread } from '../types/mail';

export const CURRENT_USER: Contact = {
  id: 'user-me',
  name: 'Alex Rivera',
  email: 'alex@acme.dev',
  role: 'Staff Systems Architect',
  company: 'Acme Cloud',
  avatarColor: '#0B57D0',
};

export const CONTACTS: Contact[] = [
  CURRENT_USER,
  {
    id: 'c-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@acme.dev',
    role: 'VP of Infrastructure',
    company: 'Acme Cloud',
    avatarColor: '#137333',
  },
  {
    id: 'c-marcus',
    name: 'Marcus Vance',
    email: 'marcus@acme.dev',
    role: 'Principal Database Engineer',
    company: 'Acme Cloud',
    avatarColor: '#B06000',
  },
  {
    id: 'c-priya',
    name: 'Priya Patel',
    email: 'priya.patel@acme.dev',
    role: 'Staff Product Designer',
    company: 'Acme Cloud',
    avatarColor: '#9334E6',
  },
  {
    id: 'c-david',
    name: 'David Kim',
    email: 'dkim@sequoia-cap.io',
    role: 'Partner',
    company: 'Sequoia Horizon',
    avatarColor: '#00639B',
  },
  {
    id: 'c-sarah',
    name: 'Sarah Jenkins',
    email: 'sjenkins@acme.dev',
    role: 'Head of Finance & FP&A',
    company: 'Acme Cloud',
    avatarColor: '#C5221F',
  },
  {
    id: 'c-liam',
    name: 'Liam O’Connor',
    email: 'liam@acme.dev',
    role: 'Security Response Lead',
    company: 'Acme Cloud',
    avatarColor: '#185ABC',
  },
  {
    id: 'c-github',
    name: 'GitHub',
    email: 'notifications@github.com',
    role: 'Code Hosting & CI',
    company: 'GitHub',
    avatarColor: '#24292F',
  },
  {
    id: 'c-linear',
    name: 'Linear',
    email: 'updates@linear.app',
    role: 'Issue Tracking',
    company: 'Linear',
    avatarColor: '#5E6AD2',
  },
  {
    id: 'c-stripe',
    name: 'Stripe Billing',
    email: 'receipts@stripe.com',
    role: 'Enterprise Billing',
    company: 'Stripe',
    avatarColor: '#635BFF',
  },
  {
    id: 'c-figma',
    name: 'Figma',
    email: 'comments@figma.com',
    role: 'Design Collaboration',
    company: 'Figma',
    avatarColor: '#F24E1E',
  },
  {
    id: 'c-aws',
    name: 'AWS Trust & Safety',
    email: 'no-reply-aws@amazon.com',
    role: 'Cloud Infrastructure',
    company: 'Amazon Web Services',
    avatarColor: '#FF9900',
  },
  {
    id: 'c-nina',
    name: 'Nina Volkov',
    email: 'nina@counsel-llp.com',
    role: 'Outside General Counsel',
    company: 'Volkov & Sterling LLP',
    avatarColor: '#007B83',
  },
  {
    id: 'c-united',
    name: 'United Airlines',
    email: 'confirmations@united.com',
    role: 'MileagePlus Premier',
    company: 'United Airlines',
    avatarColor: '#002244',
  },
  {
    id: 'c-datadog',
    name: 'Datadog Monitors',
    email: 'alerts@datadoghq.com',
    role: 'Production Observability',
    company: 'Datadog',
    avatarColor: '#632CA6',
  },
  {
    id: 'c-hn',
    name: 'TLDR Systems Digest',
    email: 'newsletter@tldr.tech',
    role: 'Daily Distributed Systems Brief',
    company: 'TLDR Media',
    avatarColor: '#D93025',
  },
  {
    id: 'c-linkedin',
    name: 'LinkedIn Executive Network',
    email: 'messages-noreply@linkedin.com',
    role: 'Professional Network',
    company: 'LinkedIn',
    avatarColor: '#0A66C2',
  },
  {
    id: 'c-vercel',
    name: 'Vercel Ship',
    email: 'ship@vercel.com',
    role: 'Developer Cloud',
    company: 'Vercel',
    avatarColor: '#111827',
  },
  {
    id: 'c-raycast',
    name: 'Raycast Pro',
    email: 'team@raycast.com',
    role: 'Productivity Tools',
    company: 'Raycast',
    avatarColor: '#FF6363',
  },
];

export const INITIAL_LABELS: CustomLabel[] = [
  {
    id: 'lbl-eng',
    name: 'Engineering',
    color: '#D3E3FD',
    textColor: '#041E49',
    darkBgColor: '#0842A0',
    darkTextColor: '#D3E3FD',
  },
  {
    id: 'lbl-prod',
    name: 'Product',
    color: '#E8DEF8',
    textColor: '#1D192B',
    darkBgColor: '#4A4458',
    darkTextColor: '#E8DEF8',
  },
  {
    id: 'lbl-finance',
    name: 'Finance',
    color: '#CEEAD6',
    textColor: '#0D652D',
    darkBgColor: '#0F5223',
    darkTextColor: '#C4EED0',
  },
  {
    id: 'lbl-urgent',
    name: 'Urgent',
    color: '#F9DEDC',
    textColor: '#8C1D18',
    darkBgColor: '#8C1D18',
    darkTextColor: '#F9DEDC',
  },
  {
    id: 'lbl-design',
    name: 'Design',
    color: '#FCE8E6',
    textColor: '#A50E0E',
    darkBgColor: '#75221F',
    darkTextColor: '#FAD2CF',
  },
  {
    id: 'lbl-legal',
    name: 'Legal',
    color: '#FEF7E0',
    textColor: '#7A4F01',
    darkBgColor: '#5B3F00',
    darkTextColor: '#FDE293',
  },
  {
    id: 'lbl-travel',
    name: 'Travel',
    color: '#E4F7FB',
    textColor: '#005A68',
    darkBgColor: '#004F5C',
    darkTextColor: '#C4EEF7',
  },
];

const c = (id: string): Contact => CONTACTS.find((x) => x.id === id) || CURRENT_USER;

export const INITIAL_THREADS: EmailThread[] = [
  {
    id: 'th-1',
    subject: 'Multi-region Raft consensus cutover: eu-central-1 readiness & zero-downtime checklist',
    folder: 'inbox',
    category: 'primary',
    labels: ['lbl-eng', 'lbl-urgent'],
    isUnread: true,
    isStarred: true,
    isImportant: true,
    lastActivityIso: '2026-10-14T10:42:00Z',
    displayDate: '10:42 AM',
    messages: [
      {
        id: 'msg-1a',
        threadId: 'th-1',
        sender: c('c-marcus'),
        to: [CURRENT_USER, c('c-elena')],
        cc: [c('c-liam')],
        timestamp: '2026-10-14T08:15:00Z',
        displayTime: '8:15 AM (2 hours ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 8:15 AM',
        snippet: 'I finished running the Jepsen nemesis suite against the new Frankfurt shard topology. P99 tail latency stayed under 6.4ms even during leader stepdown.',
        body: `<p>Hey Alex, Elena,</p>
<p>I finished running the 72-hour Jepsen nemesis suite against our new <strong>eu-central-1 (Frankfurt)</strong> Raft consensus ring. Even under asymmetric network partitions and forced leader stepdowns every 45 seconds, P99 commit latency stayed below <strong>6.4 ms</strong> with zero stale reads.</p>
<p>Key highlights from the rehearsal run:</p>
<ul>
  <li><strong>Pre-vote protocol:</strong> Prevented all disrupted minority nodes from incrementing term counters after healing.</li>
  <li><strong>Snapshot streaming:</strong> NVMe ZSTD snapshot transfer saturated 2.8 GB/s without starving foreground gRPC heartbeats.</li>
  <li><strong>Dual-write shadow proxy:</strong> 100% parity across 480M mutated keys over the last 12 hours.</li>
</ul>
<p>I've attached the full benchmark workbook and the flamegraph capture from node <code>raft-fra-04</code>.</p>`,
        attachments: [
          {
            id: 'att-1a',
            name: 'eu-central-1-jepsen-report.pdf',
            size: '2.4 MB',
            type: 'pdf',
            previewTitle: 'Jepsen Verification & Raft Cutover Readiness — eu-central-1',
            previewMeta: {
              'Cluster Topology': '5 voting nodes (fra-az1, fra-az2, fra-az3)',
              'P50 / P99 / P99.9 Latency': '1.2 ms / 6.4 ms / 11.8 ms',
              'Linearizability Check': 'PASSED (480,192,400 operations)',
              'Author': 'Marcus Vance <marcus@acme.dev>',
            },
            previewContent: `EXECUTIVE SUMMARY\n\nDuring the 72-hour fault-injection window, the Frankfurt consensus cluster processed 480.19M linearizable compare-and-swap transactions across 64 storage shards.\n\n1. Leader Election Convergence: Mean election recovery time measured 184ms following hard kernel panic simulation.\n2. WAL Compaction Overhead: Background RocksDB compaction throttled to 350 MB/s IOPS cap, eliminating write stalls.\n3. Sign-off Recommendation: Approved for production traffic cutover on Thursday Oct 15 at 02:00 UTC.`,
          },
          {
            id: 'att-1b',
            name: 'raft-fra-04-cpu-flamegraph.png',
            size: '840 KB',
            type: 'image',
            previewTitle: 'CPU Flamegraph — raft-fra-04 (96 vCPU / 320k ops/sec)',
            previewMeta: {
              'Sample Rate': '99 Hz for 300s',
              'Hot Path': 'raft::Replicator::append_entries (38.2%)',
              'Syscall Overhead': 'io_uring_enter (11.4%)',
            },
            previewContent: `[Flamegraph Visualization Summary]\n- 38.2% raft::consensus::Replicator::append_entries_batch\n- 24.6% rocksdb::DBImpl::WriteImplWALOnly\n- 14.1% zstd::compress_frame_mt\n- 11.4% kernel::io_uring_enter\n- 11.7% grpc::ServerCompletionQueue::AsyncNext`,
          },
        ],
      },
      {
        id: 'msg-1b',
        threadId: 'th-1',
        sender: CURRENT_USER,
        to: [c('c-marcus'), c('c-elena')],
        cc: [c('c-liam')],
        timestamp: '2026-10-14T09:30:00Z',
        displayTime: '9:30 AM (1 hour ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 9:30 AM',
        snippet: 'Phenomenal numbers on the WAL compaction cap. One question before we lock the maintenance window: did we verify the TLS client cert rotation hook?',
        body: `<p>Phenomenal numbers on the WAL compaction cap, Marcus. Keeping P99 under 7ms during leader elections is a huge step up from Q2.</p>
<p>One question before we lock the maintenance window: did we verify the automated SPIFFE/SPIRE mTLS client certificate rotation while a snapshot transfer is in flight? Last month we saw an edge case where long-running streams dropped if rotation hit mid-chunk.</p>`,
      },
      {
        id: 'msg-1c',
        threadId: 'th-1',
        sender: c('c-elena'),
        to: [CURRENT_USER, c('c-marcus')],
        cc: [c('c-liam')],
        timestamp: '2026-10-14T10:42:00Z',
        displayTime: '10:42 AM (18 minutes ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 10:42 AM',
        snippet: 'Liam and I tested SPIRE cert rotation at 10-minute intervals overnight—zero stream resets. Let’s do a quick 25-min go/no-go review today at 2:00 PM.',
        body: `<p>Alex — Liam and I specifically forced SPIRE SVID rotation at 10-minute intervals overnight while streaming a 64 GB shard snapshot. Zero stream resets; the gRPC channel gracefully re-handshakes on subchannels without tearing down active streams.</p>
<p>I've put a 25-minute Go/No-Go sync on the calendar for <strong>today at 2:00 PM PT</strong> so we can sign off on the runbook. Can you confirm your attendance and give final approval on the rollback thresholds?</p>`,
        calendarInvite: {
          title: 'Go/No-Go: eu-central-1 Raft Production Cutover',
          dateStr: 'Wed, Oct 14, 2026',
          timeStr: '2:00 PM – 2:25 PM PT',
          location: 'Google Meet (meet.google.com/fra-raft-cutover) & Conf Room 4B',
          organizer: 'elena.rostova@acme.dev',
          attendees: ['alex@acme.dev', 'marcus@acme.dev', 'liam@acme.dev'],
          rsvpStatus: null,
        },
        attachments: [
          {
            id: 'att-1c',
            name: 'cutover-runbook-v4.2.md',
            size: '48 KB',
            type: 'code',
            previewTitle: 'cutover-runbook-v4.2.md',
            previewMeta: {
              'Version': 'v4.2 (Final Release Candidate)',
              'Rollback SLA': '< 15 seconds via Envoy weighted cluster shift',
            },
            previewContent: `# EU-CENTRAL-1 CUTOVER RUNBOOK (v4.2)\n\n## Phase 1: Traffic Ramp (T-00:00)\n1. Set feature flag \`raft.eu_central_read_weight = 10\` via control plane.\n2. Monitor \`raft_commit_latency_p99\` and \`envoy_upstream_rq_5xx\` for 15m.\n\n## Phase 2: Quorum Promotion (T+00:15)\n1. Execute \`acme-ctl raft promote-voters --region eu-central-1\`.\n2. Verify leader lease acquisition across all 64 partition groups.\n\n## Instant Rollback Trigger\nIf P99 > 25ms for 3 consecutive minutes, run:\n\`acme-ctl traffic drain --region eu-central-1 --instant\``,
          },
        ],
      },
    ],
  },
  {
    id: 'th-2',
    subject: 'Series C Board Deck — Q3 Infrastructure Unit Economics & Gross Margin Expansion',
    folder: 'inbox',
    category: 'primary',
    labels: ['lbl-finance', 'lbl-urgent'],
    isUnread: true,
    isStarred: true,
    isImportant: true,
    lastActivityIso: '2026-10-14T10:15:00Z',
    displayDate: '10:15 AM',
    messages: [
      {
        id: 'msg-2a',
        threadId: 'th-2',
        sender: c('c-sarah'),
        to: [CURRENT_USER],
        cc: [c('c-david'), c('c-elena')],
        timestamp: '2026-10-14T09:50:00Z',
        displayTime: '9:50 AM (1 hour ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 9:50 AM',
        snippet: 'Attached the updated Q3 infrastructure COGS model. Moving cold telemetry blocks to R2 + custom Rust ingesters lifted gross margin from 74.2% to 81.6%.',
        body: `<p>Hi Alex,</p>
<p>Ahead of Friday's board meeting with David, I finalized the Q3 cloud COGS breakdown. Your team's migration off legacy managed NAT gateways and the Rust zero-copy telemetry ingester lifted our infrastructure gross margin from <strong>74.2% in Q2 to 81.6% in Q3</strong>—an annualized savings of <strong>$3.84M</strong> even as request volume grew 42% QoQ.</p>
<p>Could you double-check Slide 14 metrics in the attached spreadsheet before we send the read-ahead packet to the board tonight?</p>`,
        attachments: [
          {
            id: 'att-2a',
            name: 'Acme-Q3-2026-Infra-Unit-Economics.xlsx',
            size: '1.8 MB',
            type: 'spreadsheet',
            previewTitle: 'Acme Cloud — Q3 2026 Infrastructure Unit Economics',
            previewMeta: {
              'Q3 Gross Margin': '81.6% (+740 bps QoQ)',
              'Cost per 1M Requests': '$0.114 (down from $0.189)',
              'Annualized Net Savings': '$3,840,000',
            },
            previewContent: `METRIC                          | Q1 2026  | Q2 2026  | Q3 2026  | QoQ Delta\n-----------------------------------------------------------------------------\nMonthly Request Volume (B)      | 184.0    | 228.5    | 324.8    | +42.1%\nCompute COGS ($K/mo)            | $412.0   | $445.2   | $368.4   | -17.3%\nCross-AZ Egress ($K/mo)         | $198.5   | $214.0   | $62.1    | -71.0%\nStorage Tiering ($K/mo)         | $142.0   | $156.8   | $119.5   | -23.8%\nBlended Gross Margin (%)        | 71.8%    | 74.2%    | 81.6%    | +740 bps`,
          },
        ],
      },
      {
        id: 'msg-2b',
        threadId: 'th-2',
        sender: c('c-david'),
        to: [c('c-sarah'), CURRENT_USER],
        cc: [c('c-elena')],
        timestamp: '2026-10-14T10:15:00Z',
        displayTime: '10:15 AM (45 minutes ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 10:15 AM',
        snippet: 'Cutting cross-AZ egress by 71% while growing volume 42% is top-decile execution. Would love 2 bullets on our Q4 bare-metal GPU inference plan too.',
        body: `<p>Sarah, Alex — these unit economics are exceptional. Cutting cross-AZ egress by 71% in a single quarter while scaling throughput 42% puts Acme in the top 5% of infrastructure companies in our portfolio.</p>
<p>Alex: when we cover the technical roadmap on Friday, could you include 2 bullets on how the Q4 NVLink inference cluster reservation impacts our blended margin profile for 2027?</p>`,
      },
    ],
  },
  {
    id: 'th-3',
    subject: 'Design critique: Unified Query Studio & Real-time Trace Waterfall v2',
    folder: 'inbox',
    category: 'primary',
    labels: ['lbl-design', 'lbl-prod'],
    isUnread: true,
    isStarred: false,
    isImportant: true,
    lastActivityIso: '2026-10-14T09:18:00Z',
    displayDate: '9:18 AM',
    messages: [
      {
        id: 'msg-3a',
        threadId: 'th-3',
        sender: c('c-priya'),
        to: [CURRENT_USER],
        timestamp: '2026-10-14T09:18:00Z',
        displayTime: '9:18 AM (1 hour ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 9:18 AM',
        snippet: 'Updated the Figma tokens for the sub-millisecond span waterfall and keyboard-first command palette. Check out the high-density table spec.',
        body: `<p>Hey Alex!</p>
<p>I just pushed the updated prototypes for <strong>Unified Query Studio v2</strong>. Based on your feedback from Monday's dogfooding session, we tightened the trace waterfall row height to <code>28px</code>, switched span duration labels to tabular monospace numerals, and added inline SQL-to-PromQL AST preview chips.</p>
<p>Key changes ready for engineering handoff:</p>
<ul>
  <li><strong>Minimap scrubber:</strong> Drag-to-zoom across 10M trace spans at 120fps using WebGL2 instanced bars.</li>
  <li><strong>Keyboard navigation:</strong> Full <code>j</code>/<code>k</code> cursor traversal and <code>Space</code> quick-peek drawer for span attributes.</li>
  <li><strong>Dark & Light theme parity:</strong> Semantic surface elevation tokens exported to JSON.</li>
</ul>
<p>Let me know if the WebGL canvas viewport constraints match what the frontend engine expects!</p>`,
        attachments: [
          {
            id: 'att-3a',
            name: 'query-studio-v2-design-tokens.json',
            size: '124 KB',
            type: 'code',
            previewTitle: 'query-studio-v2-design-tokens.json',
            previewMeta: {
              'Design System': 'Acme Material Expressive v3.4',
              'Exported By': 'Priya Patel via Figma Tokens Studio',
            },
            previewContent: `{\n  "surface": {\n    "canvas": { "light": "#F8FAFD", "dark": "#111318" },\n    "elevated": { "light": "#FFFFFF", "dark": "#1E1F20" },\n    "selected": { "light": "#C2DBFF", "dark": "#004A77" }\n  },\n  "traceSpan": {\n    "grpc": "#0B57D0",\n    "postgres": "#137333",\n    "redis": "#B06000",\n    "error": "#B3261E"\n  },\n  "typography": {\n    "mono": "JetBrains Mono, monospace"\n  }\n}`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-4',
    subject: 'DPA Addendum & SOC2 Type II Continuous Control Attestation (Enterprise Tier)',
    folder: 'inbox',
    category: 'primary',
    labels: ['lbl-legal'],
    isUnread: false,
    isStarred: false,
    isImportant: true,
    lastActivityIso: '2026-10-13T17:40:00Z',
    displayDate: 'Oct 13',
    messages: [
      {
        id: 'msg-4a',
        threadId: 'th-4',
        sender: c('c-nina'),
        to: [CURRENT_USER, c('c-liam')],
        timestamp: '2026-10-13T17:40:00Z',
        displayTime: 'Yesterday, 5:40 PM',
        fullDateStr: 'Tue, Oct 13, 2026, 5:40 PM',
        snippet: 'Attached is the redlined Data Processing Addendum for the Lufthansa Systems enterprise contract. Only Section 4.3 (subprocessor notice window) needs sign-off.',
        body: `<p>Alex, Liam,</p>
<p>Attached is the clean + redlined Data Processing Addendum (DPA) for the <strong>Lufthansa Systems</strong> 3-year enterprise agreement ($1.4M ARR). Their privacy counsel accepted our standard EU residency architecture and BYOK KMS encryption specification without modification.</p>
<p>The only remaining item is Section 4.3: they requested a 30-day advance notification window prior to onboarding any new infrastructure subprocessor in the EU data plane. Given our current vendor lock, is engineering comfortable committing to a 30-day notice period?</p>`,
        attachments: [
          {
            id: 'att-4a',
            name: 'Lufthansa-Acme-DPA-Redline-2026-10-13.pdf',
            size: '612 KB',
            type: 'pdf',
            previewTitle: 'Data Processing Addendum (Redline) — Acme Cloud & Lufthansa Systems',
            previewMeta: {
              'Contract Value': '$1,400,000 ARR (36 Months)',
              'Data Residency': 'EU-Central-1 (Frankfurt) Dedicated KMS',
              'Status': 'Awaiting Technical Sign-off on Clause 4.3',
            },
            previewContent: `SECTION 4.3 — SUBPROCESSOR NOTIFICATION\n\nProcessor (Acme Cloud Inc.) shall maintain an up-to-date list of authorized Subprocessors at https://trust.acme.dev/subprocessors. Processor shall provide Controller with at least thirty (30) calendar days' prior written notice before authorizing any new Subprocessor to process Customer Personal Data within the European Economic Area.`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-5',
    subject: '[acme-cloud/core-engine] PR #4892: Zero-copy io_uring WAL writer for Linux 6.12+',
    folder: 'inbox',
    category: 'updates',
    labels: ['lbl-eng'],
    isUnread: true,
    isStarred: true,
    isImportant: false,
    lastActivityIso: '2026-10-14T10:05:00Z',
    displayDate: '10:05 AM',
    messages: [
      {
        id: 'msg-5a',
        threadId: 'th-5',
        sender: c('c-github'),
        to: [CURRENT_USER],
        timestamp: '2026-10-14T10:05:00Z',
        displayTime: '10:05 AM (55 minutes ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 10:05 AM',
        snippet: '@marcus-vance approved this pull request. All 42 CI checks passed (Rust 1.85 Clippy, ASAN, ThreadSanitizer, Jepsen smoke suite).',
        body: `<p><strong>@marcus-vance</strong> approved your pull request <code>#4892</code> in <strong>acme-cloud/core-engine</strong>.</p>
<p><strong>Commit summary:</strong> Replace POSIX <code>pwritev2</code> pool with registered fixed-buffer <code>IORING_OP_WRITE_FIXED</code> ring queues, reducing per-append syscall overhead by 61% on NVMe namespaces.</p>
<ul>
  <li>✅ <strong>ci / rust-clippy-1.85</strong> — Passed in 1m 42s</li>
  <li>✅ <strong>ci / address-thread-sanitizer</strong> — Passed in 6m 18s</li>
  <li>✅ <strong>ci / jepsen-linearizability-smoke</strong> — Passed in 11m 04s</li>
  <li>✅ <strong>benchmark / nvme-wal-throughput</strong> — 1.48M commits/sec (+58.4% vs main)</li>
</ul>
<p>You can merge this pull request now or queue it in MergeQueue.</p>`,
      },
    ],
  },
  {
    id: 'th-6',
    subject: 'Flight Confirmation: SFO → FRA (UA 58) — Departs Oct 19, 1:50 PM',
    folder: 'inbox',
    category: 'primary',
    labels: ['lbl-travel'],
    isUnread: false,
    isStarred: true,
    isImportant: true,
    lastActivityIso: '2026-10-13T14:22:00Z',
    displayDate: 'Oct 13',
    messages: [
      {
        id: 'msg-6a',
        threadId: 'th-6',
        sender: c('c-united'),
        to: [CURRENT_USER],
        timestamp: '2026-10-13T14:22:00Z',
        displayTime: 'Yesterday, 2:22 PM',
        fullDateStr: 'Tue, Oct 13, 2026, 2:22 PM',
        snippet: 'Thank you for choosing United Airlines. Confirmation #K8M4QX. San Francisco (SFO) to Frankfurt (FRA), Seat 3A (United Polaris Business).',
        body: `<p>Thank you for choosing United Airlines, <strong>Alex Rivera</strong>.</p>
<p>Your reservation for the European Engineering Summit in Frankfurt is ticketed and confirmed.</p>
<p><strong>Confirmation Number:</strong> <code>K8M4QX</code><br/>
<strong>Flight:</strong> UA 58 — Boeing 777-300ER<br/>
<strong>Departure:</strong> Mon, Oct 19, 2026 · 1:50 PM (SFO - Terminal International G)<br/>
<strong>Arrival:</strong> Tue, Oct 20, 2026 · 9:45 AM (FRA - Terminal 1)<br/>
<strong>Seat:</strong> 3A (United Polaris Business)</p>`,
        attachments: [
          {
            id: 'att-6a',
            name: 'United-eTicket-Receipt-K8M4QX.pdf',
            size: '310 KB',
            type: 'pdf',
            previewTitle: 'eTicket Receipt & Itinerary — Confirmation #K8M4QX',
            previewMeta: {
              'Passenger': 'RIVERA / ALEX',
              'Ticket Number': '0162498104921',
              'Fare Class': 'J (United Polaris Business)',
              'Total Paid': '$4,280.40 USD (Corporate Amex •••• 8012)',
            },
            previewContent: `FLIGHT ITINERARY\n\nOutbound: Mon, Oct 19, 2026\nUA 58 | San Francisco (SFO) 1:50 PM -> Frankfurt (FRA) 9:45 AM (+1)\nCabin: United Polaris Business | Seat: 3A | Baggage: 2x 32kg Free\n\nReturn: Fri, Oct 23, 2026\nUA 59 | Frankfurt (FRA) 11:20 AM -> San Francisco (SFO) 1:55 PM\nCabin: United Polaris Business | Seat: 4A`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-7',
    subject: 'CVE-2026-39104 Advisory: Kernel eBPF verifier privilege escalation patched across fleet',
    folder: 'inbox',
    category: 'primary',
    labels: ['lbl-eng', 'lbl-urgent'],
    isUnread: false,
    isStarred: false,
    isImportant: true,
    lastActivityIso: '2026-10-13T11:08:00Z',
    displayDate: 'Oct 13',
    messages: [
      {
        id: 'msg-7a',
        threadId: 'th-7',
        sender: c('c-liam'),
        to: [CURRENT_USER, c('c-elena'), c('c-marcus')],
        timestamp: '2026-10-13T11:08:00Z',
        displayTime: 'Yesterday, 11:08 AM',
        fullDateStr: 'Tue, Oct 13, 2026, 11:08 AM',
        snippet: 'All 1,420 production Kubernetes worker nodes have live-patched kernel module kpatch-6.12.9-sec4. Zero workload evictions required.',
        body: `<p>Team,</p>
<p>Following this morning's upstream Linux security disclosure (<code>CVE-2026-39104</code> affecting unprivileged eBPF ringbuf bounds checking), SecOps deployed live kernel patch <code>kpatch-6.12.9-sec4</code> across all 1,420 production bare-metal and EC2 nodes.</p>
<ul>
  <li><strong>Patch Coverage:</strong> 1,420 / 1,420 hosts (100%) verified via osquery fleet attestation.</li>
  <li><strong>Customer Impact:</strong> Zero pod evictions or TCP connection resets (applied via kpatch live-patching).</li>
  <li><strong>Hardening:</strong> <code>kernel.unprivileged_bpf_disabled=1</code> remains enforced across all tenant namespaces.</li>
</ul>`,
      },
    ],
  },
  {
    id: 'th-8',
    subject: 'Stripe Invoice #INV-2026-1094 — Enterprise Volume Settlement ($148,920.00)',
    folder: 'inbox',
    category: 'updates',
    labels: ['lbl-finance'],
    isUnread: true,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-14T07:30:00Z',
    displayDate: '7:30 AM',
    messages: [
      {
        id: 'msg-8a',
        threadId: 'th-8',
        sender: c('c-stripe'),
        to: [CURRENT_USER, c('c-sarah')],
        timestamp: '2026-10-14T07:30:00Z',
        displayTime: '7:30 AM (3 hours ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 7:30 AM',
        snippet: 'Your October enterprise payout settlement of $148,920.00 USD has been initiated to Silicon Valley Commercial Bank (•••• 4491).',
        body: `<p>Hello Acme Cloud Finance & Engineering,</p>
<p>Your monthly automated settlement for <strong>Enterprise Dedicated Clusters (October 2026 Cycle)</strong> has been processed.</p>
<p><strong>Invoice Number:</strong> <code>INV-2026-1094</code><br/>
<strong>Net Settlement Amount:</strong> $148,920.00 USD<br/>
<strong>Effective Processing Fee Rate:</strong> 0.45% (Custom Enterprise IC++)<br/>
<strong>Estimated Arrival:</strong> Oct 15, 2026 via FedNow Instant Settlement</p>`,
        attachments: [
          {
            id: 'att-8a',
            name: 'Stripe-Settlement-INV-2026-1094.pdf',
            size: '195 KB',
            type: 'pdf',
            previewTitle: 'Stripe Enterprise Statement — INV-2026-1094',
            previewMeta: {
              'Account': 'acct_1AcmeCloudEnterprise',
              'Gross Volume': '$149,593.16 USD',
              'Net Payout': '$148,920.00 USD',
            },
            previewContent: `STRIPE ENTERPRISE PAYOUT SUMMARY\n\nBilling Period: Sep 14, 2026 – Oct 14, 2026\nTotal Enterprise Subscriptions Settled: 62 Active Organizations\nACH / Wire Direct Settlement: $148,920.00 USD\nStatus: PAID`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-9',
    subject: 'Linear Cycle 44 Digest: 38 issues completed, 96% velocity accuracy',
    folder: 'inbox',
    category: 'updates',
    labels: ['lbl-prod', 'lbl-eng'],
    isUnread: false,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-13T08:00:00Z',
    displayDate: 'Oct 13',
    messages: [
      {
        id: 'msg-9a',
        threadId: 'th-9',
        sender: c('c-linear'),
        to: [CURRENT_USER],
        timestamp: '2026-10-13T08:00:00Z',
        displayTime: 'Yesterday, 8:00 AM',
        fullDateStr: 'Tue, Oct 13, 2026, 8:00 AM',
        snippet: 'Core Storage & Query Engine completed 38 of 39 scoped issues in Cycle 44. Cycle 45 starts today with focus on distributed vector indexing.',
        body: `<p><strong>Linear Cycle 44 Recap — Core Infrastructure</strong></p>
<p>Your team closed <strong>38 issues (114 points)</strong> in Cycle 44, achieving a 96% scope completion rate.</p>
<ul>
  <li><strong>ENG-2941:</strong> Implement HNSW quantized vector index on NVMe — <em>Completed by Alex Rivera</em></li>
  <li><strong>ENG-2958:</strong> Zero-downtime Raft voter promotion CLI — <em>Completed by Marcus Vance</em></li>
  <li><strong>ENG-2970:</strong> WebGL2 trace flamegraph minimap — <em>Completed by Priya Patel</em></li>
</ul>`,
      },
    ],
  },
  {
    id: 'th-10',
    subject: '[RESOLVED] P2 Monitor: High gRPC connection churn on edge-iad-09',
    folder: 'inbox',
    category: 'updates',
    labels: ['lbl-eng'],
    isUnread: false,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-12T22:14:00Z',
    displayDate: 'Oct 12',
    messages: [
      {
        id: 'msg-10a',
        threadId: 'th-10',
        sender: c('c-datadog'),
        to: [CURRENT_USER],
        timestamp: '2026-10-12T21:58:00Z',
        displayTime: 'Oct 12, 9:58 PM',
        fullDateStr: 'Mon, Oct 12, 2026, 9:58 PM',
        snippet: 'TRIGGERED: edge-iad-09 TCP SYN retransmit rate > 1.5% for 5m in us-east-1c.',
        body: `<p><strong>[TRIGGERED] Monitor: Edge Envoy gRPC Connection Churn (us-east-1c)</strong></p>
<p>Host <code>edge-iad-09.prod.acme.internal</code> reported TCP SYN retransmit rate of <strong>1.84%</strong> (threshold: 1.5%).</p>`,
      },
      {
        id: 'msg-10b',
        threadId: 'th-10',
        sender: c('c-datadog'),
        to: [CURRENT_USER],
        timestamp: '2026-10-12T22:14:00Z',
        displayTime: 'Oct 12, 10:14 PM',
        fullDateStr: 'Mon, Oct 12, 2026, 10:14 PM',
        snippet: 'RESOLVED: Automatic BGP Anycast healthcheck drained edge-iad-09 in 14s. Retransmit rate returned to 0.01%.',
        body: `<p><strong>[RESOLVED] Monitor: Edge Envoy gRPC Connection Churn (us-east-1c)</strong></p>
<p>Automated Bird BGP speaker withdrew Anycast prefix from <code>edge-iad-09</code> after transit carrier flap. Retransmit rate stabilized at <strong>0.01%</strong>.</p>`,
      },
    ],
  },
  {
    id: 'th-11',
    subject: 'Vercel Ship 2026 VIP Pass + Private Systems Architecture Dinner in SF',
    folder: 'inbox',
    category: 'promotions',
    labels: [],
    isUnread: true,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-14T06:45:00Z',
    displayDate: '6:45 AM',
    messages: [
      {
        id: 'msg-11a',
        threadId: 'th-11',
        sender: c('c-vercel'),
        to: [CURRENT_USER],
        timestamp: '2026-10-14T06:45:00Z',
        displayTime: '6:45 AM (4 hours ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 6:45 AM',
        snippet: 'You’re invited to the Vercel Ship Executive Architecture Roundtable at SFMOMA + complimentary VIP keynote seating.',
        body: `<p>Hi Alex,</p>
<p>As an engineering leader building high-throughput developer infrastructure, we'd love to host you at our <strong>Private Systems Architecture Dinner</strong> ahead of Vercel Ship 2026 in San Francisco.</p>
<p>Your complimentary VIP badge includes priority access to the Compute & Fluid Concurrency track and a seat at our 24-person roundtable at SFMOMA.</p>`,
      },
    ],
  },
  {
    id: 'th-12',
    subject: 'Raycast Pro for Teams: Custom AI Quicklinks & Shared Clipboard Sync',
    folder: 'inbox',
    category: 'promotions',
    labels: ['lbl-prod'],
    isUnread: false,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-11T15:20:00Z',
    displayDate: 'Oct 11',
    messages: [
      {
        id: 'msg-12a',
        threadId: 'th-12',
        sender: c('c-raycast'),
        to: [CURRENT_USER],
        timestamp: '2026-10-11T15:20:00Z',
        displayTime: 'Oct 11, 3:20 PM',
        fullDateStr: 'Sun, Oct 11, 2026, 3:20 PM',
        snippet: 'Share runbook extensions, Grafana deep-links, and pager commands across your entire engineering org with 30% off annual seats.',
        body: `<p>Supercharge your engineering workflows with <strong>Raycast for Teams</strong>.</p>
<p>Over 45 engineers at Acme Cloud already use Raycast daily. Upgrade your workspace org-wide to share internal CLI extensions, PagerDuty triggers, and instant PR search.</p>`,
      },
    ],
  },
  {
    id: 'th-13',
    subject: 'TLDR Systems: Linux 6.13 sched_ext benchmarks, DuckDB 1.4 Parquet pushdown & SQLite WAL2',
    folder: 'inbox',
    category: 'promotions',
    labels: ['lbl-eng'],
    isUnread: true,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-14T05:30:00Z',
    displayDate: '5:30 AM',
    messages: [
      {
        id: 'msg-13a',
        threadId: 'th-13',
        sender: c('c-hn'),
        to: [CURRENT_USER],
        timestamp: '2026-10-14T05:30:00Z',
        displayTime: '5:30 AM (5 hours ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 5:30 AM',
        snippet: '1. Meta’s eBPF sched_ext scheduler cuts tail latency 22% on heterogeneous ARM64 fleets. 2. DuckDB 1.4 zero-copy Arrow flight server.',
        body: `<p><strong>TLDR Distributed Systems — Oct 14, 2026</strong></p>
<ul>
  <li><strong>Linux 6.13 sched_ext in Production (12 min read):</strong> How custom BPF CPU schedulers eliminate CFS runqueue contention during micro-bursts.</li>
  <li><strong>DuckDB 1.4 Parquet Pushdown:</strong> vectorized SIMD late materialization achieves 18 GB/s scan rates on single-socket EPYC nodes.</li>
  <li><strong>Paper of the Week:</strong> Deterministic Simulation Testing for Multi-Region Consensus Engines.</li>
</ul>`,
      },
    ],
  },
  {
    id: 'th-14',
    subject: 'Prof. Martin Kleppmann mentioned you and 4 others in a post on Distributed Consensus',
    folder: 'inbox',
    category: 'social',
    labels: ['lbl-eng'],
    isUnread: true,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-14T08:50:00Z',
    displayDate: '8:50 AM',
    messages: [
      {
        id: 'msg-14a',
        threadId: 'th-14',
        sender: c('c-linkedin'),
        to: [CURRENT_USER],
        timestamp: '2026-10-14T08:50:00Z',
        displayTime: '8:50 AM (2 hours ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 8:50 AM',
        snippet: '“Fascinating engineering write-up from @Alex Rivera and the Acme Cloud storage team on combining io_uring fixed buffers with Raft pre-vote...”',
        body: `<p><strong>New mention in your network</strong></p>
<p>“Fascinating engineering write-up from <strong>Alex Rivera</strong> and the Acme Cloud storage team on combining <code>io_uring</code> registered buffers with deterministic Raft simulation testing. Worth reading if you operate low-latency storage engines.”</p>
<p><strong>342 reactions · 48 comments</strong></p>`,
      },
    ],
  },
  {
    id: 'th-15',
    subject: 'Priya Patel left 3 comments on “Trace Waterfall — Keyboard Navigation Spec”',
    folder: 'inbox',
    category: 'social',
    labels: ['lbl-design'],
    isUnread: false,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-12T16:10:00Z',
    displayDate: 'Oct 12',
    messages: [
      {
        id: 'msg-15a',
        threadId: 'th-15',
        sender: c('c-figma'),
        to: [CURRENT_USER],
        timestamp: '2026-10-12T16:10:00Z',
        displayTime: 'Oct 12, 4:10 PM',
        fullDateStr: 'Mon, Oct 12, 2026, 4:10 PM',
        snippet: '@alex Solved the focus-ring contrast issue in Dark Mode by switching to #A8C7FA 2px inner stroke on active rows.',
        body: `<p><strong>Priya Patel</strong> commented on <strong>Query Studio v2 — Master Spec</strong>:</p>
<p><em>“@alex Solved the focus-ring contrast issue in Dark Mode by switching to #A8C7FA 2px inner stroke on active rows. Ready for your review!”</em></p>`,
      },
    ],
  },
  {
    id: 'th-16',
    subject: 'AWS Savings Plans Commitment Renewal: 64x i4i.16xlarge Reserved Instances (us-east-1)',
    folder: 'snoozed',
    category: 'primary',
    labels: ['lbl-finance', 'lbl-eng'],
    isUnread: false,
    isStarred: true,
    isImportant: true,
    snoozedUntil: 'Tomorrow, 8:00 AM',
    lastActivityIso: '2026-10-13T15:00:00Z',
    displayDate: 'Snoozed',
    messages: [
      {
        id: 'msg-16a',
        threadId: 'th-16',
        sender: c('c-aws'),
        to: [CURRENT_USER, c('c-sarah')],
        timestamp: '2026-10-13T15:00:00Z',
        displayTime: 'Yesterday, 3:00 PM',
        fullDateStr: 'Tue, Oct 13, 2026, 3:00 PM',
        snippet: 'Your 1-year Compute Savings Plan for 64x i4i.16xlarge NVMe instances expires on Oct 31, 2026. Renew before Oct 22 for an additional 6% Enterprise EDP discount.',
        body: `<p>Dear Enterprise Customer,</p>
<p>Your AWS Compute & Storage Savings Plan covering <strong>64x i4i.16xlarge</strong> bare-metal NVMe instances in <code>us-east-1</code> is scheduled to expire on October 31, 2026.</p>
<p>Under your Private Pricing Addendum, locking in your renewal prior to October 22 grants an incremental <strong>6.0% EDP discount</strong> ($410,000 annual reduction).</p>`,
      },
    ],
  },
  {
    id: 'th-17',
    subject: 'Q4 Principal/Staff Engineering Promotion Committee Packets',
    folder: 'snoozed',
    category: 'primary',
    labels: ['lbl-eng'],
    isUnread: false,
    isStarred: false,
    isImportant: true,
    snoozedUntil: 'Mon, Oct 19, 9:00 AM',
    lastActivityIso: '2026-10-12T10:30:00Z',
    displayDate: 'Snoozed',
    messages: [
      {
        id: 'msg-17a',
        threadId: 'th-17',
        sender: c('c-elena'),
        to: [CURRENT_USER],
        timestamp: '2026-10-12T10:30:00Z',
        displayTime: 'Oct 12, 10:30 AM',
        fullDateStr: 'Mon, Oct 12, 2026, 10:30 AM',
        snippet: 'Thanks for writing Marcus’s L7 Principal calibration letter. We will review all packets next Monday after the Frankfurt cutover.',
        body: `<p>Hi Alex,</p>
<p>Thank you for submitting the peer technical calibration letter for Marcus Vance's L7 Principal Engineer dossier. The depth of detail on his Jepsen testing framework and consensus engine ownership makes the packet ironclad.</p>
<p>Committee review meets Monday Oct 19 at 11:00 AM PT.</p>`,
      },
    ],
  },
  {
    id: 'th-18',
    subject: 'Architecture RFC-089: Deterministic Simulation Testing for Distributed Transactions',
    folder: 'sent',
    category: 'primary',
    labels: ['lbl-eng'],
    isUnread: false,
    isStarred: true,
    isImportant: true,
    lastActivityIso: '2026-10-14T08:05:00Z',
    displayDate: '8:05 AM',
    messages: [
      {
        id: 'msg-18a',
        threadId: 'th-18',
        sender: CURRENT_USER,
        to: [c('c-elena'), c('c-marcus'), c('c-liam'), c('c-priya')],
        timestamp: '2026-10-14T08:05:00Z',
        displayTime: '8:05 AM (2 hours ago)',
        fullDateStr: 'Wed, Oct 14, 2026, 8:05 AM',
        snippet: 'Sharing RFC-089 for our deterministic simulation harness (seeded PRNG network, disk fault injector, and virtualized monotonic clock).',
        body: `<p>Team,</p>
<p>I’m circulating <strong>RFC-089: Deterministic Simulation Testing (DST) for Distributed Storage</strong> ahead of our Q4 planning lock.</p>
<p>By abstracting our clock, network transport, and NVMe block device behind a deterministic single-threaded PRNG scheduler in test builds, we can simulate 1,000 cluster-hours of network partitions and torn disk writes in under 45 seconds on a single developer laptop—and replay any failure strictly from a 64-bit seed integer.</p>
<p>Comments welcome in the attached spec before Friday!</p>`,
        attachments: [
          {
            id: 'att-18a',
            name: 'RFC-089-Deterministic-Simulation-Testing.pdf',
            size: '1.1 MB',
            type: 'pdf',
            previewTitle: 'RFC-089: Deterministic Simulation Testing (DST)',
            previewMeta: {
              'Author': 'Alex Rivera <alex@acme.dev>',
              'Status': 'Proposed (Target: Core Engine v4.0)',
              'Simulation Speedup': '800x Real-Time via Virtualized Event Loop',
            },
            previewContent: `RFC-089: DETERMINISTIC SIMULATION TESTING\n\n1. Motivation\nTraditional integration tests run against real wall-clock timers and OS sockets, making race conditions non-reproducible. By replacing tokio::time and tokio::net with a seeded deterministic executor, any invariant violation can be reproduced with:\n\n  cargo test --bin dst_runner -- --seed 0x9F4A2C0184B1\n\n2. Fault Matrix\n- Asymmetric packet drop, reorder, and latency spikes\n- Unsynced page-cache eviction on simulated power loss\n- Clock drift up to 450ms across quorum peers`,
          },
        ],
      },
    ],
  },
  {
    id: 'th-19',
    subject: 'Follow-up: Frankfurt Datacenter Colocation Cage Inspection Schedule',
    folder: 'scheduled',
    category: 'primary',
    labels: ['lbl-travel', 'lbl-eng'],
    isUnread: false,
    isStarred: false,
    isImportant: false,
    scheduledFor: 'Thu, Oct 15, 8:00 AM',
    lastActivityIso: '2026-10-14T10:00:00Z',
    displayDate: 'Scheduled',
    messages: [
      {
        id: 'msg-19a',
        threadId: 'th-19',
        sender: CURRENT_USER,
        to: [c('c-marcus'), c('c-liam')],
        timestamp: '2026-10-14T10:00:00Z',
        displayTime: 'Scheduled for Tomorrow, 8:00 AM',
        fullDateStr: 'Scheduled for Thu, Oct 15, 2026, 8:00 AM',
        snippet: 'Confirming our Equinix FR5 datacenter security clearance badges for Tuesday Oct 20 at 2:00 PM CET.',
        body: `<p>Hey Marcus & Liam,</p>
<p>Confirming that Equinix FR5 (Frankfurt) approved our physical cage inspection badges for <strong>Tuesday, Oct 20 at 14:00 CET</strong>. Bring your passport and hardware YubiKey for biometric enrollment at Gate B.</p>`,
      },
    ],
  },
  {
    id: 'th-20',
    subject: 'Q4 Engineering All-Hands Keynote: "Sub-Millisecond Global State"',
    folder: 'drafts',
    category: 'primary',
    labels: ['lbl-eng', 'lbl-prod'],
    isUnread: false,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-14T10:30:00Z',
    displayDate: '10:30 AM',
    messages: [
      {
        id: 'msg-20a',
        threadId: 'th-20',
        sender: CURRENT_USER,
        to: [c('c-elena'), c('c-priya')],
        timestamp: '2026-10-14T10:30:00Z',
        displayTime: 'Draft saved 10:30 AM',
        fullDateStr: 'Wed, Oct 14, 2026, 10:30 AM',
        isDraft: true,
        snippet: 'Here is the outline for the Q4 Engineering All-Hands demo: live multi-region failover + Query Studio v2 WebGL trace explorer.',
        body: `Hi Elena, Priya,\n\nHere is the working outline for the 20-minute Q4 All-Hands technical keynote:\n\n1. Retrospective on the Frankfurt Raft cutover & 81.6% gross margin milestone (5 mins)\n2. Live Chaos Demo: Killing an entire availability zone during a 500k ops/sec benchmark (7 mins)\n3. Live Preview: Unified Query Studio v2 at 120fps with Priya (8 mins)\n\nLet me know if we should add a slide on the 2027 deterministic simulation roadmap!`,
      },
    ],
  },
  {
    id: 'th-21',
    subject: 'Vendor Security Questionnaire Response — Snowflake PrivateLink Integration',
    folder: 'drafts',
    category: 'primary',
    labels: ['lbl-legal', 'lbl-eng'],
    isUnread: false,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-13T19:15:00Z',
    displayDate: 'Oct 13',
    messages: [
      {
        id: 'msg-21a',
        threadId: 'th-21',
        sender: CURRENT_USER,
        to: [c('c-nina'), c('c-liam')],
        timestamp: '2026-10-13T19:15:00Z',
        displayTime: 'Draft saved Oct 13',
        fullDateStr: 'Tue, Oct 13, 2026, 7:15 PM',
        isDraft: true,
        snippet: 'Drafting responses for sections 3.1–3.8 covering AWS PrivateLink VPC endpoint policies and envelope encryption.',
        body: `Hi Nina,\n\nI filled in the technical architecture answers for Sections 3.1 through 3.8 of the customer security questionnaire:\n- All PrivateLink traffic stays strictly on the AWS backbone without traversing public IGW.\n- Customer-managed KMS keys (CMK) are validated every 15 minutes with automatic local DEK zeroization on revoke.\n\nLiam, can you attach the latest penetration test executive summary before we send?`,
      },
    ],
  },
  {
    id: 'th-22',
    subject: 'URGENT: Claim your complimentary Gartner Magic Quadrant Leader reprint license!',
    folder: 'spam',
    category: 'promotions',
    labels: [],
    isUnread: true,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-13T04:12:00Z',
    displayDate: 'Oct 13',
    messages: [
      {
        id: 'msg-22a',
        threadId: 'th-22',
        sender: {
          id: 'c-spam1',
          name: 'Enterprise Growth Syndicate',
          email: 'offers@b2b-leadgen-syndicate.biz',
          avatarColor: '#757575',
        },
        to: [CURRENT_USER],
        timestamp: '2026-10-13T04:12:00Z',
        displayTime: 'Yesterday, 4:12 AM',
        fullDateStr: 'Tue, Oct 13, 2026, 4:12 AM',
        snippet: 'Boost your Q4 pipeline by 400% with our verified CIO email list and syndicated whitepaper distribution package.',
        body: `<p>Hi Alex,</p><p>Want 500 qualified enterprise CTO meetings this month? Click here to purchase our unverified B2B intent database!</p>`,
      },
    ],
  },
  {
    id: 'th-23',
    subject: 'Deprecated staging cluster (us-west-2-sandbox-01) decommission receipt',
    folder: 'trash',
    category: 'updates',
    labels: ['lbl-eng'],
    isUnread: false,
    isStarred: false,
    isImportant: false,
    lastActivityIso: '2026-10-10T18:00:00Z',
    displayDate: 'Oct 10',
    messages: [
      {
        id: 'msg-23a',
        threadId: 'th-23',
        sender: c('c-aws'),
        to: [CURRENT_USER],
        timestamp: '2026-10-10T18:00:00Z',
        displayTime: 'Oct 10, 6:00 PM',
        fullDateStr: 'Sat, Oct 10, 2026, 6:00 PM',
        snippet: 'Terraform workspace us-west-2-sandbox-01 destroyed 48 EC2 instances and 12 EBS volumes cleanly.',
        body: `<p>Automated infrastructure teardown notice: staging cluster <code>us-west-2-sandbox-01</code> was decommissioned per TTL policy.</p>`,
      },
    ],
  },
  {
    id: 'th-24',
    subject: 'Q3 Postmortem Review: Zero-downtime schema migration on 14 TB billing ledger',
    folder: 'archive',
    category: 'primary',
    labels: ['lbl-eng', 'lbl-finance'],
    isUnread: false,
    isStarred: false,
    isImportant: true,
    lastActivityIso: '2026-10-09T16:45:00Z',
    displayDate: 'Oct 9',
    messages: [
      {
        id: 'msg-24a',
        threadId: 'th-24',
        sender: c('c-marcus'),
        to: [CURRENT_USER, c('c-sarah')],
        timestamp: '2026-10-09T16:45:00Z',
        displayTime: 'Oct 9, 4:45 PM',
        fullDateStr: 'Fri, Oct 9, 2026, 4:45 PM',
        snippet: 'Archived notes from the pg_repack + logical replication cutover on the 14 TB billing ledger.',
        body: `<p>Wrapping up the notes from last week's billing ledger partitioning migration. Total lock acquisition time was 4 milliseconds.</p>`,
      },
    ],
  },
];

export const SMART_REPLIES_BY_THREAD: Record<string, string[]> = {
  'th-1': [
    'Confirmed for 2:00 PM PT — rollback thresholds look solid.',
    'Approved for Thursday 02:00 UTC cutover!',
    'Let’s double-check Envoy drain weights at 2pm.',
  ],
  'th-2': [
    'Slide 14 numbers match our telemetry. Adding the Q4 GPU bullets now!',
    'Looks great Sarah — approved for the board packet.',
    'I’ll send over the NVLink margin model in 15 mins.',
  ],
  'th-3': [
    'The 28px density and tabular numerals look super crisp!',
    'WebGL2 viewport constraints match our engine — ship it!',
    'Let’s review the dark mode tokens together this afternoon.',
  ],
  'th-4': [
    'Engineering is comfortable with the 30-day subprocessor notice window.',
    'Approved on Clause 4.3 — good to execute.',
    'Looping in Liam for final SOC2 attestation check.',
  ],
};
