import { escapeHtml } from "./format";

/** Mini markdown: blank-line paragraphs, "- " lists, **bold**, _italic_, [link](url), "> " quotes. */
export function md(src: string) {
  const blocks = src.trim().split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trimEnd());
      if (lines.every((l) => /^\s*- /.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*- /, ""))}</li>`).join("")}</ul>`;
      }
      if (lines.every((l) => /^\s*\d+\. /.test(l))) {
        return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+\. /, ""))}</li>`).join("")}</ol>`;
      }
      if (lines.every((l) => /^> ?/.test(l))) {
        return `<blockquote>${lines.map((l) => inline(l.replace(/^> ?/, ""))).join("<br>")}</blockquote>`;
      }
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

function inline(s: string) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|\s)_(.+?)_(?=\s|$|[.,!?])/g, "$1<i>$2</i>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

const FONT = "font-family:Helvetica,Arial,sans-serif";
const footerHtml = (brand: string, address: string) => `
  <div style="padding:22px 28px;text-align:center;font-size:11px;line-height:1.6;color:#80868b;background:#fafafa;border-top:1px solid #eee">
    You're receiving this email because you subscribed to updates from ${brand}.<br>
    <a href="https://example.com/preferences" style="color:#80868b">Email preferences</a> &nbsp;·&nbsp;
    <a href="https://example.com/unsubscribe" style="color:#80868b">Unsubscribe</a><br>${address}
  </div>`;

export interface PromoTile {
  title: string;
  sub: string;
  emoji: string;
  bg: string;
}

export function promo(o: {
  brand: string;
  color: string;
  kicker: string;
  headline: string;
  body: string;
  cta: string;
  hero: string;
  heroEmoji: string;
  tiles?: PromoTile[];
  code?: string;
  address?: string;
  dark?: boolean;
}) {
  const tiles = o.tiles
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:8px 20px 24px"><tr>${o.tiles
        .map(
          (t) => `<td style="padding:6px;vertical-align:top;width:${Math.floor(100 / o.tiles!.length)}%">
            <div style="background:${t.bg};border-radius:10px;height:110px;text-align:center;font-size:44px;line-height:110px">${t.emoji}</div>
            <div style="font-size:13px;font-weight:700;margin-top:10px;color:#202124">${t.title}</div>
            <div style="font-size:12px;color:#5f6368;margin-top:2px">${t.sub}</div></td>`,
        )
        .join("")}</tr></table>`
    : "";
  const code = o.code
    ? `<div style="margin:0 auto 26px;display:inline-block;border:2px dashed ${o.color};color:${o.color};padding:10px 18px;border-radius:8px;font-weight:700;letter-spacing:.15em">${o.code}</div>`
    : "";
  return `<div style="${FONT};max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ececec;border-radius:14px;overflow:hidden;color:#202124">
  <div data-skip style="padding:18px 28px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f1f1">
    <span style="font-weight:800;font-size:17px;letter-spacing:.02em;color:${o.color}">${o.brand}</span>
    <span style="font-size:11px;color:#80868b"><a href="https://example.com/view" style="color:#80868b">View in browser</a></span>
  </div>
  <div style="background:${o.hero};padding:44px 28px 38px;text-align:center;color:${o.dark ? "#fff" : "#202124"}">
    <div data-skip style="font-size:64px;line-height:1">${o.heroEmoji}</div>
    <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;margin-top:18px;opacity:.8">${o.kicker}</div>
    <div style="font-size:30px;line-height:1.15;font-weight:800;margin:10px auto 12px;max-width:460px">${o.headline}</div>
    <div style="font-size:15px;line-height:1.6;max-width:440px;margin:0 auto;opacity:.85">${o.body}</div>
  </div>
  <div style="text-align:center;padding:26px 28px 6px">${code}<br>
    <a href="https://example.com/shop" style="display:inline-block;background:${o.color};color:#fff;padding:13px 30px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none">${o.cta}</a>
  </div>
  ${tiles}
  ${footerHtml(o.brand, o.address ?? "")}
