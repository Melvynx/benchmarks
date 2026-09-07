import { CampaignStill } from "./campaign-still";

export function PromiseSection() {
  return (
    <section
      id="promise"
      className="relative isolate min-h-[85svh] overflow-hidden"
    >
      <CampaignStill
        name="lake"
        className="absolute inset-0 size-full object-cover"
        objectPosition="center 40%"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/55 via-canvas/25 to-canvas/80" />
      <div
        className="glow-pulse pointer-events-none absolute inset-x-[18%] top-[18%] h-40 rounded-full bg-ember/25 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[85svh] max-w-5xl flex-col justify-center px-5 py-24 text-center sm:px-8">
        <p className="font-display text-[clamp(5rem,18vw,6rem)] leading-none font-extrabold tracking-[-0.04em] text-portal">
          100%
        </p>
        <h2 className="font-display mt-4 text-[clamp(1.8rem,4vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em] text-balance text-ink">
          Built so you can find it again.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-ink/90 sm:text-lg">
          Folders fail because they ask you to remember where you put things.
          SaveIt is built so the save itself is enough. The 100% promise is
          confidence: if you kept it, you should be able to ask for it back.
        </p>
      </div>
    </section>
  );
}
