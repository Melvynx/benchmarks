import { campaign } from "../lib/campaign-images";
import { EXTENSIONS_URL, SIGN_UP_URL } from "../lib/site";
import { CampaignPicture } from "./ui/campaign-picture";
import { Cta, CtaArrow } from "./ui/cta";
import { Reveal } from "./ui/reveal";
import { SectionLabel } from "./ui/section-label";

/**
 * The last frame: one lit house alone on a dark hill. It closes the campaign
 * on the brand line, since a home for your bookmarks is exactly what the
 * picture shows. The plate fades to ink at the base so the footer sits flat
 * against it.
 */
export function ClosingCta() {
  return (
    <section id="start" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <CampaignPicture
          image={campaign.home}
          decorative
          sizes="100vw"
          className="h-full w-full"
          imgClassName="object-[50%_45%]"
        />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-ink to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink via-ink/70 to-transparent" />
      </div>

      <div className="mx-auto max-w-[88rem] px-5 py-32 sm:px-8 sm:py-40 lg:py-48">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <SectionLabel index="08" className="justify-center">
            Begin
          </SectionLabel>

          <h2 className="display-lg mt-7 text-glow">
            Save the next thing you find.
            <br />
            <em className="italic text-gradient-ember">
              Let us keep the rest.
            </em>
          </h2>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-cream/80 sm:text-lg">
            Start on the free plan and stop filing today. Everything you save
            from this point is meant to come back the moment you ask for it.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cta href={SIGN_UP_URL} size="lg">
              Start free
              <CtaArrow />
            </Cta>
            <Cta href={EXTENSIONS_URL} variant="ghost" size="lg">
              Get the extension
            </Cta>
          </div>

          <p className="mt-5 text-[13px] text-muted">
            Free plan, no card needed. Pro is $5 a month billed annually.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