</div>`;
}

export function notice(o: {
  brand: string;
  color: string;
  icon: string;
  title: string;
  body: string;
  cta?: string;
  meta?: string;
}) {
  return `<div style="${FONT};max-width:560px;margin:0 auto;color:#202124">
  <div style="display:flex;align-items:center;gap:10px;padding:8px 0 18px">
    <div data-skip style="width:34px;height:34px;border-radius:9px;background:${o.color};color:#fff;font-size:18px;text-align:center;line-height:34px">${o.icon}</div>
    <div data-skip style="font-weight:700;font-size:16px">${o.brand}</div>
  </div>
  <div style="border:1px solid #e6e6e6;border-radius:12px;padding:26px 26px 22px;background:#fff">
    <div style="font-size:20px;font-weight:700;line-height:1.3;margin-bottom:12px">${o.title}</div>
    <div style="font-size:14px;line-height:1.65;color:#3c4043">${o.body}</div>
    ${
      o.cta
        ? `<div style="margin-top:22px"><a href="https://example.com/open" style="display:inline-block;background:${o.color};color:#fff;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">${o.cta}</a></div>`
        : ""
    }
  </div>
  <div style="font-size:11px;color:#80868b;line-height:1.6;padding:16px 4px">${o.meta ?? `This is an automated message from ${o.brand}. Please do not reply.`}</div>
</div>`;
}

export function receipt(o: {
  brand: string;
  color: string;
  title: string;
  intro: string;
  orderNo: string;
  items: { name: string; detail: string; qty: number; price: number }[];
  shipping?: number;
  tax?: number;
  footer?: string;
}) {
  const subtotal = o.items.reduce((s, i) => s + i.qty * i.price, 0);
  const total = subtotal + (o.shipping ?? 0) + (o.tax ?? 0);
  const money = (n: number) => `$${n.toFixed(2)}`;
  return `<div style="${FONT};max-width:580px;margin:0 auto;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;color:#202124;background:#fff">
  <div style="background:${o.color};color:#fff;padding:22px 28px">
    <div data-skip style="font-size:13px;opacity:.85;letter-spacing:.06em;text-transform:uppercase">${o.brand}</div>
    <div style="font-size:22px;font-weight:700;margin-top:6px">${o.title}</div>
  </div>
  <div style="padding:22px 28px">
    <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#3c4043">${o.intro}</p>
    <div style="font-size:12px;color:#5f6368;margin-bottom:10px">Order <b style="color:#202124">${o.orderNo}</b></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse">
      ${o.items
        .map(
          (i) => `<tr style="border-top:1px solid #f0f0f0">
          <td style="padding:12px 0"><div style="font-weight:600">${i.name}</div><div style="font-size:12px;color:#5f6368">${i.detail} · Qty ${i.qty}</div></td>
          <td style="padding:12px 0;text-align:right;white-space:nowrap">${money(i.qty * i.price)}</td></tr>`,
        )
        .join("")}
      <tr style="border-top:1px solid #f0f0f0"><td style="padding:10px 0 4px;color:#5f6368">Subtotal</td><td style="text-align:right;color:#5f6368">${money(subtotal)}</td></tr>
      ${o.shipping !== undefined ? `<tr><td style="padding:4px 0;color:#5f6368">Shipping</td><td style="text-align:right;color:#5f6368">${o.shipping ? money(o.shipping) : "Free"}</td></tr>` : ""}
      ${o.tax !== undefined ? `<tr><td style="padding:4px 0;color:#5f6368">Tax</td><td style="text-align:right;color:#5f6368">${money(o.tax)}</td></tr>` : ""}
      <tr style="border-top:2px solid #202124"><td style="padding:12px 0;font-weight:700">Total</td><td style="text-align:right;font-weight:700;font-size:16px">${money(total)}</td></tr>
    </table>
  </div>
  <div style="padding:16px 28px;font-size:12px;color:#80868b;background:#fafafa;border-top:1px solid #eee;line-height:1.6">${o.footer ?? "Questions? Reply to this email or visit our help center."}</div>
