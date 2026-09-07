import { ArrowUpRight, BookmarkPlus, Brain, Search, Waypoints } from "lucide-react";
import { useState } from "react";

import { CampaignImage } from "./campaign-image";

const workflowSteps = [
  {
    label: "Capture",
    title: "Save it.",
    description:
      "Share a page, video, PDF, post, or image. SaveIt.now captures the content and the context in one action.",
    detail: "One familiar action wherever you find something worth keeping.",
    image: "portal-arch" as const,
    icon: BookmarkPlus,
    alt: "A luminous arch standing among rocks and flowers",
  },
  {
    label: "Understand",
    title: "It reads the room.",
    description:
      "The agent looks beyond the URL, creates a useful understanding of what you saved, and recognizes what it connects to.",
    detail: "The page becomes a memory with meaning, not a lonely link.",
    image: "portal-rocks" as const,
    icon: Brain,
    alt: "A pale portal framed by rocks and green vegetation",
  },
  {
    label: "Organize",
    title: "It finds a home.",
    description:
      "Topics, useful details, and related ideas settle into your collection without folders, tags, or cleanup.",
    detail: "Your bookmark home gets clearer as the collection grows.",
    image: "observatory" as const,
    icon: Waypoints,
    alt: "A person facing a hilltop observatory beneath a glowing arc",
  },
  {
    label: "Retrieve",
    title: "You find it.",
    description:
      "Search by what you remember or ask in natural language. SaveIt.now brings the right item back with its context.",
    detail: "The thing you meant to return to is ready when the moment arrives.",
    image: "portal-ridge" as const,
    icon: Search,
    alt: "A glowing rectangular portal on a distant mountain ridge",
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const active = workflowSteps[activeStep];

  return (
    <section className="workflow section" id="workflow">
      <div className="section-shell">
        <div className="section-heading workflow-heading" data-reveal>
          <div>
            <p className="eyebrow">The agentic loop</p>
            <h2>You do one thing. Save it.</h2>
          </div>
          <p className="section-lead">
            Capture, understanding, organization, and retrieval happen as one
            connected flow. You never stop to file.
          </p>
        </div>

        <div className="workflow-console" data-reveal>
          <div className="workflow-controls" role="tablist" aria-label="SaveIt.now workflow">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const selected = activeStep === index;

              return (
                <button
                  key={step.label}
                  type="button"
                  className={`workflow-step ${selected ? "is-active" : ""}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls="workflow-panel"
                  id={`workflow-tab-${index}`}
                  onClick={() => setActiveStep(index)}
                >
                  <span className="workflow-step-index">0{index + 1}</span>
                  <span className="workflow-step-icon" aria-hidden="true">
                    <Icon size={19} />
                  </span>
                  <span className="workflow-step-copy">
                    <small>{step.label}</small>
                    <strong>{step.title}</strong>
                  </span>
                  <ArrowUpRight aria-hidden="true" size={17} />
                </button>
              );
            })}
          </div>

          <div
            className="workflow-stage"
            id="workflow-panel"
            role="tabpanel"
            aria-labelledby={`workflow-tab-${activeStep}`}
          >
            <CampaignImage
              key={active.image}
              image={active.image}
              alt={active.alt}
              className="workflow-image"
              pictureClassName="workflow-picture"
              sizes="(max-width: 760px) 94vw, 62vw"
            />
            <div className="workflow-stage-overlay" aria-hidden="true" />
            <div className="workflow-stage-copy">
              <span className="workflow-stage-label">{active.label}</span>
              <h3>{active.title}</h3>
              <p>{active.description}</p>
              <small>{active.detail}</small>
            </div>
          </div>
        </div>

        <div className="workflow-rail" aria-label="Complete agentic workflow" data-reveal>
          {workflowSteps.map((step, index) => (
            <span key={step.label}>
              <b>0{index + 1}</b>
              {step.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
