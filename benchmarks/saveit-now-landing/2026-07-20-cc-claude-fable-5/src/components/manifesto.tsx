import { Reveal } from "./reveal";

export const Manifesto = () => {
  return (
    <section className="relative overflow-hidden py-28 sm:py-40">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        aria-hidden="true"
      >
        <img
          src="/images/landing-v2/portal-arch.jpg"
          alt=""
          className="size-full object-cover object-center"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/40 to-ink" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6">
        <Reveal>
          <p className="text-[12px] tracking-[0.3em] text-ember uppercase">
            The idea
          </p>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-8 font-display text-3xl leading-[1.2] text-cream/85 sm:text-4xl lg:text-[2.9rem]">
            Every bookmark tool ever made asked you to be the librarian.
            Folders. Tags. Lists. Cleanup days you never got to.{" "}
            <em className="text-ember-soft">SaveIt.now asks for one thing:</em>{" "}
            save it. An agent reads every save, understands it, and files it,
            so the next time you need that article, that product, that video,{" "}
            <em className="text-ember-soft">you just ask.</em>
          </p>
        </Reveal>
      </div>
    </section>
  );
};
