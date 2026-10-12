import { CampaignStill } from "./campaign-still";

const points = [
  {
    title: "Save in the moment",
    body: "On the phone, you keep the page, video, image, or post while it is open. The save is still the only manual step.",
  },
  {
    title: "Find it in the same app",
    body: "Rediscovery does not wait for a desktop session. You open SaveIt and ask for the thing you remember.",
  },
  {
    title: "One library",
    body: "The phone does not invent a second filing method. Web and iOS share the same home for bookmarks.",
  },
];

export function IosSection() {
  return (
    <section
      id="ios"
      className="section-anchor grid gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-12 lg:py-28"
    >
      <div className="order-2 min-w-0 max-w-xl lg:order-1">
        <h2 className="text-balance font-display text-[clamp(2.15rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
          Save it on the phone.
        </h2>
        <p className="mt-5 text-pretty text-base leading-relaxed text-muted sm:text-lg">
          The iOS app is the same home, carried with you. Saving and finding
          what you saved should feel immediate and native wherever you already
          are, without a folder system to learn on the go.
        </p>
        <dl className="mt-8 space-y-6">
          {points.map((point) => (
            <div key={point.title}>
              <dt className="font-display text-xl font-semibold tracking-[-0.03em] text-ivory">
                {point.title}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
                {point.body}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <figure className="order-1 min-w-0 lg:order-2">
        <div className="still-frame overflow-hidden rounded-xl border border-line bg-ink-raised">
          <CampaignStill
            name="home"
            sizes="(min-width: 1024px) 46vw, 100vw"
            alt="A small house with warm windows sits on a flowered hill at dusk, with a stone path leading to the door."
            className="aspect-[2200/1233] h-auto w-full object-cover object-[center_55%]"
          />
        </div>
        <figcaption className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Campaign still of a lit house on a hill. This is not a screenshot of
          the iOS app.
        </figcaption>
      </figure>
    </section>
  );
}
