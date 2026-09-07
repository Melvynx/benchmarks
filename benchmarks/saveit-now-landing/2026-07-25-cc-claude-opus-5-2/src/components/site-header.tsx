import { MenuIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cx } from "../lib/cx";
import { LINKS, SECTIONS } from "../lib/links";
import { useScrolled } from "../lib/motion";
import { CTA } from "./ui";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(16);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close on Escape, and hold the page still while the sheet covers it.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-out",
        scrolled || open
          ? "border-b border-line/80 bg-ink/85 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          className="font-display text-xl tracking-tight text-cream transition-opacity hover:opacity-80"
        >
          SaveIt<span className="text-ember-400">.</span>now
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="relative rounded-full px-3.5 py-2 text-[0.8125rem] text-mist transition-colors hover:text-cream"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={LINKS.signIn}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden rounded-full px-4 py-2 text-[0.8125rem] text-mist transition-colors hover:text-cream sm:block"
          >
            Sign in
          </a>
          <CTA href={LINKS.signUp} className="hidden sm:inline-flex">
            Start free
          </CTA>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 text-cream transition-colors hover:bg-cream/10 md:hidden"
          >
            {open ? (
              <XIcon className="size-[18px]" aria-hidden="true" />
            ) : (
              <MenuIcon className="size-[18px]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile sheet. Kept in the DOM only while open so nothing off screen
          can be reached by the keyboard. */}
      {open && (
        <div
          id="mobile-nav"
          className="border-t border-line bg-ink/95 backdrop-blur-xl md:hidden"
        >
          <nav aria-label="Mobile" className="px-5 py-4">
            <ul className="flex flex-col">
              {SECTIONS.map((section, index) => (
                <li
                  key={section.id}
                  className="motion-safe:animate-rise"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <a
                    href={`#${section.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between border-b border-line/70 py-4 font-display text-2xl text-cream"
                  >
                    {section.label}
                    <span aria-hidden="true" className="text-sm text-haze">
                      0{index + 1}
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 pb-4">
              <CTA href={LINKS.signUp} size="lg" className="w-full">
                Start saving free
              </CTA>
              <CTA href={LINKS.signIn} variant="ghost" size="lg" className="w-full">
                Sign in
              </CTA>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
