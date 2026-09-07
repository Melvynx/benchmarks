import { useRef } from "react";
import { useReducedMotion } from "../lib/motion";
import { Reveal } from "./reveal";

const PILLARS = [
  {
    title: "Nothing to file",
    body: "Folders were the job. The agent does it now, the moment you hit save.",
  },
  {
    title: "Nothing to forget",
    body: "Every save is read and understood, so it stays reachable even when the details fade.",
  },
  {
    title: "Everything findable",
    body: "Ask in plain words and get the exact link back. That is the whole promise.",
  },
];

export const PromiseSection = () => {
  const numeralRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  const onPointerMove = (event: React.PointerEvent) => {
    if (reducedMotion || !numeralRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 6;
    numeralRef.current.style.setProperty(
      "--clip-position",
      `${50 + x}% ${38 + y}%`,
    );
  };

  return (
    <section
      id="promise"
      onPointerMove={onPointerMove}
      className="relative scroll-mt-20 overflow-hidden bg-coal-deep px-5 py-24 sm:px-8 lg:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="kicker justify-center text-ember">
            02 · The 100% promise
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div
            ref={numeralRef}
            aria-hidden="true"
            className="clipped-image-text mt-4 select-none text-center text-[clamp(7rem,26vw,22rem)] font-semibold leading-[0.95] tracking-[-0.05em]"
            style={
              {
                "--clip-image": "url(/images/landing-v2/portal-arch.png)",
                "--clip-position": "50% 38%",
              } as React.CSSProperties
            }
          >
            100%
          </div>
          <span className="sr-only">
            The 100% promise: every save comes back.
          </span>
        </Reveal>

        <Reveal delay={180}>
          <h2 className="mx-auto mt-2 max-w-3xl text-balance text-center font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Every save <em className="display-italic text-flare">comes back.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-dusk">
            Everything you save stays findable. Not buried in folders, not lost
            in tabs. Every page, every video, every half-remembered idea is one
            question away. Save it once and trust the way back is always open.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 120} className="h-full">
              <div className="h-full bg-coal-deep p-7 transition-colors duration-300 hover:bg-panel">
                <p className="font-display text-xl italic text-flare">
                  {pillar.title}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-haze">
                  {pillar.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
