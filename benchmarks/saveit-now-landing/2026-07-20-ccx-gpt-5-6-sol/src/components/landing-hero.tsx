import { ArrowDown, BookmarkCheck, Search, Sparkles } from "lucide-react";

import { CampaignImage } from "./campaign-image";
import { LandingAppButton } from "./landing-app-button";

export function LandingHero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Your home for bookmarks
          </p>

          <h1 id="hero-title">gpt-5.6-sol</h1>

          <p className="hero-promise">Save it. Find it.</p>
          <p className="hero-support">
            Keep the link, image, video, or idea. SaveIt.now captures the
            context, understands it, organizes it, and brings it back when you
            need it.
          </p>

          <div className="hero-actions">
            <LandingAppButton
              className="hero-primary-cta"
              signedOutChildren="Start saving free"
              showArrow
            />
            <a className="button button-outline" href="#workflow">
              See how it works
              <ArrowDown aria-hidden="true" size={17} />
            </a>
          </div>

          <p className="hero-proofline">
            No folders. No tags. No cleanup.
          </p>
        </div>

        <div className="hero-visual" aria-label="SaveIt.now campaign artwork">
          <div className="hero-portal-line" aria-hidden="true" />
          <div className="hero-image-frame">
            <CampaignImage
              image="home"
              alt="An illuminated home above a flowered ridge at sunset"
              className="hero-image"
              pictureClassName="hero-picture"
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 760px) 94vw, 48vw"
            />
            <div className="hero-image-wash" aria-hidden="true" />

            <div className="save-toast">
              <span className="save-toast-icon" aria-hidden="true">
                <BookmarkCheck size={18} />
              </span>
              <span>
                <small>One tap</small>
                Saved with context
              </span>
            </div>

            <div className="return-card">
              <span className="return-card-icon" aria-hidden="true">
                <Search size={15} />
              </span>
              <span>
                <small>Later</small>
                The place with the glowing roof
              </span>
              <Sparkles aria-hidden="true" size={15} />
            </div>
          </div>

          <div className="hero-visual-caption" aria-hidden="true">
            <span>Save</span>
            <span>Understand</span>
            <span>Return</span>
          </div>
        </div>
      </div>

      <a className="hero-scroll" href="#transformation">
        <span>Keep scrolling</span>
        <ArrowDown aria-hidden="true" size={16} />
      </a>
    </section>
  );
}
