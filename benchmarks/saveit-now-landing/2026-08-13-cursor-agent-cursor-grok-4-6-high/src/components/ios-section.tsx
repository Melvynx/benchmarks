import { CampaignStill } from "./campaign-still";

export function IosSection() {
  return (
    <section id="ios" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance text-ink">
            In your pocket, the same promise.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-pretty text-mute">
            Saving should not wait until you are back at a desk. From Safari,
            YouTube, or Messages, share a link into SaveIt. Later, open the app
            and ask for it in the same language you would use out loud.
          </p>
          <ul className="mt-8 space-y-4 text-sm leading-relaxed text-mute">
            <li>
              <span className="font-semibold text-ink">Share Sheet.</span> One
              system action. No filing ritual on the sidewalk.
            </li>
            <li>
              <span className="font-semibold text-ink">Ask on the go.</span>{" "}
              Rediscovery uses the same agent, not a separate mobile inbox.
            </li>
            <li>
              <span className="font-semibold text-ink">Native feel.</span> Built
              for iOS so the save is immediate wherever you are browsing.
            </li>
          </ul>
          <a
            href="/ios"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-portal px-5 text-sm font-semibold text-canvas transition-colors duration-200 hover:bg-ink"
          >
            Get the iOS app
          </a>
        </div>

        <div className="flex justify-center lg:justify-end">
          <figure className="relative w-full max-w-[320px]">
            <div
              className="absolute -inset-8 rounded-full bg-ember/20 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative rounded-[1.75rem] border border-portal/40 bg-canvas p-3">
              <div className="overflow-hidden rounded-[1.35rem]">
                <CampaignStill
                  name="portalRidge"
                  className="aspect-[9/16] w-full object-cover"
                  objectPosition="center 45%"
                />
              </div>
            </div>
            <figcaption className="relative mt-5 text-center text-sm text-mute">
              Art from the campaign: the doorway you carry. Not a screenshot of
              the app.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
