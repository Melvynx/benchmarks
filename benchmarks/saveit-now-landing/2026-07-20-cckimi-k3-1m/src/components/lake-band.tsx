import { useParallax } from "../lib/motion";
import { Reveal } from "./reveal";

export const LakeBand = () => {
  const { sectionRef, layerRef } = useParallax<HTMLElement>(0.3);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[70svh] items-center justify-center overflow-hidden"
      aria-label="Editorial interlude about rediscovery"
    >
      <div ref={layerRef} className="absolute -inset-y-16 inset-x-0">
        <img
          src="/images/landing-v2/lake.png"
          alt="A still alpine lake at golden hour, reflecting a pink-lit mountain peak"
          className="size-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-coal/35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-coal-deep to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-coal to-transparent" />

      <Reveal className="relative z-10 px-6">
        <p className="text-center text-[12px] font-medium uppercase tracking-[0.3em] text-ink/80">
          Rediscovery
        </p>
        <p className="mx-auto mt-5 max-w-3xl text-balance text-center font-display text-3xl leading-[1.15] tracking-tight text-ink drop-shadow-[0_2px_16px_rgba(20,13,10,0.6)] sm:text-4xl lg:text-5xl">
          Your saves, reflected back{" "}
          <em className="display-italic">exactly when you need them.</em>
        </p>
      </Reveal>
    </section>
  );
};
