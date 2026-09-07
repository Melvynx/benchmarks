import { useEffect, useState } from "react";
import { LandingAppButton } from "./landing-app-button";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#promise", label: "Promise" },
  { href: "#ios", label: "iOS" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6">
      <div
        className={`relative z-50 mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full px-4 py-2.5 transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] sm:px-5 ${
          scrolled || open
            ? "bg-bg/90 shadow-[0_12px_40px_-20px_rgba(42,33,28,0.45)] backdrop-blur-xl"
            : "bg-black/25 backdrop-blur-md"
        }`}
      >
        <a
          href="#top"
          className={`font-display text-[15px] font-semibold tracking-tight ${
            scrolled || open ? "text-ink" : "text-on-dark"
          }`}
        >
          SaveIt.now
        </a>

        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label="Primary"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-[13px] transition-colors duration-200 ${
                scrolled
                  ? "text-muted hover:text-ink"
                  : "text-white/75 hover:text-on-dark"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LandingAppButton
            authIntent="signin"
            variant={scrolled || open ? "outline" : "ghost"}
            className="hidden h-9 px-4 md:inline-flex"
            signedOutChildren="Sign in"
          />
          <LandingAppButton
            variant="ember"
            className="hidden h-9 px-4 md:inline-flex"
            signedOutChildren="Start free"
          />
          <button
            type="button"
            className={`btn-press inline-flex size-9 items-center justify-center rounded-full md:hidden ${
              scrolled || open
                ? "bg-ink/5 text-ink"
                : "bg-white/15 text-on-dark"
            }`}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Close" : "Menu"}</span>
            <span className="relative block size-4">
              <span
                className={`absolute left-0 top-[5px] h-[1.5px] w-4 rounded-full bg-current transition-transform duration-300 ${
                  open ? "translate-y-[3.5px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[12px] h-[1.5px] w-4 rounded-full bg-current transition-transform duration-300 ${
                  open ? "-translate-y-[3.5px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={`fixed inset-0 top-0 z-30 bg-bg/95 pt-24 backdrop-blur-xl transition-opacity duration-300 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <nav
          className="flex h-full flex-col justify-center gap-2 px-8"
          aria-label="Mobile"
        >
          {links.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="font-display text-3xl font-semibold tracking-tight text-ink transition-transform duration-300"
              style={{
                transitionDelay: open ? `${80 + i * 40}ms` : "0ms",
                transform: open ? "translateY(0)" : "translateY(12px)",
                opacity: open ? 1 : 0,
              }}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-8 flex flex-col gap-3">
            <LandingAppButton
              variant="ember"
              className="w-full"
              signedOutChildren="Start free"
            />
            <LandingAppButton
              authIntent="signin"
              variant="outline"
              className="w-full"
              signedOutChildren="Sign in"
            />
          </div>
        </nav>
      </div>
    </header>
  );
}