</div>`;
}

export function flight(o: {
  airline: string;
  color: string;
  confirmation: string;
  passenger: string;
  legs: { flight: string; date: string; from: string; fromCity: string; dep: string; to: string; toCity: string; arr: string; seat: string; cabin: string }[];
}) {
  return `<div style="${FONT};max-width:600px;margin:0 auto;color:#202124">
  <div style="background:${o.color};color:#fff;border-radius:14px 14px 0 0;padding:24px 28px">
    <div data-skip style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">${o.airline}</div>
    <div style="font-size:24px;font-weight:700;margin-top:8px">You're all set, ${o.passenger.split(" ")[0]}! ✈️</div>
    <div style="margin-top:14px;font-size:13px;opacity:.9">Confirmation code</div>
    <div style="font-size:28px;font-weight:800;letter-spacing:.18em">${o.confirmation}</div>
  </div>
  <div style="border:1px solid #e3e3e3;border-top:0;border-radius:0 0 14px 14px;background:#fff">
  ${o.legs
    .map(
      (l) => `<div style="padding:22px 28px;border-bottom:1px dashed #dadce0">
      <div style="font-size:12px;color:#5f6368;margin-bottom:12px">${l.date} · Flight ${l.flight} · ${l.cabin}</div>
      <table role="presentation" width="100%" style="border-collapse:collapse"><tr>
        <td style="width:38%"><div style="font-size:30px;font-weight:800">${l.from}</div><div style="font-size:12px;color:#5f6368">${l.fromCity}</div><div style="font-size:16px;font-weight:600;margin-top:4px">${l.dep}</div></td>
        <td style="text-align:center;color:#9aa0a6;font-size:22px">——✈——</td>
        <td style="width:38%;text-align:right"><div style="font-size:30px;font-weight:800">${l.to}</div><div style="font-size:12px;color:#5f6368">${l.toCity}</div><div style="font-size:16px;font-weight:600;margin-top:4px">${l.arr}</div></td>
      </tr></table>
      <div style="margin-top:12px;font-size:13px">Seat <b>${l.seat}</b> · Passenger <b>${o.passenger}</b></div>
    </div>`,
    )
    .join("")}
    <div style="padding:18px 28px;font-size:13px;line-height:1.6;color:#3c4043">Online check-in opens 24 hours before departure. Your e-ticket is attached to this email. Carry-on allowance: 1 bag + 1 personal item.</div>
  </div>
</div>`;
}

export function newsletter(o: {
  name: string;
  color: string;
  date: string;
  intro: string;
  stories: { tag: string; title: string; body: string }[];
}) {
  return `<div style="${FONT};max-width:620px;margin:0 auto;color:#202124;background:#fff;border:1px solid #ececec;border-radius:12px;overflow:hidden">
  <div style="padding:26px 30px 18px;border-bottom:3px solid ${o.color}">
    <div data-skip style="font-family:Georgia,serif;font-size:30px;font-weight:700;letter-spacing:-.01em">${o.name}</div>
    <div data-skip style="font-size:12px;color:#5f6368;margin-top:4px;text-transform:uppercase;letter-spacing:.1em">${o.date}</div>
  </div>
  <div style="padding:20px 30px 6px;font-size:15px;line-height:1.65;color:#3c4043">${o.intro}</div>
  ${o.stories
    .map(
      (s) => `<div style="padding:16px 30px;border-top:1px solid #f1f1f1">
      <div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:${o.color};text-transform:uppercase">${s.tag}</div>
      <div style="font-family:Georgia,serif;font-size:20px;font-weight:700;margin:6px 0 6px;line-height:1.3">${s.title}</div>
      <div style="font-size:14px;line-height:1.65;color:#3c4043">${s.body}</div></div>`,
    )
    .join("")}
  ${footerHtml(o.name, "")}
</div>`;
}
