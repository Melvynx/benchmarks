import { BookmarkIcon, MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "The promise", href: "#promise" },
  { label: "iOS", href: "#ios" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const LandingHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/[0.08] bg-coal/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          className="group flex items-center gap-2.5"
          aria-label="SaveIt.now home"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-ember text-coal transition-transform duration-300 group-hover:-rotate-6">
            <BookmarkIcon className="size-4 fill-current" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            SaveIt.now
          </span>
        </a>

        <nav
          className="hidden items-center gap-7 text-[13px] font-medium text-dusk lg:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors duration-200 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="/signin?intent=signin&step=email"
            className="text-[13px] font-medium text-dusk transition-colors hover:text-ink"
          >
            Sign in
          </a>
          <a
            href="/signin?intent=signup&step=email"
            className="inline-flex h-9 items-center rounded-full bg-ink px-5 text-[13px] font-semibold text-coal transition-all duration-300 hover:bg-flare"
          >
            Start free
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-10 items-center justify-center rounded-full text-ink lg:hidden"
        >
          {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 top-16 z-40 flex flex-col bg-coal/95 backdrop-blur-2xl transition-all duration-300 lg:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <nav
          className="flex flex-1 flex-col justify-center gap-2 px-8"
          aria-label="Mobile"
        >
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`border-b border-white/[0.07] py-4 font-display text-3xl tracking-tight text-ink transition-all duration-500 ${
                open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col gap-3 px-8 pb-12">
          <a
            href="/signin?intent=signup&step=email"
            className="inline-flex h-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-coal"
          >
            Start free
          </a>
          <a
            href="/signin?intent=signin&step=email"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 text-sm font-medium text-ink"
          >
            Sign in
          </a>
        </div>
      </div>
    </header>
  );
};
