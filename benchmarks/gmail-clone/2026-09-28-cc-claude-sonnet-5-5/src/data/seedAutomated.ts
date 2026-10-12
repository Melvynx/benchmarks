import type { Contact } from '../lib/types';
import type { SeedThread } from './seedTypes';
import {
  alert,
  avatar,
  avatarRow,
  badge,
  barChart,
  brandBar,
  button,
  buttons,
  card,
  checkList,
  codeChip,
  codeDiff,
  commentBubble,
  coupon,
  divider,
  eventCard,
  eyebrow,
  footer,
  h,
  hero,
  itinerary,
  kv,
  link,
  listRow,
  logBlock,
  mail,
  p,
  productGrid,
  progressTracker,
  qr,
  scene,
  receiptTable,
  sec,
  small,
  sparkline,
  statRow,
  statusList,
  strong,
  tbl,
  tile,
  ticket,
  tint,
} from './emailHtml';

/**
 * Automated / bulk mail from fictional companies: promotions, social
 * notifications, receipts, alerts, bank + code-host notifications, travel
 * documents and newsletters. Every brand here is invented; domains are `.example`.
 */

export const contacts: Contact[] = [
  { id: 'b_skyline', name: 'Skyline Air', email: 'no-reply@skylineair.example', org: 'Skyline Air', color: '#0b6bcb' },
  { id: 'b_kestrel', name: 'Kestrel', email: 'notifications@kestrel.example', org: 'Kestrel', color: '#2f3a4f' },
  { id: 'b_parcelly', name: 'Parcelly', email: 'updates@parcelly.example', org: 'Parcelly', color: '#e08a00' },
  { id: 'b_tandem', name: 'Tandem Bank', email: 'alerts@tandembank.example', org: 'Tandem Bank', color: '#0e7c66' },
  { id: 'b_roam', name: 'Roam Stays', email: 'reservations@roamstays.example', org: 'Roam Stays', color: '#f2545b' },
  { id: 'b_harbor', name: 'Harbor+', email: 'hello@harborplus.example', org: 'Harbor+', color: '#1e3a8a' },
  { id: 'b_loop', name: 'Loop', email: 'no-reply@loopapp.example', org: 'Loop', color: '#6d5efc' },
  { id: 'b_loopsupport', name: 'Ines at Loop Support', email: 'support@loopapp.example', org: 'Loop', color: '#6d5efc' },
  { id: 'b_notely', name: 'Notely', email: 'team@notely.example', org: 'Notely', color: '#f5a300' },
  { id: 'b_plume', name: 'Plume Weekly', email: 'editor@plumeweekly.example', org: 'Plume Weekly', color: '#7c3aed' },
  { id: 'b_fernwood', name: 'Fernwood', email: 'hello@fernwood.example', org: 'Fernwood', color: '#2f855a' },
  { id: 'b_swiftbite', name: 'Swiftbite', email: 'orders@swiftbite.example', org: 'Swiftbite', color: '#ff6b00' },
  { id: 'b_peakform', name: 'Peakform', email: 'coach@peakform.example', org: 'Peakform', color: '#e11d48' },
  { id: 'b_ledgerly', name: 'Ledgerly', email: 'billing@ledgerly.example', org: 'Ledgerly', color: '#0f766e' },
  { id: 'b_orbit', name: 'Orbit', email: 'notify@orbit.example', org: 'Orbit', color: '#6366f1' },
  { id: 'b_meetly', name: 'Meetly', email: 'invites@meetly.example', org: 'Meetly', color: '#0ea5e9' },
  { id: 'b_sable', name: 'Sable Coffee', email: 'hello@sablecoffee.example', org: 'Sable Coffee', color: '#4b2e1e' },
  { id: 'b_vesper', name: 'Vesper Outfitters', email: 'offers@vesperoutfitters.example', org: 'Vesper Outfitters', color: '#1f4d3a' },
  { id: 'b_oakline', name: 'Oakline Home', email: 'hello@oaklinehome.example', org: 'Oakline Home', color: '#b7791f' },
  { id: 'b_pixelmart', name: 'Pixelmart', email: 'deals@pixelmart.example', org: 'Pixelmart', color: '#2563eb' },
  { id: 'b_pagewise', name: 'Pagewise Books', email: 'orders@pagewisebooks.example', org: 'Pagewise Books', color: '#b91c1c' },
  { id: 'b_clearwater', name: 'Clearwater Utilities', email: 'billing@clearwaterutilities.example', org: 'Clearwater Utilities', color: '#0891b2' },
  { id: 'b_marlow', name: 'Marlow Family Dental', email: 'reminders@marlowdental.example', org: 'Marlow Family Dental', color: '#14b8a6' },
  { id: 'b_alder', name: 'Alder Health', email: 'noreply@alderhealth.example', org: 'Alder Health', color: '#0284c7' },
  { id: 'b_pocket', name: 'Pocket Store', email: 'no_reply@pocketstore.example', org: 'Pocket Store', color: '#374151' },
  { id: 'b_zipp', name: 'Zipp Rides', email: 'receipts@zipprides.example', org: 'Zipp Rides', color: '#1f2937' },
  { id: 'b_stratus', name: 'Stratus Storage', email: 'billing@stratusstorage.example', org: 'Stratus Storage', color: '#3b82f6' },
  { id: 'b_pallet', name: 'Pallet', email: 'notifications@pallet.example', org: 'Pallet', color: '#ff5b3a' },
  { id: 'b_fairfile', name: 'Fairfile Tax', email: 'documents@fairfiletax.example', org: 'Fairfile Tax', color: '#1d4ed8' },
  { id: 'b_shieldwell', name: 'Shieldwell Insurance', email: 'policies@shieldwell.example', org: 'Shieldwell Insurance', color: '#0369a1' },
  { id: 'b_passage', name: 'Passage Travel Authorisation', email: 'noreply@passagetravel.example', org: 'Passage', color: '#9a3412' },
  { id: 'b_encore', name: 'Encore Tickets', email: 'tickets@encoretickets.example', org: 'Encore Tickets', color: '#be185d' },
  { id: 'b_cascade', name: 'Cascade Design Summit', email: 'tickets@cascadesummit.example', org: 'Cascade Design Summit', color: '#6d28d9' },
  { id: 'b_linkwell', name: 'Linkwell', email: 'notifications@linkwell.example', org: 'Linkwell', color: '#2b6cb0' },
  { id: 'b_commons', name: 'Commons', email: 'digest@commons.example', org: 'Commons', color: '#d97706' },
  { id: 'b_gather', name: 'Gather', email: 'events@gather.example', org: 'Gather', color: '#d61f7a' },
  { id: 'b_lumo', name: 'Lumo', email: 'hello@lumo.example', org: 'Lumo', color: '#f43f5e' },
  { id: 'b_trailhead', name: 'Trailhead Community', email: 'hikes@trailhead.example', org: 'Trailhead', color: '#16a34a' },
];

const GREY = '#8a919c';

/* ==================================================================== */
/* PROMOTIONS                                                            */
/* ==================================================================== */

const VES = 'https://vesperoutfitters.example';
const SKY = 'https://skylineair.example';
const SWB = 'https://swiftbite.example';
const NOT = 'https://notely.example';
const SAB = 'https://sablecoffee.example';
const FER = 'https://fernwood.example';
const OAK = 'https://oaklinehome.example';
const PIX = 'https://pixelmart.example';
const PEA = 'https://peakform.example';
const HAR = 'https://harborplus.example';
const LED = 'https://ledgerly.example';
const ROA = 'https://roamstays.example';
const LOO = 'https://loopapp.example';
const PAG = 'https://pagewisebooks.example';

const dealRow = (city: string, route: string, price: string, a: string, b: string, glyph: string, note: string) =>
  listRow(
    tile(a, b, glyph, 54, { fs: 24, radius: 12 }),
    `<div style="font-size:16px;font-weight:700;color:#0f172a">${city}</div><div style="font-size:12.5px;color:#64748b">${route} &middot; ${note}</div>`,
    `<div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.6px">from</div><div style="font-size:22px;font-weight:800;color:#0b6bcb;letter-spacing:-.5px">${price}</div>`,
  );

