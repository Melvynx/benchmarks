import { MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { LandingAppButton } from "./landing-app-button";

export const NAV_LINKS = [
  { href: "#workflow", label: "How it works" },
  { href: "#promise", label: "The promise" },
  { href: "#ios", label: "iOS" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export const LandingHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border px-3 pl-5 transition-[background-color,border-color,box-shadow] duration-500 ${
          scrolled || open
            ? "border-white/10 bg-ink/75 shadow-[0_10px_40px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <a
          href="#top"
          className="flex items-center gap-2.5 text-cream"
          aria-label="SaveIt.now, back to top"
        >
          <span className="relative flex size-7 items-center justify-center overflow-hidden rounded-[9px] bg-gradient-to-br from-ember-2 via-ember to-rose shadow-glow">
            <span className="absolute inset-[3px] rounded-[6px] border border-white/40" />
            <span className="relative size-2 rounded-full bg-cream" />
          </span>
          <span className="font-display text-[22px] leading-none tracking-tight">
            SaveIt.now
          </span>
        </a>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-[13.5px] text-sand transition-colors hover:bg-white/[0.06] hover:text-cream"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <LandingAppButton authIntent="signin" size="sm" variant="ghost">
              Sign in
            </LandingAppButton>
          </span>
          <LandingAppButton size="sm" variant="cream">
            Start free
          </LandingAppButton>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-9 items-center justify-center rounded-full text-cream transition-colors hover:bg-white/[0.08] md:hidden"
          >
            {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="mx-auto mt-2 max-w-6xl rounded-3xl border border-white/10 bg-ink/90 p-3 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur-xl md:hidden"
      >
        <nav aria-label="Mobile" className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3.5 text-[17px] text-cream transition-colors hover:bg-white/[0.06]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-2 flex gap-2 border-t border-white/10 pt-3">
          <LandingAppButton
            authIntent="signin"
            className="flex-1"
            variant="outline"
          >
            Sign in
          </LandingAppButton>
          <LandingAppButton className="flex-1" variant="ember">
            Start free
          </LandingAppButton>
        </div>
      </div>
    </header>
  );
};
