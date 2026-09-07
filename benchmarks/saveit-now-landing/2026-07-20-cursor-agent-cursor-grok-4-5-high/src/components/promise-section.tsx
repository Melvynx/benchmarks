import { Reveal } from "./reveal";

export function PromiseSection() {
  return (
    <section
      id="promise"
      className="relative overflow-hidden text-on-dark"
    >
      <div className="absolute inset-0">
        <img
          src="/images/landing-v2/lake.png"
          alt="A still mountain lake reflecting a coral-lit peak, clarity matching what you saved"
          className="size-full object-cover object-center"
          width={3272}
          height={1834}
          loading="lazy"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/25"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-[1] mx-auto flex min-h-[min(85vh,52rem)] max-w-6xl items-center px-6 py-24 sm:py-32">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-medium tracking-[0.16em] text-white/75 uppercase">
            The 100% promise
          </p>
          <h2 className="font-display mt-5 text-balance text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.03em]">
            Everything you save should be findable again
          </h2>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
            Folders hide links. Tabs forget them. Bookmark lists bury them.
            SaveIt is built so rediscovery feels certain: ask in your words, and
            the right save surfaces because the agent already understood it.
          </p>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/70">
            That is the aspirational bar we design toward. Not a statistic. A
            product promise about confidence when you reach back for something
            that mattered.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
