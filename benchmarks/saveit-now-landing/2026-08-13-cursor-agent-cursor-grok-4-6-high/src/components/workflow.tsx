import { AskDemo } from "./ask-demo";
import { CampaignStill } from "./campaign-still";

const beats = [
  {
    title: "You save",
    body: "Share a link, tap the extension, or paste a URL. That is the only filing you do.",
  },
  {
    title: "SaveIt reads it",
    body: "The agent captures the page, writes a summary, and places it. Categories form without a folder tree.",
  },
  {
    title: "You ask",
    body: "Describe what you remember. The save comes back by meaning, not by the name you never gave it.",
  },
];

export function Workflow() {
  return (
    <section
      id="workflow"
      className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div className="portal-frame relative overflow-hidden rounded-2xl">
          <CampaignStill
            name="observatory"
            className="aspect-[16/10] w-full object-cover sm:aspect-[4/3]"
            objectPosition="center 58%"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas/50 to-transparent" />
        </div>

        <div>
          <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance text-ink">
            You save. SaveIt does the rest.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-pretty text-mute">
            Agentic bookmarking means the product acts after the tap. Capture,
            understanding, filing, and retrieval happen without a sorting
            session.
          </p>
        </div>
      </div>

      <ol className="mx-auto mt-16 grid max-w-6xl gap-8 sm:grid-cols-3 sm:gap-10">
        {beats.map((beat, index) => (
          <li key={beat.title} className="min-w-0">
            <p className="font-display text-sm font-semibold text-ember">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink">
              {beat.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-pretty text-mute">
              {beat.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mx-auto mt-16 grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="portal-frame overflow-hidden rounded-2xl">
          <CampaignStill
            name="portalArch"
            className="aspect-[4/3] w-full object-cover"
            objectPosition="center 60%"
          />
        </div>
        <div>
          <h3 className="font-display text-[clamp(1.6rem,3vw,2.25rem)] leading-tight font-bold tracking-[-0.03em] text-ink">
            The doorway is the save.
          </h3>
          <p className="mt-4 max-w-md text-base leading-relaxed text-pretty text-mute">
            Walk through once. The agent keeps the other side in order, so the
            next time you need that page you ask for it instead of hunting
            through tabs.
          </p>
          <a
            href="https://saveit.now/extensions"
            className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-ember transition-colors hover:text-ink"
          >
            Get the browser extension
          </a>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-3xl">
        <AskDemo />
      </div>
    </section>
  );
}
