import { Bookmark, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { LandingAppButton } from "./landing-app-button";

const navItems = [
  { href: "#workflow", label: "How it works" },
  { href: "#promise", label: "Promise" },
  { href: "#ios", label: "iOS" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="header-shell">
        <a className="brand" href="#top" aria-label="SaveIt.now home">
          <span className="brand-mark" aria-hidden="true">
            <Bookmark size={16} strokeWidth={2.4} />
          </span>
          <span>SaveIt.now</span>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <LandingAppButton
            authIntent="signin"
            className="header-sign-in"
            signedOutChildren="Sign in"
            variant="outline"
          />
          <LandingAppButton
            className="header-cta"
            signedOutChildren="Start free"
          />
          <button
            type="button"
            className="menu-button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        className={`menu-scrim ${menuOpen ? "is-open" : ""}`}
        aria-hidden="true"
      />

      <div
        className={`mobile-nav ${menuOpen ? "is-open" : ""}`}
        id="mobile-navigation"
      >
        <nav aria-label="Mobile navigation">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <LandingAppButton
            className="mobile-nav-cta"
            signedOutChildren="Start saving free"
            showArrow
          />
        </nav>
      </div>
    </header>
  );
}
