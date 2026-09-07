import { campaign } from "../lib/campaign-images";
import { IOS_URL } from "../lib/site";
import { CampaignPicture } from "./ui/campaign-picture";
import { Cta, CtaArrow } from "./ui/cta";
import { Reveal } from "./ui/reveal";
import { SectionLabel } from "./ui/section-label";

const POINTS = [
  {
    title: "Share sheet saving",
    body: "Anything an app can share, you can save. Safari, a video, a message, a PDF. Pick SaveIt and carry on with what you were doing.",
  },
  {
    title: "Ask on the move",
    body: "Search by meaning from your phone. Half a memory and a few words are enough to bring the right thing back.",
  },
  {
    title: "One library everywhere",
    body: "What you save on the phone is waiting on the laptop before you have put the phone down. There is no second inbox to reconcile.",
  },
];

/**
 * The mobile half of the promise, set against `lake`, whose mirrored surface
 * carries the idea of one library reflected across every device.
 */
export function IosSection() {
  return (
    <section id="ios" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <CampaignPicture
          image={campaign.lake}
          decorative
          sizes="100vw"
          className="h-full w-full"
          imgClassName="object-[50%_60%]"
        />
        <div className="absolute inset-0 bg-ink/86" />
        <div className="absolute inset-x-0 top-0 h-44 bg-linear-to-b from-ink to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-ink to-transparent" />
      </div>

      <div className="mx-auto max-w-[88rem] px-5 py-24 sm:px-8 sm:py-32 lg:py-40">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-6">
            <SectionLabel index="05">On iPhone</SectionLabel>
            <h2 className="display-lg mt-6 text-glow">
              Save it before
              <br />
              <em className="italic text-gradient-ember">you look away.</em>
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-cream/78 sm:text-lg">
              The best thing you find today will arrive on your phone, in the
              middle of something else. SaveIt lives in the share sheet so
              keeping it costs you one tap and no attention.
            </p>

            <ul className="mt-10 flex flex-col gap-7">
              {POINTS.map((point) => (
                <li key={point.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 h-px w-6 shrink-0 bg-linear-to-r from-ember to-transparent"
                  />
                  <div>
                    <h3 className="text-[15px] font-medium text-glow">
                      {point.title}
                    </h3>
                    <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted">
                      {point.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Cta href={IOS_URL} variant="ghost" size="lg">
                See the iOS app
                <CtaArrow />
              </Cta>
            </div>
          </Reveal>

          <Reveal
            variant="blur"
            delay={120}
            className="flex justify-center lg:col-span-6"
          >
            <ShareSheetIllustration />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/**
 * A diagram of the share sheet moment, drawn entirely from primitives.
 *
 * It is deliberately abstract and captioned as an illustration: it shows where
 * SaveIt sits in the iOS flow without passing itself off as a screenshot of
 * the real application.
 */
function ShareSheetIllustration() {
  return (
    <figure className="w-full max-w-[19rem]">
      <div className="float-soft relative">
        {/* Warm bloom behind the device, matching the light in the plates. */}
        <div
          aria-hidden="true"
          className="absolute -inset-8 -z-10 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(255,106,61,0.28), transparent 68%)",
          }}
        />

        <div className="relative aspect-9/19 w-full overflow-hidden rounded-[2.6rem] border border-lilac/25 bg-ink-2 p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
          <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-linear-to-b from-ink-3 to-ink">
            {/* Whatever you were already looking at, kept unreadable on
                purpose: this is a diagram, not a captured screen. */}
            <div aria-hidden="true" className="space-y-2.5 p-5 pt-8 opacity-35">
              <div className="h-2.5 w-2/3 rounded-full bg-lilac/40" />
              <div className="h-2 w-full rounded-full bg-lilac/20" />
              <div className="h-2 w-11/12 rounded-full bg-lilac/20" />
              <div className="mt-4 h-24 w-full rounded-xl bg-lilac/15" />
              <div className="h-2 w-3/4 rounded-full bg-lilac/20" />
              <div className="h-2 w-5/6 rounded-full bg-lilac/20" />
            </div>

            {/* The sheet. Visible by default so that switching motion off
                leaves the illustration complete. */}
            <div className="sheet-rise absolute inset-x-1.5 bottom-1.5 rounded-[1.7rem] border border-lilac/20 bg-ink-2/95 p-3.5 backdrop-blur-xl">
              <div
                aria-hidden="true"
                className="mx-auto h-1 w-9 rounded-full bg-lilac/35"
              />

              <div aria-hidden="true" className="mt-4 flex justify-between px-1">
                {["bg-lilac/25", "bg-lilac/25", "bg-lilac/25", "bg-lilac/25"].map(
                  (tone, index) => (
                    <div key={index} className="flex flex-col items-center gap-1.5">
                      <div className={`size-9 rounded-full ${tone}`} />
                      <div className="h-1.5 w-6 rounded-full bg-lilac/20" />
                    </div>
                  ),
                )}
              </div>

              <div className="mt-4 space-y-2">
                {/* The one row that matters. */}
                <div className="row-highlight flex items-center gap-2.5 rounded-xl border border-ember/65 bg-ember/25 px-3 py-2.5">
                  <span aria-hidden="true" className="relative flex size-4">
                    <span className="absolute inset-0 rounded-full bg-ember blur-[3px]" />
                    <span className="absolute inset-0 rounded-full bg-amber" />
                  </span>
                  <span className="text-[12px] font-medium text-glow">
                    Save to SaveIt.now
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-auto text-[11px] text-amber"
                  >
                    ✦
                  </span>
                </div>

                {[0, 1].map((row) => (
                  <div
                    key={row}
                    aria-hidden="true"
                    className="flex items-center gap-2.5 rounded-xl border border-lilac/12 px-3 py-2.5"
                  >
                    <div className="size-4 rounded-full bg-lilac/20" />
                    <div className="h-1.5 w-24 rounded-full bg-lilac/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="mt-5 text-center text-[12px] leading-relaxed text-faint">
        Illustration of where SaveIt appears in the iOS share sheet. Not a
        screenshot of the app.
      </figcaption>
    </figure>
  );
}
