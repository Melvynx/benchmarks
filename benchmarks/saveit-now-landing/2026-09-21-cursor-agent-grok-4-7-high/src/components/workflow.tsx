import { useState } from "react";
import { CampaignStill, type CampaignName } from "./campaign-still";

const stages: {
  id: string;
  number: string;
  title: string;
  body: string;
  image: CampaignName;
  alt: string;
  caption: string;
}[] = [
  {
    id: "save",
    number: "1",
    title: "Save",
    body: "From the Chrome or Firefox extension, or from the iOS app, you keep the page, video, image, PDF, or post in front of you. You do not choose a folder first.",
    image: "portal-arch",
    alt: "A glowing arched doorway stands on a flowered hill at dusk, framed by rocks in the foreground.",
    caption: "The door is the save. One action, and the manual work is done.",
  },
  {
    id: "file",
    number: "2",
    title: "It files itself",
    body: "SaveIt reads what you kept and places it. You do not name a collection or write a summary.",
    image: "portal-rocks",
    alt: "A pale rectangular portal stands between sunlit rocks, with a shallow stream running toward it.",
    caption: "The save moves through like the stream. You do not sort it.",
  },
  {
    id: "ask",
    number: "3",
    title: "Ask it back",
    body: "Describe a fragment the way you remember it. The bookmark you meant comes back.",
    image: "portal-ridge",
    alt: "A bright rectangular portal stands on a ridge, with a stone path leading to it under a red sky.",
    caption: "The path back is already there. You ask, and the save is at the end of it.",
  },
];

export function Workflow() {
  const [activeId, setActiveId] = useState(stages[0].id);
  const active = stages.find((stage) => stage.id === activeId) ?? stages[0];

  return (
    <section
      id="workflow"
      className="section-anchor grid gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-12 lg:py-28"
    >
      <figure className="min-w-0">
        <div className="still-frame relative aspect-[2200/1233] overflow-hidden rounded-xl border border-line bg-ink-raised">
          <CampaignStill
            key={active.id}
            name={active.image}
            alt={active.alt}
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="still-swap absolute inset-0 h-full w-full object-cover object-[center_62%]"
          />
        </div>
        <figcaption aria-live="polite" className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          {active.caption}
        </figcaption>
      </figure>

      <div className="min-w-0 max-w-xl">
        <h2 className="text-balance font-display text-[clamp(2.15rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
          You save it. SaveIt does the rest.
        </h2>
        <p className="mt-5 text-pretty text-base leading-relaxed text-muted sm:text-lg">
          Capture, understanding, categorization, organization, and retrieval
          are the product's job. You do not build a folder system, and you do
          not write tags.
        </p>

        <fieldset className="mt-8 border-y border-line">
          <legend className="sr-only">Stages of a save</legend>
          {stages.map((stage) => (
            <label
              key={stage.id}
              className="relative grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-4 border-b border-line px-1 py-5 last:border-b-0 has-[:checked]:bg-ink-raised has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-gold"
            >
              <input
                type="radio"
                name="save-stage"
                value={stage.id}
                checked={active.id === stage.id}
                onChange={() => setActiveId(stage.id)}
                className="peer sr-only"
              />
              <span className="font-display text-3xl font-semibold tracking-[-0.03em] text-muted peer-checked:text-coral">
                {stage.number}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-2xl font-semibold tracking-[-0.03em] text-ivory">
                  {stage.title}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-muted">
                  {stage.body}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </section>
  );
}
