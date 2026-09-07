import { Check, ChevronRight, Share, Smartphone, Sparkles } from "lucide-react";

import { CampaignImage } from "./campaign-image";

const iosBenefits = [
  {
    icon: Share,
    title: "One familiar share",
    description: "Send something home from the iOS share sheet.",
  },
  {
    icon: Check,
    title: "Quiet confirmation",
    description: "Know it is saved without leaving what you were doing.",
  },
  {
    icon: Sparkles,
    title: "Ready to rediscover",
    description: "Return to a collection that already understands the save.",
  },
];

export function ExtensionsSection() {
  return (
    <section className="ios-section section" id="ios">
      <div className="section-shell ios-grid">
        <div className="ios-copy" data-reveal>
          <p className="eyebrow">Made for iOS</p>
          <h2>Save at the speed of a thought.</h2>
          <p className="section-lead">
            From Safari, Messages, X, YouTube, or anywhere the share sheet
            appears, send it home in one familiar action.
          </p>

          <div className="ios-benefits">
            {iosBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div className="ios-benefit" key={benefit.title}>
                  <span aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <a className="ios-link" href="/ios">
            Explore SaveIt.now for iOS
            <ChevronRight aria-hidden="true" size={17} />
          </a>
        </div>

        <div className="ios-visual" data-reveal>
          <CampaignImage
            image="lake"
            alt="An alpine lake reflecting coral-lit mountains at dusk"
            className="ios-backdrop-image"
            pictureClassName="ios-backdrop"
            sizes="(max-width: 760px) 94vw, 54vw"
          />
          <div className="ios-backdrop-wash" aria-hidden="true" />

          <div className="phone-frame" aria-label="SaveIt.now iOS experience illustration">
            <div className="phone-island" aria-hidden="true" />
            <div className="phone-screen">
              <div className="phone-status" aria-hidden="true">
                <span>9:41</span>
                <span>iOS</span>
              </div>
              <CampaignImage
                image="lake"
                alt=""
                className="phone-wallpaper"
                pictureClassName="phone-wallpaper-picture"
                sizes="320px"
              />
              <div className="share-panel">
                <div className="share-panel-handle" aria-hidden="true" />
                <div className="share-panel-title">
                  <span className="share-app-icon" aria-hidden="true">
                    <Smartphone size={18} />
                  </span>
                  <div>
                    <small>Share to</small>
                    <strong>SaveIt.now</strong>
                  </div>
                  <span className="share-check" aria-hidden="true">
                    <Check size={15} />
                  </span>
                </div>
                <div className="share-progress">
                  <span />
                </div>
                <p>Saved. Understanding and organizing now.</p>
              </div>
            </div>
          </div>

          <p className="ios-illustration-label">
            Experience illustration, not an app screenshot
          </p>
        </div>
      </div>
    </section>
  );
}
