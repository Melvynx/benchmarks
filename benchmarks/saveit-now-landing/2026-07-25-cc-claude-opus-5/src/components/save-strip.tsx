import { useReducedMotion } from "../lib/use-reduced-motion";

/** Everything the capture step accepts, stated plainly rather than counted. */
const SAVEABLE = [
  "Articles",
  "YouTube videos",
  "PDFs",
  "X posts",
  "Product pages",
  "Screenshots",
  "Recipes",
  "Documentation",
  "Newsletters",
  "Images",
  "GitHub repos",
  "Podcasts",
];

/**
 * A quiet band under the hero that answers the first question a visitor has:
 * what can I actually put in this. It scrolls under reduced motion too, just
 * as a static wrapped list instead of a marquee.
 */
export function SaveStrip() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <section
        aria-label="What you can save"
        className="border-y border-lilac/10 bg-ink-2/40 py-6"
      >
        <ul className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 text-[13px] text-muted sm:px-8">
          {SAVEABLE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section
      aria-label="What you can save"
      className="relative overflow-hidden border-y border-lilac/10 bg-ink-2/40 py-6"
    >
      {/* Feathered edges so items enter and leave instead of being clipped. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-ink to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-ink to-transparent"
      />

      <div className="marquee-track flex w-max items-center">
        {/* Rendered twice so the -50% translate loops seamlessly. The copy is
            hidden from assistive tech, which reads the list once instead. */}
        {[0, 1].map((pass) => (
          <ul
            key={pass}
            aria-hidden={pass === 1 || undefined}
            className="flex items-center"
          >
            {SAVEABLE.map((item) => (
              <li
                key={item}
                className="flex items-center gap-8 whitespace-nowrap px-8 text-[13px] tracking-wide text-muted"
              >
                {item}
                <span
                  aria-hidden="true"
                  className="size-1 rounded-full bg-ember/60"
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