const promotions: SeedThread[] = [
  // P1 Vesper Outfitters
  {
    subject: 'Autumn Trail Sale: up to 40% off jackets, boots and packs',
    category: 'promotions',
    messages: [
      {
        from: 'b_vesper',
        ago: '9h',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Layers, boots and packs for the cold months, marked down while stock lasts.',
            bg: '#e9efe9',
            foot: footer('Vesper Outfitters', '410 Alder Row, Unit 3, Bellmoor, OR 97201', { domain: 'vesperoutfitters.example', unsub: true, reason: 'You’re receiving this because you shop with Vesper Outfitters.' }),
          },
          brandBar({ name: 'VESPER', letter: 'V', color: '#1f4d3a', shape: 'square', right: 'Free shipping over $75' }),
          hero({
            eyebrow: 'Autumn Trail Sale',
            title: 'Up to 40% off trail gear',
            subtitle: 'Layers, boots and packs for the cold months, marked down while stock lasts.',
            from: '#1f4d3a',
            to: '#4b8a67',
            cta: button('Shop the sale', `${VES}/sale`, '#ffffff', { text: '#1f4d3a' }),
          }),
          sec(
            h('Trail favourites', { level: 3, mb: 14 }) +
              productGrid(
                [
                  { name: 'Ridgeline Shell Jacket', sub: 'Waterproof, 3 colours', price: '$129', was: '$189', tag: '32% off', from: '#2f6b4f', to: '#a3d2b3', glyph: '🧥' },
                  { name: 'Cinder Trail Boots', sub: 'Vibram outsole', price: '$149', was: '$210', tag: '29% off', from: '#8a5a2b', to: '#e2b783', glyph: '🥾' },
                  { name: 'Summit 28L Pack', sub: 'Recycled ripstop', price: '$79', was: '$115', tag: '31% off', from: '#b45f3a', to: '#f0b48f', glyph: '🎒' },
                  { name: 'Merino Base Layer', sub: 'Midweight crew', price: '$54', was: '$90', tag: '40% off', from: '#3d5a80', to: '#a9c0dc', glyph: '🧣' },
                ],
                { accent: '#c0392b' },
              ) +
              `<div style="text-align:center;margin-top:6px">${button('See all 240 deals', `${VES}/sale`, '#1f4d3a')}</div>`,
          ),
          sec(small('Sale prices apply to select styles while supplies last. Free returns within 45 days.', { align: 'center', mb: 0 }), '0 32px 26px'),
        ),
      },
    ],
  },
  // P2 Skyline Air fare deals
  {
    subject: 'Fares from $89: 6 weekend escapes to book this week',
    category: 'promotions',
    messages: [
      {
        from: 'b_skyline',
        ago: '2h 15m',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Lisbon, Porto, Reykjavik and more, one-way fares from $89 for the next 72 hours.',
            bg: '#e8f0fb',
            foot: footer('Skyline Air Ltd.', '1 Terminal Way, Aldergate, GB-AL1 4RT', { domain: 'skylineair.example', unsub: true, reason: 'You’re on the Skyline Air deals list because you flew with us.' }),
          },
          brandBar({ name: 'Skyline Air', letter: 'S', color: '#0b6bcb', shape: 'circle', right: 'Fare alert' }),
          hero({
            emoji: '✈️',
            title: 'Small fares. Big escapes.',
            subtitle: 'One-way from $89 for the next 72 hours. Book by midnight to lock the price.',
            from: '#0b3d91',
            to: '#0b9bd6',
            angle: 120,
          }),
          sec(
            eyebrow('Picked for you', '#0b6bcb') +
              dealRow('Lisbon', 'JFK to LIS', '$129', '#f59e0b', '#fcd34d', '🌇', 'Nonstop') +
              dealRow('Porto', 'BOS to OPO', '$119', '#ef4444', '#fca5a5', '🍷', 'Nonstop') +
              dealRow('Reykjavik', 'EWR to KEF', '$89', '#0ea5e9', '#7dd3fc', '🧊', 'Nonstop') +
              dealRow('Marrakesh', 'JFK to RAK', '$189', '#d97706', '#fbbf24', '🕌', '1 stop') +
              dealRow('Edinburgh', 'BOS to EDI', '$149', '#6366f1', '#a5b4fc', '🏰', 'Nonstop') +
              listRow(tile('#10b981', '#6ee7b7', '🌴', 54, { fs: 24, radius: 12 }), '<div style="font-size:16px;font-weight:700;color:#0f172a">Madeira</div><div style="font-size:12.5px;color:#64748b">JFK to FNC &middot; 1 stop</div>', '<div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.6px">from</div><div style="font-size:22px;font-weight:800;color:#0b6bcb;letter-spacing:-.5px">$159</div>', false) +
              `<div style="margin-top:18px;text-align:center">${button('Search all fares', `${SKY}/deals`, '#0b6bcb')}</div>`,
          ),
          sec(small('Fares are one-way, per person, include taxes and fees, and are subject to availability. Bags and seat selection extra.', { mb: 0 }), '0 32px 24px'),
        ),
      },
    ],
  },
  // P3 Swiftbite coupon
  {
    subject: '$8 off your next two orders, on us',
    category: 'promotions',
    messages: [
      {
        from: 'b_swiftbite',
        ago: '1d 10h',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Use code HUNGRY8 at checkout. Free delivery from your favourite spots too.',
            bg: '#fff1e6',
            foot: footer('Swiftbite Inc.', '88 Market Lane, Suite 12, Fairview, CA 94100', { domain: 'swiftbite.example', unsub: true, reason: 'Sent to jordan.hayes@hayes.example. Offer valid for one account.' }),
          },
          hero({
            emoji: '🍜',
            eyebrow: 'Swiftbite',
            title: 'Craving something? We’ve got $8 for you.',
            subtitle: 'Two orders, $8 off each. Delivered hot, usually in under 30 minutes.',
            from: '#ff6b00',
            to: '#ffa62b',
            align: 'center',
            angle: 160,
          }),
          sec(
            coupon('HUNGRY8', 'Your promo code', 'Applies to your next 2 orders over $15. Expires in 4 days.', '#ff6b00') +
              `<div style="text-align:center;margin-bottom:22px">${button('Order now', `${SWB}/order`, '#ff6b00')}</div>` +
              eyebrow('Popular near you', GREY) +
              productGrid(
                [
                  { name: 'Casa Verde', sub: 'Tacos &middot; 20-30 min', price: '$1.99 delivery', from: '#65a30d', to: '#bef264', glyph: '🌮' },
                  { name: 'Noodle Theory', sub: 'Ramen &middot; 25-35 min', price: '$0 delivery', from: '#dc2626', to: '#fca5a5', glyph: '🍜' },
                  { name: 'Slice Society', sub: 'Pizza &middot; 15-25 min', price: '$0.99 delivery', from: '#f59e0b', to: '#fde68a', glyph: '🍕' },
                ],
                { cols: 3, accent: '#ff6b00' },
              ),
          ),
        ),
      },
    ],
  },
  // P4 Notely AI blocks
  {
    subject: 'Meet AI Blocks: notes that finish themselves',
    category: 'promotions',
    messages: [
      {
        from: 'b_notely',
        ago: '3d 5h',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Turn rough thoughts into structured pages, without leaving the editor.',
            bg: '#fff9ec',
            foot: footer('Notely Labs, Inc.', '2200 Harbour St, Floor 5, Portland, ME 04101', { domain: 'notely.example', unsub: true, links: ['Blog', 'Changelog'] }),
          },
          brandBar({ name: 'Notely', letter: 'N', color: '#f5a300', shape: 'squircle', right: 'Product update' }),
          sec(
            eyebrow('New', '#b7791f') +
              h('Meet AI Blocks: notes that finish themselves.', { level: 1, mb: 12, size: 30 }) +
              p('Type <span style="background:#fff1c9;border-radius:4px;padding:0 5px;font-family:ui-monospace,Menlo,monospace">/ai</span> in any Notely page and turn a rough thought into a checklist, a summary, or a first draft. Everything stays editable, and nothing leaves your workspace.', { size: 16 }) +
              buttons(button('Try AI Blocks', `${NOT}/ai-blocks`, '#111827'), button('Watch the 90s demo', `${NOT}/demo`, '#111827', { ghost: true })),
            '34px 34px 10px',
          ),
          sec(
            card(
              `<div style="font-size:12px;color:${GREY};margin-bottom:10px">Sprint retro &middot; Draft</div>` +
                `<div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:8px">What went well</div>` +
                `<div style="font-size:14px;color:#3c4043;margin-bottom:4px">&bull; Shipped the onboarding rewrite two days early</div><div style="font-size:14px;color:#3c4043;margin-bottom:12px">&bull; Support tickets down 18%</div>` +
                `<div style="background:#fff4d6;border:1px solid #f7d98a;border-radius:10px;padding:10px 12px;font-size:13.5px;color:#7a5200">${badge('AI Block', '#b7791f')} &nbsp;Summarise these notes as 3 action items&hellip;</div>`,
              { pad: '18px 20px', radius: 16, border: '#eadfc7', m: '0' },
            ),
            '10px 34px 24px',
          ),
          sec(
            checkList(['Draft from a single sentence', 'Summarise long pages in one click', 'Works with your existing templates']) +
              divider('#f0e6cf', '22px 0 16px') +
              `<div style="font-size:14px;color:#5f6368;font-style:italic">&ldquo;We replaced three tools with Notely. AI Blocks is the reason our retros take 10 minutes now.&rdquo;</div><div style="font-size:12.5px;color:${GREY};margin-top:6px">Dara Levine, Head of Ops at Tidewater</div>`,
            '4px 34px 30px',
          ),
        ),
      },
    ],
  },
  // P5 Sable coffee subscription
  {
    subject: 'Your next Sable box ships soon: meet Ember Ridge',
    category: 'promotions',
    messages: [
      {
        from: 'b_sable',
        ago: '2d 9h',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Cacao nib, orange peel and toasted almond. Swap or skip before it roasts.',
            bg: '#efe6dc',
            foot: footer('Sable Coffee Roasters', '17 Kiln Yard, Unit B, Ashford, VT 05001', { domain: 'sablecoffee.example', unsub: true, reason: 'You’re a Sable subscriber. Boxes ship every two weeks.' }),
          },
          hero({
            eyebrow: 'Your next box',
            title: 'Ember Ridge is roasting now.',
            subtitle: 'A medium-dark single origin from the Huila highlands, roasted to order for your box.',
            from: '#3b2416',
            to: '#7a4a2a',
            angle: 150,
          }),
          sec(
            `${tbl()}<tr><td style="width:150px;vertical-align:top">${tile('#5a3a25', '#c68b59', '☕', 150, { fs: 56 })}</td><td style="padding-left:18px;vertical-align:top">${h('Ember Ridge', { level: 2, mb: 4 })}${badge('Medium-dark', '#7a4a2a')} ${badge('Single origin', '#4b2e1e')}<div style="margin-top:12px">${kv([['Tasting notes', 'Cacao nib, orange peel'], ['Size', '340 g whole bean'], ['Ships', 'In 2 days']], { size: 13, w: 42 })}</div></td></tr></table>`,
          ),
          sec(
            progressTracker(['Roasting', 'Packed', 'Shipped', 'Delivered'], 0, '#7a4a2a') +
              divider('#eee3d6', '22px 0 18px') +
              buttons(button('Swap roast', `${SAB}/box/swap`, '#4b2e1e'), button('Skip this box', `${SAB}/box/skip`, '#4b2e1e', { ghost: true })) +
              small('Changes are locked in 24 hours before your box ships.', { mb: 0 }),
            '6px 32px 28px',
          ),
        ),
      },
    ],
  },
  // P6 Fernwood
  {
    subject: 'Low-light plants for shorter days',
    category: 'promotions',
    messages: [
      {
        from: 'b_fernwood',
        ago: '4d',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Six easy-going plants that thrive by a north window. Free care card with every order.',
            bg: '#eaf3ec',
            foot: footer('Fernwood Plant Shop', '9 Greenhouse Road, Millbrook, NY 12545', { domain: 'fernwood.example', unsub: true, reason: 'You’re receiving this because you ordered from Fernwood.' }),
          },
          brandBar({ name: 'Fernwood', letter: 'F', color: '#2f855a', shape: 'circle', right: 'Autumn edit' }),
          hero({ title: 'Low-light plants for shorter days', subtitle: 'Six easy-going greens that thrive by a north-facing window.', from: '#d9efdf', to: '#b6dcc1', angle: 160, emoji: '🌿', pad: '34px 32px', text: '#14532d' }),
          sec(
            productGrid(
              [
                { name: 'Snake Plant', sub: '4 in pot', price: '$24', from: '#3f8f5f', to: '#a7e0bb', glyph: '🪴' },
                { name: 'ZZ Plant', sub: '6 in pot', price: '$38', tag: 'Bestseller', from: '#2f855a', to: '#9be0b4', glyph: '🌿' },
                { name: 'Cast Iron Plant', sub: '6 in pot', price: '$34', from: '#4d7c0f', to: '#bef264', glyph: '🍃' },
                { name: 'Pothos', sub: 'Hanging basket', price: '$28', was: '$34', tag: 'Save $6', from: '#15803d', to: '#86efac', glyph: '🌱' },
                { name: 'Peace Lily', sub: '6 in pot', price: '$36', from: '#0f766e', to: '#99f6e4', glyph: '🌼' },
                { name: 'Chinese Evergreen', sub: '5 in pot', price: '$32', from: '#65a30d', to: '#d9f99d', glyph: '☘️' },
              ],
              { cols: 3, accent: '#2f855a' },
            ) + `<div style="text-align:center;margin-top:4px">${button('Shop low-light plants', `${FER}/low-light`, '#2f855a')}</div>`,
          ),
          sec(card('<div style="font-size:14px;color:#2f5d3f">🌱 <strong>Free plant-care card</strong> with every order, plus a 30-day happy-plant guarantee.</div>', { bg: '#f1f8f3', border: '#cfe6d6', m: '0' }), '0 32px 28px'),
        ),
      },
    ],
  },
  // P7 Oakline Home
  {
    subject: 'Free shipping on every rug. This week only.',
    category: 'promotions',
    messages: [
      {
        from: 'b_oakline',
        ago: '6d',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Hand-knotted wool, washable weaves and runners, delivered free.',
            bg: '#f4ece2',
            foot: footer('Oakline Home Co.', '52 Loomis Street, Suite 200, Hartwell, MA 02140', { domain: 'oaklinehome.example', unsub: true }),
          },
          `<div style="background:#2b2118;color:#f4ece2;text-align:center;padding:9px;font-size:12.5px;letter-spacing:.8px;text-transform:uppercase">Free shipping on all rugs &middot; ends soon</div>`,
          brandBar({ name: 'Oakline Home', letter: 'O', color: '#b7791f', shape: 'square' }),
          sec(
            eyebrow('The Rug Event', '#b7791f') + h('Ground your space.', { level: 1, size: 36, mb: 10 }) + p('From hand-knotted wool to machine-washable weaves, every rug ships free through the end of the event. No minimum.', { size: 16 }) + buttons(button('Shop rugs', `${OAK}/rugs`, '#2b2118', { radius: 6 })),
            '34px 34px 8px',
          ),
          sec(
            productGrid(
              [
                { name: 'Sable Wool Rug', sub: '8&times;10 ft &middot; hand-knotted', price: '$740', was: '$920', from: '#8b6f4e', to: '#d9c2a3', glyph: '🟫', tag: '20% off' },
                { name: 'Dune Washable Runner', sub: '2.5&times;9 ft', price: '$139', from: '#c2a77d', to: '#efe0c4', glyph: '🏜️' },
                { name: 'Fjord Jute Round', sub: '6 ft round', price: '$210', was: '$260', from: '#6b8a99', to: '#c1d4dc', glyph: '🌊', tag: 'Save $50' },
              ],
              { cols: 3, accent: '#b45309', height: 118 },
            ),
            '16px 26px 8px',
          ),
          sec(
            `${tbl('table-layout:fixed')}<tr>${['Free returns', '30-day trial', 'Ships in 3 days'].map((t) => `<td align="center" style="padding:14px 4px;font-size:13px;font-weight:600;color:#5c4b37;border-top:1px solid #eadfce">${t}</td>`).join('')}</tr></table>`,
            '8px 32px 18px',
          ),
        ),
      },
    ],
  },
  // P8 Pixelmart (dark)
  {
    subject: 'Ends tonight: up to $200 off displays, docks and audio',
    category: 'promotions',
    messages: [
      {
        from: 'b_pixelmart',
        ago: '8d 6h',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Last call on the Workspace Sale. Prices go back up at midnight.',
            bg: '#070b16',
            card: false,
            foot: footer('Pixelmart Electronics', '300 Circuit Ave, Suite 9, San Marino, CA 91108', { domain: 'pixelmart.example', unsub: true, dark: true, reason: 'You’re subscribed to Pixelmart Deals.' }),
          },
          `<div style="background:#0f172a;border-radius:18px;overflow:hidden;border:1px solid #1e293b">`,
          brandBar({ name: 'pixelmart', letter: 'p', color: '#2563eb', shape: 'square', dark: true, right: 'Workspace Sale' }),
          sec(
            `<div style="text-align:center;color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:8px">Ends tonight</div><div style="text-align:center;font-size:32px;font-weight:800;letter-spacing:-.8px;color:#f8fafc;margin-bottom:16px">Up to $200 off your desk setup</div>` +
              `<div style="text-align:center;margin-bottom:6px">${['06', '41', '17'].map((n, i) => `<span style="display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:8px 12px;margin:0 4px;font-family:ui-monospace,Menlo,monospace;font-size:24px;font-weight:700;color:#f8fafc">${n}<span style="display:block;font-size:9.5px;color:#94a3b8;letter-spacing:1px;font-family:-apple-system,Segoe UI,sans-serif">${['HRS', 'MIN', 'SEC'][i]}</span></span>`).join('')}</div>`,
            '30px 30px 16px',
            'linear-gradient(180deg,#13223f,#0f172a)',
          ),
          sec(
            [
              ['Studio 27" 5K Display', 'Matte glass, height-adjust stand', '$1,099', '$1,299', '#1d4ed8', '#60a5fa', '🖥️'],
              ['Dock Pro 14-in-1', 'Dual 4K, 100W pass-through', '$179', '$229', '#7c3aed', '#c4b5fd', '🔌'],
              ['Hush ANC Headphones', '40h battery, spatial audio', '$249', '$329', '#0f766e', '#5eead4', '🎧'],
            ]
              .map(
                ([n, s, pr, was, a, b, g]) =>
                  `<div style="background:#111c33;border:1px solid #1e293b;border-radius:14px;padding:12px;margin-bottom:10px">${tbl()}<tr><td style="width:76px">${tile(a, b, g, 64, { fs: 28, radius: 12 })}</td><td style="padding-left:14px"><div style="font-size:15px;font-weight:700;color:#f1f5f9">${n}</div><div style="font-size:12.5px;color:#94a3b8">${s}</div></td><td align="right" style="white-space:nowrap"><div style="font-size:18px;font-weight:800;color:#60a5fa">${pr}</div><div style="font-size:12px;color:#64748b;text-decoration:line-through">${was}</div></td></tr></table></div>`,
              )
              .join('') + `<div style="text-align:center;margin-top:18px">${button('Shop the sale', `${PIX}/workspace-sale`, '#2563eb')}</div>`,
            '10px 26px 30px',
          ),
          `</div>`,
        ),
      },
    ],
  },
  // P9 Peakform
  {
    subject: 'You ran 46 km last month. Ready for a plan?',
    category: 'promotions',
    messages: [
      {
        from: 'b_peakform',
        ago: '11d',
        unsubscribe: true,
        html: mail(
          {
            pre: 'Go Pro for 30% off the annual plan: adaptive training plans built around your week.',
            bg: '#fdecef',
            foot: footer('Peakform Fitness, Inc.', '640 Ridge Ave, Suite 4, Boulder, CO 80301', { domain: 'peakform.example', unsub: true }),
          },
          brandBar({ name: 'Peakform', letter: 'P', color: '#e11d48', shape: 'circle', right: 'Monthly recap' }),
          sec(
            eyebrow('Your last 30 days', '#e11d48') +
              h('You ran 46 km. Nice consistency.', { level: 1, size: 27, mb: 14 }) +
              statRow([
                { label: 'Distance', value: '46 km', sub: '+12% vs prior', color: '#e11d48' },
                { label: 'Runs', value: '9', sub: 'best: 8.2 km' },
                { label: 'Avg pace', value: '5:48', sub: 'per km' },
              ]) +
              `<div style="margin-top:18px">${barChart([8, 12, 6, 14, 5, 11, 9, 16], { color: '#e11d48', labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'], hi: 7, h: 110 })}</div>`,
            '28px 32px 8px',
          ),
          sec(
            hero({
              title: 'Go Pro: 30% off annual',
              subtitle: 'Adaptive plans that flex around your week, recovery insights and race predictions.',
              from: '#be123c',
              to: '#fb7185',
              cta: button('Claim 30% off', `${PEA}/pro?promo=RUN30`, '#ffffff', { text: '#be123c' }),
              pad: '26px 26px',
              radius: 16,
            }),
            '16px 32px 30px',
          ),
        ),
      },
    ],
  },
  // P10 Harbor+
  {
    subject: 'New this month on Harbor+',
    category: 'promotions',
    messages: [
      {
        from: 'b_harbor',
        ago: '15d',
        unsubscribe: true,
        html: mail(
          {
            pre: 'A season finale, two new originals and a documentary you’ll want to see first.',
            bg: '#0a1230',
            card: false,
            foot: footer('Harbor+ Streaming LLC', '1200 Studio Blvd, Los Feliz, CA 90027', { domain: 'harborplus.example', unsub: true, dark: true, reason: 'You’re receiving this as a Harbor+ member.' }),
          },
          `<div style="background:linear-gradient(180deg,#14224f,#0a1230);border-radius:18px;overflow:hidden;border:1px solid #1e2c5c">`,
          brandBar({ name: 'Harbor+', letter: 'H', color: '#3b82f6', shape: 'circle', dark: true, bg: 'transparent', right: 'New this month' }),
          sec(
            `<div style="font-size:11.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#7aa2ff;margin-bottom:8px">Featured</div><div style="font-size:30px;font-weight:800;letter-spacing:-.8px;color:#ffffff;line-height:1.15">Last Light of Mercer Bay</div><div style="font-size:14px;color:#a5b4d8;margin:8px 0 18px">The acclaimed drama returns for its final season. All 8 episodes are streaming now.</div>` +
              button('Watch now', `${HAR}/watch/mercer-bay`, '#3b82f6') +
              ' ' +
              button('+ My list', `${HAR}/list/add`, '#7aa2ff', { ghost: true }),
            '26px 28px 22px',
          ),
          sec(
            productGrid(
              [
                { name: 'Salt &amp; Static', sub: 'Original series', price: '10 episodes', tag: 'New', from: '#7c3aed', to: '#f472b6', glyph: '🎬' },
                { name: 'The Long Thaw', sub: 'Documentary', price: '1h 48m', tag: 'Harbor+ Original', from: '#0e7490', to: '#67e8f9', glyph: '🏔️' },
                { name: 'Paper Lanterns', sub: 'Family film', price: '1h 32m', from: '#b45309', to: '#fcd34d', glyph: '🏮' },
              ],
              { cols: 3, accent: '#7aa2ff', height: 150 },
            ).replace(/color:#111827/g, 'color:#f1f5f9').replace(/color:#6b7280/g, 'color:#8ea0cc'),
            '4px 22px 26px',
          ),
          `</div>`,
        ),
      },
    ],
  },
  // P11 Ledgerly marketing
  {
    subject: 'Get paid faster with Ledgerly payment links',
    category: 'promotions',
    messages: [
      {
        from: 'b_ledgerly',
        ago: '21d',
        unsubscribe: true,
        html: mail(
          {
            pre: 'Freelancers using payment links get paid 11 days sooner on average.',
            bg: '#e8f4f2',
            foot: footer('Ledgerly Software Ltd.', '25 Counting House Lane, Leeds LS1 5AB', { domain: 'ledgerly.example', unsub: true, links: ['Help centre', 'Pricing'] }),
          },
          brandBar({ name: 'Ledgerly', letter: 'L', color: '#0f766e', shape: 'squircle', right: 'For freelancers' }),
          sec(
            eyebrow('Payment links', '#0f766e') + h('Send an invoice. Get paid the same day.', { level: 1, size: 28, mb: 12 }) + p('Add a secure payment link to any Ledgerly invoice. Clients pay by card or bank transfer in two clicks and you get a receipt automatically.', { size: 16 }),
            '32px 34px 8px',
          ),
          sec(
            card(
              `${tbl()}<tr><td><div style="font-size:12px;color:${GREY}">Invoice INV-1093</div><div style="font-size:16px;font-weight:700;color:#111827">Brand refresh, phase 2</div></td><td align="right">${badge('Due in 7 days', '#b45309')}</td></tr></table>` +
                divider('#edeff2', '12px 0') +
                `${tbl()}<tr><td style="font-size:26px;font-weight:800;letter-spacing:-.6px;color:#111827">$4,800.00</td><td align="right">${button('Pay invoice', `${LED}/pay/demo`, '#0f766e', { small: true })}</td></tr></table>`,
              { radius: 16, border: '#cfe5e1', m: '0', pad: '18px 20px' },
            ),
            '10px 34px 20px',
          ),
          sec(
            statRow([
              { label: 'Faster', value: '11 days', sub: 'average payout', color: '#0f766e' },
              { label: 'On time', value: '94%', sub: 'links paid' },
              { label: 'Setup', value: '2 min', sub: 'no code' },
            ]) + `<div style="text-align:center;margin-top:22px">${button('Turn on payment links', `${LED}/payment-links`, '#0f766e')}</div>`,
            '4px 34px 30px',
          ),
        ),
      },
    ],
  },
  // P12 Roam Stays
  {
    subject: 'Cozy cabins, 15% off. Book your quiet escape',
    category: 'promotions',
    messages: [
      {
        from: 'b_roam',
        ago: '27d',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Use COZY15 on any cabin stay of 2+ nights. Lakeside, forest and mountain picks.',
            bg: '#fff0ee',
            foot: footer('Roam Stays, Inc.', '77 Wayfarer Court, Suite 6, Asheville, NC 28801', { domain: 'roamstays.example', unsub: true }),
          },
          brandBar({ name: 'roam', letter: 'r', color: '#f2545b', shape: 'circle', right: 'Fall getaways' }),
          hero({ title: 'Cozy cabins, 15% off', subtitle: 'Wood stoves, quiet mornings and no signal. Stays of 2+ nights.', from: '#f2545b', to: '#f9a26c', eyebrow: 'Limited time', emoji: '🏡', align: 'center' }),
          sec(
            coupon('COZY15', 'Promo code', 'Valid on stays of 2 nights or more. Book within 5 days.', '#f2545b') +
              productGrid(
                [
                  { name: 'Birchwater Lake Cabin', sub: '★ 4.94 &middot; sleeps 4', price: '$164 / night', from: '#1d4ed8', to: '#7dd3fc', glyph: '🛶' },
                  { name: 'The Fern Hollow A-frame', sub: '★ 4.89 &middot; sleeps 2', price: '$139 / night', tag: 'Guest favourite', from: '#15803d', to: '#bbf7d0', glyph: '🌲' },
                  { name: 'Cinder Peak Lodge', sub: '★ 4.97 &middot; sleeps 6', price: '$248 / night', from: '#9a3412', to: '#fdba74', glyph: '⛰️' },
                  { name: 'Stillwater Tiny House', sub: '★ 4.92 &middot; sleeps 2', price: '$118 / night', from: '#6d28d9', to: '#ddd6fe', glyph: '🔥' },
                ],
                { accent: '#f2545b', height: 118 },
              ) +
              `<div style="text-align:center">${button('Browse cabins', `${ROA}/cabins`, '#f2545b')}</div>`,
          ),
        ),
      },
    ],
  },
  // P13 Loop 3.0
  {
    subject: 'Loop 3.0 is here: Cycles, Timelines and a faster everything',
    category: 'promotions',
    messages: [
      {
        from: 'b_loop',
        ago: '36d',
        unsubscribe: true,
        html: mail(
          {
            pre: 'Plan in cycles, see the whole roadmap on a timeline, and load boards 3x faster.',
            bg: '#efedff',
            foot: footer('Loop Software, Inc.', '900 Tenth St, Floor 3, San Francisco, CA 94103', { domain: 'loopapp.example', unsub: true, links: ['Changelog', 'Docs'] }),
          },
          hero({ eyebrow: 'Loop 3.0', title: 'Plan in cycles. Ship on rhythm.', subtitle: 'The biggest release since we started, and it’s already in your workspace.', from: '#4c3dd8', to: '#8f7bff', angle: 125, cta: button('See what’s new', `${LOO}/3`, '#ffffff', { text: '#4c3dd8' }) }),
          sec(
            `${tbl('table-layout:fixed')}<tr>${[
              ['Backlog', '#94a3b8', ['Empty-state audit', 'Export to CSV']],
              ['In progress', '#6d5efc', ['Onboarding v3', 'Billing page']],
              ['Done', '#16a34a', ['Dark mode QA']],
            ]
              .map(
                ([t, c, items]) =>
                  `<td style="vertical-align:top;padding:0 4px"><div style="background:#f6f5ff;border-radius:12px;padding:10px"><div style="font-size:11.5px;font-weight:700;color:${c as string};margin-bottom:8px;text-transform:uppercase;letter-spacing:.7px">&bull; ${t as string}</div>${(items as string[]).map((i) => `<div style="background:#fff;border:1px solid #e6e3ff;border-radius:8px;padding:8px 9px;font-size:12.5px;color:#1f2328;margin-bottom:6px">${i}</div>`).join('')}</div></td>`,
              )
              .join('')}</tr></table>`,
            '26px 26px 8px',
          ),
          sec(
            h('What’s new', { level: 3, mb: 8 }) +
              checkList(['<strong>Cycles</strong>: time-boxed planning with automatic carry-over', '<strong>Timelines</strong>: roadmap view across teams and projects', '<strong>3x faster</strong> board loading on large workspaces', 'Keyboard-first command bar (' + codeChip('&#8984;K') + ')'], '#6d5efc'),
            '16px 32px 30px',
          ),
        ),
      },
    ],
  },
  // P14 Pagewise Books
  {
    subject: 'Buy 2, get a 3rd free on staff-pick paperbacks',
    category: 'promotions',
    messages: [
      {
        from: 'b_pagewise',
        ago: '48d',
        unsubscribe: true,
        html: mail(
          {
            pre: 'Mix and match across fiction, memoir and design books. Cheapest one is on us.',
            bg: '#f7efe8',
            foot: footer('Pagewise Books Ltd.', '14 Bindery Lane, Norwich NR2 4LQ', { domain: 'pagewisebooks.example', unsub: true }),
          },
          brandBar({ name: 'Pagewise', letter: 'P', color: '#b91c1c', shape: 'square', right: 'Staff picks' }),
          sec(
            eyebrow('Limited offer', '#b91c1c') + h('Buy 2, get the 3rd free.', { level: 1, size: 32, mb: 8 }) + p('Choose any three staff-pick paperbacks and the cheapest is on us. Automatically applied in your basket.', { size: 16, mb: 6 }),
            '30px 34px 10px',
          ),
          sec(
            productGrid(
              [
                { name: 'The Quiet Machine', sub: 'Mara Ellison', price: '$16.00', from: '#7f1d1d', to: '#fca5a5', glyph: '📕' },
                { name: 'Small Rooms', sub: 'Theo Anand &middot; memoir', price: '$15.50', from: '#1e3a8a', to: '#93c5fd', glyph: '📘' },
                { name: 'Grids &amp; Gutters', sub: 'Design classic', price: '$24.00', tag: 'Staff pick', from: '#166534', to: '#86efac', glyph: '📗' },
              ],
              { cols: 3, accent: '#b91c1c', height: 158 },
            ) + `<div style="text-align:center">${button('Build your trio', `${PAG}/three-for-two`, '#b91c1c', { radius: 6 })}</div>`,
            '10px 26px 30px',
          ),
        ),
      },
    ],
  },
];

