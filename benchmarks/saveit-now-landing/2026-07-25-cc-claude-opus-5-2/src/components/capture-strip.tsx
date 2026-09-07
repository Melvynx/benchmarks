import { usePrefersReducedMotion } from "../lib/motion";

/**
 * Everything the product swallows, and every place you can hand it over from.
 * Sits directly under the hero to answer "will it take my thing?" before the
 * visitor has to ask.
 */
const SURFACES = [
  "Web pages",
  "YouTube videos",
  "X posts",
  "PDFs",
  "Images",
  "Chrome extension",
  "Firefox extension",
  "iOS share sheet",
  "Right click to save",
  "Paste a link",
];

function Item({ label }: { label: string }) {
  return (
    <li className="flex shrink-0 items-center gap-6 text-[0.8125rem] tracking-wide text-mist sm:gap-8">
      <span>{label}</span>
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-ember-500/70" />
    </li>
  );
}

export function CaptureStrip() {
  const reduced = usePrefersReducedMotion();

  return (
    <section
      aria-label="What you can save, and where you can save it from"
      className="relative border-y border-line/70 bg-ink-2/60 py-5"
    >
      {reduced ? (
        // No marquee: a wrapped list keeps every item readable and reachable.
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 sm:px-8">
          {SURFACES.map((label) => (
            <Item key={label} label={label} />
          ))}
        </ul>
      ) : (
        <div className="relative overflow-hidden">
          {/* Feather both ends so items enter and leave rather than pop. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-ink to-transparent sm:w-32"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-ink to-transparent sm:w-32"
          />

          <div className="flex w-max animate-marquee">
            {/* Two identical runs: the first scrolls exactly its own width, so
                the reset is invisible. The clone is hidden from the a11y tree. */}
            <ul className="flex shrink-0 items-center gap-6 pr-6 sm:gap-8 sm:pr-8">
              {SURFACES.map((label) => (
                <Item key={label} label={label} />
              ))}
            </ul>
            <ul
              aria-hidden="true"
              className="flex shrink-0 items-center gap-6 pr-6 sm:gap-8 sm:pr-8"
            >
              {SURFACES.map((label) => (
                <Item key={`clone-${label}`} label={label} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
