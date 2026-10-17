import type { Category } from "../types";
import { ME } from "./contacts";

export interface IncomingSpec {
  /** Subject of an existing thread to append to; otherwise a new thread. */
  replyToSubject?: string;
  subject: string;
  from: string;
  category: Category;
  labels: string[];
  html: string;
  attachments?: { name: string; kb: number }[];
}

const P = (...x: string[]) => x.map((s) => `<p>${s}</p>`).join("");

export const INCOMING: IncomingSpec[] = [
  {
    replyToSubject: "Atlas launch checklist — final pass before Thursday",
    subject: "Atlas launch checklist — final pass before Thursday",
    from: "tom.becker@northwind.dev",
    category: "primary",
    labels: ["work", "atlas"],
    html: P("Sorry for the delay — read replica access is granted for Diego and Sam. You should see <code>atlas-ro-1</code> and <code>atlas-ro-2</code> in the bastion now.", "Tom"),
  },
  {
    subject: "Your package was delivered 📦",
    from: "shipment-tracking@amazon.com",
    category: "updates",
    labels: ["receipts"],
    html: P("Your package was left at the front door.", "Black Diamond Momentum Harness (M), Petzl GriGri+ Belay Device", "How was your delivery?"),
  },
  {
    subject: "Re: Quick question about the onboarding flow",
    replyToSubject: "Quick question about the onboarding flow",
    from: "marcus.chen@northwind.dev",
    category: "primary",
    labels: ["work"],
    html: P("Actually — found the answer in the sync service code, we only get workspace size after the first sync. Going with direction B and a skeleton state. Ignore my previous email! 🙈"),
  },
  {
    subject: "Weekend flash sale: extra 20% off sale styles",
    from: "patagonia@email.patagonia.com",
    category: "promotions",
    labels: [],
    html: P("Extra 20% off already-reduced styles this weekend only. Free returns, always."),
  },
  {
    subject: "Aisha Bello shared “Atlas launch dashboard” with you",
    from: "notify@mail.notion.so",
    category: "updates",
    labels: ["atlas"],
    html: P("<b>Aisha Bello</b> invited you to edit <b>Atlas launch dashboard</b>.", "\"Live view of signups, activation and billing errors for launch day.\""),
  },
  {
    subject: "Photos from the Gunks 🧗",
    from: "kenji@watanabe.jp",
    category: "primary",
    labels: ["personal"],
    html: P("Great day out! Here are the shots from the top of High Exposure. Theo's face on the overhang is priceless."),
    attachments: [
      { name: "gunks-01.jpg", kb: 2800 },
      { name: "gunks-02.jpg", kb: 3100 },
    ],
  },
];

/** Canned replies for auto-responses when you send to a person. */
export function cannedReply(fromName: string, subject: string): string {
  const first = fromName.split(" ")[0];
  const options = [
    P(`Thanks ${ME.name.split(" ")[0]}! Got it — I'll take a look this afternoon and get back to you.`, first),
    P("Sounds good to me 👍", "Let's sync tomorrow if anything changes.", first),
    P(`Appreciate the quick reply. Re: "${subject.replace(/^(re|fwd):\s*/i, "")}" — all makes sense, I'm on it.`, first),
    P("Perfect, thank you! Adding it to my calendar now.", first),
  ];
  let h = 0;
  for (const ch of subject + fromName) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}
