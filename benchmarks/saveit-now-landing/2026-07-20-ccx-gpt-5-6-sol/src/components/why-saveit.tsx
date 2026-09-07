import { ArrowRight, FolderOpen, Layers3, MousePointer2 } from "lucide-react";

const savedMoments = [
  {
    label: "Travel",
    title: "The quiet trail you wanted to visit",
    meta: "Saved from an article",
  },
  {
    label: "Design",
    title: "The chair that finally fit the room",
    meta: "Saved from an image",
  },
  {
    label: "Work",
    title: "The reference for your next project",
    meta: "Saved from a PDF",
  },
];

export function WhySaveIt() {
  return (
    <section className="transformation section" id="transformation">
      <div className="section-shell transformation-grid">
        <div className="transformation-copy" data-reveal>
          <p className="eyebrow">The lived difference</p>
          <h2>Your bookmarks should come back to you.</h2>
          <p className="section-lead">
            Most bookmark tools make saving the first step in a filing system.
            SaveIt.now makes it the only step.
          </p>

          <ul className="friction-list">
            <li className="friction-item">
              <Layers3 aria-hidden="true" size={19} />
              <span>Tabs multiply faster than you can read them.</span>
            </li>
            <li className="friction-item">
              <FolderOpen aria-hidden="true" size={19} />
              <span>Folders become another job to maintain.</span>
            </li>
            <li className="friction-item friction-answer">
              <MousePointer2 aria-hidden="true" size={19} />
              <span>You save once. The agent handles the rest.</span>
            </li>
          </ul>
        </div>

        <div className="memory-stack" data-reveal>
          <div className="memory-stack-label">
            <span>Your collection, ready to remember</span>
            <span>03 saves</span>
          </div>
          <div className="memory-cards">
            {savedMoments.map((item, index) => (
              <article className="memory-card" key={item.title}>
                <span className="memory-card-number">0{index + 1}</span>
                <div>
                  <span className="memory-card-label">{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                </div>
                <ArrowRight aria-hidden="true" size={19} />
              </article>
            ))}
          </div>
          <p className="memory-stack-note">
            Organized around meaning, not manual filing.
          </p>
        </div>
      </div>
    </section>
  );
}
