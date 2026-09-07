import { useEffect, useState } from "react";

import { NAV_SECTIONS, SIGN_IN_URL, SIGN_UP_URL } from "../lib/site";
import { useActiveSection, useScrollY } from "../lib/use-scroll";
import { Cta } from "./ui/cta";

const SECTION_IDS = NAV_SECTIONS.map((s) => s.id);

export function SiteHeader() {
  const scrollY = useScrollY();
  const active = useActiveSection(SECTION_IDS);
  const [menuOpen, setMenuOpen] = useState(false);

  const condensed = scrollY > 24;

  // Close the mobile sheet on Escape, and hold the page still while it is up.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-glow focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-ink"
      >
        Skip to content
      </a>

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          condensed
            ? "glass border-b border-lilac/10"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between gap-6 px-5 sm:px-8">
          <a
            href="#top"
            className="flex items-center gap-2.5 text-[15px] tracking-tight text-glow"
          >
            <span aria-hidden="true" className="relative flex size-2.5">
              <span className="absolute inset-0 rounded-full bg-ember blur-[3px]" />
              <span className="absolute inset-0 rounded-full bg-amber" />
            </span>
            <span className="font-display text-[17px]">SaveIt.now</span>
          </a>

          <nav
            aria-label="Sections"
            className="hidden items-center gap-1 md:flex"
          >
            {NAV_SECTIONS.map((section) => {
              const isActive = active === section.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative rounded-full px-3.5 py-2 text-[13px] transition-colors duration-300 ${
                    isActive ? "text-glow" : "text-muted hover:text-cream"
                  }`}
                >
                  {section.label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-3.5 -bottom-px h-px bg-linear-to-r from-transparent via-amber to-transparent transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={SIGN_IN_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full px-3.5 py-2 text-[13px] text-muted transition-colors hover:text-glow sm:block"
            >
              Sign in
            </a>
            <Cta href={SIGN_UP_URL} className="hidden sm:inline-flex">
              Start free
            </Cta>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex size-10 items-center justify-center rounded-full border border-lilac/20 text-cream transition-colors hover:bg-white/5 md:hidden"
            >
              <span aria-hidden="true" className="relative block h-3 w-4">
                <span
                  className={`absolute left-0 block h-px w-4 bg-current transition-all duration-300 ${
                    menuOpen ? "top-1.5 rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 top-1.5 block h-px w-4 bg-current transition-opacity duration-200 ${
                    menuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 block h-px w-4 bg-current transition-all duration-300 ${
                    menuOpen ? "top-1.5 -rotate-45" : "top-3"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sheet */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="fixed inset-0 z-40 md:hidden"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 h-full w-full cursor-default bg-ink/85 backdrop-blur-md"
        />
        <nav
          aria-label="Sections"
          className="glass absolute inset-x-0 top-16 border-b border-lilac/12 px-5 pb-8 pt-4"
        >
          <ul className="flex flex-col">
            {NAV_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between border-b border-lilac/10 py-4 font-display text-2xl text-cream"
                >
                  {section.label}
                  <span aria-hidden="true" className="text-sm text-amber/70">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3">
            <Cta href={SIGN_UP_URL} size="lg" className="w-full">
              Start free
            </Cta>
            <Cta href={SIGN_IN_URL} variant="ghost" size="lg" className="w-full">
              Sign in
            </Cta>
          </div>
        </nav>
      </div>
    </>
  );
}
