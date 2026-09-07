import { ArrowRightIcon } from "lucide-react";

import { campaignImages } from "../lib/campaign-images";
import { links } from "../lib/links";
import { LinkButton } from "./ui/button";
import { CampaignPicture } from "./ui/campaign-picture";
import { Reveal } from "./ui/reveal";

export function ClosingCta() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <CampaignPicture
          image={campaignImages.home}
          sizes="100vw"
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/30 to-ink" />
        <div className="absolute inset-0 bg-ink/30" />
      </div>

      <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-5 py-32 text-center sm:px-8 lg:py-44">
        <Reveal as="p" className="section-eyebrow justify-center">
          SaveIt.now
        </Reveal>
        <Reveal
          as="h2"
          delay={80}
          className="font-display mt-5 max-w-3xl text-5xl leading-[0.98] text-cream sm:text-6xl lg:text-7xl"
        >
          Your home <em className="text-ember-soft">for bookmarks.</em>
        </Reveal>
        <Reveal
          as="p"
          delay={160}
          className="mt-6 max-w-lg text-[17px] leading-relaxed text-cream/80"
        >
          Stop filing. Start saving. Every link you keep from today on has a
          place to live and a way back.
        </Reveal>
        <Reveal delay={240} className="mt-9 flex flex-wrap justify-center gap-3">
          <LinkButton href={links.signUp} size="lg">
            Start saving free
            <ArrowRightIcon
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </LinkButton>
          <LinkButton href="#pricing" size="lg" variant="outline">
            Compare plans
          </LinkButton>
        </Reveal>
      </div>
    </section>
  );
}
