import { ArrowDownIcon, ArrowRightIcon } from "lucide-react";

import { campaignImages } from "../lib/campaign-images";
import { links } from "../lib/links";
import { SaveDemo } from "./save-demo";
import { LinkButton } from "./ui/button";
import { CampaignPicture } from "./ui/campaign-picture";
import { Reveal } from "./ui/reveal";

const saveable = [
  "Articles",
  "YouTube videos",
  "PDFs",
  "Tweets",
  "Images",
  "Recipes",
  "Docs",
  "Threads",
  "Products",
  "Papers",
];

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <CampaignPicture
          image={campaignImages.portalRidge}
          priority
          imgClassName="drift"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/20 to-ink" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-32 sm:px-8 sm:pt-40 lg:pb-24 lg:pt-44">
        <div className="grid items-end gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div>
            <Reveal as="h1" className="section-eyebrow" delay={0}>
              Claude Fable 5.1
            </Reveal>

            <Reveal
              as="p"
              delay={80}
              className="font-display mt-5 text-[2.9rem] leading-[0.98] text-cream sm:text-6xl lg:text-[5.4rem]"
            >
              Just save it.
              <br />
              <em className="text-ember-soft">Find it again, every time.</em>
            </Reveal>

            <Reveal
              as="p"
              delay={160}
              className="mt-6 max-w-lg text-[17px] leading-relaxed text-cream/80"
            >
              SaveIt.now is your home for bookmarks. Save a link, a video, a
              PDF, or an image. The agent captures it, understands it, and files
              it for you. Later, ask in plain words and it comes straight back.
            </Reveal>

            <Reveal
              delay={240}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <LinkButton href={links.signUp} size="lg">
                Start saving free
                <ArrowRightIcon
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </LinkButton>
              <LinkButton href="#how-it-works" size="lg" variant="outline">
                See how it works
                <ArrowDownIcon
                  className="size-4 transition-transform group-hover:translate-y-0.5"
                  aria-hidden
                />
              </LinkButton>
            </Reveal>

            <Reveal
              as="p"
              delay={320}
              className="mt-5 text-[13px] text-cream/60"
            >
              Free for your first 20 bookmarks. No credit card needed.
            </Reveal>
          </div>

          <Reveal variant="scale" delay={200} className="lg:pb-2">
            <SaveDemo />
          </Reveal>
        </div>
      </div>

      <div className="ticker-mask border-y border-white/[0.06] bg-ink/60 py-3 backdrop-blur-sm">
        <div className="ticker gap-10 px-5 text-[13px] uppercase tracking-[0.2em] text-cream/50">
          {[...saveable, ...saveable].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-10 whitespace-nowrap"
              aria-hidden={index >= saveable.length}
            >
              {item}
              <span className="size-1 rounded-full bg-ember/70" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