/* ==================================================================== */
/* SOCIAL                                                                */
/* ==================================================================== */

const ORB = 'https://orbit.example';
const LNK = 'https://linkwell.example';
const COM = 'https://commons.example';
const GAT = 'https://gather.example';
const LUM = 'https://lumo.example';
const TRL = 'https://trailhead.example';

const orbitFoot = footer('Orbit Social, Inc.', '1 Beacon Plaza, Floor 9, Seattle, WA 98101', {
  domain: 'orbit.example',
  unsub: true,
  reason: 'You’re receiving this because notifications are enabled for jordan.hayes@hayes.example.',
});

const social: SeedThread[] = [
  // S1 Orbit new followers
  {
    subject: 'Maya Ortiz and 3 others started following you',
    category: 'social',
    messages: [
      {
        from: 'b_orbit',
        ago: '7h',
        unread: true,
        unsubscribe: true,
        html: mail(
          { pre: 'Maya Ortiz, Kofi Mensah, Ilse Brandt and Tomás Vega are now following your updates.', bg: '#eceeff', foot: orbitFoot },
          brandBar({ name: 'Orbit', letter: 'O', color: '#6366f1', shape: 'circle', right: 'New followers' }),
          sec(
            avatarRow(
              [
                { name: 'Maya Ortiz', color: '#ec4899' },
                { name: 'Kofi Mensah', color: '#f59e0b' },
                { name: 'Ilse Brandt', color: '#10b981' },
                { name: 'Tomas Vega', color: '#3b82f6' },
              ],
              { size: 46 },
            ) +
              h('Maya Ortiz and 3 others started following you', { level: 2, size: 21, mb: 6 }) +
              p('Your <strong>Palette study</strong> series is getting noticed. 4 new followers in the last day.', { mb: 10 }),
            '26px 30px 4px',
          ),
          sec(
            [
              ['Maya Ortiz', '#ec4899', 'Illustrator &middot; Lisbon'],
              ['Kofi Mensah', '#f59e0b', 'Brand designer &middot; Accra'],
              ['Ilse Brandt', '#10b981', 'Type nerd &middot; Hamburg'],
              ['Tomas Vega', '#3b82f6', 'Product design &middot; Madrid'],
            ]
              .map(([n, c, bio], i) =>
                listRow(avatar(n, c, 42), `<div style="font-weight:700;color:#111827;font-size:15px">${n}</div><div style="font-size:12.5px;color:#6b7280">${bio}</div>`, button('Follow back', `${ORB}/follow/${i}`, '#6366f1', { small: true, ghost: true }), i < 3),
              )
              .join('') + `<div style="text-align:center;margin-top:20px">${link('See all followers', `${ORB}/followers`, '#6366f1')}</div>`,
            '0 30px 28px',
          ),
        ),
      },
    ],
  },
  // S2 Orbit comment
  {
    subject: 'Tessa Lund commented on your post "Palette study 04"',
    category: 'social',
    messages: [
      {
        from: 'b_orbit',
        ago: '3d 20h',
        unread: true,
        unsubscribe: true,
        html: mail(
          { pre: '“The muted teal against warm grey is doing so much work here. Are you sharing the tokens?”', bg: '#eceeff', foot: orbitFoot },
          brandBar({ name: 'Orbit', letter: 'O', color: '#6366f1', shape: 'circle', right: 'Comment' }),
          sec(
            `${tbl()}<tr><td style="width:88px;vertical-align:top">${tile('#0f766e', '#a7c4c0', '🎨', 78, { fs: 32, radius: 12 })}</td><td style="padding-left:14px;vertical-align:middle"><div style="font-size:12px;color:${GREY}">Your post</div><div style="font-size:16px;font-weight:700;color:#111827">Palette study 04</div><div style="font-size:12.5px;color:#6b7280">34 likes &middot; 6 comments</div></td></tr></table>` +
              divider('#eceef2', '18px 0') +
              commentBubble({ name: 'Tessa Lund', color: '#0ea5e9', meta: '2h ago', text: 'The muted teal against the warm grey is doing so much work here. Are you sharing the tokens? I’d love to try them in a dashboard.' }) +
              `<div style="margin-top:16px">${buttons(button('Reply', `${ORB}/post/palette-04#reply`, '#6366f1'), button('Like', `${ORB}/post/palette-04#like`, '#6366f1', { ghost: true }))}</div>`,
            '26px 30px 26px',
          ),
        ),
      },
    ],
  },
  // S3 Linkwell requests
  {
    subject: 'You have 5 new connection requests',
    category: 'social',
    messages: [
      {
        from: 'b_linkwell',
        ago: '2d 12h',
        unsubscribe: true,
        html: mail(
          {
            pre: 'Ravi Menon, Corinne Baptiste and 3 others want to connect with you.',
            bg: '#e9f0f8',
            foot: footer('Linkwell Networks Ltd.', '30 Regent Quay, Dublin D02 X285', { domain: 'linkwell.example', unsub: true, reason: 'You’re receiving invitation emails. Turn them off any time.' }),
          },
          brandBar({ name: 'Linkwell', letter: 'in', color: '#2b6cb0', shape: 'square', right: 'Invitations' }),
          sec(
            h('You have 5 new connection requests', { level: 2, size: 21, mb: 12 }) +
              [
                ['Ravi Menon', '#7c3aed', 'Head of Design at Halcyon', '12 mutual connections'],
                ['Corinne Baptiste', '#db2777', 'Design Recruiter at Foundry', '4 mutual connections'],
                ['Anders Holt', '#059669', 'Founder, Holt &amp; Daughter Studio', '2 mutual connections'],
              ]
                .map(([n, c, t, m], i) =>
                  listRow(avatar(n, c, 48), `<div style="font-weight:700;color:#111827;font-size:15px">${n}</div><div style="font-size:13px;color:#4b5563">${t}</div><div style="font-size:12px;color:${GREY}">${m}</div>`, button('Accept', `${LNK}/invite/${i}`, '#2b6cb0', { small: true }) + ' ' + button('Ignore', `${LNK}/ignore/${i}`, '#6b7280', { small: true, ghost: true }), i < 2),
                )
                .join('') +
              `<div style="text-align:center;margin-top:20px">${button('View all 5 invitations', `${LNK}/invitations`, '#2b6cb0', { ghost: true })}</div>`,
            '26px 30px 30px',
          ),
        ),
      },
    ],
  },
  // S4 Commons digest
  {
    subject: 'Top discussions this week in Designers & Makers',
    category: 'social',
    messages: [
      {
        from: 'b_commons',
        ago: '5d 20h',
        unsubscribe: true,
        html: mail(
          {
            pre: 'How do you price fixed-scope projects? Plus: the great empty-state debate.',
            bg: '#fbf1e3',
            foot: footer('Commons Community Co-op', '5 Common Green, Suite 1, Burlington, VT 05401', { domain: 'commons.example', unsub: true, reason: 'Weekly digest for the Designers &amp; Makers community.' }),
          },
          brandBar({ name: 'Commons', letter: 'C', color: '#d97706', shape: 'circle', right: 'Weekly digest' }),
          sec(
            eyebrow('Designers &amp; Makers', '#b45309') + h('The conversations worth your coffee break', { level: 2, size: 21, mb: 12 }) +
              [
                ['214', 'How do you price fixed-scope projects?', '68 replies &middot; pricing', '#d97706'],
                ['187', 'The great empty-state debate: illustration vs. plain text', '52 replies &middot; ux', '#0ea5e9'],
                ['143', 'Show &amp; tell: your desk setup, honestly', '97 replies &middot; off-topic', '#16a34a'],
                ['96', 'Handoff tools you actually still use in 2 years', '33 replies &middot; workflow', '#8b5cf6'],
              ]
                .map(([v, t, m, c], i) =>
                  listRow(`<div style="width:46px;height:46px;border-radius:12px;background:${tint(c, 0.12)};text-align:center;color:${c};font-weight:800;font-size:15px;line-height:1.1;padding-top:7px;box-sizing:border-box">${v}<div style="font-size:9px;font-weight:600;letter-spacing:.5px">VOTES</div></div>`, `<div style="font-weight:700;color:#111827;font-size:15px;line-height:1.35">${link(t, `${COM}/t/${i}`, '#111827')}</div><div style="font-size:12.5px;color:${GREY}">${m}</div>`, '', i < 3),
                )
                .join('') +
              `<div style="text-align:center;margin-top:20px">${button('Join the conversation', `${COM}/designers-makers`, '#d97706')}</div>`,
            '26px 30px 30px',
          ),
        ),
      },
    ],
  },
  // S5 Gather event invite
  {
    subject: 'You’re invited: Portfolio Review Night (in 3 days)',
    category: 'social',
    messages: [
      {
        from: 'b_gather',
        ago: '1d 20h',
        unread: true,
        unsubscribe: true,
        html: mail(
          {
            pre: 'Bring a project, get honest feedback from 6 working designers. 23 people are going.',
            bg: '#fdeaf3',
            foot: footer('Gather Events, Inc.', '412 Commerce Row, Suite 5, Austin, TX 78701', { domain: 'gather.example', unsub: true, reason: 'You’re invited because you follow Product Design Circle.' }),
          },
          hero({ eyebrow: 'You’re invited', title: 'Portfolio Review Night', subtitle: 'Hosted by Product Design Circle &middot; free, snacks included', from: '#d61f7a', to: '#7c3aed', emoji: '🎟️' }),
          sec(
            eventCard({ title: 'Portfolio Review Night', big: 'In 3 days', small: '6:30 PM', color: '#d61f7a', lines: ['📍 Studio 9, 41 Kiln Street', '⏱ 2.5 hours &middot; doors at 6:00 PM', '🎤 6 reviewers from product studios'] }) +
              `<div style="margin:0 0 16px">${avatarRow([{ name: 'Nia Cole', color: '#f59e0b' }, { name: 'Ben Ito', color: '#10b981' }, { name: 'Sara Wu', color: '#3b82f6' }, { name: 'Luis Prado', color: '#ec4899' }], { size: 34, extra: 19 })}<div style="font-size:13px;color:#5f6368;margin-top:10px">Nia, Ben and 21 others are going</div></div>` +
              buttons(button('Going', `${GAT}/e/portfolio-night/rsvp?yes`, '#d61f7a'), button('Maybe', `${GAT}/e/portfolio-night/rsvp?maybe`, '#d61f7a', { ghost: true }), button('Can’t make it', `${GAT}/e/portfolio-night/rsvp?no`, '#6b7280', { ghost: true })),
            '26px 30px 28px',
          ),
        ),
      },
    ],
  },
  // S6 Lumo tag
  {
    subject: 'Noah Fischer tagged you in a photo',
    category: 'social',
    messages: [
      {
        from: 'b_lumo',
        ago: '9d 14h',
        unsubscribe: true,
        html: mail(
          {
            pre: 'Noah Fischer tagged you in “Send day at the gym.” 41 people liked it.',
            bg: '#fff0f2',
            foot: footer('Lumo Photos, Inc.', '8 Aperture Way, Suite 2, Brooklyn, NY 11201', { domain: 'lumo.example', unsub: true }),
          },
          brandBar({ name: 'lumo', letter: 'L', color: '#f43f5e', shape: 'circle', right: 'You were tagged' }),
          sec(
            `${tbl()}<tr><td style="width:44px">${avatar('Noah Fischer', '#0d652d', 38)}</td><td style="font-size:14.5px;color:#1f2328"><strong>Noah Fischer</strong> tagged you in a photo</td></tr></table>`,
            '20px 24px 12px',
          ),
          `<div style="margin:0 24px">${tile('#fb7185', '#fdba74', '🧗', 250, { fs: 96, radius: 16 })}</div>`,
          sec(
            `<div style="font-size:14.5px;color:#1f2328"><strong>noah.f</strong> Send day at the gym. Jordan finally topped the purple one 🎉</div><div style="font-size:13px;color:${GREY};margin:8px 0 16px">♥ 41 likes &middot; 8 comments</div>` +
              buttons(button('View photo', `${LUM}/p/send-day`, '#f43f5e'), button('Remove tag', `${LUM}/p/send-day/untag`, '#6b7280', { ghost: true })),
            '16px 24px 26px',
          ),
        ),
      },
    ],
  },
  // S7 Trailhead
  {
    subject: '3 hikes near you this weekend',
    category: 'social',
    messages: [
      {
        from: 'b_trailhead',
        ago: '13d',
        unsubscribe: true,
        html: mail(
          {
            pre: 'Ridge loops, a waterfall walk and a sunrise summit, all within an hour.',
            bg: '#e6f3e9',
            foot: footer('Trailhead Community', 'PO Box 88, Sunfield, CO 80302', { domain: 'trailhead.example', unsub: true }),
          },
          hero({ eyebrow: 'Weekend picks', title: '3 hikes near you', subtitle: 'Chosen from 1,240 community trip reports.', from: '#166534', to: '#65a30d', emoji: '🥾', angle: 145 }),
          sec(
            [
              ['Heron Falls Loop', '4.2 mi &middot; 1h 45m &middot; 320 ft', 'Easy', '#16a34a', '#86efac', '💧', '38 min away'],
              ['Cinder Ridge Traverse', '7.8 mi &middot; 4h &middot; 1,900 ft', 'Moderate', '#d97706', '#fcd34d', '⛰️', '52 min away'],
              ['Sunrise Point Summit', '5.1 mi &middot; 3h &middot; 2,300 ft', 'Hard', '#dc2626', '#fca5a5', '🌅', '1h 05m away'],
            ]
              .map(([n, m, d, a, b, g, t], i) =>
                listRow(tile(a, b, g, 60, { fs: 26, radius: 14 }), `<div style="font-weight:700;color:#111827;font-size:15.5px">${n}</div><div style="font-size:12.5px;color:#6b7280">${m}</div><div style="font-size:12px;color:${GREY}">${t}</div>`, badge(d, a), i < 2),
              )
              .join('') + `<div style="text-align:center;margin-top:20px">${button('Explore trails', `${TRL}/near-you`, '#166534')}</div>`,
            '20px 28px 30px',
          ),
        ),
      },
    ],
  },
  // S8 Linkwell profile views
  {
    subject: 'Your profile was viewed 27 times this week',
    category: 'social',
    messages: [
      {
        from: 'b_linkwell',
        ago: '19d',
        unsubscribe: true,
        html: mail(
          {
            pre: 'Up 8 views from last week. See who’s looking.',
            bg: '#e9f0f8',
            foot: footer('Linkwell Networks Ltd.', '30 Regent Quay, Dublin D02 X285', { domain: 'linkwell.example', unsub: true }),
          },
          brandBar({ name: 'Linkwell', letter: 'in', color: '#2b6cb0', shape: 'square', right: 'Weekly insights' }),
          sec(
            eyebrow('Profile views', '#2b6cb0') +
              `${tbl()}<tr><td><div style="font-size:52px;font-weight:800;letter-spacing:-2px;color:#111827;line-height:1">27</div><div style="font-size:13px;color:#188038;font-weight:600">&#9650; 8 from last week</div></td><td align="right">${sparkline([9, 12, 8, 14, 19, 16, 27], '#2b6cb0', 200, 60)}</td></tr></table>` +
              divider('#e9edf2', '20px 0 6px') +
              [
                ['Recruiter at Foundry', '#db2777', 'Design'],
                ['Head of Product at Halcyon', '#7c3aed', 'Product'],
                ['3 others in your industry', '#059669', 'Design'],
              ]
                .map(([t, c], i) => listRow(avatar(t.replace(/^\d /, ''), c, 38), `<div style="font-size:14.5px;color:#111827;font-weight:600">${t}</div><div style="font-size:12.5px;color:${GREY}">Viewed your profile</div>`, '', i < 2))
                .join('') +
              `<div style="text-align:center;margin-top:18px">${button('See all viewers', `${LNK}/insights`, '#2b6cb0')}</div>`,
            '26px 30px 30px',
          ),
        ),
      },
    ],
  },
  // S9 Commons reply
  {
    subject: 'New reply to “Best way to handle empty states in dashboards?”',
    category: 'social',
    messages: [
      {
        from: 'b_commons',
        ago: '32d',
        unsubscribe: true,
        html: mail(
          {
            pre: 'Priyanka_D replied: “I usually start with the next best action, not an apology.”',
            bg: '#fbf1e3',
            foot: footer('Commons Community Co-op', '5 Common Green, Suite 1, Burlington, VT 05401', { domain: 'commons.example', unsub: true, reason: 'You’re following this thread.' }),
          },
          brandBar({ name: 'Commons', letter: 'C', color: '#d97706', shape: 'circle', right: 'Reply' }),
          sec(
            `<div style="font-size:12px;color:${GREY};margin-bottom:4px">In Designers &amp; Makers</div>` +
              h('Best way to handle empty states in dashboards?', { level: 2, size: 20, mb: 16 }) +
              commentBubble({ name: 'Priyanka_D', color: '#8b5cf6', meta: 'replied to you', text: 'I usually start with the <em>next best action</em>, not an apology. A blank chart with a single “connect your data” button beats a sad illustration every time.' }) +
              commentBubble({ name: 'mo.builds', color: '#16a34a', meta: '3 upvotes', bg: '#eef7f0', text: 'Seconding this. Also show a faded sample so people know what “full” looks like.' }) +
              `<div style="margin-top:14px">${button('Reply in thread', `${COM}/t/empty-states`, '#d97706')}</div>`,
            '26px 30px 28px',
          ),
        ),
      },
    ],
  },
  // S10 Orbit digest
  {
    subject: 'You have 12 new notifications on Orbit',
    category: 'social',
    messages: [
      {
        from: 'b_orbit',
        ago: '44d',
        unsubscribe: true,
        html: mail(
          { pre: '5 likes, 4 new followers, 2 comments and a mention since you last visited.', bg: '#eceeff', foot: orbitFoot },
          brandBar({ name: 'Orbit', letter: 'O', color: '#6366f1', shape: 'circle', right: 'What you missed' }),
          sec(
            h('12 new notifications', { level: 2, size: 24, mb: 4 }) + p('Here’s what happened while you were away.', { color: '#6b7280' }) +
              statRow([
                { label: 'Likes', value: '5', color: '#ef4444' },
                { label: 'Followers', value: '4', color: '#6366f1' },
                { label: 'Comments', value: '2', color: '#0ea5e9' },
                { label: 'Mentions', value: '1', color: '#10b981' },
              ]) +
              `<div style="margin-top:16px">${barChart([2, 5, 1, 0, 3, 1, 0], { color: '#6366f1', labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], h: 90, w: 480 })}</div>` +
              `<div style="text-align:center;margin-top:20px">${button('Open Orbit', ORB, '#6366f1')}</div>`,
            '26px 30px 30px',
          ),
        ),
      },
    ],
  },
];

