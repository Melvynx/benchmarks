import type { Contact, SeedThread } from './types';

/*
 * Automated mail for Robin Hale: notifications, receipts, newsletters, promotions and junk.
 * Assumes "today" is a Tuesday in late September. Robin flies PDX → DEN next Wednesday for the
 * Juniper workshop (Wed/Thu), stays two nights and flies back Friday.
 */

export const AUTOMATED_CONTACTS: Record<string, Contact> = {};

/* ------------------------------------------------------------------ */
/* Rich HTML bodies                                                    */
/* ------------------------------------------------------------------ */

const HTML_FORGEHUB_PR = `<div style="background:#f6f8fa;padding:24px 12px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2328">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d0d7de;border-radius:6px;overflow:hidden">
<div style="background:#24292f;padding:14px 24px;color:#ffffff;font-size:16px;font-weight:bold">&#9670; Forgehub</div>
<div style="padding:24px">
<div style="font-size:13px;color:#59636e;margin-bottom:6px">fernbrook/atlas · Pull request #482</div>
<div style="font-size:20px;line-height:1.3;font-weight:bold;margin-bottom:12px">Color ramp tokens (OKLCH migration)</div>
<div style="font-size:14px;margin-bottom:18px"><span style="background:#1f883d;color:#ffffff;border-radius:12px;padding:3px 10px;font-size:12px;font-weight:bold">Open</span>&nbsp; <b>@marcus-bell</b> requested your review</div>
<div style="border:1px solid #d0d7de;border-radius:6px;padding:14px 16px;font-size:14px;line-height:1.55;margin-bottom:18px">Migrates every color ramp from hex to OKLCH tokens and regenerates the theme files. Most of the 312 changed files are mechanical renames.<br><br><b>Needs design eyes:</b> a few mid-tones shift visibly. Visual regression flags 41 snapshots, all in the blue and amber ramps.</div>
<table cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;border:1px solid #d0d7de">
<tr style="background:#f6f8fa;text-align:left"><th>Token</th><th>Before</th><th>After</th><th>ΔE</th></tr>
<tr style="border-top:1px solid #d0d7de;font-family:Menlo,Consolas,monospace"><td>blue-500</td><td>#3b6fe0</td><td>oklch(58% .17 262)</td><td>3.1</td></tr>
<tr style="border-top:1px solid #d0d7de;font-family:Menlo,Consolas,monospace"><td>amber-400</td><td>#f5b53d</td><td>oklch(80% .15 78)</td><td>2.4</td></tr>
<tr style="border-top:1px solid #d0d7de;font-family:Menlo,Consolas,monospace"><td>amber-500</td><td>#e09a1a</td><td>oklch(72% .16 70)</td><td>1.9</td></tr>
</table>
<div style="font-size:13px;color:#59636e;margin-bottom:22px"><b style="color:#1a7f37">+4,918</b> <b style="color:#d1242f">−4,730</b> · 312 files · 6 commits · Reviewers: @robinhale, @devon-price</div>
<a href="#" style="display:inline-block;background:#1f883d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:10px 18px;border-radius:6px">Review changes</a>
<a href="#" style="display:inline-block;color:#0969da;text-decoration:none;font-size:14px;padding:10px 12px">View on Forgehub</a>
</div>
<div style="padding:14px 24px;border-top:1px solid #d0d7de;font-size:12px;line-height:1.5;color:#59636e">You are receiving this because your review was requested. Reply to this email directly, or <a href="#" style="color:#0969da">unsubscribe</a> from this thread.</div>
</div>
</div>`;

const HTML_THE_MARGIN = `<div style="background:#f5f3ef;padding:28px 12px;font-family:Georgia,'Times New Roman',serif;color:#111827">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:#111827;color:#f9fafb;padding:28px 32px">
<div style="font-size:32px;letter-spacing:-0.5px">The Margin</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;margin-top:6px">Weekly · Issue 212 · Design, tech &amp; the space between</div>
</div>
<div style="padding:28px 32px">
<p style="margin:0 0 24px;font-size:17px;line-height:1.6;color:#374151;font-style:italic">This week: why your tokens deserve a changelog, the quiet tyranny of the infinite canvas, and what a hospital waiting room can teach a product team.</p>
<div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-bottom:22px">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#b45309;letter-spacing:1px;text-transform:uppercase">Essay · 7 min</div>
<div style="margin:6px 0 8px;font-size:23px;line-height:1.3">Design tokens are an API. Version them like one.</div>
<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4b5563">A renamed color can break more screens than a renamed endpoint. Hollis Grant on semver, deprecation windows and the migration nobody budgets for.</p>
<a href="#" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;font-weight:bold">Read the essay →</a>
</div>
<div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-bottom:22px">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#b45309;letter-spacing:1px;text-transform:uppercase">Essay · 9 min</div>
<div style="margin:6px 0 8px;font-size:23px;line-height:1.3">The case against the infinite canvas</div>
<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4b5563">Unlimited space feels like freedom until nobody can find the decision. Why the best teams are adding edges back.</p>
<a href="#" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;font-weight:bold">Read the essay →</a>
</div>
<div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-bottom:24px">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#b45309;letter-spacing:1px;text-transform:uppercase">Field notes · 6 min</div>
<div style="margin:6px 0 8px;font-size:23px;line-height:1.3">What the waiting room teaches us</div>
<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4b5563">Anxious people skim, re-read and second-guess. Designing for the worst reading conditions makes interfaces better for everyone.</p>
<a href="#" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;font-weight:bold">Read the essay →</a>
</div>
<div style="background:#f9fafb;padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.8;color:#374151"><b>Worth your time</b><br>· A field guide to empty states that don't apologize<br>· OKLCH makes accessible palettes boring (in a good way)<br>· The crit where everyone kills one idea</div>
</div>
<div style="padding:18px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#9ca3af;text-align:center">You're reading The Margin because you subscribed at themargin.news.<br><a href="#" style="color:#6b7280">Manage preferences</a> · <a href="#" style="color:#6b7280">Unsubscribe</a></div>
</div>
</div>`;

const HTML_JUNIPER_STATEMENT = `<div style="background:#eef5f4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #d5e5e3">
<div style="background:#0f766e;padding:18px 28px;color:#ffffff;font-size:18px"><b style="letter-spacing:1px">JUNIPER</b> BANK</div>
<div style="padding:28px">
<div style="font-size:22px;font-weight:bold;margin-bottom:8px">Your September statement is ready</div>
<p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#475569">Hi Robin, the statement for your Juniper Rewards card ending in 4417 is now available. A PDF copy is attached for your records.</p>
<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:22px">
<tr><td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#475569">New balance</td><td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;font-size:20px">$2,318.45</td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#475569">Minimum payment due</td><td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right">$35.00</td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#475569">Payment due</td><td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right">in 25 days</td></tr>
<tr><td style="padding:12px 0;color:#475569">Rewards earned this period</td><td style="padding:12px 0;text-align:right;color:#0f766e;font-weight:bold">+2,318 pts</td></tr>
</table>
<div style="background:#f0fdfa;border-left:4px solid #0f766e;padding:12px 14px;font-size:13px;line-height:1.5;color:#134e4a;margin-bottom:24px">Autopay is on. We'll pay the full statement balance from Checking •• 2208 on the due date — no action needed.</div>
<a href="#" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:6px">View statement</a>
</div>
<div style="background:#f8fafc;padding:16px 28px;font-size:11px;line-height:1.6;color:#94a3b8">Juniper Bank will never ask for your password, PIN or one-time code by email. Member FDIC.<br><a href="#" style="color:#64748b">Manage alerts</a> · <a href="#" style="color:#64748b">Paperless settings</a> · <a href="#" style="color:#64748b">Privacy</a></div>
</div>
</div>`;

const HTML_GREENBASKET_RECEIPT = `<div style="background:#f0fdf4;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#1f2937">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
<div style="background:#16a34a;padding:20px 28px;color:#ffffff"><div style="font-size:22px;font-weight:bold;letter-spacing:-0.5px">greenbasket</div><div style="font-size:13px;margin-top:2px;color:#dcfce7">Order #GB-48213 · Delivered Saturday</div></div>
<div style="padding:26px 28px">
<p style="margin:0 0 20px;font-size:15px;line-height:1.5">Thanks, Robin! Your shopper Luis left 3 bags at your front door at 5:38 PM. Here's your receipt.</p>
<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">
<tr style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280"><td style="padding-bottom:8px;border-bottom:2px solid #16a34a">Item</td><td style="padding-bottom:8px;border-bottom:2px solid #16a34a;text-align:center">Qty</td><td style="padding-bottom:8px;border-bottom:2px solid #16a34a;text-align:right">Price</td></tr>
<tr><td style="padding:9px 0">Honeycrisp apples, 3 lb</td><td style="text-align:center">1</td><td style="text-align:right">$6.99</td></tr>
<tr style="background:#f7fdf9"><td style="padding:9px 0">Pasture-raised eggs, dozen</td><td style="text-align:center">1</td><td style="text-align:right">$7.49</td></tr>
<tr><td style="padding:9px 0">Country sourdough loaf</td><td style="text-align:center">1</td><td style="text-align:right">$6.50</td></tr>
<tr style="background:#f7fdf9"><td style="padding:9px 0">Oat milk, 64 oz</td><td style="text-align:center">2</td><td style="text-align:right">$9.98</td></tr>
<tr><td style="padding:9px 0">Wild coho salmon, 1.2 lb</td><td style="text-align:center">1</td><td style="text-align:right">$17.99</td></tr>
<tr style="background:#f7fdf9"><td style="padding:9px 0">Baby spinach, 10 oz</td><td style="text-align:center">1</td><td style="text-align:right">$4.49</td></tr>
<tr><td colspan="2" style="padding:12px 0 4px;border-top:1px solid #e5e7eb;color:#6b7280">Subtotal</td><td style="padding:12px 0 4px;border-top:1px solid #e5e7eb;text-align:right">$53.44</td></tr>
<tr><td colspan="2" style="padding:4px 0;color:#6b7280">Delivery fee</td><td style="text-align:right">$3.99</td></tr>
<tr><td colspan="2" style="padding:4px 0 12px;color:#6b7280">Shopper tip</td><td style="text-align:right">$6.00</td></tr>
<tr style="font-weight:bold;font-size:16px"><td colspan="2" style="padding-top:12px;border-top:2px solid #1f2937">Total charged</td><td style="padding-top:12px;border-top:2px solid #1f2937;text-align:right">$63.43</td></tr>
</table>
<p style="margin:16px 0 22px;font-size:12px;color:#6b7280">Paid with Juniper Rewards card •• 4417</p>
<a href="#" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:11px 22px;border-radius:24px">Reorder these items</a>
</div>
<div style="padding:16px 28px;background:#f9fafb;font-size:11px;color:#9ca3af;text-align:center">Greenbasket · Fresh groceries, delivered in Portland<br><a href="#" style="color:#6b7280">Help with this order</a> · <a href="#" style="color:#6b7280">Email preferences</a></div>
</div>
</div>`;

