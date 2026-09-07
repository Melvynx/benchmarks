import { MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { links, navItems } from "../lib/links";
import { LinkButton } from "./ui/button";

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
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-4 pl-5 transition-[background-color,border-color,box-shadow] duration-500 sm:px-5 sm:pl-6 ${
          scrolled || open
            ? "glass shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
            : "border border-transparent"
        }`}
      >
        <a
          href="/"
          className="font-display text-[22px] leading-none text-cream"
          aria-label="SaveIt.now home"
        >
          SaveIt<span className="text-ember">.</span>now
        </a>

        <nav
          className="hidden items-center gap-7 text-[13px] text-mist md:flex"
          aria-label="Primary"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-cream"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LinkButton href={links.signIn} variant="ghost" className="h-9 px-4">
            Sign in
          </LinkButton>
          <LinkButton href={links.signUp} className="h-9 px-4">
            Start free
          </LinkButton>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full text-cream transition-colors hover:bg-white/10 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="glass mx-auto mt-2 max-w-6xl rounded-3xl p-4 md:hidden"
      >
        <nav className="flex flex-col" aria-label="Mobile">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-[15px] text-cream/90 transition-colors hover:bg-white/[0.06]"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-3 flex gap-2 border-t border-white/10 pt-4">
          <LinkButton
            href={links.signIn}
            variant="outline"
            className="flex-1"
          >
            Sign in
          </LinkButton>
          <LinkButton href={links.signUp} className="flex-1">
            Start free
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
