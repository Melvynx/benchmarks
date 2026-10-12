import { useState } from "react";
import { MousePointerClickIcon, ScanSearchIcon, MessagesSquareIcon } from "lucide-react";

const steps = [
  {
    id: "save",
    n: "01",
    icon: MousePointerClickIcon,
    title: "Save in one tap",
    body: "Use the share sheet, the browser extension or paste a link. One gesture and you are done. SaveIt keeps the full page, the video, the PDF or the post.",
    image: "/images/landing-v2/portal-arch.png",
    alt: "A small glowing arch on a flowered hill, the campaign image for one tap saving",
    caption: "The arch moment: saving takes one second",
  },
  {
    id: "understand",
    n: "02",
    icon: ScanSearchIcon,
    title: "Your agent files it for you",
    body: "Screenshots, summaries, topics and connections are added automatically. Your collection organizes itself around what things mean, not where you put them.",
    image: "/images/landing-v2/observatory.png",
    alt: "A hilltop observatory with a glowing arc, the campaign image for the agent that watches and organizes",
    caption: "The observatory: always watching, always sorting",
  },
  {
    id: "retrieve",
    n: "03",
    icon: MessagesSquareIcon,
    title: "Ask and it returns",
    body: "Describe what you remember in plain words. Your library answers with the original source attached, ready to open, quote or share.",
    image: "/images/landing-v2/portal-rocks.png",
    alt: "A pale glowing doorway framed by rocks, the campaign image for asking and getting back what you saved",
    caption: "The doorway: every question finds its source",
  },
];

export const HowItWorks = () => {
  const [active, setActive] = useState(steps[1]);

  return (
    <section id="workflow" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
      <p className="eyebrow reveal">The agentic workflow</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <h2 className="display-xl reveal text-4xl text-[#fff6ec] sm:text-5xl lg:text-6xl">
          You save. <em className="text-[#ffc36b]">The rest is handled.</em>
        </h2>
        <p className="reveal max-w-xl text-base leading-relaxed text-[#c9b3a1]">
          This is the just save it mechanism. Capture, understanding,
          categorization, organization and retrieval run on their own, so a busy
          day of saving still ends in a library you can trust.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-3" role="tablist" aria-label="Agentic workflow steps">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === active.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={isActive}
                data-active={isActive}
                onClick={() => setActive(s)}
                className="workflow-tab reveal rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left hover:border-white/25"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5a1f]/15 text-[#ffc36b]">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7a6b]">
                      Step {s.n}
                    </p>
                    <h3 className="mt-0.5 text-lg font-semibold text-[#fff6ec]">{s.title}</h3>
                  </div>
                </div>
                {isActive && (
                  <p className="mt-3 text-[15px] leading-relaxed text-[#c9b3a1]">{s.body}</p>
                )}
              </button>
            );
          })}
          <div className="reveal card rounded-2xl p-5">
            <p className="text-sm leading-relaxed text-[#f3d9bd]">
              Before SaveIt: 47 open tabs, three bookmark folders named final,
              and a link you swear you saved. After SaveIt: one place to save,
              one place to ask.
            </p>
          </div>
        </div>

        <div className="reveal hero-img-frame relative min-h-[420px] overflow-hidden rounded-3xl lg:min-h-[560px]">
          {steps.map((s) => (
            <img
              key={s.id}
              src={s.image}
              alt={s.alt}
              loading="lazy"
              className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
                s.id === active.id ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#100b08]/90 via-[#100b08]/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffc36b]">
              Now showing {active.n} / 03
            </p>
            <p className="mt-2 font-elegant text-2xl text-white sm:text-3xl">{active.caption}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
