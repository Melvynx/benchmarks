import { MessageCircleQuestionIcon, ScanSearchIcon, SparklesIcon } from "lucide-react";

import { campaignImages } from "../lib/campaign-images";
import { CampaignPicture } from "./ui/campaign-picture";
import { Reveal } from "./ui/reveal";

const ways = [
  {
    icon: MessageCircleQuestionIcon,
    title: "Ask in your own words",
    body: "\"The pink site about caching\" or \"that video on sourdough\" is enough. Meaning is searched, not just titles.",
  },
  {
    icon: ScanSearchIcon,
    title: "Search by what you remember",
    body: "Screenshots, full text, and summaries are indexed, so a half remembered detail is still a way in.",
  },
  {
    icon: SparklesIcon,
    title: "Browse what the agent grouped",
    body: "Open a category you never created and find everything that belongs there, already together.",
  },
];

export function PromiseSection() {
  return (
    <section
      id="promise"
      className="relative isolate scroll-mt-24 overflow-hidden py-24 lg:py-36"
    >
      <div className="absolute inset-0 -z-10">
        <CampaignPicture
          image={campaignImages.portalRocks}
          sizes="100vw"
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-ink/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink" />
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="text-center">
          <Reveal as="p" className="section-eyebrow justify-center">
            The 100% promise
          </Reveal>
          <Reveal
            as="p"
            delay={80}
            aria-hidden
            className="font-display image-text mx-auto mt-4 select-none text-[clamp(7rem,26vw,19rem)] leading-[0.85] tracking-[-0.04em]"
            style={{ backgroundImage: `url(${campaignImages.portalRocks.src})` }}
          >
            100%
          </Reveal>
          <Reveal
            as="h2"
            delay={140}
            className="font-display mx-auto mt-6 max-w-3xl text-3xl leading-[1.05] text-cream sm:text-5xl"
          >
            Everything you save,{" "}
            <em className="text-ember-soft">you can find again.</em>
          </Reveal>
          <Reveal
            as="p"
            delay={200}
            className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-cream/75"
          >
            That is the whole point of a home. Nothing you save should vanish
            into a folder you forget or a list you never reopen. Save it once
            and walk back through the door whenever you need it.
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {ways.map((way, index) => {
            const Icon = way.icon;
            return (
              <Reveal
                key={way.title}
                delay={index * 100}
                className="glass rounded-3xl p-6 transition-colors hover:bg-white/[0.07]"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-ember/15 text-ember-soft">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-[17px] font-medium text-cream">
                  {way.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-mist">
                  {way.body}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
