const scenes = [
  {
    src: "/images/landing-v2/portal-arch.png",
    title: "The quick save",
    body: "One gesture from anywhere. The arch is small because saving should feel small.",
  },
  {
    src: "/images/landing-v2/observatory.png",
    title: "The quiet agent",
    body: "Your collection is watched over. Summaries, topics and links appear on their own.",
  },
  {
    src: "/images/landing-v2/portal-rocks.png",
    title: "The fast return",
    body: "Ask in plain words. The doorway opens on the exact source you meant.",
  },
  {
    src: "/images/landing-v2/portal-ridge.png",
    title: "The open promise",
    body: "A door that stays open. What you save remains reachable whenever you return.",
  },
  {
    src: "/images/landing-v2/lake.png",
    title: "The calm recall",
    body: "No digging, no dread. Your past finds surface clear and complete.",
  },
  {
    src: "/images/landing-v2/home.png",
    title: "The home",
    body: "Everything you kept lives in one warm place. This is your home for bookmarks.",
  },
];

export function WhySaveIt() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28" aria-label="Campaign scenes">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow reveal">Six scenes, one idea</p>
          <h2 className="display-xl reveal mt-4 max-w-2xl text-4xl text-[#fff6ec] sm:text-5xl">
            A world built for <em className="text-[#ffc36b]">never losing things.</em>
          </h2>
        </div>
        <p className="reveal max-w-sm text-[15px] leading-relaxed text-[#c9b3a1]">
          Each campaign image marks a moment in the life of a save, from the
          tap that keeps it to the question that brings it back.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenes.map((s, i) => (
          <figure
            key={s.title}
            className={`reveal group relative overflow-hidden rounded-2xl border border-white/10 ${
              i === 0 ? "sm:col-span-2 lg:col-span-1" : ""
            }`}
          >
            <img
              src={s.src}
              alt={`${s.title}, campaign photograph`}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#100b08]/90 via-[#100b08]/10 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffc36b]">
                Scene {String(i + 1).padStart(2, "0")}
              </p>
              <p className="mt-1 font-elegant text-xl text-white">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#e8d5c2]">{s.body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
