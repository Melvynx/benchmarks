import {
  ArrowUpRightIcon,
  CheckIcon,
  SearchIcon,
  Share2Icon,
  SmartphoneIcon,
} from "lucide-react";

import { campaignImages } from "../lib/campaign-images";
import { links } from "../lib/links";
import { LinkButton } from "./ui/button";
import { CampaignPicture } from "./ui/campaign-picture";
import { Reveal } from "./ui/reveal";

const points = [
  {
    icon: Share2Icon,
    title: "Save from the share sheet",
    body: "Tap share in Safari, YouTube, or any app, pick SaveIt.now, and you are done.",
  },
  {
    icon: SearchIcon,
    title: "Find it from your pocket",
    body: "The same agent, the same library. Ask for something on the train and it is there.",
  },
  {
    icon: SmartphoneIcon,
    title: "Native, and in sync",
    body: "Built for iPhone, so saving feels immediate. Everything stays in step with the web app.",
  },
];

/**
 * A stylised phone silhouette. It deliberately shows an abstract share sheet
 * moment rather than pretending to be a screenshot of the real app.
 */
function PhoneIllustration() {
  return (
    <div
      className="relative mx-auto w-[240px] sm:w-[260px]"
      role="img"
      aria-label="Illustration of an iPhone share sheet with SaveIt.now selected and a saved confirmation"
    >
      <div className="rounded-[44px] border border-white/20 bg-ink/80 p-2 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-md">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[36px] bg-gradient-to-b from-ink-3 to-ink">
          <div className="absolute left-1/2 top-3 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          <div className="absolute inset-x-4 top-14 space-y-2 opacity-60">
            <div className="h-24 rounded-2xl bg-gradient-to-br from-rose/30 to-lilac/20" />
            <div className="h-2.5 w-3/4 rounded bg-white/25" />
            <div className="h-2.5 w-1/2 rounded bg-white/15" />
          </div>

          <div className="absolute inset-x-2 bottom-2 rounded-[28px] border border-white/10 bg-ink-2/95 p-3">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/20" />
            <div className="flex items-center gap-2 text-[10px] text-mist">
              <span className="size-7 rounded-lg bg-gradient-to-br from-rose/40 to-lilac/30" />
              <span className="min-w-0 flex-1 truncate">
                A crash course on caching fundamentals
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[9px] text-dim">
              {["Messages", "Mail", "Notes"].map((app) => (
                <div key={app} className="flex flex-col items-center gap-1">
                  <span className="size-9 rounded-xl bg-white/[0.06]" />
                  {app}
                </div>
              ))}
              <div className="flex flex-col items-center gap-1 text-ember-soft">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-ember text-ink shadow-[0_0_30px_-4px_rgba(255,122,61,0.9)]">
                  <span className="font-display text-[15px]">S</span>
                </span>
                SaveIt.now
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-ember/15 px-3 py-2 text-[11px] text-cream">
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="size-3 text-ember-soft" aria-hidden />
                Saved to your home
              </span>
              <span className="text-dim">now</span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-cream/50">
        Illustration, not an app screenshot
      </p>
    </div>
  );
}

export function IosSection() {
  return (
    <section
      id="ios"
      className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="grid overflow-hidden rounded-[32px] border border-white/10 lg:grid-cols-2">
        <Reveal
          variant="scale"
          className="relative flex min-h-[520px] items-center justify-center overflow-hidden p-8"
        >
          <CampaignPicture
            image={campaignImages.lake}
            sizes="(min-width: 1024px) 560px, 100vw"
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-ink/10 lg:bg-gradient-to-r lg:from-ink/20 lg:to-ink/70" />
          <div className="relative">
            <PhoneIllustration />
          </div>
        </Reveal>

        <div className="flex flex-col justify-center bg-ink-2 p-8 sm:p-10 lg:p-14">
          <Reveal as="p" className="section-eyebrow">
            SaveIt.now for iOS
          </Reveal>
          <Reveal
            as="h2"
            delay={80}
            className="font-display mt-5 text-4xl leading-[1.02] text-cream sm:text-5xl"
          >
            Save it wherever <em className="text-ember-soft">you are.</em>
          </Reveal>
          <Reveal
            as="p"
            delay={160}
            className="mt-5 max-w-md text-[16px] leading-relaxed text-mist"
          >
            Most things worth keeping show up on your phone. Save them the
            moment you see them and let the agent handle the rest before you
            are back at your desk.
          </Reveal>

          <ul className="mt-8 space-y-5">
            {points.map((point, index) => {
              const Icon = point.icon;
              return (
                <Reveal
                  as="li"
                  key={point.title}
                  delay={200 + index * 80}
                  className="flex gap-4"
                >
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-ember-soft">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[16px] font-medium text-cream">
                      {point.title}
                    </span>
                    <span className="mt-1 block text-[14px] leading-relaxed text-mist">
                      {point.body}
                    </span>
                  </span>
                </Reveal>
              );
            })}
          </ul>

          <Reveal delay={480} className="mt-9 flex flex-wrap gap-3">
            <LinkButton href={links.ios} size="lg">
              Get the iOS app
              <ArrowUpRightIcon className="size-4" aria-hidden />
            </LinkButton>
            <LinkButton href={links.signUp} size="lg" variant="outline">
              Start on the web
            </LinkButton>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
