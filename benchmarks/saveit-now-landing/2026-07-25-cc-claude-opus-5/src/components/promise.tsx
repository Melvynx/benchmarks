import { campaign } from "../lib/campaign-images";
import { CampaignPicture } from "./ui/campaign-picture";
import { Reveal } from "./ui/reveal";
import { SectionLabel } from "./ui/section-label";

const PILLARS = [
  {
    title: "Nothing waits on you",
    body: "No item sits unfiled because you never got around to it. Filing happens at save time, every time.",
  },
  {
    title: "Nothing needs its name",
    body: "Meaning is the index. Describe the idea, the shape, the moment you saw it, and it surfaces.",
  },
  {
    title: "Nothing goes quiet",
    body: "A link from two years ago answers as readily as the one you saved this morning.",
  },
];

/**
 * The rediscovery promise, built around `portal-rocks`, where the light leaves
 * the doorway and runs downhill toward the viewer. The figure is poured full
 * of that same frame so the number reads as a place rather than a statistic.
 */
export function RediscoveryPromise() {
  const clipImage = `url(${campaign.rocks.fallback})`;

  return (
    <section id="promise" className="relative isolate overflow-hidden">
      {/* Atmosphere */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <CampaignPicture
          image={campaign.rocks}
          decorative
          sizes="100vw"
          className="h-full w-full"
          imgClassName="scale-105 object-[50%_55%]"
        />
        <div className="absolute inset-0 bg-ink/82" />
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-ink to-transparent" />
      </div>

      <div className="mx-auto max-w-[88rem] px-5 py-28 sm:px-8 sm:py-36 lg:py-44">
        <Reveal className="flex flex-col items-center text-center">
          <SectionLabel index="04" className="justify-center">
            The promise
          </SectionLabel>

          <p
            className="image-clip-text lining-figures mt-8 font-display leading-[0.82] tracking-[-0.05em]"
            style={{
              fontSize: "clamp(6rem, 26vw, 20rem)",
              ["--clip-image" as string]: clipImage,
            }}
          >
            100%
          </p>

          <h2 className="display-md mt-6 max-w-3xl text-glow">
            Everything you save is meant to be found again.
          </h2>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg">
            Not most of it. Not only the parts you remembered to tag. SaveIt is
            built so that every single thing you keep stays reachable, in your
            own words, for as long as you keep it.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-lilac/15 bg-lilac/12 sm:mt-20 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <Reveal
              key={pillar.title}
              delay={index * 110}
              className="glass p-8 sm:p-9"
            >
              <span
                aria-hidden="true"
                className="block h-px w-10 bg-linear-to-r from-ember to-transparent"
              />
              <h3 className="mt-5 font-display text-xl text-glow sm:text-[1.4rem]">
                {pillar.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                {pillar.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
