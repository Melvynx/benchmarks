import { CheckIcon, RefreshCwIcon, SearchIcon, Share2Icon } from "lucide-react";

import { Reveal } from "./reveal";

const FEATURES = [
  {
    icon: Share2Icon,
    title: "Save from the share sheet",
    copy: "Send anything from Safari, X, YouTube, or any app. Two taps and it is captured, agent already at work.",
  },
  {
    icon: RefreshCwIcon,
    title: "One library, every device",
    copy: "Save on the phone during a commute, ask on the laptop at your desk. It is the same home.",
  },
  {
    icon: SearchIcon,
    title: "Rediscover on the go",
    copy: "The same plain-words search, in your pocket, the moment a conversation needs that link back.",
  },
];

export const IosSection = () => {
  return (
    <section id="ios" className="scroll-mt-16 overflow-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="text-[12px] tracking-[0.3em] text-ember uppercase">
              SaveIt.now for iPhone
            </p>
            <h2 className="mt-6 font-display text-4xl leading-[1.05] tracking-tight text-cream sm:text-5xl">
              Saving feels native, <em className="text-ember-soft">because it is.</em>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-cream/65">
              Most links worth keeping show up on your phone first. The iOS app
              makes the save instant and native, then hands the rest to the
              agent.
            </p>
          </Reveal>

          <div className="mt-10 flex flex-col gap-7">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 120}>
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-ember/25 bg-ember/10 text-ember">
                    <feature.icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-medium text-cream">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-cream/60">
                      {feature.copy}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="/ios"
                className="inline-flex h-11 items-center rounded-full bg-cream px-6 text-sm font-medium text-ink transition-all duration-300 hover:bg-white hover:shadow-[0_0_44px_rgba(255,122,69,0.35)]"
              >
                Get the iOS app
              </a>
              <span className="text-[13px] text-cream/50">
                Free to download
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={100} className="flex justify-center lg:justify-end">
          <div className="relative">
            <div
              className="absolute -inset-12 rounded-full bg-ember/15 blur-3xl"
              aria-hidden="true"
            />
            <figure className="relative m-0">
              <div className="float-slow relative w-[280px] rotate-2 overflow-hidden rounded-[3rem] border border-cream/20 bg-ink-soft p-2 shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)] transition-transform duration-500 hover:rotate-0 sm:w-[310px]">
                <div className="relative overflow-hidden rounded-[2.5rem]">
                  <img
                    src="/images/landing-v2/lake.jpg"
                    alt="Campaign artwork of an alpine lake at dusk shown inside an iPhone frame"
                    className="aspect-[9/19] w-full object-cover"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink/70"
                    aria-hidden="true"
                  />

                  {/* Dynamic island */}
                  <div
                    className="absolute left-1/2 top-3 h-7 w-24 -translate-x-1/2 rounded-full bg-ink"
                    aria-hidden="true"
                  />

                  {/* Illustrative save confirmation */}
                  <div className="absolute inset-x-4 bottom-5 rounded-2xl border border-cream/20 bg-ink/70 p-4 backdrop-blur-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-full bg-ember">
                        <CheckIcon className="size-4 text-ink" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-[13px] font-medium text-cream">
                          Saved to SaveIt.now
                        </p>
                        <p className="text-[11px] text-cream/55">
                          The agent is filing it for you
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["Alpine lake", "Travel ideas", "Dusk light"].map(
                        (tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-cream/15 bg-cream/10 px-2.5 py-0.5 text-[10px] text-cream/75"
                          >
                            {tag}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <figcaption className="mt-5 text-center text-[12px] text-cream/40">
                Campaign artwork shown. The app stays out of your way.
              </figcaption>
            </figure>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