const HTML_NORTHSTAR_ITINERARY = `<div style="background:#e8eef8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f1f3d">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden">
<div style="background:#0b3d91;padding:22px 28px;color:#ffffff"><div style="font-size:11px;letter-spacing:3px;color:#b8c9ea">NORTHSTAR AIR</div><div style="font-size:24px;font-weight:bold;margin-top:6px">You're all set, Robin.</div></div>
<div style="padding:24px 28px">
<table cellpadding="0" cellspacing="0" style="width:100%;font-size:12px;color:#64748b;margin-bottom:18px"><tr><td>CONFIRMATION<br><b style="font-size:22px;color:#0b3d91;letter-spacing:3px">7QK4ZP</b></td><td style="text-align:right">PASSENGER<br><b style="font-size:15px;color:#0f1f3d">Robin Hale</b><br>Miles # NS 3391 0472</td></tr></table>
<div style="border:1px solid #dbe3f0;border-radius:8px;padding:16px 18px;margin-bottom:12px">
<div style="font-size:12px;color:#64748b;margin-bottom:8px"><b style="color:#0b3d91">DEPART · WEDNESDAY</b> · NS 418 · Nonstop · 2h 27m</div>
<table cellpadding="0" cellspacing="0" style="width:100%;font-size:28px;font-weight:bold"><tr><td>PDX</td><td style="text-align:center;color:#94a3b8;font-size:22px">✈</td><td style="text-align:right">DEN</td></tr><tr style="font-size:13px;font-weight:normal;color:#475569"><td>8:05 AM</td><td style="text-align:center">Seat 14A</td><td style="text-align:right">11:32 AM</td></tr></table>
</div>
<div style="border:1px solid #dbe3f0;border-radius:8px;padding:16px 18px;margin-bottom:18px">
<div style="font-size:12px;color:#64748b;margin-bottom:8px"><b style="color:#0b3d91">RETURN · FRIDAY</b> · NS 1127 · Nonstop · 2h 43m</div>
<table cellpadding="0" cellspacing="0" style="width:100%;font-size:28px;font-weight:bold"><tr><td>DEN</td><td style="text-align:center;color:#94a3b8;font-size:22px">✈</td><td style="text-align:right">PDX</td></tr><tr style="font-size:13px;font-weight:normal;color:#475569"><td>10:15 AM</td><td style="text-align:center">Seat 12C</td><td style="text-align:right">11:58 AM</td></tr></table>
</div>
<p style="margin:0 0 14px;font-size:12px;color:#64748b">Main Cabin · 1 personal item + 1 carry-on included on both flights</p>
<table cellpadding="5" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:6px">
<tr><td style="color:#475569">Base fare</td><td style="text-align:right">$318.00</td></tr>
<tr><td style="color:#475569">Taxes, fees &amp; charges</td><td style="text-align:right">$46.30</td></tr>
<tr style="font-weight:bold"><td style="border-top:1px solid #dbe3f0">Total</td><td style="border-top:1px solid #dbe3f0;text-align:right">$364.30</td></tr>
</table>
<p style="margin:0 0 20px;font-size:12px;color:#64748b">Charged to Fernbrook corporate card •• 9031. Your e-ticket receipt is attached.</p>
<a href="#" style="display:inline-block;background:#0b3d91;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:11px 20px;border-radius:6px">Manage trip</a>
<a href="#" style="display:inline-block;color:#0b3d91;border:1px solid #0b3d91;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 18px;border-radius:6px;margin-left:8px">Add to calendar</a>
</div>
<div style="background:#f1f5fb;padding:16px 28px;font-size:11px;line-height:1.6;color:#8391a7">Check-in opens 24 hours before departure. <a href="#" style="color:#5b6b85">Manage email preferences</a> · <a href="#" style="color:#5b6b85">Unsubscribe from offers</a></div>
</div>
</div>`;

const HTML_HARBOR_PINE = `<div style="background:#f4f1ea;padding:28px 12px;font-family:Georgia,'Times New Roman',serif;color:#1c2b25">
<div style="max-width:600px;margin:0 auto;background:#fffdf8;border:1px solid #e4ddcc">
<div style="background:#1f4e3d;padding:28px 32px;text-align:center;color:#f4f1ea"><div style="font-size:24px;letter-spacing:5px">HARBOR &amp; PINE</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;margin-top:8px;color:#b9d3c7">DENVER · LODO</div></div>
<div style="padding:30px 32px">
<div style="font-size:24px;margin-bottom:8px">Your stay is confirmed</div>
<p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4b5b54">Dear Robin, we look forward to welcoming you to Denver. Your confirmation number is <b style="color:#1f4e3d">HP-DEN-58210</b>.</p>
<table cellpadding="0" cellspacing="0" style="width:100%;font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;margin-bottom:22px"><tr>
<td style="width:50%;padding:16px;background:#eef3ef;border-right:3px solid #fffdf8"><div style="font-size:11px;letter-spacing:1px;color:#5f7a6d">CHECK-IN</div><div style="font-size:19px;margin-top:4px">Wednesday</div><div style="font-size:12px;color:#5f7a6d">from 3:00 PM</div></td>
<td style="width:50%;padding:16px;background:#eef3ef"><div style="font-size:11px;letter-spacing:1px;color:#5f7a6d">CHECK-OUT</div><div style="font-size:19px;margin-top:4px">Friday</div><div style="font-size:12px;color:#5f7a6d">by 11:00 AM</div></td>
</tr></table>
<table cellpadding="6" cellspacing="0" style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:14px;border-collapse:collapse">
<tr><td style="color:#5f7a6d">Room</td><td style="text-align:right">Deluxe King, city view</td></tr>
<tr><td style="color:#5f7a6d">Guests</td><td style="text-align:right">1 adult</td></tr>
<tr><td style="color:#5f7a6d">2 nights × $229.00</td><td style="text-align:right">$458.00</td></tr>
<tr><td style="color:#5f7a6d">Taxes &amp; fees (15.75%)</td><td style="text-align:right">$72.14</td></tr>
<tr style="font-weight:bold"><td style="border-top:1px solid #d9d2c0">Estimated total</td><td style="border-top:1px solid #d9d2c0;text-align:right">$530.14</td></tr>
</table>
<p style="margin:18px 0 26px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#4b5b54">Guaranteed with Fernbrook corporate card •• 9031. Free cancellation until 6 PM the day before arrival. Arriving early? Leave your bags with us and we'll text you when your room is ready.</p>
<div style="text-align:center"><a href="#" style="display:inline-block;background:#1f4e3d;color:#fffdf8;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:1px;padding:13px 26px">MANAGE RESERVATION</a></div>
</div>
<div style="border-top:1px solid #e4ddcc;padding:18px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#8a948f;text-align:center">Harbor &amp; Pine Denver LoDo · 1735 Wynkoop St, Denver, CO 80202 · +1 303-555-0162<br><a href="#" style="color:#5f7a6d">Manage preferences</a> · <a href="#" style="color:#5f7a6d">Unsubscribe from offers</a></div>
</div>
</div>`;

const HTML_RYDR_RECEIPT = `<div style="background:#f2f2f2;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#111111">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:#111111;padding:22px 28px;color:#ffffff"><span style="font-size:24px;font-weight:bold;letter-spacing:-1px">Rydr</span><span style="float:right;font-size:13px;color:#bdbdbd;line-height:30px">Business · Tuesday morning</span></div>
<div style="padding:28px">
<div style="font-size:13px;color:#6b6b6b">Total</div>
<div style="font-size:44px;font-weight:bold;letter-spacing:-1px;margin:2px 0 6px">$38.72</div>
<div style="font-size:14px;color:#6b6b6b;margin-bottom:26px">Thanks for riding with Dmitri, Robin.</div>
<table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin-bottom:24px">
<tr><td style="width:22px;vertical-align:top;padding-top:5px"><div style="width:9px;height:9px;background:#111111;border-radius:50%"></div></td><td style="padding-bottom:16px"><b>5:41 AM</b><br><span style="color:#6b6b6b">SE Clinton St, Portland, OR</span></td></tr>
<tr><td style="vertical-align:top;padding-top:5px"><div style="width:9px;height:9px;background:#111111"></div></td><td><b>6:07 AM</b><br><span style="color:#6b6b6b">Portland International Airport (PDX), Departures</span></td></tr>
</table>
<table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-top:1px solid #e5e5e5">
<tr><td style="padding:12px 0 6px">Trip fare · 14.2 mi, 26 min</td><td style="text-align:right;padding-top:6px">$29.84</td></tr>
<tr><td style="padding:6px 0">Airport surcharge</td><td style="text-align:right">$2.50</td></tr>
<tr><td style="padding:6px 0">Booking fee</td><td style="text-align:right">$1.38</td></tr>
<tr><td style="padding:6px 0 12px">Tip</td><td style="text-align:right">$5.00</td></tr>
<tr style="font-weight:bold"><td style="padding-top:12px;border-top:2px solid #111111">Charged to card •• 9031</td><td style="padding-top:12px;border-top:2px solid #111111;text-align:right">$38.72</td></tr>
</table>
<div style="margin-top:26px"><a href="#" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 20px;border-radius:8px">Download PDF</a> <a href="#" style="display:inline-block;background:#eeeeee;color:#111111;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 20px;border-radius:8px;margin-left:6px">Report an issue</a></div>
</div>
<div style="padding:18px 28px;border-top:1px solid #eeeeee;font-size:11px;line-height:1.6;color:#8a8a8a">Expensed to Fernbrook via your Business profile. Rydr Technologies, Inc.<br><a href="#" style="color:#6b6b6b">Receipt settings</a> · <a href="#" style="color:#6b6b6b">Unsubscribe from promotions</a></div>
</div>
</div>`;

