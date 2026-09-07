import { ArrowUpRight, Bookmark } from "lucide-react";

import { LandingAppButton } from "./landing-app-button";

const footerLinks = [
  {
    title: "Explore",
    links: [
      { href: "#workflow", label: "How it works" },
      { href: "#promise", label: "Promise" },
      { href: "#ios", label: "iOS" },
    ],
  },
  {
    title: "Plans",
    links: [
      { href: "#pricing", label: "Free" },
      { href: "#pricing", label: "Pro" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "mailto:hi@saveit.now", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="closing-cta section-shell" data-reveal>
        <div className="closing-portal" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="closing-copy">
          <p className="eyebrow">SaveIt.now</p>
          <h2>Make saved mean findable.</h2>
          <p>Build a home for everything worth keeping.</p>
        </div>
        <LandingAppButton
          className="closing-button"
          signedOutChildren="Start saving free"
          showArrow
        />
      </div>

      <div className="footer-main section-shell">
        <div className="footer-brand-block">
          <a className="brand footer-brand" href="#top">
            <span className="brand-mark" aria-hidden="true">
              <Bookmark size={16} strokeWidth={2.4} />
            </span>
            <span>SaveIt.now</span>
          </a>
          <p>Your home for bookmarks.</p>
          <a className="footer-sign-in" href="/signin?intent=signin&step=email">
            Sign in
            <ArrowUpRight aria-hidden="true" size={15} />
          </a>
        </div>

        <div className="footer-links">
          {footerLinks.map((group) => (
            <nav key={group.title} aria-label={`${group.title} links`}>
              <h3>{group.title}</h3>
              {group.links.map((link) => (
                <a key={`${group.title}-${link.label}`} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          ))}
        </div>
      </div>

      <div className="footer-bottom section-shell">
        <p>© {new Date().getFullYear()} SaveIt.now</p>
        <p>Save it now. Find it when it matters.</p>
      </div>
    </footer>
  );
}
