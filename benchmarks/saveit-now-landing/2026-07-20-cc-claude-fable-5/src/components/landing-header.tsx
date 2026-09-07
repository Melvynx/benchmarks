import { MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { LandingAppButton } from "./landing-app-button";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#promise", label: "The promise" },
  { href: "#ios", label: "iOS" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export const LandingHeader = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled || open
          ? "border-b border-cream/10 bg-ink/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a
          href="/"
          className="font-display text-xl tracking-tight text-cream"
          aria-label="SaveIt.now home"
        >
          SaveIt<span className="text-ember">.now</span>
        </a>

        <nav
          className="hidden items-center gap-8 text-[13px] text-cream/60 md:flex"
          aria-label="Main"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-cream"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LandingAppButton
              authIntent="signin"
              signedOutChildren="Sign in"
              size="sm"
              variant="outline"
            />
          </div>
          <div className="hidden md:block">
            <LandingAppButton signedOutChildren="Start free" size="sm" />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-9 items-center justify-center rounded-full border border-cream/15 text-cream md:hidden"
          >
            {open ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-cream/10 bg-ink/95 px-6 py-6 backdrop-blur-xl md:hidden"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-base text-cream/80 transition-colors hover:text-cream"
              >
                {link.label}
              </a>
            ))}
            <LandingAppButton
              className="mt-2 w-full"
              signedOutChildren="Start saving free"
            />
          </div>
        </nav>
      )}
    </header>
  );
};