const HTML_LINKWELL_SEARCHES = `<div style="background:#f3f2ef;padding:24px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1d2226">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden">
<div style="background:#0a66c2;padding:14px 24px;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:-0.5px">linkwell</div>
<div style="padding:32px 24px 20px;text-align:center">
<div style="font-size:60px;font-weight:bold;color:#0a66c2;line-height:1">12</div>
<div style="font-size:19px;font-weight:bold;margin:10px 0 4px">You appeared in 12 searches this week</div>
<div style="font-size:14px;color:#666666">Up 50% from last week · Robin Hale, Design Lead at Fernbrook</div>
</div>
<div style="padding:8px 28px 4px">
<div style="font-size:12px;font-weight:bold;color:#666666;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Where your searchers work</div>
<table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px">
<tr><td style="padding:7px 0;width:45%">Healthcare technology</td><td style="padding:7px 10px"><div style="background:#0a66c2;height:8px;width:100%;border-radius:4px"></div></td><td style="width:24px;text-align:right;font-weight:bold">5</td></tr>
<tr><td style="padding:7px 0">Financial services</td><td style="padding:7px 10px"><div style="background:#378fe9;height:8px;width:80%;border-radius:4px"></div></td><td style="text-align:right;font-weight:bold">4</td></tr>
<tr><td style="padding:7px 0">Design &amp; consulting</td><td style="padding:7px 10px"><div style="background:#70b5f9;height:8px;width:60%;border-radius:4px"></div></td><td style="text-align:right;font-weight:bold">3</td></tr>
</table>
<div style="font-size:12px;font-weight:bold;color:#666666;text-transform:uppercase;letter-spacing:1px;margin:22px 0 10px">What they searched for</div>
<div><span style="display:inline-block;border:1px solid #0a66c2;color:#0a66c2;border-radius:14px;padding:4px 12px;font-size:13px;margin:0 6px 6px 0">design systems</span><span style="display:inline-block;border:1px solid #0a66c2;color:#0a66c2;border-radius:14px;padding:4px 12px;font-size:13px;margin:0 6px 6px 0">healthcare UX</span><span style="display:inline-block;border:1px solid #0a66c2;color:#0a66c2;border-radius:14px;padding:4px 12px;font-size:13px;margin:0 6px 6px 0">design lead Portland</span></div>
</div>
<div style="padding:22px 24px 30px;text-align:center"><a href="#" style="display:inline-block;background:#0a66c2;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:11px 26px;border-radius:24px">See all searches</a></div>
<div style="background:#f3f2ef;padding:16px 24px;font-size:11px;line-height:1.6;color:#86888a;text-align:center">This email was intended for Robin Hale (Design Lead at Fernbrook). <a href="#" style="color:#666666">Learn why we included this</a>.<br><a href="#" style="color:#666666">Unsubscribe</a> · <a href="#" style="color:#666666">Help</a></div>
</div>
</div>`;

const HTML_STRIDERS_DIGEST = `<div style="background:#fff1f2;padding:24px 12px;font-family:'Trebuchet MS',Arial,sans-serif;color:#1f1f1f">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden">
<div style="background:#be123c;padding:22px 28px;color:#ffffff"><div style="font-size:12px;letter-spacing:3px;color:#fecdd3">WEEKLY DIGEST</div><div style="font-size:26px;font-weight:bold;margin-top:4px">Rose City Striders</div></div>
<div style="padding:24px 28px">
<div style="font-size:16px;font-weight:bold;color:#be123c;margin-bottom:10px">This week's runs</div>
<table cellpadding="10" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
<tr style="background:#fff1f2"><td style="font-weight:bold;width:90px">Wed 6:30 PM</td><td><b>Tempo run</b> · 5 mi with 3 at tempo<br><span style="color:#6b7280">Laurelhurst Park, stairs by the pond</span></td></tr>
<tr><td style="font-weight:bold">Sat 8:00 AM</td><td><b>Long run</b> · 10–14 mi, three pace groups<br><span style="color:#6b7280">Forest Park, Leif Erikson trailhead</span></td></tr>
<tr style="background:#fff1f2"><td style="font-weight:bold">Sun 7:30 AM</td><td><b>Race day: Fall Classic 10K</b> · volunteers check in by 6:45<br><span style="color:#6b7280">Sellwood Riverfront Park</span></td></tr>
</table>
<div style="font-size:16px;font-weight:bold;color:#be123c;margin-bottom:8px">Club news</div>
<p style="margin:0 0 8px;font-size:14px;line-height:1.6">🏅 Huge congrats to <b>Owen Pryce</b> — 1:31:08 at the Bridges Half, a four-minute PR.</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6">📋 Fall Classic: a record 340 runners, 38 of them Striders. Registration closes Friday; bib pickup is at the Saturday long run. Water Station 2 volunteers: Marisol will email details.</p>
<div style="font-size:16px;font-weight:bold;color:#be123c;margin-bottom:8px">Mileage leaderboard</div>
<table cellpadding="6" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:24px">
<tr><td style="width:24px;color:#9ca3af">1</td><td>Owen Pryce</td><td style="text-align:right;font-weight:bold">42.6 mi</td></tr>
<tr><td style="color:#9ca3af">2</td><td>Dani Okoro</td><td style="text-align:right;font-weight:bold">38.9 mi</td></tr>
<tr><td style="color:#9ca3af">3</td><td>Mei Lin</td><td style="text-align:right;font-weight:bold">33.0 mi</td></tr>
<tr style="background:#fff1f2"><td style="color:#be123c;font-weight:bold">17</td><td style="font-weight:bold">You</td><td style="text-align:right;font-weight:bold">14.2 mi</td></tr>
</table>
<div style="text-align:center"><a href="#" style="display:inline-block;background:#be123c;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:30px">RSVP for Wednesday</a></div>
</div>
<div style="background:#fafafa;padding:16px 28px;font-size:11px;line-height:1.6;color:#9ca3af;text-align:center">You're receiving this because you're a member of Rose City Striders.<br><a href="#" style="color:#6b7280">Email preferences</a> · <a href="#" style="color:#6b7280">Unsubscribe</a></div>
</div>
</div>`;

const HTML_DAYBREAK = `<div style="background:#fffbeb;padding:24px 12px;font-family:Verdana,Geneva,sans-serif;color:#292524">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #fde68a">
<div style="background:#f59e0b;padding:24px 28px;color:#1c1917"><div style="font-size:28px;font-weight:bold">☀ Daybreak</div><div style="font-size:13px;margin-top:4px">Tuesday edition · 5-minute read</div></div>
<div style="background:#fef3c7;padding:10px 28px;font-size:13px;color:#78350f">Portland: 64° and cloudy · Rain returns Thursday</div>
<div style="padding:24px 28px">
<p style="margin:0 0 20px;font-size:15px;line-height:1.6">Good morning. Here's what matters today, and one thing that doesn't but will make you smile.</p>
<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#d97706">WORK</div><div style="font-size:18px;font-weight:bold;margin:4px 0 6px">The four-day week goes mainstream</div><div style="font-size:14px;line-height:1.6;color:#57534e">A survey of 2,000 mid-sized companies found one in five now runs a compressed schedule, up from one in twelve two years ago. Most say output held steady.</div></div>
<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#d97706">TECH</div><div style="font-size:18px;font-weight:bold;margin:4px 0 6px">Passwords are losing the race</div><div style="font-size:14px;line-height:1.6;color:#57534e">Three large email providers say passkey sign-ins now outnumber passwords on mobile. Your next security prompt probably won't ask you to type anything.</div></div>
<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#d97706">PORTLAND</div><div style="font-size:18px;font-weight:bold;margin:4px 0 6px">The Eastside Greenway opens Saturday</div><div style="font-size:14px;line-height:1.6;color:#57534e">Seven miles of car-light streets now link SE Division to NE Sandy. Expect a bike parade at 10 AM and a lot of bells.</div></div>
<div style="background:#fffbeb;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.6;margin-bottom:24px"><b>One more thing:</b> a library on the coast now lends fishing rods. The waitlist is 43 people long.</div>
<div style="text-align:center"><a href="#" style="display:inline-block;background:#1c1917;color:#fbbf24;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:24px">Read the full edition</a></div>
</div>
<div style="padding:16px 28px;font-size:11px;line-height:1.6;color:#a8a29e;text-align:center">Daybreak is free and reader-supported.<br><a href="#" style="color:#78716c">Update preferences</a> · <a href="#" style="color:#78716c">Unsubscribe</a></div>
</div>
</div>`;

