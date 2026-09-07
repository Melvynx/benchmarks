import { useEffect, useId, useState } from "react";
import { LandingAppButton } from "./landing-app-button";

const links = [
  { href: "#workflow", label: "How it works" },
  { href: "#promise", label: "Promise" },
  { href: "#ios", label: "iOS" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled || open
          ? "border-b border-line bg-canvas/88 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:h-16 sm:px-8">
        <a
          href="#top"
          className="font-display text-[1.05rem] font-semibold tracking-tight text-ink"
        >
          SaveIt.now
        </a>

        <nav
          className="hidden items-center gap-7 text-sm text-mute md:flex"
          aria-label="Primary"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors duration-200 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <LandingAppButton
              authIntent="signin"
              signedOutChildren="Sign in"
              variant="ghost"
            />
            <LandingAppButton signedOutChildren="Start free" />
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ink/15 text-ink md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span aria-hidden="true" className="text-lg leading-none">
              {open ? "×" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div
          id={menuId}
          className="border-t border-line bg-canvas px-5 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-3 text-base text-ink hover:bg-ink/5"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <LandingAppButton
                authIntent="signin"
                className="w-full"
                signedOutChildren="Sign in"
                variant="outline"
              />
              <LandingAppButton
                className="w-full"
                signedOutChildren="Start free"
              />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
