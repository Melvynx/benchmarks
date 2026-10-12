import { ShieldCheckIcon, RefreshCcwIcon, HeartHandshakeIcon } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheckIcon,
    title: "Built to return what you keep",
    body: "Every save is captured with its full content, so a changed page or a deleted post does not take your memory with it.",
  },
  {
    icon: RefreshCcwIcon,
    title: "Organized without your labor",
    body: "Your agent keeps topics fresh as your interests move, so last spring research still answers this autumn question.",
  },
  {
    icon: HeartHandshakeIcon,
    title: "Confidence as a daily feeling",
    body: "Save boldly and move on. The product promise is simple: what you trusted to SaveIt stays within reach.",
  },
];

export const LandingStats = () => {
  return (
    <section id="promise" className="relative scroll-mt-20 overflow-hidden border-y border-white/10">
      <div className="absolute inset-0" aria-hidden="true">
        <img src="/images/landing-v2/lake.png" alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-[#100b08]/72" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#100b08] via-transparent to-[#100b08]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-32">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="eyebrow reveal">The 100 percent promise</p>
            <p className="display-xl reveal mt-4 text-[34vw] leading-none text-[#fff6ec] drop-shadow-[0_10px_60px_rgba(255,90,31,0.35)] sm:text-[10rem] lg:text-[12rem]">
              100<span className="text-[#ff8a5c]">%</span>
            </p>
            <h2 className="display-xl reveal mt-4 text-3xl text-[#ffd9b8] sm:text-4xl lg:text-5xl">
              Save with total confidence. <em className="text-[#ffc36b]">Come back to everything.</em>
            </h2>
          </div>
          <div className="reveal card rounded-3xl p-7 sm:p-8">
            <p className="text-base leading-relaxed text-[#fff6ec] sm:text-lg">
              Our aspirational promise: a home for bookmarks where rediscovery
              is the standard. Not a folder you forget, not a tab you lose, but
              a collection that answers when you call.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[#c9b3a1]">
              Like still water returning the mountain, your library reflects
              back what you placed in it. Save a recipe, a paper, a film to
              watch, a gift idea. Ask weeks later in your own words and meet it
              again, calm and intact.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Capture with context", "Meaning based search", "Sources kept whole"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs font-medium text-[#ffd9b8]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="reveal card rounded-2xl p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-[#ffc36b]">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-[#fff6ec]">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#c9b3a1]">{p.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