const HTML_EMBER = `<div style="background:#faf5f0;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;color:#3b1d0e">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:#9a3412;padding:26px 28px;text-align:center;color:#ffedd5"><div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:4px">EMBER COFFEE ROASTERS</div><div style="font-size:26px;margin-top:8px">Your next bag ships Friday</div></div>
<div style="padding:28px">
<table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #f1e3d6;margin-bottom:26px"><tr>
<td style="width:90px;background:#3b1d0e;color:#fdba74;text-align:center;font-size:30px;padding:18px 0">☕</td>
<td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif"><div style="font-size:16px;font-weight:bold">Hearthstone Blend</div><div style="font-size:13px;color:#7c5a46;margin:3px 0">12 oz · Whole bean · Chocolate, hazelnut, orange peel</div><div style="font-size:14px;font-weight:bold">$19.50</div></td>
</tr></table>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:#9a3412;margin-bottom:6px">NEW HARVEST JUST LANDED</div>
<div style="font-size:24px;margin-bottom:8px">Huila, Colombia</div>
<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#57392a">Washed, grown at 1,800 m by the Rojas family. Bright and juicy: red apple, panela and cocoa nib. Only 90 bags this season.</p>
<p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold">$21.00 · 12 oz</p>
<a href="#" style="display:inline-block;background:#9a3412;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:4px">Swap my next bag</a>
<a href="#" style="display:inline-block;color:#9a3412;text-decoration:underline;font-family:Arial,Helvetica,sans-serif;font-size:14px;padding:12px 14px">Skip this delivery</a>
</div>
<div style="border-top:1px solid #f1e3d6;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#a8907f;text-align:center">You're subscribed: 1 bag every 2 weeks.<br><a href="#" style="color:#7c5a46">Manage subscription</a> · <a href="#" style="color:#7c5a46">Unsubscribe from marketing</a></div>
</div>
</div>`;

const HTML_GREENBASKET_PROMO = `<div style="background:#ecfdf5;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#064e3b">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
<div style="background:#16a34a;padding:18px 28px;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:-0.5px">greenbasket</div>
<div style="padding:32px 28px 12px;text-align:center">
<div style="font-size:15px;color:#047857">Thanks for your order, Robin. Here's a little something.</div>
<div style="font-size:44px;font-weight:bold;margin:10px 0 4px;color:#14532d">$15 off</div>
<div style="font-size:15px;color:#374151">your next order of $60 or more</div>
<div style="display:inline-block;border:2px dashed #16a34a;border-radius:10px;padding:12px 26px;margin:22px 0 8px;font-family:'Courier New',monospace;font-size:24px;font-weight:bold;letter-spacing:4px;color:#15803d">FALL15</div>
<div style="font-size:12px;color:#6b7280">Applied automatically at checkout · Ends Sunday</div>
</div>
<div style="padding:18px 28px">
<div style="font-size:12px;font-weight:bold;letter-spacing:1px;color:#6b7280;margin-bottom:10px">IN SEASON NOW</div>
<table cellpadding="0" cellspacing="8" style="width:100%;font-size:14px"><tr>
<td style="background:#fef9c3;border-radius:10px;padding:14px;text-align:center;width:33%"><div style="font-size:26px">🎃</div><b>Delicata squash</b><div style="color:#6b7280">$1.99 each</div></td>
<td style="background:#fee2e2;border-radius:10px;padding:14px;text-align:center;width:33%"><div style="font-size:26px">🍎</div><b>Honeycrisp</b><div style="color:#6b7280">$2.33 / lb</div></td>
<td style="background:#ffedd5;border-radius:10px;padding:14px;text-align:center;width:33%"><div style="font-size:26px">🍂</div><b>Fresh-pressed cider</b><div style="color:#6b7280">$6.49 / half gal</div></td>
</tr></table>
</div>
<div style="padding:8px 28px 32px;text-align:center"><a href="#" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 32px;border-radius:30px">Start shopping</a></div>
<div style="background:#f9fafb;padding:16px 28px;font-size:11px;line-height:1.6;color:#9ca3af;text-align:center">One use per customer. Excludes alcohol and gift cards.<br><a href="#" style="color:#6b7280">Email preferences</a> · <a href="#" style="color:#6b7280">Unsubscribe</a></div>
</div>
</div>`;

const HTML_SUMMIT_SALE = `<div style="background:#fdf6ec;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#292016">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:#b45309;padding:14px 28px;color:#fff7ed;font-size:13px;font-weight:bold;letter-spacing:3px">SUMMIT SUPPLY CO.</div>
<div style="background:#292016;padding:40px 28px;text-align:center;color:#fef3c7">
<div style="font-size:13px;letter-spacing:4px;color:#fbbf24">THE FALL SALE</div>
<div style="font-size:46px;font-weight:bold;line-height:1.1;margin:10px 0">Up to 40% off</div>
<div style="font-size:15px;color:#e7d8bf">Tents, layers and trail gear · Ends Monday at midnight</div>
</div>
<div style="padding:26px 20px 10px">
<table cellpadding="0" cellspacing="8" style="width:100%;font-size:14px"><tr>
<td style="width:33%;vertical-align:top;border:1px solid #eadfcd"><div style="background:#4d7c0f;color:#ecfccb;font-size:12px;font-weight:bold;letter-spacing:2px;text-align:center;padding:30px 0">SHELTER</div><div style="padding:12px"><b>Ridgeline 2P Tent</b><br><span style="color:#b45309;font-weight:bold">$279</span> <s style="color:#9ca3af">$399</s></div></td>
<td style="width:33%;vertical-align:top;border:1px solid #eadfcd"><div style="background:#1e3a8a;color:#dbeafe;font-size:12px;font-weight:bold;letter-spacing:2px;text-align:center;padding:30px 0">LAYERS</div><div style="padding:12px"><b>Cascade Down Jacket</b><br><span style="color:#b45309;font-weight:bold">$174</span> <s style="color:#9ca3af">$249</s></div></td>
<td style="width:33%;vertical-align:top;border:1px solid #eadfcd"><div style="background:#9f1239;color:#ffe4e6;font-size:12px;font-weight:bold;letter-spacing:2px;text-align:center;padding:30px 0">TRAIL</div><div style="padding:12px"><b>Trailbreak Run Vest</b><br><span style="color:#b45309;font-weight:bold">$59</span> <s style="color:#9ca3af">$85</s></div></td>
</tr></table>
</div>
<div style="margin:0 28px 26px;background:#fef3c7;padding:14px 16px;font-size:14px;line-height:1.5;text-align:center">Members: free shipping + an extra 10% with code <b>TRAILHEAD</b></div>
<div style="text-align:center;padding-bottom:34px"><a href="#" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;letter-spacing:1px;padding:14px 34px">SHOP THE SALE</a></div>
<div style="background:#f5efe6;padding:16px 28px;font-size:11px;line-height:1.6;color:#8c7b64;text-align:center">Summit Supply Co. · Outfitting the Northwest since 1978<br><a href="#" style="color:#6b5b45">Manage preferences</a> · <a href="#" style="color:#6b5b45">Unsubscribe</a></div>
</div>
</div>`;

const HTML_REELHOUSE = `<div style="background:#050507;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#f4f4f5">
<div style="max-width:600px;margin:0 auto;background:#111116;border-radius:10px;overflow:hidden">
<div style="background:#e11d48;padding:16px 28px;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:-0.5px">▶ reelhouse</div>
<div style="padding:28px 28px 8px">
<div style="font-size:12px;letter-spacing:3px;color:#fb7185">NEW THIS WEEK</div>
<div style="font-size:26px;font-weight:bold;margin:6px 0 22px">Four picks for your weekend, Robin</div>
<div style="border-left:4px solid #e11d48;background:#1a1a21;padding:16px 18px;margin-bottom:12px"><div style="font-size:17px;font-weight:bold">The Lighthouse Keepers <span style="font-size:12px;color:#fb7185">· Season 2</span></div><div style="font-size:13px;color:#a1a1aa;margin:4px 0 8px">Drama · 8 episodes · Because you watched Low Water</div><a href="#" style="color:#fda4af;font-size:13px;font-weight:bold;text-decoration:none">Watch now →</a></div>
<div style="border-left:4px solid #f59e0b;background:#1a1a21;padding:16px 18px;margin-bottom:12px"><div style="font-size:17px;font-weight:bold">Paper Moons</div><div style="font-size:13px;color:#a1a1aa;margin:4px 0 8px">Documentary · 1h 34m · The last hand-lettered sign painters</div><a href="#" style="color:#fda4af;font-size:13px;font-weight:bold;text-decoration:none">Watch now →</a></div>
<div style="border-left:4px solid #38bdf8;background:#1a1a21;padding:16px 18px;margin-bottom:12px"><div style="font-size:17px;font-weight:bold">Northbound</div><div style="font-size:13px;color:#a1a1aa;margin:4px 0 8px">Film · 2h 02m · Two sisters, one van, 1,400 miles of coast</div><a href="#" style="color:#fda4af;font-size:13px;font-weight:bold;text-decoration:none">Watch now →</a></div>
<div style="border-left:4px solid #a3e635;background:#1a1a21;padding:16px 18px;margin-bottom:24px"><div style="font-size:17px;font-weight:bold">Small Kitchens <span style="font-size:12px;color:#fb7185">· New series</span></div><div style="font-size:13px;color:#a1a1aa;margin:4px 0 8px">Food · 6 episodes · Big cooking in tiny apartments</div><a href="#" style="color:#fda4af;font-size:13px;font-weight:bold;text-decoration:none">Watch now →</a></div>
<div style="text-align:center;padding-bottom:28px"><a href="#" style="display:inline-block;background:#e11d48;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 30px;border-radius:6px">Browse everything new</a></div>
</div>
<div style="background:#0b0b0f;padding:16px 28px;font-size:11px;line-height:1.6;color:#71717a;text-align:center">You're getting this because you're a Reelhouse Premium member.<br><a href="#" style="color:#a1a1aa">Notification settings</a> · <a href="#" style="color:#a1a1aa">Unsubscribe</a></div>
</div>
</div>`;

