import { Reveal } from "./ui/reveal";
import { SectionLabel } from "./ui/section-label";

const BEFORE = [
  "A tab you keep open for three weeks so you do not lose it.",
  "A folder named Read Later that you stopped opening.",
  "A search that only works if you recall the exact title.",
  "The quiet certainty that you saved it somewhere.",
];

const AFTER = [
  "One tap, and it leaves your head without leaving your life.",
  "No folder to choose. No tag to invent. Nothing to tidy later.",
  "Search by what it was about, not what it was called.",
  "You ask in plain words. It comes back.",
];

/**
 * The turn from problem to promise. Deliberately type only: the campaign art
 * returns in the next section and lands harder after a quiet page.
 */
export function Transformation() {
  return (
    <section id="shift" className="relative py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <SectionLabel index="01">The shift</SectionLabel>
          <h2 className="display-lg mt-6 text-glow">
            Saving was never the hard part.
            <br />
            <em className="italic text-muted">Finding it again was.</em>
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Bookmarks fail at the moment you need them. SaveIt is built for that
            moment, so the thing you kept is still there when it finally
            matters.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-lilac/12 bg-lilac/10 sm:mt-20 lg:grid-cols-2">
          <Reveal className="bg-ink-2/80 p-8 sm:p-12">
            <p className="eyebrow text-faint">Bookmarks today</p>
            <ul className="mt-8 flex flex-col gap-6">
              {BEFORE.map((line) => (
                <li key={line} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 h-px w-5 shrink-0 bg-faint/60"
                  />
                  <span className="text-[15px] leading-relaxed text-muted/85">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delay={120}
            className="ember-wash relative bg-ink-3/80 p-8 sm:p-12"
          >
            <p className="eyebrow text-amber">With SaveIt.now</p>
            <ul className="mt-8 flex flex-col gap-6">
              {AFTER.map((line) => (
                <li key={line} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-ember shadow-[0_0_12px_2px_rgba(255,106,61,0.6)]"
                  />
                  <span className="text-[15px] leading-relaxed text-cream">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
