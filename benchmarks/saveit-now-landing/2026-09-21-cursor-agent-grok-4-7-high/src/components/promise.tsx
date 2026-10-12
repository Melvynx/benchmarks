import { CampaignStill } from "./campaign-still";

export function PromiseSection() {
  return (
    <section id="promise" className="section-anchor">
      <figure>
        <CampaignStill
          name="lake"
          sizes="100vw"
          alt="A turquoise alpine lake reflects a jagged mountain lit in coral light, with pines along the rocky shore."
          className="h-[min(72vh,760px)] min-h-72 w-full object-cover object-[center_58%]"
        />
      </figure>

      <div className="px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-x-16">
          <h2 className="text-balance font-display text-[clamp(2.15rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.03em] lg:col-start-2">
            Find what you saved.
          </h2>
          <p className="font-display text-[clamp(4.5rem,12vw,6rem)] font-semibold leading-none tracking-[-0.03em] text-coral lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">
            100%
          </p>
          <div className="max-w-xl lg:col-start-2">
            <p className="text-pretty text-base leading-relaxed text-muted sm:text-lg">
              This 100% is a promise, not a measured rate. It is the standard
              SaveIt is built for: if you saved something, you should be able
              to find it again. Not by reopening a folder from months ago. Not
              by hoping a tab is still there. You remember a piece of it, you
              ask, and that save comes back.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              The mountain returns in the lake. Retrieval should feel that
              clear.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