/* ------------------------------------------------------------------ */
/* Threads                                                             */
/* ------------------------------------------------------------------ */

export const AUTOMATED: SeedThread[] = [
  /* ---------- Last 12 hours ---------- */
  {
    id: 't-cal-harbor-v4-updated',
    subject: 'Updated invitation: Harbor v4 walkthrough @ Thu 10am – 10:45am (PDT)',
    category: 'updates',
    labels: ['clients'],
    unread: true,
    messages: [
      {
        from: 'calendar',
        to: ['me'],
        at: '14m',
        body: `This event has been updated.
Changed: time

Harbor v4 walkthrough
Walkthrough of the v4 patient portal prototype with the Harbor Health team. Moved from Wednesday at Ben's request.

When
Thursday · 10am – 10:45am (Pacific Time - Los Angeles)
(was Wednesday · 3pm – 3:45pm)

Where
Fernbrook Meet

Join with Fernbrook Meet
https://meet.fernbrook.co/harbor-v4-walkthrough
Or dial: +1 503-555-0143  PIN: 771 204#

Who
- Maya Chen — organizer
- Robin Hale
- Theo Marsh
- Rachel Okoye (Harbor Health)
- Ben Lindqvist (Harbor Health)

Going?   Yes · Maybe · No
https://calendar.fernbrook.co/event?action=RESPOND&eid=aGFyYm9yLXY0LXdhbGt0aHJvdWdo

Invitation from Fernbrook Calendar
You are receiving this email because you are an attendee on the event. Forwarding this invitation could allow any recipient to send a response to the organizer.`,
      },
    ],
  },
  {
    id: 't-keystone-new-signin',
    subject: 'New sign-in on Mac',
    category: 'updates',
    important: true,
    unread: true,
    messages: [
      {
        from: 'keystone',
        to: ['me'],
        at: '38m',
        body: `New sign-in to your Keystone account

robin.hale@fernbrook.co

We noticed a new sign-in to your Keystone account on a Mac. If this was you, you don't need to do anything. If not, we'll help you secure your account.

Device: Mac · desktop browser
Location: Portland, OR, United States (approximate)
IP address: 203.0.113.48

Check activity: https://keystone.id/security/activity

Wasn't you? Secure your account now: https://keystone.id/security/lockdown

You received this email to let you know about important changes to your Keystone account and services.
© Keystone Identity, Inc.`,
      },
    ],
  },
  {
    id: 't-northstar-denver-pretrip',
    subject: 'Your trip to Denver is coming up',
    category: 'updates',
    labels: ['travel'],
    unread: true,
    messages: [
      {
        from: 'northstar',
        to: ['me'],
        at: '1h',
        body: `Hi Robin,

Your trip to Denver is next week. Here's everything you need before you go.

Confirmation: 7QK4ZP

Wed · NS 418 · Portland (PDX) 8:05 AM → Denver (DEN) 11:32 AM · Seat 14A
Fri · NS 1127 · Denver (DEN) 10:15 AM → Portland (PDX) 11:58 AM · Seat 12C

Main Cabin: 1 personal item + 1 carry-on included.

Check-in opens 24 hours before departure — next Tuesday morning. We'll email your mobile boarding pass as soon as you check in. Want to skip that step? Turn on auto check-in in the Northstar app.

Before you fly:
- Add your Known Traveler Number: https://northstarair.com/trips/7QK4ZP/ktn
- First checked bag is $35 online or $40 at the airport
- PDX tip: Concourse C security is busiest between 6 and 8 AM, so give yourself extra time

Manage your trip: https://northstarair.com/trips/7QK4ZP

Safe travels,
Northstar Air`,
      },
    ],
  },
  {
    id: 't-daybreak-today',
    subject: 'Daybreak: the four-day week, passkeys win, and a new greenway ☀',
    category: 'promotions',
    unread: true,
    messages: [{ from: 'daybreak', to: ['me'], at: '2h', html: HTML_DAYBREAK }],
  },
  {
    id: 't-forgehub-ci-main',
    subject: '[fernbrook/atlas] CI failed on main — nightly visual regression (a3f91c2)',
    category: 'updates',
    labels: ['work'],
    messages: [
      {
        from: 'forgehub',
        to: ['me'],
        at: '4h',
        body: `Run failed for main (a3f91c2)

Workflow: nightly-visual-regression
Triggered by: schedule
Duration: 11m 42s

Jobs:
- ✓ lint (38s)
- ✓ unit-tests (2m 04s)
- ✗ visual-regression (8m 51s)
- ○ publish-storybook (skipped)

Failing step: "Compare snapshots against baseline"
7 of 1,286 snapshots differ above the 0.1% threshold.
Most affected: Table/dense, DataGrid/header, DataGrid/row-selected

Last commit: "Merge pull request #479 from fernbrook/table-density" by ines-duarte

View run: https://forgehub.dev/fernbrook/atlas/actions/runs/88214097

You are receiving this because you are subscribed to Actions notifications for fernbrook/atlas.
Manage notifications: https://forgehub.dev/settings/notifications`,
      },
    ],
  },
  {
    id: 't-chatter-mention-tessellate',
    subject: '@robinhale you were mentioned by Tessellate Conf',
    category: 'social',
    messages: [
      {
        from: 'chatter',
        to: ['me'],
        at: '7h',
        body: `Tessellate Conf (@tessellateconf) mentioned you

"Replay of the week: @robinhale on designing for trust in patient-facing software. Task success went from 61% to 89% — the part about anxious readers is worth the whole 30 minutes. tessellateconf.com/replays/trust"

48 replies · 212 reposts · 1.4K likes

View post: https://chatter.social/tessellateconf/status/1843300912

You're receiving this because you were mentioned.
Manage notifications: https://chatter.social/settings/notifications`,
      },
    ],
  },
  {
    id: 't-juniper-card-500',
    subject: 'Card purchase over $500',
    category: 'updates',
    labels: ['finance'],
    important: true,
    unread: true,
    messages: [
      {
        from: 'juniperAlerts',
        to: ['me'],
        at: '9h',
        body: `Juniper Bank alert

A purchase of $642.18 was made with your Juniper Rewards card ending in 4417.

Merchant: SUMMIT SUPPLY CO ONLINE
Amount: $642.18
Card: •• 4417
Type: Online / card not present

If you made this purchase, no action is needed.

Don't recognize it? Lock your card in the Juniper app or call us 24/7 at 1-800-555-0199.

You're receiving this alert because you set a $500 threshold for card purchases. Manage alerts: https://juniperbank.com/alerts

Juniper Bank will never ask for your password, PIN or one-time code by email or text.`,
      },
    ],
  },
  {
    id: 't-linkwell-grace-comment',
    subject: 'Grace Whitfield commented on your post',
    category: 'social',
    messages: [
      {
        from: 'linkwell',
        to: ['me'],
        at: '11h',
        body: `Grace Whitfield commented on your post

Your post: "We ran 38 usability sessions in three weeks with small-business owners. The biggest lesson wasn't about the UI at all — it was about the paperwork people have to find before they even start…"

Grace Whitfield · VP, Customer Experience at Juniper Bank
"This work made our branch teams feel genuinely heard. Can't wait to show the next round to our leadership in Denver."

47 reactions · 9 comments

Reply: https://linkwell.com/feed/update/rh-7714#comments

This email was intended for Robin Hale (Design Lead at Fernbrook).
Unsubscribe · Help`,
      },
    ],
  },

  /* ---------- 1–7 days ---------- */
  {
    id: 't-paystream-stub',
    subject: 'Your pay stub is ready',
    category: 'updates',
    labels: ['finance'],
    unread: true,
    messages: [
      {
        from: 'paystream',
        to: ['me'],
        at: '14h',
        body: `Hi Robin,

Your pay stub from Fernbrook, Inc. is ready to view.

Pay date: Wednesday
Net pay: $4,812.36
Deposited to: Checking •• 2208

View pay stub: https://app.paystream.io/stubs/fb-18-rhale

Year-to-date earnings, taxes and benefit deductions are in the Paystream app under Pay → History. Your new benefit elections from open enrollment take effect on the first paycheck of next year.

Questions about your pay? Contact your payroll admin, Jonah Whitaker (jonah.whitaker@fernbrook.co).

Paystream · Payroll for teams that ship
Notification settings: https://app.paystream.io/settings/notifications`,
      },
    ],
  },
  {
    id: 't-forgehub-pr-482',
    subject: 'Review requested: fernbrook/atlas#482 Color ramp tokens (OKLCH migration)',
    category: 'updates',
    labels: ['work'],
    unread: true,
    messages: [
      { from: 'forgehub', to: ['me'], at: '1d@15:12', html: HTML_FORGEHUB_PR },
      {
        from: 'forgehub',
        to: ['me'],
        at: '1d@16:05',
        body: `@devon-price commented on this pull request.

In tokens/color/blue.json:

> "500": { "value": "oklch(58% 0.17 262)" }

This is the one that moves the primary button the most. @robinhale if you're not happy with it we can pin blue-500 to the old hex and ship the rest of the ramps as-is.

Reply to this email directly or view it on Forgehub:
https://forgehub.dev/fernbrook/atlas/pull/482#discussion_r1873920

You are receiving this because your review was requested.`,
      },
      {
        from: 'forgehub',
        to: ['me'],
        at: '1d@18:40',
        body: `@marcus-bell pushed 2 commits.

- 9c41e7a  Add side-by-side ramp comparison to Storybook
- 2f08d13  Pin amber-400 contrast to 4.5:1 on white

View the changes: https://forgehub.dev/fernbrook/atlas/pull/482/files/2f08d13

You are receiving this because your review was requested.`,
      },
    ],
  },
  {
    id: 't-cal-design-review',
    subject: 'Invitation: Design review @ Thu 2pm – 3pm (PDT)',
    category: 'updates',
    labels: ['work'],
    unread: true,
    messages: [
      {
        from: 'calendar',
        to: ['me'],
        at: '1d@10:48',
        body: `Lena Fischer has invited you to an event.

Design review — homepage hero v2
Picking a direction from the crit thread. Bring your top pick and one thing you'd kill.

When
Thursday · 2pm – 3pm (Pacific Time - Los Angeles)

Where
Studio · Big table

Join with Fernbrook Meet
https://meet.fernbrook.co/hero-v2-review

Who
- Lena Fischer — organizer
- Robin Hale
- Theo Marsh
- Kai Tanaka
- Maya Chen — optional

Going?   Yes · Maybe · No
https://calendar.fernbrook.co/event?action=RESPOND&eid=ZGVzaWduLXJldmlldy1oZXJvLXYy

Invitation from Fernbrook Calendar
You are receiving this email because you are an attendee on the event. Forwarding this invitation could allow any recipient to send a response to the organizer.`,
      },
    ],
  },
  {
    id: 't-cal-atlas-accepted',
    subject: 'Accepted: Atlas design system sync @ Wed 10am – 11am (PDT)',
    category: 'updates',
    labels: ['work'],
    messages: [
      {
        from: 'calendar',
        to: ['me'],
        at: '1d@11:20',
        body: `Marcus Bell has accepted this invitation.

Atlas design system sync
Agenda: v2.0 release candidate, OKLCH ramp sign-off, docs relaunch plan.

When
Wednesday · 10am – 11am (Pacific Time - Los Angeles)

Where
Studio · Room Alder

Joining info
https://meet.fernbrook.co/atlas-sync

Who
- Robin Hale — organizer
- Marcus Bell — accepted
- Devon Price — accepted
- Theo Marsh — awaiting response
- Kai Tanaka — awaiting response

Invitation from Fernbrook Calendar
You are receiving this email because you are the organizer of this event.`,
      },
    ],
  },
  {
    id: 't-canvasly-comment-hero',
    subject: 'Theo commented on Homepage hero v2',
    category: 'updates',
    labels: ['work'],
    unread: true,
    messages: [
      {
        from: 'canvasly',
        to: ['me'],
        at: '1d@14:36',
        body: `Theo Marsh commented on Homepage hero v2

Frame: Hero / Option C — "Built with care"

"Option C is the strongest, but the headline wraps to three lines at 1280. Could we try the shorter line from Option A over C's layout? Also +1 to Kai's note on the photo crop."

Reply in Canvasly: https://canvasly.app/file/fb-web-hero-v2?comment=5521

2 other comments in this file since you last viewed it.

You're getting this email because you follow Homepage hero v2.
Unfollow · Notification settings: https://canvasly.app/settings/notifications`,
      },
    ],
  },
  {
    id: 't-driftbox-offsite-photos',
    subject: 'Maya shared "Offsite photos 2025" with you',
    category: 'updates',
    labels: ['work'],
    messages: [
      {
        from: 'driftbox',
        to: ['me'],
        at: '1d@09:05',
        body: `Maya Chen shared a folder with you

Offsite photos 2025
214 items · 3.8 GB

"Digging these up before Silver Fir — the whiteboard shots from your workshop in the loft are in /Day 1. Add any you have!"

Open folder: https://driftbox.com/s/fb-offsite-2025

You can view and add files.

Driftbox · Your files, everywhere
Don't want these emails? Manage notifications: https://driftbox.com/account/notifications`,
      },
    ],
  },
  {
    id: 't-the-margin-212',
    subject: 'The Margin #212: Tokens are an API',
    category: 'updates',
    unread: true,
    messages: [{ from: 'theMargin', to: ['me'], at: '1d@06:30', html: HTML_THE_MARGIN }],
  },
  {
    id: 't-linkwell-searches',
    subject: 'You appeared in 12 searches this week',
    category: 'social',
    messages: [{ from: 'linkwell', to: ['me'], at: '1d@08:15', html: HTML_LINKWELL_SEARCHES }],
  },
  {
    id: 't-ember-next-bag',
    subject: 'Your next bag ships Friday (+ a new harvest from Huila)',
    category: 'promotions',
    unread: true,
    messages: [{ from: 'ember', to: ['me'], at: '1d@12:30', html: HTML_EMBER }],
  },
  {
    id: 't-juniper-statement-sep',
    subject: 'Your September statement is ready',
    category: 'updates',
    labels: ['finance'],
    messages: [
      {
        from: 'juniperAlerts',
        to: ['me'],
        at: '2d@06:10',
        html: HTML_JUNIPER_STATEMENT,
        attachments: [
          {
            name: 'statement-sep-2026.pdf',
            size: 184_322,
            preview: `JUNIPER BANK — Rewards Card Statement
Account ending 4417 · Robin Hale · Portland, OR

Previous balance            $1,904.12
Payments & credits         −$1,904.12
Purchases                  +$2,318.45
Fees charged                    $0.00
Interest charged                $0.00
New balance                 $2,318.45
Minimum payment due            $35.00
Rewards: 2,318 points earned · 41,902 available`,
          },
        ],
      },
    ],
  },
  {
    id: 't-striders-digest',
    subject: 'Striders weekly: tempo Wednesday, Owen’s PR, Fall Classic next Sunday',
    category: 'social',
    labels: ['personal'],
    messages: [{ from: 'striders', to: ['me'], at: '2d@18:00', html: HTML_STRIDERS_DIGEST }],
  },
  {
    id: 't-greenbasket-15off',
    subject: 'Robin, here’s $15 off your next order 🥕',
    category: 'promotions',
    messages: [{ from: 'greenbasket', to: ['me'], at: '2d@10:00', html: HTML_GREENBASKET_PROMO }],
  },
  {
    id: 't-pdx-power-bill',
    subject: 'Your PDX Power & Light bill is ready — $142.67',
    category: 'updates',
    labels: ['finance'],
    snoozeHours: 30,
    messages: [
      {
        from: 'pdxPower',
        to: ['me'],
        at: '3d@07:15',
        body: `Hi Robin,

Your latest electric bill is ready. A PDF copy is attached.

Account: 7710-4482-19
Service address: •••• SE Clinton St, Unit B, Portland, OR
Amount due: $142.67
Due in 21 days
Usage this period: 712 kWh (down 9% from last month)

Autopay is on — we'll pay this bill from Checking •• 2208 on the due date. No action needed.

View bill online: https://pdxpower.com/account/bills/latest

Tip: Evening rates rise when fall pricing starts next month. Time-of-Day customers with similar usage saved an average of $11 a month last winter: https://pdxpower.com/time-of-day

PDX Power & Light · Customer service 503-555-0110`,
        attachments: [
          {
            name: 'invoice-2026-09.pdf',
            size: 96_418,
            preview: `PDX POWER & LIGHT — Residential Electric Service
Invoice 2026-09 · Account 7710-4482-19 · Robin Hale
Billing period: 30 days · Energy use: 712 kWh

Basic charge                       $11.00
Energy (712 kWh @ $0.1487)        $105.87
Transmission & delivery            $19.94
Public purpose charge               $3.52
City franchise fee                  $2.34
Total due                         $142.67

Paid by autopay from Checking •• 2208`,
          },
        ],
      },
    ],
  },
  {
    id: 't-greenbasket-receipt-48213',
    subject: 'Your Greenbasket receipt — order #GB-48213',
    category: 'updates',
    labels: ['receipts'],
    messages: [{ from: 'greenbasket', to: ['me'], at: '3d@17:42', html: HTML_GREENBASKET_RECEIPT }],
  },
  {
    id: 't-summit-fall-sale',
    subject: 'The Fall Sale is on: up to 40% off tents, layers & trail gear',
    category: 'promotions',
    messages: [{ from: 'summit', to: ['me'], at: '3d@09:00', html: HTML_SUMMIT_SALE }],
  },
  {
    id: 't-northstar-itinerary-7qk4zp',
    subject: "Your Northstar itinerary: Portland ⇄ Denver (7QK4ZP)",
    category: 'updates',
    labels: ['travel'],
    starred: true,
    important: true,
    messages: [
      {
        from: 'northstar',
        to: ['me'],
        at: '5d@21:14',
        html: HTML_NORTHSTAR_ITINERARY,
        attachments: [
          {
            name: 'eticket-receipt-7QK4ZP.pdf',
            size: 71_904,
            preview: `NORTHSTAR AIR — Electronic Ticket Receipt
Confirmation: 7QK4ZP · Ticket 0487 2213 90415
Passenger: HALE/ROBIN · Miles # NS 3391 0472

Wed  NS 418   PDX 08:05 → DEN 11:32   Seat 14A   Main
Fri  NS 1127  DEN 10:15 → PDX 11:58   Seat 12C   Main

Base fare                     $318.00
Taxes, fees & charges          $46.30
Total                         $364.30
Form of payment: corporate card •••• 9031 (Fernbrook)`,
          },
        ],
      },
    ],
  },
  {
    id: 't-harborpine-denver',
    subject: 'Reservation confirmed: Harbor & Pine Denver LoDo · 2 nights',
    category: 'updates',
    labels: ['travel'],
    starred: true,
    messages: [{ from: 'harborPine', to: ['me'], at: '5d@21:36', html: HTML_HARBOR_PINE }],
  },

  /* ---------- 8 days and older ---------- */
  {
    id: 't-reelhouse-receipt',
    subject: 'Your Reelhouse receipt',
    category: 'updates',
    labels: ['receipts'],
    messages: [
      {
        from: 'reelhouse',
        to: ['me'],
        at: '8d@04:10',
        body: `Thanks for being a Reelhouse member.

Receipt #RH-2291-7734
Plan: Premium · 4K · 4 screens
Billing period: 1 month
Amount: $17.99
Paid with: Juniper Rewards card •• 4417

Your next payment is in 1 month. You can cancel anytime from Account → Membership.

Manage membership: https://reelhouse.tv/account/membership

Reelhouse · Questions? https://reelhouse.tv/help`,
      },
    ],
  },
  {
    id: 't-linkwell-connect-elena',
    subject: 'Elena Varga wants to connect',
    category: 'social',
    messages: [
      {
        from: 'linkwell',
        to: ['me'],
        at: '8d@13:22',
        body: `Elena Varga
Principal Product Designer at Meridian Transit · Seattle, WA
14 mutual connections, including Theo Marsh and Paige Donnelly

"Hi Robin — I saw your Tessellate talk on designing for trust and have been sharing it with my team ever since. Would love to connect and swap notes on accessibility research."

Accept: https://linkwell.com/invite/accept/ev-88213
View profile: https://linkwell.com/in/elenavarga

This email was intended for Robin Hale (Design Lead at Fernbrook).
Unsubscribe · Help`,
      },
    ],
  },
  {
    id: 't-chatter-mention-jules',
    subject: '@robinhale you were mentioned by Jules Moreau',
    category: 'social',
    messages: [
      {
        from: 'chatter',
        to: ['me'],
        at: '10d@12:40',
        body: `Jules Moreau (@julesmoreau) mentioned you

"Stole @robinhale's crit rule — everyone brings their favourite and one thing they'd kill — and it's now the best meeting on our calendar. Shorter, kinder, sharper."

6 replies · 19 reposts · 143 likes

Reply: https://chatter.social/julesmoreau/status/1839021177

You're receiving this because you were mentioned.
Manage notifications: https://chatter.social/settings/notifications`,
      },
    ],
  },
  {
    id: 't-pinecone-datepickers',
    subject: '[Pinecone Community] Accessible date pickers — what’s actually working?',
    category: 'social',
    messages: [
      {
        from: 'pinecone',
        to: ['me'],
        at: '25d@21:10',
        body: `Hana Sato replied to your topic

Accessible date pickers — what's actually working?
Category: Design Systems › Components

Hana Sato · Staff Designer · 1.2k reputation

We dropped the calendar grid as the default about a year ago. Now it's a plain text input with a visible format hint (MM/DD/YYYY) and an optional "Pick from calendar" button. In moderated testing, screen reader users finished the booking task about twice as fast, and sighted users didn't notice anything was missing.

The grid is still great for ranges — we just stopped forcing it on single dates.

View reply: https://pinecone-community.org/t/accessible-date-pickers/4821/3

You're receiving this because you started this topic.
Mute this topic: https://pinecone-community.org/t/4821/mute`,
      },
      {
        from: 'pinecone',
        to: ['me'],
        at: '10d@08:44',
        body: `Leo Brandt replied to your topic

Accessible date pickers — what's actually working?

Leo Brandt · Accessibility Engineer · 860 reputation

+1 to Hana's approach. One gotcha we hit: if you auto-format while people type, announce the result through an aria-live region — otherwise screen reader users hear the cursor jump and assume they made a mistake.

Also, don't disable past dates silently. Tell people why a date is unavailable.

View reply: https://pinecone-community.org/t/accessible-date-pickers/4821/7

You're receiving this because you started this topic.
Mute this topic: https://pinecone-community.org/t/4821/mute`,
      },
    ],
  },
  {
    id: 't-northstar-fare-sale',
    subject: 'Fall fare sale: one-way from $59 out of Portland',
    category: 'promotions',
    messages: [
      {
        from: 'northstar',
        to: ['me'],
        at: '11d@10:15',
        body: `Robin, fall is the best time to go. Our Fall Fare Sale is on for 72 hours.

One-way fares from Portland (PDX):
- San Francisco (SFO) from $59
- Los Angeles (LAX) from $79
- Denver (DEN) from $89
- Austin (AUS) from $119
- Boston (BOS) from $149

Book by Sunday for travel on Tuesdays, Wednesdays and Saturdays through mid-December. Main Cabin fares include a carry-on.

Find your fare: https://northstarair.com/deals/fall

Northstar Miles members earn double miles on sale fares booked in the app.

Fares are one-way, include taxes and fees, and are subject to availability.
Unsubscribe from deals: https://northstarair.com/preferences`,
      },
    ],
  },
  {
    id: 't-reelhouse-new-week',
    subject: 'New this week: The Lighthouse Keepers S2, Paper Moons & more',
    category: 'promotions',
    messages: [{ from: 'reelhouse', to: ['me'], at: '11d@12:00', html: HTML_REELHOUSE }],
  },
  {
    id: 't-parcelpath-quillmark',
    subject: 'Your Quillmark Stationery package · PP 4418 2093 7761',
    category: 'updates',
    messages: [
      {
        from: 'parcelpath',
        to: ['me'],
        at: '13d@14:20',
        body: `Your package is on the way

From: Quillmark Stationery
Order: QM-30718
Tracking number: PP 4418 2093 7761
Service: Parcelpath Ground
Estimated delivery: Friday, by 8 PM

Shipping to:
Robin Hale
Fernbrook · Portland, OR 97209

What's inside (per the sender):
- Super-stick notes, 3×3 in, 24 pads (assorted colors)
- Felt-tip markers, black, 36-pack

Track your package: https://parcelpath.com/t/PP441820937761

Parcelpath · Change delivery preferences: https://parcelpath.com/preferences`,
      },
      {
        from: 'parcelpath',
        to: ['me'],
        at: '11d@07:48',
        body: `Out for delivery today

Tracking number: PP 4418 2093 7761
From: Quillmark Stationery
Expected: today, 12 PM – 4 PM

Your driver is on the way. A signature may be required at business addresses.

Follow along live: https://parcelpath.com/t/PP441820937761/live`,
      },
      {
        from: 'parcelpath',
        to: ['me'],
        at: '11d@13:32',
        body: `Delivered

Your package from Quillmark Stationery was delivered at 1:29 PM.

Location: Front desk / reception
Signed by: J. WHITAKER
Tracking number: PP 4418 2093 7761

Something wrong? Report a problem: https://parcelpath.com/help/PP441820937761

How did we do? Rate your delivery: https://parcelpath.com/rate/PP441820937761`,
      },
    ],
  },
  {
    id: 't-ember-receipt-10442',
    subject: 'Ember order #EC-10442 confirmed',
    category: 'updates',
    labels: ['receipts'],
    location: 'archive',
    messages: [
      {
        from: 'ember',
        to: ['me'],
        at: '12d@10:22',
        body: `Thanks, Robin — your subscription bag is being roasted.

Order #EC-10442
- Hearthstone Blend · 12 oz · Whole bean — $19.50

Shipping: Free (subscriber)
Total: $19.50
Paid with: Juniper Rewards card •• 4417

Roasting today, ships tomorrow (Friday) via Parcelpath.
Delivery cadence: every 2 weeks

Manage subscription: https://embercoffee.co/account/subscription`,
      },
    ],
  },
  {
    id: 't-rydr-promo-50',
    subject: '50% off your next 3 rides',
    category: 'promotions',
    messages: [
      {
        from: 'rydr',
        to: ['me'],
        at: '13d@17:05',
        body: `Robin, your next 3 rides are half off.

No code needed — the discount is applied automatically at checkout.

- 50% off, up to $10 per ride
- Valid on Rydr Standard and Rydr Comfort
- Expires in 7 days

Heading to the airport soon? Schedule a ride up to 30 days ahead: https://rydr.app/schedule

Open Rydr: https://rydr.app/open

Offer applies to your personal profile only and isn't valid on Business rides.
Manage emails: https://rydr.app/settings/email`,
      },
    ],
  },
  {
    id: 't-tessellate-earlybird',
    subject: 'Early-bird tickets for Tessellate are live — save $300',
    category: 'promotions',
    messages: [
      {
        from: 'tessellate',
        to: ['me'],
        at: '16d@09:30',
        body: `Tessellate is back next spring — three days of design, research and front-end craft.

Early-bird pricing (first 400 tickets only):
- Full pass: $499 (regular $799)
- Workshop add-on: $149
- Teams of 5+: an extra 10% off every pass

Early-bird ends at the end of October or when all 400 are gone, whichever comes first.

Get tickets: https://tessellateconf.com/tickets

First speakers are announced next month. Past speakers: check the Speakers Circle for your 25% code.

Tessellate Conf · Unsubscribe from ticket news: https://tessellateconf.com/preferences`,
      },
    ],
  },
  {
    id: 't-pdx-power-autopay',
    subject: 'Payment received — thank you',
    category: 'updates',
    labels: ['finance', 'receipts'],
    location: 'archive',
    messages: [
      {
        from: 'pdxPower',
        to: ['me'],
        at: '27d@06:00',
        body: `Hi Robin,

We received your automatic payment. Thank you!

Account: 7710-4482-19
Amount paid: $156.20
Paid from: Checking •• 2208
Confirmation: PMT-88410273

Your next bill will be ready in about 3 weeks, and autopay will keep paying your balance on each due date.

Payment history: https://pdxpower.com/account/payments

PDX Power & Light · Customer service 503-555-0110`,
      },
    ],
  },
  {
    id: 't-rydr-receipt-pdx',
    subject: 'Your Tuesday morning trip with Rydr',
    category: 'updates',
    labels: ['receipts', 'travel'],
    location: 'archive',
    messages: [{ from: 'rydr', to: ['me'], at: '35d@06:12', html: HTML_RYDR_RECEIPT }],
  },
  {
    id: 't-tessellate-speakers-circle',
    subject: "You're invited: Tessellate Speakers Circle",
    category: 'social',
    messages: [
      {
        from: 'tessellate',
        to: ['me'],
        at: '47d@11:00',
        body: `Hi Robin,

As a Tessellate speaker, you're invited to join the Speakers Circle — a small, private community for past and upcoming speakers.

What's inside:
- Monthly office hours with the program committee
- Draft-talk reviews from other speakers
- An early look at next spring's call for proposals
- A shared library of slides, rehearsal tips and accessibility checklists

Your talk "Designing for trust in patient-facing software" was one of our most-watched replays this year, so we'd especially love to have you.

Join the Circle: https://community.tessellateconf.com/invite/SPK-2291

See you there,
Mira Solberg & the Tessellate team`,
      },
    ],
  },
  {
    id: 't-canvasly-pro-annual',
    subject: 'Save 30% on Canvasly Pro when you go annual',
    category: 'promotions',
    messages: [
      {
        from: 'canvasly',
        to: ['me'],
        at: '118d@14:00',
        body: `Hi Robin,

You've created 14 files in your personal workspace this quarter. Pro removes the 3-project limit and adds version history, dev mode and unlimited Motion prototypes.

Go annual and save 30%:
- Pro monthly: $15/month
- Pro annual: $126/year (that's $10.50/month)

Offer ends Sunday. Your Fernbrook organization seat isn't affected.

Upgrade: https://canvasly.app/upgrade?plan=pro-annual&code=SUMMER30

Canvasly · Manage email preferences: https://canvasly.app/settings/email`,
      },
    ],
  },
  {
    id: 't-harborpine-seattle-folio',
    subject: 'Your folio from Harbor & Pine Seattle Waterfront',
    category: 'updates',
    labels: ['receipts', 'travel'],
    location: 'archive',
    messages: [
      {
        from: 'harborPine',
        to: ['me'],
        at: '287d@11:02',
        body: `Dear Robin,

Thank you for staying with us at Harbor & Pine Seattle Waterfront. Your final folio is attached for your records.

Confirmation: HP-SEA-41877
Stay: 1 night · Deluxe Queen
Total charged: $286.44 to corporate card •• 9031

This stay earned you 2,860 Harbor & Pine Circle points. We hope to welcome you back soon.

Harbor & Pine Seattle Waterfront · 2210 Alaskan Way, Seattle, WA 98121
Manage preferences: https://harborandpine.com/preferences`,
        attachments: [
          {
            name: 'folio-HP-SEA-41877.pdf',
            size: 58_117,
            preview: `HARBOR & PINE SEATTLE WATERFRONT
Guest Folio · Confirmation HP-SEA-41877
Guest: Robin Hale · Company: Fernbrook

Night 1   Room — Deluxe Queen              $219.00
Night 1   Occupancy tax & fees              $36.36
Night 1   Harbor Kitchen — dinner           $31.08
          Payment — card •••• 9031        −$286.44

Balance due                                  $0.00
Thank you for staying with us.`,
          },
        ],
      },
    ],
  },
  {
    id: 't-keystone-2sv-on',
    subject: '2-Step Verification is on',
    category: 'updates',
    location: 'archive',
    messages: [
      {
        from: 'keystone',
        to: ['me'],
        at: '301d@20:14',
        body: `2-Step Verification turned on

robin.hale@fernbrook.co

Your Keystone account is now protected with 2-Step Verification. When you sign in on a new device, you'll need your password and a code from your authenticator app.

Backup codes: generated (10 remaining). Store them somewhere safe.

If you didn't make this change, secure your account now: https://keystone.id/security/lockdown

You received this email to let you know about important changes to your Keystone account and services.
© Keystone Identity, Inc.`,
      },
    ],
  },
  {
    id: 't-northstar-receipt-sfo',
    subject: 'Your receipt: Portland ⇄ San Francisco (3HX9LM)',
    category: 'updates',
    labels: ['receipts', 'travel'],
    location: 'archive',
    messages: [
      {
        from: 'northstar',
        to: ['me'],
        at: '318d@19:40',
        body: `Thanks for flying Northstar, Robin.

Confirmation: 3HX9LM
Ticket: 0487 2209 11364

Mon · NS 212 · PDX 7:10 AM → SFO 9:02 AM · Seat 9C
Tue · NS 871 · SFO 6:25 PM → PDX 8:21 PM · Seat 11A

Base fare: $214.00
Taxes & fees: $38.84
Total: $252.84
Paid with: Fernbrook corporate card •• 9031

Miles earned: 1,100 · New balance: 18,420

Receipt details: https://northstarair.com/receipts/3HX9LM`,
      },
    ],
  },

  /* ---------- Trash ---------- */
  {
    id: 't-trash-summit-clearance',
    subject: 'Last call: summer clearance ends tonight',
    category: 'promotions',
    location: 'trash',
    messages: [
      {
        from: 'summit',
        to: ['me'],
        at: '26d@09:00',
        body: `Final hours: up to 50% off summer gear.

- Ultralight hammock — $39 (was $79)
- Trail sandals — $54 (was $90)
- 32 oz insulated bottle — $22 (was $36)

Ends at midnight PT. Shop now: https://summitsupply.co/clearance

Summit Supply Co. · Unsubscribe: https://summitsupply.co/preferences`,
      },
    ],
  },
  {
    id: 't-trash-canvasly-motion-trial',
    subject: 'Your Canvasly Motion trial has ended',
    category: 'updates',
    location: 'trash',
    messages: [
      {
        from: 'canvasly',
        to: ['me'],
        at: '19d@09:00',
        body: `Your 14-day Canvasly Motion trial is over.

Your 3 Motion prototypes are safe, but they're now view-only. Upgrade to keep editing and exporting.

Upgrade: https://canvasly.app/upgrade?addon=motion

Canvasly · Manage email preferences: https://canvasly.app/settings/email`,
      },
    ],
  },
  {
    id: 't-trash-greenbasket-credit',
    subject: 'Your $10 credit expires tonight',
    category: 'promotions',
    location: 'trash',
    messages: [
      {
        from: 'greenbasket',
        to: ['me'],
        at: '21d@16:00',
        body: `Don't let it go to waste, Robin.

You have a $10 Greenbasket credit that expires at midnight tonight. It applies automatically to any order over $35.

Start an order: https://greenbasket.com/shop

Greenbasket · Email preferences: https://greenbasket.com/preferences`,
      },
    ],
  },

  /* ---------- Spam ---------- */
  {
    id: 't-spam-rewards',
    subject: '🎁 Congratulations Robin! You have been selected for a $1,000 Gift Card',
    category: 'promotions',
    location: 'spam',
    unread: true,
    messages: [
      {
        from: 'spamRewards',
        to: ['me'],
        at: '1d@03:12',
        body: `Dear Valued Customer,

CONGRATULATIONS!! Your email address was randomly selected in our Monthly Loyalty Draw and you have WON a $1,000 Gift Card.

To claim your reward you must confirm your details within 48 HOURS. After this time your prize will be given to another winner.

CLAIM NOW: http://rewards-claim-center.xyz/claim?id=RH88213

A small processing & shipping fee of $4.95 is required to verify you are a real person.

Winner ID: #RW-0088213
Rewards Center Team

This is a one time notification. You recieved this because you are a valued member.`,
      },
    ],
  },
  {
    id: 't-spam-bank-suspended',
    subject: 'Your account has been suspended — verify now',
    category: 'primary',
    location: 'spam',
    unread: true,
    messages: [
      {
        from: 'spamBank',
        to: ['me'],
        at: '1d@19:47',
        body: `Dear Customer,

We detected unusual sign-in activity on your Juniper Bank online account. For your protection, your access has been temporarily SUSPENDED.

To restore full access you must verify your identity within 24 hours:

https://juniperbank-verify.com/secure/restore?session=8f2a71

You will be asked to confirm your card number, expiry date, online banking password and the one-time code we send you.

Failure to verify will result in permanent closure of your account and all linked cards.

Juniper Bank Security Department
Ref: JB-SEC-4471-AX`,
      },
    ],
  },
  {
    id: 't-spam-invoice-20931',
    subject: 'OVERDUE: Invoice INV-20931 — final notice before collections',
    category: 'primary',
    location: 'spam',
    unread: true,
    messages: [
      {
        from: 'spamInvoice',
        to: ['me'],
        at: '2d@04:31',
        body: `Hello,

Please find attached the overdue invoice INV-20931 for $3,480.00 for services rendered to your company.

Payment was due 14 days ago. To avoid a 15% late fee and referral to our collections partner, please open the attached file and remit payment today.

If you have already paid, please disregard this message.

Regards,
Accounts Receivable Dept.
Secure Invoicing Portal`,
        attachments: [{ name: 'Invoice_INV-20931.zip', size: 412_880 }],
      },
    ],
  },
  {
    id: 't-spam-crypto',
    subject: 'Turn $500 into $10,000 in 7 days — GUARANTEED returns',
    category: 'promotions',
    location: 'spam',
    messages: [
      {
        from: 'spamCrypto',
        to: ['me'],
        at: '14d@02:15',
        body: `Hi Robin,

Our AI trading bot has returned 2,000% for early members — and for the next 24 hours we're opening 50 new spots.

- Deposit as little as $500 in crypto
- Our algorithm DOUBLES it every 48 hours
- Withdraw anytime, zero risk, 100% guaranteed

"I paid off my mortgage in 3 weeks!!" — Kevin R., verified member

Secure your spot before it's gone: https://bityield-pro.biz/join?ref=robin

BitYield Pro Support Team
Not financial advice. Past results guarantee future returns.`,
      },
    ],
  },
  {
    id: 't-spam-parcel-fee',
    subject: 'Delivery attempt failed — $1.99 redelivery fee required',
    category: 'primary',
    location: 'spam',
    messages: [
      {
        from: 'spamParcel',
        to: ['me'],
        at: '9d@13:09',
        body: `Delivery Notice

We attempted to deliver your parcel today but were unable to complete delivery due to an incomplete address.

Parcel number: US9921-4471-PD
Status: HELD AT DEPOT

To schedule redelivery, please confirm your address and pay the $1.99 redelivery fee within 48 hours:

https://parcel-redelivery.info/schedule?id=US99214471

If payment is not received your parcel will be returned to sender.

Parcel Delivery Service`,
      },
    ],
  },
];
