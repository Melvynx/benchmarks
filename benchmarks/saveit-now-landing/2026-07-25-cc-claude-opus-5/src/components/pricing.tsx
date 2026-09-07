import { campaign } from "../lib/campaign-images";
import { SIGN_UP_URL, APP_URL } from "../lib/site";
import { CampaignPicture } from "./ui/campaign-picture";
import { Cta, CtaArrow } from "./ui/cta";
import { Reveal } from "./ui/reveal";
import { SectionLabel } from "./ui/section-label";

type Tier = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  note: string;
  pitch: string;
  features: string[];
  href: string;
  action: string;
  featured: boolean;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    note: "No card needed",
    pitch: "Enough to feel what saving without filing is like.",
    features: [
      "20 bookmarks",
      "20 AI bookmark runs each month",
      "10 chat questions each month",
      "Chrome and Firefox extensions",
      "Save from the iOS share sheet",
    ],
    href: SIGN_UP_URL,
    action: "Start free",
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$5",
    cadence: "per month",
    note: "Billed annually at $60",
    pitch: "For a library you intend to keep for years.",
    features: [
      "Up to 50,000 bookmarks",
      "1,500 AI bookmark runs each month",
      "200 chat questions each month",
      "API access and CSV export",
      "Priority support",
    ],
    href: `${APP_URL}/upgrade`,
    action: "Go Pro",
    featured: true,
  },
];

/**
 * Pricing, set against the softest plate in the set: a distant arch seen
 * across an out of focus field. The art stays quiet here so the numbers read.
 */
export function Pricing() {
  return (
    <section id="pricing" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <CampaignPicture
          image={campaign.arch}
          decorative
          sizes="100vw"
          className="h-full w-full"
        />
        <div className="absolute inset-0 bg-ink/88" />
        <div className="absolute inset-x-0 top-0 h-44 bg-linear-to-b from-ink to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-ink to-transparent" />
      </div>

      <div className="mx-auto max-w-[88rem] px-5 py-24 sm:px-8 sm:py-32 lg:py-40">
        <Reveal className="max-w-2xl">
          <SectionLabel index="06">Pricing</SectionLabel>
          <h2 className="display-lg mt-6 text-glow">
            One price.{" "}
            <em className="italic text-muted">No per bookmark maths.</em>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">
            Start on the free plan and keep it as long as it serves you. Pro
            exists for the point where your library becomes something you rely
            on.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:mt-16 lg:grid-cols-2 lg:gap-8">
          {TIERS.map((tier, index) => (
            <Reveal key={tier.id} delay={index * 120}>
              <article
                className={`relative flex h-full flex-col rounded-2xl p-8 sm:p-10 ${
                  tier.featured
                    ? "ember-wash border border-ember/35 bg-ink-3/80 shadow-[0_30px_90px_-40px_rgba(255,106,61,0.65)]"
                    : "border border-lilac/12 bg-ink-2/70"
                }`}
              >
                {tier.featured && (
                  <span className="absolute right-8 top-8 rounded-full border border-amber/35 bg-amber/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-amber sm:right-10 sm:top-10">
                    Most complete
                  </span>
                )}

                <h3
                  id={`tier-${tier.id}`}
                  className="font-display text-2xl text-glow"
                >
                  {tier.name}
                </h3>
                <p className="mt-2 text-[15px] text-muted">{tier.pitch}</p>

                <p className="mt-8 flex items-baseline gap-2">
                  <span className="lining-figures font-display text-6xl tracking-tight text-glow">
                    {tier.price}
                  </span>
                  <span className="text-sm text-muted">{tier.cadence}</span>
                </p>
                <p
                  className={`mt-2 text-[13px] ${
                    tier.featured ? "text-amber/90" : "text-faint"
                  }`}
                >
                  {tier.note}
                </p>

                <ul className="mt-8 flex flex-1 flex-col gap-3.5">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-[15px] text-cream/85"
                    >
                      <CheckMark featured={tier.featured} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Cta
                  href={tier.href}
                  size="lg"
                  variant={tier.featured ? "primary" : "ghost"}
                  className="mt-10 w-full"
                >
                  {tier.action}
                  <CtaArrow />
                </Cta>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={140}>
          <p className="mt-8 text-[13px] text-faint">
            Cancel whenever you like. Pro stays active until the end of the
            period you paid for.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function CheckMark({ featured }: { featured: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`mt-0.5 size-4 shrink-0 ${featured ? "text-amber" : "text-lilac/70"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}
