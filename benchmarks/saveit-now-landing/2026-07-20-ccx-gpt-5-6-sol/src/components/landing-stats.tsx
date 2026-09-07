import { ArrowDownRight } from "lucide-react";

import { CampaignImage } from "./campaign-image";

export function LandingStats() {
  return (
    <section className="promise section" id="promise">
      <div className="promise-shell" data-reveal>
        <CampaignImage
          image="portal-ridge"
          alt="A glowing doorway on a mountain ridge at sunset"
          className="promise-image"
          pictureClassName="promise-picture"
          sizes="100vw"
        />
        <div className="promise-overlay" aria-hidden="true" />
        <div className="promise-topline">
          <span>Our north star</span>
          <span>Built for rediscovery</span>
        </div>
        <div className="promise-content">
          <p className="promise-number" aria-label="One hundred percent">
            100%
          </p>
          <div className="promise-copy">
            <p className="eyebrow">The rediscovery promise</p>
            <h2>What you save should stay findable.</h2>
            <p>
              Not most of it. Not only when you remember the folder. Every part
              of SaveIt.now is shaped around one outcome: helping what mattered
              once matter again.
            </p>
            <a href="#pricing">
              Build your bookmark home
              <ArrowDownRight aria-hidden="true" size={18} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