/* ==================================================================== */
/* UPDATES                                                               */
/* ==================================================================== */

const PAR = 'https://parcelly.example';
const TAN = 'https://tandembank.example';
const KES = 'https://kestrel.example';
const MEE = 'https://meetly.example';

const parcelly = (step: number, pre: string, title: string, sub: string, extra: string, right = 'PC 4471 9902 3316') =>
  mail(
    {
      pre,
      bg: '#fdf3e1',
      foot: footer('Parcelly Logistics, Inc.', '500 Freight Blvd, Depot 4, Memphis, TN 38118', { domain: 'parcelly.example', links: ['Delivery preferences'], reason: 'You’re receiving tracking updates for a package from Vesper Outfitters.' }),
    },
    brandBar({ name: 'Parcelly', letter: 'P', color: '#e08a00', right }),
    sec(
      eyebrow(step === 3 ? 'Delivered' : step === 2 ? 'Out for delivery' : step === 1 ? 'In transit' : 'Label created', '#b26a00') +
        h(title, { level: 2, size: 23, mb: 6 }) +
        p(sub, { color: '#5f6368' }) +
        `<div style="margin:22px 0 8px">${progressTracker(['Label created', 'In transit', 'Out for delivery', 'Delivered'], step, '#e08a00')}</div>` +
        extra,
      '26px 30px 28px',
    ),
  );

