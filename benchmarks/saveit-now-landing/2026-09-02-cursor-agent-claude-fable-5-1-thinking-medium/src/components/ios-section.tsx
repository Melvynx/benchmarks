import {
  ArrowRightIcon,
  CheckIcon,
  RefreshCwIcon,
  SearchIcon,
  Share2Icon,
} from "lucide-react";

import { images } from "../lib/images";
import { CampaignPicture } from "./campaign-image";
import { SectionHeading } from "./section-heading";

const FEATURES = [
  {
    icon: Share2Icon,
    title: "Save from the share sheet",
    body: "Tap Share in Safari, YouTube, or any app, then tap SaveIt.now. You are done before the sheet closes.",
  },
  {
    icon: SearchIcon,
    title: "Ask in plain language",
    body: "Find what you saved the way you remember it, from the couch or the train, without opening a laptop.",
  },
  {
    icon: RefreshCwIcon,
    title: "One library everywhere",
    body: "Saves from your phone, the extension, and the web land in the same place with the same context.",
  },
];

export const IosSection = () => {
  return (
    <section
      id="ios"
      className="relative scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32"
      aria-labelledby="ios-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              id="ios-title"
              eyebrow="SaveIt.now for iPhone"
              title={
                <>
                  Save it where you find it.
                  <br />
                  <em className="text-ember-gradient">Find it wherever you are.</em>
                </>
              }
              description="Most of what you want to keep shows up on your phone first. SaveIt.now for iOS makes saving a single tap and keeps rediscovery just as immediate, with the same agent working behind every save."
            />

            <ul className="mt-10 flex flex-col gap-3" aria-label="iOS highlights">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <li
                    key={feature.title}
                    data-reveal="left"
                    style={{ "--reveal-delay": `${index * 80}ms` } as React.CSSProperties}
                    className="flex gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-ember-2">
                      <Icon className="size-[18px]" />
                    </span>
                    <div>
                      <h3 className="text-[16px] font-medium text-cream">{feature.title}</h3>
                      <p className="mt-1 text-[14.5px] leading-relaxed text-sand/80">
                        {feature.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div
              data-reveal
              style={{ "--reveal-delay": "260ms" } as React.CSSProperties}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <a
                href="/ios"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-cream px-5 text-sm font-medium text-ink transition-colors hover:bg-white"
              >
                Get the iOS app
                <ArrowRightIcon className="size-4" />
              </a>
              <span className="text-[13px] text-dune">
                Same account as the web and the browser extension.
              </span>
            </div>
          </div>

          {/* Visual */}
          <div
            data-reveal="scale"
            className="relative mx-auto w-full max-w-[560px] lg:max-w-none"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] border border-white/10 shadow-card sm:aspect-[5/6] lg:aspect-[4/5]">
              <CampaignPicture
                image={images.rocks}
                className="absolute inset-0"
                imgClassName="object-[50%_45%]"
                sizes="(min-width: 1024px) 50vw, 100vw"
                decorative
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent"
              />

              <PhoneIllustration />
            </div>
            <p className="mt-3 text-center text-[12px] text-dune">
              Illustration of the share flow. Not a screenshot of the app.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Schematic device with abstract UI blocks. Intentionally not a mockup of the
 * real app: it only conveys the "share, tap, saved" rhythm.
 */
function PhoneIllustration() {
  return (
    <div
      className="absolute inset-0 flex items-end justify-center"
      aria-hidden
    >
      <div className="relative w-[64%] max-w-[300px] translate-y-[16%] rounded-[42px] border border-white/25 bg-ink/70 p-2 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:w-[58%]">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-b from-ink-3 to-ink">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-3 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          {/* Abstract page behind the sheet */}
          <div className="absolute inset-x-5 top-14 space-y-3 opacity-60">
            <div className="h-3 w-2/3 rounded bg-white/25" />
            <div className="h-2 w-full rounded bg-white/15" />
            <div className="h-2 w-11/12 rounded bg-white/15" />
            <div className="h-2 w-4/5 rounded bg-white/15" />
            <div className="mt-4 aspect-video w-full rounded-xl bg-white/10" />
            <div className="h-2 w-full rounded bg-white/15" />
            <div className="h-2 w-3/4 rounded bg-white/15" />
          </div>

          {/* Share sheet */}
          <div className="absolute inset-x-0 bottom-0 rounded-t-[26px] border-t border-white/15 bg-ink-2/95 p-4 pb-6 backdrop-blur-xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" />
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex flex-col items-center gap-1.5">
                  <div className="size-11 rounded-2xl bg-white/10" />
                  <div className="h-1.5 w-8 rounded bg-white/15" />
                </div>
              ))}
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-ember-2 via-ember to-rose shadow-glow">
                  <span className="relative size-4 rounded-[5px] border border-white/60">
                    <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream" />
                  </span>
                </div>
                <div className="h-1.5 w-8 rounded bg-blush/70" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation toast floating over the scene so it stays visible at every width */}
      <div className="absolute top-5 left-5 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-ink/70 px-3.5 py-2.5 text-[12.5px] text-cream shadow-card backdrop-blur-xl sm:top-7 sm:left-7">
        <span className="flex size-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
          <CheckIcon className="size-3.5" />
        </span>
        <span className="leading-tight">
          <span className="block font-medium">Saved to SaveIt.now</span>
          <span className="block text-[11.5px] text-dune">Filed by the agent</span>
        </span>
      </div>
    </div>
  );
}
