export function p(...paras: string[]): string {
  return paras.map((x) => (x.startsWith('<') ? x : `<p>${x}</p>`)).join('');
}

export function ul(...items: string[]): string {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
}

export function ol(...items: string[]): string {
  return `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
}

export function sig(...lines: string[]): string {
  return `<p class="signature">${lines.join('<br>')}</p>`;
}

const FONT = 'font-family:Helvetica,Arial,sans-serif';

export function promo(o: {
  brand: string;
  color: string;
  headline: string;
  sub: string;
  cta: string;
  items?: Array<[string, string, string]>;
  footer?: string;
  dark?: boolean;
}): string {
  const items = o.items?.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse"><tr>${o.items
        .map(
          ([name, price, tint]) => `<td style="padding:10px;width:${Math.floor(100 / o.items!.length)}%;vertical-align:top">
            <div style="height:110px;border-radius:10px;background:${tint}"></div>
            <div style="font-size:13px;font-weight:700;margin-top:8px;color:#1f1f1f">${name}</div>
            <div style="font-size:13px;color:#5f6368">${price}</div></td>`,
        )
        .join('')}</tr></table>`
    : '';
  return `<div class="html-email" style="max-width:620px;margin:4px 0;background:#fff;border:1px solid #e8eaed;border-radius:14px;overflow:hidden;${FONT}">
  <div style="background:${o.color};color:${o.dark ? '#1f1f1f' : '#fff'};padding:30px 32px">
    <div style="font-size:12px;letter-spacing:2.5px;text-transform:uppercase;opacity:.85;font-weight:700">${o.brand}</div>
    <div style="font-size:30px;font-weight:800;line-height:1.12;margin-top:14px">${o.headline}</div>
    <div style="font-size:15px;margin-top:10px;opacity:.92;line-height:1.45">${o.sub}</div>
    <a href="#" style="display:inline-block;margin-top:20px;background:${o.dark ? '#1f1f1f' : '#fff'};color:${o.dark ? '#fff' : o.color};padding:11px 24px;border-radius:999px;font-weight:700;text-decoration:none;font-size:14px">${o.cta}</a>
  </div>
  ${items ? `<div style="padding:12px 22px">${items}</div>` : ''}
  <div style="padding:16px 32px;font-size:11px;color:#80868b;border-top:1px solid #eee;line-height:1.5">${o.footer ?? `You’re receiving this because you subscribed to ${o.brand} emails.`}<br><a href="#" style="color:#80868b">Unsubscribe</a> · <a href="#" style="color:#80868b">Preferences</a></div>
</div>`;
}

export function newsletter(o: { name: string; color: string; issue: string; intro: string; stories: Array<[string, string]> }): string {
  return `<div class="html-email" style="max-width:620px;margin:4px 0;background:#fff;border:1px solid #e8eaed;border-radius:14px;overflow:hidden;${FONT}">
  <div style="padding:26px 32px 18px;border-bottom:4px solid ${o.color}">
    <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#1f1f1f">${o.name}</div>
    <div style="font-size:12px;color:#5f6368;margin-top:6px;text-transform:uppercase;letter-spacing:1.5px">${o.issue}</div>
  </div>
  <div style="padding:22px 32px 6px;font-size:15px;line-height:1.6;color:#3c4043">${o.intro}</div>
  ${o.stories
    .map(
      ([h, b], i) => `<div style="padding:14px 32px;${i ? 'border-top:1px solid #f1f3f4' : ''}">
    <div style="font-size:17px;font-weight:700;color:#1f1f1f;line-height:1.3">${h}</div>
    <div style="font-size:14px;color:#5f6368;line-height:1.55;margin-top:4px">${b} <a href="#" style="color:${o.color};font-weight:700;text-decoration:none">Read more →</a></div></div>`,
    )
    .join('')}
  <div style="padding:18px 32px;font-size:11px;color:#80868b;border-top:1px solid #eee;margin-top:8px">You’re subscribed to ${o.name}. <a href="#" style="color:#80868b">Unsubscribe</a></div>
</div>`;
}

export function notice(o: { brand: string; color: string; title: string; lines: string[]; cta?: string; meta?: string; mono?: boolean }): string {
  return `<div class="html-email" style="max-width:620px;margin:4px 0;background:#fff;border:1px solid #e8eaed;border-radius:12px;overflow:hidden;${FONT}">
  <div style="padding:16px 28px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px">
    <span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:${o.color}"></span>
    <span style="font-weight:700;font-size:15px;color:#1f1f1f">${o.brand}</span>
  </div>
  <div style="padding:22px 28px">
    <div style="font-size:19px;font-weight:700;color:#1f1f1f;line-height:1.35">${o.title}</div>
    ${o.lines.map((l) => `<div style="font-size:14px;color:#3c4043;line-height:1.6;margin-top:10px;${o.mono ? 'font-family:ui-monospace,Menlo,monospace;font-size:13px' : ''}">${l}</div>`).join('')}
    ${o.cta ? `<a href="#" style="display:inline-block;margin-top:20px;background:${o.color};color:#fff;padding:10px 20px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px">${o.cta}</a>` : ''}
  </div>
  ${o.meta ? `<div style="padding:14px 28px;font-size:11px;color:#80868b;border-top:1px solid #eee;line-height:1.5">${o.meta}</div>` : ''}
</div>`;
}

export function itinerary(o: { code: string; from: [string, string]; to: [string, string]; date: string; depart: string; arrive: string; flight: string; seat: string }): string {
  return `<div class="html-email" style="max-width:620px;margin:4px 0;background:#fff;border:1px solid #e8eaed;border-radius:14px;overflow:hidden;${FONT}">
  <div style="background:#0f3057;color:#fff;padding:24px 30px">
    <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.8;font-weight:700">Skyway Airlines</div>
    <div style="font-size:24px;font-weight:700;margin-top:10px">You’re all set, Alex.</div>
    <div style="font-size:14px;opacity:.85;margin-top:4px">Confirmation code <b style="letter-spacing:2px">${o.code}</b></div>
  </div>
  <div style="padding:24px 30px">
    <table role="presentation" style="width:100%;border-collapse:collapse"><tr>
      <td style="width:40%"><div style="font-size:34px;font-weight:800;color:#0f3057">${o.from[0]}</div><div style="font-size:13px;color:#5f6368">${o.from[1]}</div><div style="font-size:15px;font-weight:700;margin-top:8px;color:#1f1f1f">${o.depart}</div></td>
      <td style="width:20%;text-align:center;color:#9aa0a6;font-size:22px">✈</td>
      <td style="width:40%;text-align:right"><div style="font-size:34px;font-weight:800;color:#0f3057">${o.to[0]}</div><div style="font-size:13px;color:#5f6368">${o.to[1]}</div><div style="font-size:15px;font-weight:700;margin-top:8px;color:#1f1f1f">${o.arrive}</div></td>
    </tr></table>
    <div style="margin-top:20px;padding:14px 16px;background:#f4f7fb;border-radius:10px;font-size:13px;color:#3c4043;line-height:1.7">
      <b>${o.date}</b> · Flight ${o.flight} · Seat ${o.seat} · Main Cabin<br>Checked bag: 1 included · Boarding group 3
    </div>
    <a href="#" style="display:inline-block;margin-top:18px;background:#0f3057;color:#fff;padding:10px 22px;border-radius:999px;font-weight:700;text-decoration:none;font-size:14px">Manage trip</a>
  </div>
  <div style="padding:14px 30px;font-size:11px;color:#80868b;border-top:1px solid #eee">Your e-ticket receipt is attached. Check-in opens 24 hours before departure.</div>
</div>`;
}