const parcelInfo = kv([
  ['From', 'Vesper Outfitters, Bellmoor OR'],
  ['Service', 'Parcelly Ground'],
  ['Weight', '3.4 lb (1.5 kg)'],
]);

const tandemFoot = footer('Tandem Bank, N.A.', '1 Ledger Square, Charlotte, NC 28202', {
  domain: 'tandembank.example',
  reason: 'Tandem will never ask for your PIN, password or one-time code by email.',
});

const tandemStatement = (period: string, open: string, inn: string, out: string, close: string, seed: number[]) =>
  mail(
    { pre: `Your ${period} statement for Everyday Checking ending 3390 is ready to view.`, bg: '#e6f1ee', foot: tandemFoot },
    brandBar({ name: 'Tandem Bank', letter: 'T', color: '#0e7c66', shape: 'square', dark: true, bg: '#0b3b33', right: 'Statement' }),
    sec(
      eyebrow('Everyday Checking &middot; ending 3390', '#0e7c66') +
        h(`Your ${period} statement is ready`, { level: 2, size: 23, mb: 8 }) +
        p('Your statement is available to view and download in online banking. A PDF copy is attached for your records.', { color: '#5f6368' }) +
        statRow([
          { label: 'Opening', value: open },
          { label: 'Money in', value: inn, color: '#0e7c66' },
          { label: 'Money out', value: out, color: '#b3261e' },
          { label: 'Closing', value: close },
        ]) +
        `<div style="margin:18px 0 6px;font-size:12px;color:${GREY}">Daily balance</div>${sparkline(seed, '#0e7c66', 520, 64)}` +
        `<div style="margin-top:20px">${buttons(button('View statement', `${TAN}/statements`, '#0e7c66'), button('Download PDF', `${TAN}/statements/download`, '#0e7c66', { ghost: true }))}</div>`,
      '26px 30px 28px',
    ),
  );

const kestrelHead = (right: string) => brandBar({ name: 'Kestrel', letter: 'K', color: '#2f3a4f', shape: 'squircle', right });
const kestrelFoot = (why: string) =>
  footer('Kestrel, Inc.', '1201 Perch Street, Suite 400, Denver, CO 80202', { domain: 'kestrel.example', reason: why, links: ['Notification settings'], align: 'left' });

