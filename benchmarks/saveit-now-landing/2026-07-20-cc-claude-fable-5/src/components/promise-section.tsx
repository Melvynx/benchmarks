import { EyeIcon, InboxIcon, MessageSquareTextIcon } from "lucide-react";

import { Reveal } from "./reveal";

const PILLARS = [
  {
    icon: InboxIcon,
    title: "Captured in full",
    copy: "Page, text, and imagery are stored the moment you save, so nothing depends on a link staying alive.",
  },
  {
    icon: EyeIcon,
    title: "Understood by the agent",
    copy: "Every save is read and given meaning, not just a URL and a date.",
  },
  {
    icon: MessageSquareTextIcon,
    title: "Ready when you ask",
    copy: "Describe what you remember, even vaguely, and your save comes back.",
  },
];

export const PromiseSection = () => {
  return (
    <section id="promise" className="relative scroll-mt-16 overflow-hidden">
      {/* The observatory keeping watch, its halo standing in for the full circle */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src="/images/landing-v2/observatory.jpg"
          alt=""
          className="size-full object-cover object-center"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-ink/30" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0e0a11_0%,transparent_22%,transparent_78%,#0e0a11_100%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-32 text-center sm:py-44">
        <Reveal>
          <p className="text-[12px] tracking-[0.3em] text-ember-soft uppercase">
            The promise
          </p>
        </Reveal>

        <Reveal delay={100}>
          <p
            className="mt-6 font-display text-[7rem] leading-none tracking-tight text-cream drop-shadow-[0_0_60px_rgba(255,180,120,0.45)] sm:text-[11rem] lg:text-[14rem]"
            aria-label="100 percent"
          >
            100%
          </p>
          <p className="mx-auto mt-4 max-w-xl font-display text-2xl italic text-ember-soft drop-shadow-[0_2px_14px_rgba(14,10,17,0.9)] sm:text-3xl">
            of what you save should come back to you.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-cream/75 sm:text-lg">
            Not most of it. Not just the recent stuff. Everything. We build
            SaveIt.now around one aspiration: if you saved it, you can
            rediscover it, whether that was this morning or two years ago.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 120}>
              <div className="h-full rounded-2xl border border-cream/15 bg-ink/55 p-6 backdrop-blur-md">
                <pillar.icon
                  className="size-5 text-ember-soft"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-[15px] font-medium text-cream">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/65">
                  {pillar.copy}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
