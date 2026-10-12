import { useEffect, useRef, useState } from "react";
import { nav } from "../nav";
import { ArcMark } from "./arc-mark";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const nodes = nav
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => node !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setCurrent(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.5] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink">
      <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <a href="#top" className="flex min-h-11 items-center gap-2.5">
          <ArcMark className="h-4 w-7 text-coral" />
          <span className="font-display text-lg font-semibold tracking-[-0.03em] text-ivory">
            SaveIt.now
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={current === item.id ? "true" : undefined}
              className={`text-sm transition-colors duration-200 ease-out ${
                current === item.id
                  ? "text-coral"
                  : "text-muted hover:text-ivory"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#pricing"
            className="hidden min-h-11 items-center bg-coral px-4 text-sm font-semibold text-ink transition-colors duration-200 ease-out hover:bg-coral-hot sm:inline-flex"
          >
            Start free
          </a>
          <button
            ref={menuButton}
            type="button"
            className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-ivory lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" aria-label="Primary" className="border-t border-line px-5 py-2 lg:hidden">
          {nav.map((item, index) => (
            <a
              key={item.id}
              ref={index === 0 ? firstLink : undefined}
              href={item.href}
              aria-current={current === item.id ? "true" : undefined}
              className="flex min-h-12 items-center text-base text-ivory"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#pricing"
            className="mb-3 mt-1 inline-flex min-h-11 w-full items-center justify-center bg-coral text-sm font-semibold text-ink"
            onClick={() => setOpen(false)}
          >
            Start free
          </a>
        </nav>
      ) : null}
    </header>
  );
}
