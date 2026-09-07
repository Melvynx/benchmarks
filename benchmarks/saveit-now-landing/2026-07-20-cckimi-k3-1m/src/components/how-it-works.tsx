import { AgentDemo } from "./agent-demo";
import { Reveal } from "./reveal";

const STEPS = [
  {
    number: "01",
    title: "Just save it",
    body: "One tap from the share sheet, one click from the extension. No folders to pick, no tags to invent, no decisions to make.",
  },
  {
    number: "02",
    title: "Your agent takes over",
    body: "It reads every page you save, understands what it is, and files it where it belongs. Your library organizes itself.",
  },
  {
    number: "03",
    title: "Ask, and it is back",
    body: "Describe what you remember in plain words. The right link surfaces in seconds, not after a dig through tabs.",
  },
];

export const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-20 px-5 py-24 sm:px-8 lg:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Copy + steps */}
          <div>
            <Reveal>
              <p className="kicker text-ember">01 · The agentic workflow</p>
              <h2 className="mt-6 text-balance font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                You save it.{" "}
                <em className="display-italic text-flare">
                  Everything else is done for you.
                </em>
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-dusk">
                Bookmarking used to mean filing. SaveIt ends that. Capture
                takes a second, and the agent handles capture, understanding,
                organization, and retrieval from there.
              </p>
            </Reveal>

            <ol className="mt-12 space-y-0">
              {STEPS.map((step, i) => (
                <Reveal key={step.number} as="div" delay={i * 120}>
                  <li className="group grid grid-cols-[auto_1fr] gap-6 border-t border-white/[0.08] py-7 last:border-b">
                    <span className="font-display text-2xl italic text-ember/80 transition-colors duration-300 group-hover:text-ember">
                      {step.number}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-haze">
                        {step.body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>

          {/* Observatory plate */}
          <Reveal delay={150} className="lg:sticky lg:top-28">
            <figure className="group relative overflow-hidden rounded-2xl border border-white/[0.08]">
              <img
                src="/images/landing-v2/observatory.png"
                alt="A modern observatory with a glowing halo on a green hill at dusk, watched by a lone figure in the meadow"
                className="aspect-[4/5] w-full object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.03] sm:aspect-[5/4] lg:aspect-[4/5]"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-coal/70 via-transparent to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                <span className="text-sm font-medium text-ink">
                  Your agent, on duty around the clock.
                </span>
                <span className="glow-pulse size-2 shrink-0 rounded-full bg-flare shadow-[0_0_16px_4px] shadow-flare/50" />
              </figcaption>
            </figure>
          </Reveal>
        </div>

        {/* Live demo */}
        <Reveal delay={100} className="mt-16 lg:mt-24">
          <div id="demo" className="mx-auto max-w-4xl scroll-mt-28">
            <p className="mb-5 text-center text-[13px] font-medium uppercase tracking-[0.22em] text-haze">
              Watch the agent answer a real question
            </p>
            <AgentDemo />
          </div>
        </Reveal>
      </div>
    </section>
  );
};