const updates: SeedThread[] = [
  // U1 Parcelly progression (4 messages)
  {
    subject: 'Your Parcelly package from Vesper Outfitters',
    category: 'updates',
    messages: [
      {
        from: 'b_parcelly',
        ago: '3d 4h',
        html: parcelly(0, 'Vesper Outfitters created a shipping label. Your package will be handed to Parcelly shortly.', 'Your package is on its way to us', 'Vesper Outfitters has created a label for your order. We’ll update you as soon as we scan it.', parcelInfo),
      },
      {
        from: 'b_parcelly',
        ago: '2d 2h',
        html: parcelly(1, 'Departed the Bellmoor sort facility. Estimated delivery: the day after tomorrow.', 'In transit: departed Bellmoor facility', 'Your package left our Bellmoor hub and is moving through the network. Estimated delivery in 2 days.', parcelInfo + `<div style="margin-top:16px">${button('Track package', `${PAR}/track/PC447199023316`, '#e08a00')}</div>`),
      },
      {
        from: 'b_parcelly',
        ago: '3h 10m',
        unread: true,
        html: parcelly(2, 'Your package is out for delivery today. Estimated arrival 2:00 to 5:00 PM.', 'Out for delivery today', 'Your driver, Luis, is on the way. Estimated arrival between <strong>2:00 and 5:00 PM</strong>.', card(`${tbl()}<tr><td style="width:56px">${tile('#fde68a', '#f59e0b', '🚚', 46, { fs: 22, radius: 12 })}</td><td style="font-size:14px;color:#5f6368">Your package is <strong style="color:#111827">7 stops away</strong><div style="font-size:12.5px;color:${GREY}">Updated a few minutes ago</div></td></tr></table>`, { bg: '#fffaf0', border: '#f6dfae', m: '0 0 14px' }) + button('Live tracking', `${PAR}/track/PC447199023316/live`, '#e08a00')),
      },
      {
        from: 'b_parcelly',
        ago: '11m',
        unread: true,
        html: parcelly(3, 'Delivered: left at the front door. Photo proof of delivery attached below.', 'Your package was delivered', 'Left at your <strong>front door</strong>. If it’s not there, check with neighbours or around the side of the building.', `<div style="border-radius:16px;overflow:hidden;margin:0 0 14px">${tile('#5b6b8c', '#a9b8d4', '🚪📦', 150, { fs: 54, radius: 16 })}</div>` + kv([['Delivered', 'Today, 4:12 PM'], ['Left at', 'Front door'], ['Signed by', 'Not required']]) + `<div style="margin-top:16px">${buttons(button('Rate delivery', `${PAR}/rate`, '#e08a00'), button('Report a problem', `${PAR}/help`, '#e08a00', { ghost: true }))}</div>`),
      },
    ],
  },
  // U2 Fernwood order (2 messages)
  {
    subject: 'Your Fernwood order #FW-20418',
    category: 'updates',
    labels: ['receipts'],
    messages: [
      {
        from: 'b_fernwood',
        ago: '4d 6h',
        html: mail(
          {
            pre: 'Thanks for your order! 3 plants, packed with care and shipping soon.',
            bg: '#eaf3ec',
            foot: footer('Fernwood Plant Shop', '9 Greenhouse Road, Millbrook, NY 12545', { domain: 'fernwood.example', links: ['Care guides', 'Contact us'] }),
          },
          hero({ emoji: '🌿', title: 'Thank you, Jordan!', subtitle: 'Order #FW-20418 is confirmed. We’ll pack your plants with care.', from: '#2f855a', to: '#68b984', pad: '30px 32px' }),
          sec(
            receiptTable(
              [
                { name: 'Snake Plant &ldquo;Moonshine&rdquo;', sub: '6 in pot &middot; terracotta', qty: 1, price: '$38.00', thumb: ['#3f8f5f', '#a7e0bb', '🪴'] },
                { name: 'Pothos Hanging Basket', sub: '8 in', qty: 1, price: '$28.00', thumb: ['#15803d', '#86efac', '🌱'] },
                { name: 'Plant food, organic', sub: '250 ml', qty: 1, price: '$9.50', thumb: ['#a16207', '#fde68a', '🧴'] },
              ],
              { summary: [['Subtotal', '$75.50'], ['Shipping', 'Free'], ['Tax', '$4.53']], total: ['Total', '$80.03'], color: '#2f855a' },
            ) +
              divider('#e7efe9', '20px 0 14px') +
              kv([['Ship to', 'Jordan Hayes, 128 Alder Street, Apt 4B'], ['Payment', 'Card ending 4821'], ['Estimated delivery', 'in 4 to 6 days']], { size: 13.5 }) +
              `<div style="margin-top:18px">${button('View order', `${FER}/orders/FW-20418`, '#2f855a')}</div>`,
            '26px 30px 28px',
          ),
        ),
      },
      {
        from: 'b_fernwood',
        ago: '3d 20h',
        unread: true,
        html: mail(
          {
            pre: 'Your plants have left the greenhouse. Track your package with Parcelly.',
            bg: '#eaf3ec',
            foot: footer('Fernwood Plant Shop', '9 Greenhouse Road, Millbrook, NY 12545', { domain: 'fernwood.example', links: ['Care guides', 'Contact us'] }),
          },
          brandBar({ name: 'Fernwood', letter: 'F', color: '#2f855a', shape: 'circle', right: 'Order #FW-20418' }),
          sec(
            h('Your plants are on their way 🌱', { level: 2, size: 23, mb: 6 }) +
              p('Everything left the greenhouse this morning. Unpack them within a day, water lightly, and give them a bright spot.', { color: '#5f6368' }) +
              `<div style="margin:22px 0 10px">${progressTracker(['Confirmed', 'Packed', 'Shipped', 'Delivered'], 2, '#2f855a')}</div>` +
              kv([['Carrier', 'Parcelly Ground'], ['Tracking', codeChip('PC 8820 1145 7093')], ['Arrives', 'in 2 to 3 days']]) +
              `<div style="margin-top:18px">${button('Track package', `${PAR}/track/PC882011457093`, '#2f855a')}</div>`,
            '26px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U3 Pagewise order (archived receipt)
  {
    subject: 'Order confirmation #PB-88231',
    category: 'updates',
    labels: ['receipts'],
    archived: true,
    messages: [
      {
        from: 'b_pagewise',
        ago: '23d',
        html: mail(
          {
            pre: 'Your 3 books are being packed. Estimated delivery in 3 to 5 days.',
            bg: '#f7efe8',
            foot: footer('Pagewise Books Ltd.', '14 Bindery Lane, Norwich NR2 4LQ', { domain: 'pagewisebooks.example', links: ['Returns', 'Help'] }),
          },
          brandBar({ name: 'Pagewise', letter: 'P', color: '#b91c1c', shape: 'square', right: 'Order #PB-88231' }),
          sec(
            h('Thanks for your order, Jordan.', { level: 2, size: 22, mb: 6 }) + p('We’re packing your books now and will email you the moment they ship.', { color: '#5f6368' }) +
              receiptTable(
                [
                  { name: 'Grids &amp; Gutters', sub: 'Paperback &middot; Design classic', qty: 1, price: '$24.00', thumb: ['#166534', '#86efac', '📗'] },
                  { name: 'Small Rooms', sub: 'Paperback &middot; Theo Anand', qty: 1, price: '$15.50', thumb: ['#1e3a8a', '#93c5fd', '📘'] },
                  { name: 'The Quiet Machine', sub: 'Paperback &middot; Mara Ellison', qty: 1, price: '$16.00', thumb: ['#7f1d1d', '#fca5a5', '📕'] },
                ],
                { summary: [['Subtotal', '$55.50'], ['3-for-2 offer', '&minus;$15.50'], ['Shipping', '$3.99']], total: ['Total charged', '$43.99'], color: '#b91c1c' },
              ) +
              `<div style="margin-top:20px">${button('Track order', `${PAG}/orders/PB-88231`, '#b91c1c', { radius: 6 })}</div>`,
            '26px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U4 Tandem statement
  {
    subject: 'Your monthly statement is ready',
    category: 'updates',
    labels: ['finance'],
    messages: [
      {
        from: 'b_tandem',
        ago: '3d 9h',
        unread: true,
        files: [['statement.pdf', 410000]],
        html: tandemStatement('monthly', '$6,214.08', '$9,600.00', '$7,318.55', '$8,495.53', [6.2, 6.4, 5.9, 5.6, 8.9, 8.4, 8.1, 7.7, 7.9, 7.2, 12.4, 11.6, 10.9, 9.8, 9.4, 8.9, 8.5]),
      },
    ],
  },
  // U5 Tandem card alert
  {
    subject: 'Card purchase alert: $148.20 at Vesper Outfitters',
    category: 'updates',
    labels: ['finance'],
    messages: [
      {
        from: 'b_tandem',
        ago: '3d 6h',
        html: mail(
          { pre: 'A purchase of $148.20 was made with your debit card ending 4821. Not you? Freeze it now.', bg: '#e6f1ee', foot: tandemFoot },
          brandBar({ name: 'Tandem Bank', letter: 'T', color: '#0e7c66', shape: 'square', dark: true, bg: '#0b3b33', right: 'Card alert' }),
          sec(
            `<div style="text-align:center;margin-bottom:16px"><div style="font-size:12px;color:${GREY};text-transform:uppercase;letter-spacing:1px;font-weight:700">Purchase</div><div style="font-size:44px;font-weight:800;letter-spacing:-1.5px;color:#111827">$148.20</div><div style="font-size:15px;color:#3c4043">Vesper Outfitters</div></div>` +
              kv([['Card', 'Debit &middot; ending 4821'], ['Merchant', 'VESPEROUTFITTERS.EXAMPLE BELLMOOR OR'], ['Type', 'Online purchase'], ['Available balance', '$8,347.33']], { size: 13.5 }) +
              alert('info', 'Was this you? If you don’t recognise this purchase, freeze your card right away and we’ll help you sort it out.') +
              `<div style="text-align:center">${buttons(button('This was me', `${TAN}/alerts/confirm`, '#0e7c66'), button('Freeze card', `${TAN}/cards/freeze`, '#b3261e', { ghost: true }))}</div>`,
            '26px 30px 26px',
          ),
        ),
      },
    ],
  },
  // U6 Tandem deposit
  {
    subject: 'You received $4,800.00',
    category: 'updates',
    labels: ['finance'],
    messages: [
      {
        from: 'b_tandem',
        ago: '4d 20h',
        html: mail(
          { pre: 'A deposit from Ledgerly Payouts has been added to Everyday Checking ending 3390.', bg: '#e6f1ee', foot: tandemFoot },
          hero({ emoji: '💸', eyebrow: 'Deposit received', title: '+$4,800.00', subtitle: 'From Ledgerly Payouts &middot; reference INV-2041', from: '#0e7c66', to: '#37a98d', align: 'center', pad: '34px 30px' }),
          sec(
            kv([['To account', 'Everyday Checking &middot; ending 3390'], ['Method', 'ACH credit'], ['New balance', '$13,147.33']], { size: 14 }) +
              `<div style="margin-top:18px;text-align:center">${button('View transaction', `${TAN}/transactions`, '#0e7c66')}</div>`,
            '24px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U7 Kestrel PR review requested
  {
    subject: '[northlight/dashboard] Add empty states to Insights (PR #482)',
    category: 'updates',
    messages: [
      {
        from: 'b_kestrel',
        ago: '42m',
        unread: true,
        html: mail(
          { pre: 'priya-nair requested your review. +214 -38 across 6 files. All checks have passed.', bg: '#f4f5f7', foot: kestrelFoot('You are receiving this because your review was requested.') },
          kestrelHead('Pull request'),
          sec(
            `<div style="font-size:13px;color:#6b7280;margin-bottom:8px"><strong style="color:#111827">priya-nair</strong> requested your review on <strong style="color:#111827">northlight/dashboard</strong></div>` +
              h('Add empty states to Insights <span style="color:#8a919c;font-weight:400">#482</span>', { level: 2, size: 21, mb: 10 }) +
              `<div style="margin-bottom:14px">${badge('Open', '#1a7f37', true)} ${badge('Review requested', '#9a6700')} <span style="font-size:13px;color:#6b7280;margin-left:6px">${codeChip('feat/insights-empty-states')} &rarr; ${codeChip('main')}</span></div>` +
              p('Replaces the bare “No data yet” text with a faded sample chart and a single next-best-action button. Follows the spec Jordan shared in the design review.', { size: 14.5 }) +
              statRow([
                { label: 'Additions', value: '+214', color: '#1a7f37' },
                { label: 'Deletions', value: '&minus;38', color: '#cf222e' },
                { label: 'Files', value: '6' },
              ]) +
              `<div style="height:16px"></div>` +
              codeDiff('src/components/EmptyState.tsx', [
                [' ', 'export function EmptyState({ title, action }: Props) {'],
                ['-', '  return <p className="muted">No data yet</p>;'],
                ['+', '  return ('],
                ['+', '    <div className="empty" role="status">'],
                ['+', '      <SampleChart faded />'],
                ['+', '      <h3>{title}</h3>'],
                ['+', '      {action && <Button onClick={action.run}>{action.label}</Button>}'],
                ['+', '    </div>'],
                ['+', '  );'],
                [' ', '}'],
              ], 12) +
              statusList([['ok', 'CI / lint', '18s'], ['ok', 'CI / typecheck', '41s'], ['ok', 'CI / unit tests', '1m 12s']]) +
              buttons(button('Review changes', `${KES}/northlight/dashboard/pull/482/files`, '#2f3a4f', { radius: 8 }), button('Open pull request', `${KES}/northlight/dashboard/pull/482`, '#2f3a4f', { ghost: true, radius: 8 })),
            '24px 28px 26px',
          ),
        ),
      },
    ],
  },
  // U8 Kestrel CI failed
  {
    subject: '[northlight/dashboard] Run failed: CI - main (a3f9c21)',
    category: 'updates',
    messages: [
      {
        from: 'b_kestrel',
        ago: '1d 3h',
        html: mail(
          { pre: 'CI workflow run failed for main branch. 1 of 4 jobs failed: unit tests.', bg: '#f4f5f7', foot: kestrelFoot('You are receiving this because you are watching this repository.') },
          kestrelHead('Workflow run'),
          `<div style="background:#fff1f0;border-bottom:1px solid #ffd7d5;padding:16px 28px"><span style="display:inline-block;width:26px;height:26px;line-height:26px;border-radius:50%;background:#cf222e;color:#fff;font-weight:800;text-align:center;font-size:14px;vertical-align:middle">&#10005;</span> <span style="font-size:17px;font-weight:700;color:#82071e;vertical-align:middle;margin-left:6px">CI workflow run failed</span></div>`,
          sec(
            kv([['Repository', 'northlight/dashboard'], ['Branch', codeChip('main')], ['Commit', `${codeChip('a3f9c21')} Merge pull request #479`], ['Triggered by', 'kenji-w'], ['Duration', '2m 47s']], { size: 13.5, w: 28 }) +
              `<div style="height:14px"></div>` +
              statusList([['ok', 'lint', '18s'], ['ok', 'typecheck', '41s'], ['fail', 'unit-tests', '1m 46s'], ['skip', 'build', 'skipped']]) +
              logBlock([
                ['dim', '$ pnpm test --run'],
                ['ok', ' ✓ src/lib/format.test.ts (12 tests)'],
                ['ok', ' ✓ src/lib/dates.test.ts (9 tests)'],
                ['err', ' ✗ src/charts/Insights.test.tsx > renders empty state'],
                ['err', '   AssertionError: expected "No data yet" to equal "Connect your data"'],
                ['dim', '   at src/charts/Insights.test.tsx:58:31'],
                ['', ''],
                ['err', ' Tests  1 failed | 214 passed (215)'],
              ]) +
              buttons(button('View workflow run', `${KES}/northlight/dashboard/actions/runs/1931`, '#2f3a4f', { radius: 8 }), button('Re-run failed jobs', `${KES}/northlight/dashboard/actions/runs/1931/rerun`, '#2f3a4f', { ghost: true, radius: 8 })),
            '22px 28px 26px',
          ),
        ),
      },
    ],
  },
  // U9 Kestrel release
  {
    subject: '[kestrel-ui/kestrel-ui] Release v2.4.0 - Compact tables & dark tokens',
    category: 'updates',
    messages: [
      {
        from: 'b_kestrel',
        ago: '52d',
        html: mail(
          { pre: 'v2.4.0 adds compact table density, dark-mode tokens and 14 fixes.', bg: '#f4f5f7', foot: kestrelFoot('You are receiving this because you are watching releases for this repository.') },
          kestrelHead('New release'),
          sec(
            `<div style="font-size:13px;color:#6b7280;margin-bottom:8px">kestrel-ui/kestrel-ui</div>` +
              h(`v2.4.0 ${badge('Latest', '#1a7f37')}`, { level: 1, size: 28, mb: 4 }) +
              `<div style="font-size:13px;color:#6b7280;margin-bottom:16px">Released by <strong style="color:#111827">mbello</strong> &middot; 38 commits since v2.3.2</div>` +
              h('Highlights', { level: 3, mb: 6 }) +
              checkList(['<strong>Compact table density</strong> with a new <code style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px;background:#f1f3f4;padding:1px 5px;border-radius:4px">density="compact"</code> prop', 'Dark-mode design tokens for all 32 components', 'Focus rings now meet 3:1 contrast in every theme'], '#2f3a4f') +
              `<div style="height:8px"></div>` + h('Fixes', { level: 3, mb: 6 }) +
              `<ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#3c4043;line-height:1.7"><li>Select: stop closing when scrollbar is dragged (#1208)</li><li>Tooltip: respect reduced motion (#1211)</li><li>DatePicker: fix off-by-one on locale change (#1219)</li></ul>` +
              statusList([['ok', 'kestrel-ui-2.4.0.tgz', '412 KB'], ['ok', 'tokens.json', '18 KB'], ['ok', 'Source code (zip)', '2.1 MB']]) +
              button('View release', `${KES}/kestrel-ui/kestrel-ui/releases/tag/v2.4.0`, '#2f3a4f', { radius: 8 }),
            '24px 28px 28px',
          ),
        ),
      },
    ],
  },
  // U10 Kestrel new sign-in
  {
    subject: '[Kestrel] A new sign-in to your account',
    category: 'updates',
    messages: [
      {
        from: 'b_kestrel',
        ago: '3d 15h',
        html: mail(
          { pre: 'We noticed a sign-in from a new device: Chrome on macOS near Portland, OR.', bg: '#f4f5f7', foot: kestrelFoot('You are receiving this security notice because it affects your Kestrel account.') },
          kestrelHead('Security alert'),
          sec(
            `<div style="text-align:center;margin-bottom:14px"><div style="width:64px;margin:0 auto">${tile('#fde9c8', '#f6b96a', '🔐', 64, { fs: 30, radius: 32 })}</div></div>` +
              h('New sign-in to your account', { level: 2, size: 22, mb: 6, align: 'center' }) +
              p('Hi jordan-hayes, we noticed a sign-in from a device we haven’t seen before.', { align: 'center', color: '#5f6368' }) +
              card(kv([['Device', 'Chrome 128 on macOS'], ['Location', 'Portland, OR, US (approximate)'], ['IP address', '203.0.113.42'], ['Time', 'A few minutes ago']], { size: 13.5, w: 32 }), { bg: '#fafbfc', m: '0 0 16px' }) +
              alert('success', 'If this was you, there’s nothing more to do.') +
              `<div style="text-align:center">${buttons(button('Yes, this was me', `${KES}/security/confirm`, '#2f3a4f', { radius: 8 }), button('Secure my account', `${KES}/settings/security`, '#cf222e', { ghost: true, radius: 8 }))}</div>`,
            '26px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U11 Meetly invitation
  {
    subject: 'Invitation: Design crit: Insights empty states @ Tomorrow 2:30 PM',
    category: 'updates',
    messages: [
      {
        from: 'b_meetly',
        ago: '4h',
        unread: true,
        files: [['invite.ics', 1800]],
        html: mail(
          { pre: 'Marcus Chen invited you. Tomorrow, 2:30 to 3:15 PM. 5 guests.', bg: '#e6f4fb', foot: footer('Meetly Calendar', '19 Schedule Row, Suite 2, Chicago, IL 60601', { domain: 'meetly.example', reason: 'You’re receiving this invitation because you’re a guest on this event.', links: ['Forward this invitation'] }) },
          brandBar({ name: 'Meetly', letter: 'M', color: '#0ea5e9', shape: 'circle', right: 'Invitation' }),
          sec(
            `<div style="font-size:13px;color:#6b7280;margin-bottom:6px">Marcus Chen invited you to</div>` +
              h('Design crit: Insights empty states', { level: 2, size: 23, mb: 14 }) +
              eventCard({ title: 'Tomorrow', big: '2:30', small: 'PM', color: '#0ea5e9', lines: ['2:30 to 3:15 PM &middot; 45 min', '📹 Meetly Video, link below', '🔁 Does not repeat'] }) +
              `<div style="margin-bottom:16px">${button('Join with Meetly Video', `${MEE}/j/crit-empty-states`, '#0ea5e9')}<div style="font-size:12.5px;color:${GREY};margin-top:8px">meet.meetly.example/crit-empty-states</div></div>` +
              h('Guests', { level: 3, size: 14, mb: 8 }) +
              [['Marcus Chen', '#a142f4', 'Organizer'], ['Priya Nair', '#188038', ''], ['Elena Rossi', '#e8710a', ''], ['Jordan Hayes', '#1a73e8', 'You']]
                .map(([n, c, t], i) => listRow(avatar(n, c, 30), `<div style="font-size:14px;color:#111827;font-weight:600">${n}</div>`, t ? badge(t, '#0ea5e9') : '', i < 3))
                .join('') +
              divider('#e8eaed', '18px 0 14px') +
              `<div style="font-size:13px;color:#6b7280;margin-bottom:10px">Going?</div>` +
              buttons(button('Yes', `${MEE}/rsvp?yes`, '#0ea5e9', { small: true }), button('Maybe', `${MEE}/rsvp?maybe`, '#0ea5e9', { small: true, ghost: true }), button('No', `${MEE}/rsvp?no`, '#0ea5e9', { small: true, ghost: true })),
            '26px 30px 26px',
          ),
        ),
      },
    ],
  },
  // U12 Meetly updated invitation
  {
    subject: 'Updated invitation: Northlight weekly sync (time changed)',
    category: 'updates',
    messages: [
      {
        from: 'b_meetly',
        ago: '7d 4h',
        files: [['invite.ics', 1900]],
        html: mail(
          { pre: 'Sofia Lindqvist changed the time. New time: 2:30 PM. Repeats weekly.', bg: '#e6f4fb', foot: footer('Meetly Calendar', '19 Schedule Row, Suite 2, Chicago, IL 60601', { domain: 'meetly.example', reason: 'You’re receiving this because you’re a guest on this recurring event.' }) },
          brandBar({ name: 'Meetly', letter: 'M', color: '#0ea5e9', shape: 'circle', right: 'Updated invitation' }),
          sec(
            alert('warn', '<strong>Sofia Lindqvist</strong> changed the time of this event.') +
              h('Northlight weekly sync', { level: 2, size: 22, mb: 12 }) +
              kv([
                ['When', `<span style="text-decoration:line-through;color:${GREY};font-weight:400">2:00 to 2:45 PM</span><br><span style="color:#0369a1">2:30 to 3:15 PM</span>`],
                ['Repeats', 'Every week'],
                ['Where', 'Meetly Video &middot; Room 2'],
                ['Guests', '9 people'],
              ], { size: 14 }) +
              `<div style="margin-top:20px">${buttons(button('Accept', `${MEE}/rsvp?yes`, '#0ea5e9', { small: true }), button('Decline', `${MEE}/rsvp?no`, '#0ea5e9', { small: true, ghost: true }), button('View in Meetly', `${MEE}/e/weekly-sync`, '#0ea5e9', { small: true, ghost: true }))}</div>`,
            '24px 30px 26px',
          ),
        ),
      },
    ],
  },
  // U13 Notely password reset
  {
    subject: 'Reset your Notely password',
    category: 'updates',
    messages: [
      {
        from: 'b_notely',
        ago: '9d',
        html: mail(
          { pre: 'Use the link below within 60 minutes to choose a new password.', bg: '#f7f5ef', foot: footer('Notely Labs, Inc.', '2200 Harbour St, Floor 5, Portland, ME 04101', { domain: 'notely.example', reason: 'This is an automated security email. Please don’t reply.' }) },
          sec(
            `<div style="margin-bottom:18px">${brandBar({ name: 'Notely', letter: 'N', color: '#f5a300', shape: 'squircle', bg: 'transparent' }).replace('padding:15px 28px', 'padding:0')}</div>` +
              h('Reset your password', { level: 2, size: 24, mb: 8 }) +
              p('Hi Jordan, we received a request to reset the password for your Notely account. Click the button below to choose a new one.', { size: 15.5 }) +
              `<div style="margin:22px 0">${button('Reset password', `${NOT}/reset?token=8f2a91c0`, '#111827', { radius: 10 })}</div>` +
              small('This link expires in <strong>60 minutes</strong> and can only be used once.') +
              divider('#ece8dc', '18px 0') +
              small('If you didn’t ask for this, you can safely ignore this email; your password won’t change. If you keep getting these, <a href="https://notely.example/security" target="_blank" rel="noopener noreferrer" style="color:#b7791f">tell us</a>.', { mb: 0 }),
            '32px 34px 30px',
          ),
        ),
      },
    ],
  },
  // U14 Harbor+ renewal receipt
  {
    subject: 'Your Harbor+ subscription has renewed',
    category: 'updates',
    labels: ['receipts'],
    messages: [
      {
        from: 'b_harbor',
        ago: '10d',
        html: mail(
          { pre: 'Thanks for staying with us. $15.99 charged to your card ending 4821.', bg: '#e8edf8', foot: footer('Harbor+ Streaming LLC', '1200 Studio Blvd, Los Feliz, CA 90027', { domain: 'harborplus.example', links: ['Manage plan', 'Help'] }) },
          brandBar({ name: 'Harbor+', letter: 'H', color: '#3b82f6', shape: 'circle', dark: true, bg: '#0a1230', right: 'Receipt' }),
          sec(
            h('Your Harbor+ subscription renewed', { level: 2, size: 22, mb: 6 }) + p('Thanks for being a member. Here’s your receipt.', { color: '#5f6368' }) +
              receiptTable([{ name: 'Harbor+ Premium (no ads)', sub: 'Monthly &middot; renews in 30 days', price: '$15.99', thumb: ['#1e3a8a', '#60a5fa', '▶️'] }], { summary: [['Subtotal', '$15.99'], ['Tax', '$1.32']], total: ['Total', '$17.31'], color: '#1e3a8a' }) +
              divider('#e8ecf5', '20px 0 8px') +
              kv([['Payment method', 'Visa ending 4821'], ['Invoice', codeChip('HP-77120933')]], { size: 13.5 }) +
              `<div style="margin-top:18px">${button('Manage subscription', `${HAR}/account`, '#1e3a8a', { ghost: true })}</div>`,
            '26px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U15 Stratus renewal
  {
    subject: 'Your Stratus 2 TB plan renews in 3 days',
    category: 'updates',
    messages: [
      {
        from: 'b_stratus',
        ago: '41d',
        html: mail(
          { pre: 'You’re using 1.8 TB of 2 TB. Renewal: $9.99. Consider upgrading before you run out.', bg: '#e8f0fe', foot: footer('Stratus Storage Ltd.', '4 Nimbus Court, Reading RG1 3PS', { domain: 'stratusstorage.example', links: ['Manage plan'] }) },
          brandBar({ name: 'Stratus', letter: 'S', color: '#3b82f6', shape: 'circle', right: 'Plan renewal' }),
          sec(
            h('Your plan renews in 3 days', { level: 2, size: 22, mb: 6 }) + p('We’ll charge <strong>$9.99</strong> to your card ending 4821. No action needed.', { color: '#5f6368' }) +
              card(`<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:8px"><span style="font-weight:700;color:#111827">1.8 TB of 2 TB used</span><span style="color:#d97706;font-weight:700">90%</span></div><div style="height:10px;border-radius:6px;background:#e5e7eb"><div style="width:90%;height:10px;border-radius:6px;background:linear-gradient(90deg,#3b82f6,#8b5cf6)"></div></div><div style="font-size:12.5px;color:#6b7280;margin-top:10px">Photos 1.1 TB &middot; Documents 420 GB &middot; Backups 280 GB</div>`, { bg: '#f8fafc' }) +
              alert('warn', 'You’re close to your limit. Upgrade to <strong>5 TB</strong> for $19.99/month to keep backing up.') +
              buttons(button('Upgrade to 5 TB', 'https://stratusstorage.example/upgrade', '#3b82f6'), button('Manage plan', 'https://stratusstorage.example/plan', '#3b82f6', { ghost: true })),
            '26px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U16 Clearwater bill
  {
    subject: 'Your electricity bill is ready: $86.42 due in 12 days',
    category: 'updates',
    labels: ['finance'],
    messages: [
      {
        from: 'b_clearwater',
        ago: '3d 1h',
        files: [['bill-summary.pdf', 96000]],
        html: mail(
          { pre: 'Account 4471-2290. You used 412 kWh this cycle, 6% less than last cycle.', bg: '#e3f3f7', foot: footer('Clearwater Utilities Co.', '90 Waterworks Rd, Riverton, OH 43001', { domain: 'clearwaterutilities.example', links: ['Autopay', 'Outage map'] }) },
          brandBar({ name: 'Clearwater', letter: 'C', color: '#0891b2', shape: 'circle', right: 'Account 4471-2290' }),
          hero({ eyebrow: 'Amount due', title: '$86.42', subtitle: 'Due in 12 days &middot; autopay is off', from: '#0e7490', to: '#22b8cf', pad: '28px 30px' }),
          sec(
            statRow([{ label: 'Usage', value: '412', sub: 'kWh this cycle' }, { label: 'Vs last cycle', value: '&minus;6%', sub: '26 kWh less', color: '#188038' }, { label: 'Rate', value: '$0.17', sub: 'per kWh' }]) +
              `<div style="margin:18px 0 4px;font-size:12px;color:${GREY}">Last 6 cycles (kWh)</div>` + barChart([388, 402, 455, 470, 438, 412], { color: '#0891b2', labels: ['-5', '-4', '-3', '-2', '-1', 'Now'], hi: 5, h: 100 }) +
              divider('#e5eef1', '16px 0 8px') +
              kv([['Electricity charge', '$70.04'], ['Delivery', '$12.10'], ['Taxes &amp; fees', '$4.28'], ['Total due', '<span style="font-size:17px">$86.42</span>']], { size: 14 }) +
              `<div style="margin-top:20px">${buttons(button('Pay now', 'https://clearwaterutilities.example/pay', '#0891b2'), button('Set up autopay', 'https://clearwaterutilities.example/autopay', '#0891b2', { ghost: true }))}</div>`,
            '24px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U17 Marlow dental
  {
    subject: 'Reminder: your dental cleaning is tomorrow at 9:15 AM',
    category: 'updates',
    messages: [
      {
        from: 'b_marlow',
        ago: '13h',
        html: mail(
          { pre: 'Dr. Okonkwo, 44 Elm Court. Please arrive 10 minutes early. Reply C to confirm.', bg: '#e4f6f3', foot: footer('Marlow Family Dental', '44 Elm Court, Suite 1B, Marlow, CT 06070', { domain: 'marlowdental.example', reason: 'Appointment reminders are sent 24 hours before your visit.' }) },
          brandBar({ name: 'Marlow Family Dental', letter: 'M', color: '#14b8a6', shape: 'circle' }),
          sec(
            eyebrow('Appointment reminder', '#0f766e') + h('Your cleaning is tomorrow', { level: 2, size: 23, mb: 12 }) +
              eventCard({ title: 'Dental cleaning &amp; exam', big: '9:15', small: 'AM', color: '#14b8a6', lines: ['🦷 Dr. Amara Okonkwo', '📍 44 Elm Court, Suite 1B', '⏱ About 50 minutes'] }) +
              checkList(['Arrive 10 minutes early to update your forms', 'Bring your insurance card', 'Brush and floss as usual'], '#0f766e') +
              `<div style="margin-top:20px">${buttons(button('Confirm appointment', 'https://marlowdental.example/confirm', '#14b8a6'), button('Reschedule', 'https://marlowdental.example/reschedule', '#14b8a6', { ghost: true }))}</div>` +
              small('Need to cancel? Please call (860) 555-0142 at least 24 hours ahead to avoid a $40 late fee.', { mb: 0 }),
            '26px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U18 Alder Health
  {
    subject: 'A new test result is available in your Alder portal',
    category: 'updates',
    messages: [
      {
        from: 'b_alder',
        ago: '30d',
        html: mail(
          { pre: 'For your privacy, results aren’t included in email. Sign in to view.', bg: '#e6f1f8', foot: footer('Alder Health Partners', '350 Clinic Way, Building C, Madison, WI 53703', { domain: 'alderhealth.example', reason: 'This message contains no medical details. Please don’t reply.' }) },
          brandBar({ name: 'Alder Health', letter: 'A', color: '#0284c7', shape: 'squircle', right: 'Patient portal' }),
          sec(
            `<div style="text-align:center;margin-bottom:10px"><div style="width:60px;margin:0 auto">${tile('#e0f2fe', '#7dd3fc', '🧪', 60, { fs: 28, radius: 30 })}</div></div>` +
              h('You have a new test result', { level: 2, size: 22, mb: 8, align: 'center' }) +
              p('Dr. Ruiz has released a result from your recent visit. For your privacy, we don’t include results in email. Sign in to your portal to view it.', { align: 'center', color: '#5f6368' }) +
              `<div style="text-align:center;margin:20px 0">${button('View in portal', 'https://alderhealth.example/portal/results', '#0284c7')}</div>` +
              alert('info', 'Questions? You can message your care team securely from the portal. For urgent concerns, call the clinic directly.'),
            '30px 34px 26px',
          ),
        ),
      },
    ],
  },
  // U19 Pocket Store receipt (archived)
  {
    subject: 'Your receipt from Pocket Store',
    category: 'updates',
    labels: ['receipts'],
    archived: true,
    messages: [
      {
        from: 'b_pocket',
        ago: '16d',
        html: mail(
          { pre: 'Receipt for 2 items totalling $22.98. Order ID ML8QX2C4.', bg: '#f2f2f4', foot: footer('Pocket Store Services', '1 Orchard Loop, Cupertine, CA 95014', { domain: 'pocketstore.example', links: ['Report a problem'] }) },
          sec(
            `${tbl()}<tr><td><div style="font-size:24px;font-weight:700;letter-spacing:-.5px;color:#111827">Pocket Store</div><div style="font-size:13px;color:${GREY}">Receipt</div></td><td align="right">${logoMark('P', '#374151', 40, 'squircle')}</td></tr></table>` +
              divider('#e5e7eb', '16px 0 4px') +
              kv([['Order ID', 'ML8QX2C4'], ['Document no.', '190447215533'], ['Billed to', 'Visa &middot;&middot;&middot;&middot; 4821']], { size: 13, w: 34 }) +
              divider('#e5e7eb', '4px 0 8px') +
              receiptTable([
                { name: 'Sketchbook Pro', sub: 'Annual subscription &middot; renews in 12 months', price: '$19.99', thumb: ['#f97316', '#fdba74', '✏️'] },
                { name: 'Cloud Add-on 50 GB', sub: 'Monthly', price: '$0.99', thumb: ['#3b82f6', '#93c5fd', '☁️'] },
              ], { summary: [['Subtotal', '$20.98'], ['Tax', '$2.00']], total: ['Total', '$22.98'], color: '#111827' }) +
              small('If you didn’t make this purchase, open Pocket Store and tap “Report a Problem”.', { mb: 0 }),
            '28px 30px 26px',
          ),
        ),
      },
    ],
  },
  // U20 Zipp receipt
  {
    subject: 'Your ride with Amir: $14.20',
    category: 'updates',
    labels: ['receipts'],
    messages: [
      {
        from: 'b_zipp',
        ago: '12d 6h',
        html: mail(
          { pre: 'Thanks for riding, Jordan. 3.4 mi, 14 minutes, charged to Visa 4821.', bg: '#eceff1', foot: footer('Zipp Technologies, Inc.', '55 Commuter Lane, Suite 700, San Francisco, CA 94107', { domain: 'zipprides.example', links: ['Help', 'Lost item'] }) },
          brandBar({ name: 'zipp', letter: 'z', color: '#1f2937', shape: 'squircle', dark: true, bg: '#111827', right: 'Trip receipt' }),
          sec(
            `<div style="font-size:42px;font-weight:800;letter-spacing:-1.5px;color:#111827">$14.20</div><div style="font-size:13px;color:${GREY};margin-bottom:16px">Thanks for riding, Jordan</div>` +
              scene(520, 150, '<rect width="520" height="150" fill="#e9edf0"/><path d="M0 112L140 92L230 122L370 62L520 84" stroke="#fff" stroke-width="15" fill="none"/><path d="M70 0L96 150M300 0L268 150" stroke="#fff" stroke-width="9" fill="none"/><rect x="380" y="10" width="80" height="50" rx="8" fill="#d7e6d2"/><path d="M44 122C120 40 210 132 300 74S440 66 480 40" stroke="#111827" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="44" cy="122" r="8" fill="#111827"/><rect x="474" y="33" width="14" height="14" fill="#111827"/>', 'Route map') +
              `<div style="height:14px"></div>` +
              listRow('<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#111827"></span>', '<div style="font-size:14px;color:#111827">128 Alder Street</div><div style="font-size:12px;color:' + GREY + '">6:48 PM</div>', '', false) +
              listRow('<span style="display:inline-block;width:10px;height:10px;background:#111827"></span>', '<div style="font-size:14px;color:#111827">Eastgate Station</div><div style="font-size:12px;color:' + GREY + '">7:02 PM &middot; 14 min &middot; 3.4 mi</div>', '', false) +
              divider('#e5e7eb', '10px 0 6px') +
              kv([['Base fare', '$3.10'], ['Distance &amp; time', '$8.72'], ['Booking fee', '$1.50'], ['Tip for Amir', '$0.88']], { size: 13.5 }) +
              divider('#e5e7eb', '8px 0 12px') +
              `<div style="font-size:13px;color:#6b7280">Amir K. &middot; Toyota Prius &middot; <span style="color:#f59e0b">★★★★★</span></div>`,
            '26px 30px 26px',
          ),
        ),
      },
    ],
  },
  // U21 Swiftbite receipt (archived)
  {
    subject: 'Your Swiftbite order from Casa Verde',
    category: 'updates',
    labels: ['receipts'],
    archived: true,
    messages: [
      {
        from: 'b_swiftbite',
        ago: '18d',
        html: mail(
          { pre: 'Delivered in 24 minutes. Total $27.84. Enjoy your meal!', bg: '#fff1e6', foot: footer('Swiftbite Inc.', '88 Market Lane, Suite 12, Fairview, CA 94100', { domain: 'swiftbite.example', links: ['Help with this order'] }) },
          hero({ emoji: '🌮', title: 'Enjoy your meal, Jordan!', subtitle: 'Order from Casa Verde delivered in 24 minutes.', from: '#ff6b00', to: '#ff9a3c', pad: '26px 30px', angle: 100 }),
          sec(
            receiptTable(
              [
                { name: 'Al pastor tacos (3)', sub: 'Extra salsa verde', qty: 1, price: '$13.50', thumb: ['#65a30d', '#bef264', '🌮'] },
                { name: 'Elote cup', qty: 1, price: '$5.25', thumb: ['#f59e0b', '#fde68a', '🌽'] },
                { name: 'Horchata', qty: 2, price: '$6.00', thumb: ['#a16207', '#fef3c7', '🥛'] },
              ],
              { summary: [['Subtotal', '$24.75'], ['Delivery', '$1.99'], ['Service fee', '$1.10'], ['Tip', '$3.00'], ['Promo HUNGRY8', '&minus;$3.00']], total: ['Total', '$27.84'], color: '#ff6b00' },
            ) +
              small('Paid with Visa ending 4821 &middot; Order #SB-7719203', { mb: 0 }),
            '24px 30px 26px',
          ),
        ),
      },
    ],
  },
  // U22 Peakform weekly
  {
    subject: 'Your week in review: 3 runs, 14.2 km',
    category: 'updates',
    messages: [
      {
        from: 'b_peakform',
        ago: '6d 12h',
        html: mail(
          { pre: 'A 3-week streak! Your longest run was 6.1 km. Recovery looks good.', bg: '#fdecef', foot: footer('Peakform Fitness, Inc.', '640 Ridge Ave, Suite 4, Boulder, CO 80301', { domain: 'peakform.example', links: ['Notification settings'] }) },
          brandBar({ name: 'Peakform', letter: 'P', color: '#e11d48', shape: 'circle', right: 'Weekly recap' }),
          sec(
            `<div>${badge('🔥 3-week streak', '#e11d48')}</div>` + h('Your week: 14.2 km', { level: 1, size: 28, mb: 12 }) +
              statRow([{ label: 'Runs', value: '3' }, { label: 'Longest', value: '6.1 km', color: '#e11d48' }, { label: 'Avg pace', value: '5:41' }, { label: 'Recovery', value: '82%', color: '#188038' }]) +
              `<div style="margin:18px 0 4px;font-size:12px;color:${GREY}">Distance by day (km)</div>` + barChart([0, 4.1, 0, 6.1, 0, 4.0, 0], { color: '#e11d48', labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], h: 110, hi: 3 }) +
              `<div style="margin-top:18px">${button('See full breakdown', `${PEA}/week`, '#e11d48')}</div>`,
            '26px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U23 Loop task assigned
  {
    subject: 'Marcus Chen assigned you LOOP-214: Audit empty states',
    category: 'updates',
    messages: [
      {
        from: 'b_loop',
        ago: '5d',
        html: mail(
          { pre: 'Priority: High. Due in 4 days. Project: Insights redesign.', bg: '#efedff', foot: footer('Loop Software, Inc.', '900 Tenth St, Floor 3, San Francisco, CA 94103', { domain: 'loopapp.example', links: ['Notification settings'], reason: 'You’re receiving this because you were assigned a task.' }) },
          brandBar({ name: 'Loop', letter: 'L', color: '#6d5efc', shape: 'circle', right: 'Task assigned' }),
          sec(
            `<div style="font-size:13px;color:#6b7280;margin-bottom:10px">${avatar('Marcus Chen', '#a142f4', 22)} <strong style="color:#111827">Marcus Chen</strong> assigned you a task</div>` +
              card(`<div style="font-size:12px;color:${GREY};font-weight:600;margin-bottom:2px">LOOP-214 &middot; Insights redesign</div><div style="font-size:19px;font-weight:700;color:#111827;margin-bottom:10px">Audit empty states across the dashboard</div>${badge('High', '#d93025')} ${badge('In progress', '#6d5efc')} ${badge('Due in 4 days', '#b45309')}<div style="font-size:14px;color:#5f6368;margin-top:12px;line-height:1.55">List every screen that can render without data, screenshot it and note which have a next-best-action. Target: a shortlist of 8 to design first.</div>`, { accent: '#6d5efc', pad: '18px 20px' }) +
              `<div style="margin-top:6px">${buttons(button('Open task', `${LOO}/t/LOOP-214`, '#6d5efc'), button('Snooze', `${LOO}/t/LOOP-214/snooze`, '#6d5efc', { ghost: true }))}</div>`,
            '24px 30px 26px',
          ),
        ),
      },
    ],
  },
  // U24 Loop support ticket (4 messages)
  {
    subject: '[Loop Support #48213] Export to CSV drops custom fields',
    category: 'updates',
    messages: [
      {
        from: 'me',
        to: ['b_loopsupport'],
        ago: '5d 3h',
        md: `Hi Loop team,

When I export a board to CSV, all my custom fields (Effort, Design status) are missing. Only the default columns come through. It worked last month.

I’m on the Team plan and the workspace is "Northlight Insights". Screenshot of the export attached to the ticket form.

Thanks,
Jordan`,
      },
      {
        from: 'b_loopsupport',
        ago: '4d 20h',
        md: `Hi Jordan,

Thanks for reaching out, and sorry about the trouble. I’ve opened ticket **#48213** for this.

Two quick questions so I can reproduce it:

1. Are the custom fields of type *Select* or *Number*?
2. Did you export from the board view or from the list view?

In the meantime, exporting from the list view sometimes includes fields the board export skips.

Best,
Ines

--
Ines Marchetti
Loop Support · Response time: usually under 4 hours`,
      },
      {
        from: 'me',
        ago: '4d 6h',
        md: `Hi Ines,

Both are *Select* fields, and I exported from the board view. I just tried the list view as you suggested and that does include them, thanks. Would still love to have board export fixed since that’s what we use in reviews.

Jordan`,
      },
      {
        from: 'b_loopsupport',
        ago: '2d 5h',
        unread: true,
        md: `Hi Jordan,

Thanks, that helped a lot. I was able to reproduce it: board exports skip *Select* fields when a column is hidden. Our engineers have a fix queued for the next release, **ETA in about a week**.

Until then, unhide all columns before exporting and the board export will include everything. I’ll follow up on this ticket as soon as the fix ships.

Best,
Ines

--
Ines Marchetti
Loop Support · Response time: usually under 4 hours`,
      },
    ],
  },
  // U25 Pallet comment
  {
    subject: 'Marcus Chen commented on “Checkout flow v3”',
    category: 'updates',
    messages: [
      {
        from: 'b_pallet',
        ago: '60d',
        html: mail(
          { pre: '“Can we try the secondary action as a text link? The button competes with the primary.”', bg: '#ffeeea', foot: footer('Pallet Design, Inc.', '31 Vector Ave, Floor 2, New York, NY 10013', { domain: 'pallet.example', unsub: false, links: ['Notification settings'], reason: 'You’re receiving this because you own this file.' }) },
          brandBar({ name: 'Pallet', letter: 'P', color: '#ff5b3a', shape: 'squircle', right: 'New comment' }),
          sec(
            `<div style="font-size:13px;color:#6b7280;margin-bottom:12px"><strong style="color:#111827">Marcus Chen</strong> commented on <strong style="color:#111827">Checkout flow v3</strong> &middot; Frame 4 of 12</div>` +
              scene(520, 230, '<rect width="520" height="230" fill="#f1f3f6"/><rect x="60" y="20" width="400" height="190" rx="12" fill="#fff" stroke="#e2e6ea"/><rect x="84" y="42" width="140" height="12" rx="6" fill="#111827"/><rect x="84" y="70" width="230" height="8" rx="4" fill="#cbd2d9"/><rect x="84" y="90" width="190" height="8" rx="4" fill="#dde2e7"/><rect x="84" y="122" width="180" height="54" rx="8" fill="#f1f3f6"/><rect x="284" y="122" width="150" height="54" rx="8" fill="#f1f3f6"/><rect x="84" y="186" width="120" height="14" rx="7" fill="#ff5b3a"/><rect x="220" y="186" width="90" height="14" rx="7" fill="none" stroke="#9aa3ad"/><circle cx="318" cy="190" r="14" fill="#ff5b3a"/><text x="318" y="195" font-family="Arial,sans-serif" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">1</text>', 'Frame preview') +
              `<div style="height:14px"></div>` +
              commentBubble({ name: 'Marcus Chen', color: '#a142f4', meta: 'on Frame 4', bg: '#fff4f1', text: 'Can we try the secondary action as a text link? The outline button competes with the primary.' }) +
              buttons(button('Reply in Pallet', 'https://pallet.example/file/checkout-v3#c1', '#ff5b3a'), button('Open file', 'https://pallet.example/file/checkout-v3', '#ff5b3a', { ghost: true })),
            '24px 30px 26px',
          ),
        ),
      },
    ],
  },
  // U26 Ledgerly invoice viewed
  {
    subject: 'Larkspur Coffee just viewed invoice INV-2039',
    category: 'updates',
    messages: [
      {
        from: 'b_ledgerly',
        ago: '34d',
        html: mail(
          { pre: 'Viewed 2 minutes ago. Amount $1,250.00, due in 5 days.', bg: '#e8f4f2', foot: footer('Ledgerly Software Ltd.', '25 Counting House Lane, Leeds LS1 5AB', { domain: 'ledgerly.example', links: ['Notification settings'] }) },
          brandBar({ name: 'Ledgerly', letter: 'L', color: '#0f766e', shape: 'squircle', right: 'Invoice activity' }),
          sec(
            `<div style="text-align:center"><div style="width:56px;margin:0 auto 12px">${tile('#ccfbf1', '#5eead4', '👀', 56, { fs: 26, radius: 28 })}</div></div>` +
              h('Larkspur Coffee viewed your invoice', { level: 2, size: 22, mb: 4, align: 'center' }) + p('They opened it 2 minutes ago on a desktop browser.', { align: 'center', color: '#5f6368' }) +
              card(kv([['Invoice', 'INV-2039'], ['Amount', '$1,250.00'], ['Due', 'in 5 days'], ['Status', badge('Viewed', '#0f766e')]], { size: 14 }), { bg: '#f8fbfb', m: '0 0 18px' }) +
              `<div style="text-align:center">${button('Send a gentle reminder', `${LED}/invoices/INV-2039/remind`, '#0f766e')}</div>`,
            '28px 30px 28px',
          ),
        ),
      },
    ],
  },
  // U27 Kestrel security advisory
  {
    subject: '[northlight/dashboard] High severity: tinyparse < 3.1.4 (regex DoS)',
    category: 'updates',
    messages: [
      {
        from: 'b_kestrel',
        ago: '66d',
        html: mail(
          { pre: 'A dependency has a known vulnerability. An automated fix PR is available.', bg: '#f4f5f7', foot: kestrelFoot('You are receiving this because you have access to security alerts for this repository.') },
          kestrelHead('Security advisory'),
          sec(
            alert('danger', `<strong>High severity</strong> &middot; tinyparse &lt; 3.1.4 &middot; ${codeChip('CVE-2025-31877')}`) +
              h('Regular expression denial of service in tinyparse', { level: 2, size: 20, mb: 8 }) +
              p('A crafted input can cause catastrophic backtracking in <code style="font-family:ui-monospace,Menlo,monospace;font-size:13px">parse()</code>, blocking the event loop. Patched in <strong>3.1.4</strong>.', { size: 14.5 }) +
              codeDiff('package.json', [[' ', '  "dependencies": {'], ['-', '    "tinyparse": "^3.1.0",'], ['+', '    "tinyparse": "^3.1.4",'], [' ', '    "zod": "^3.23.8"'], [' ', '  }']], 22) +
              kv([['Affected', 'northlight/dashboard'], ['Path', 'package.json'], ['Fixed in', '3.1.4']], { size: 13.5, w: 26 }) +
              `<div style="margin-top:18px">${button('Review pull request #488', `${KES}/northlight/dashboard/pull/488`, '#2f3a4f', { radius: 8 })}</div>`,
            '24px 28px 28px',
          ),
        ),
      },
    ],
  },
  // U28 Tandem older statement (archived)
  {
    subject: 'Your monthly statement is ready',
    category: 'updates',
    labels: ['finance'],
    archived: true,
    messages: [
      {
        from: 'b_tandem',
        ago: '70d',
        files: [['statement.pdf', 388000]],
        html: tandemStatement('monthly', '$5,902.40', '$9,600.00', '$9,288.32', '$6,214.08', [5.9, 5.6, 5.2, 4.9, 9.2, 8.7, 8.3, 7.5, 7.1, 6.8, 6.5, 6.4, 6.3, 6.2]),
      },
    ],
  },
];

/* @@PRIMARY@@ */

export const threads: SeedThread[] = [...promotions];

// Referenced by later sections.
void [alert, avatar, avatarRow, barChart, codeChip, codeDiff, commentBubble, eventCard, itinerary, link, logBlock, qr, receiptTable, small, sparkline, statusList, strong, ticket, tint];
