import { useEffect, useState } from "react";
import { BookmarkIcon, MenuIcon, XIcon } from "lucide-react";

const links = [
  { label: "Workflow", href: "#workflow" },
  { label: "Promise", href: "#promise" },
  { label: "iPhone", href: "#ios" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const LandingHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#100b08]/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5" aria-label="SaveIt.now home">
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5a1f] to-[#ff8a3d] shadow-lg shadow-orange-900/40">
            <BookmarkIcon className="size-4 text-white" fill="currentColor" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-[#fff6ec]">
            SaveIt.now
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-sm text-[#c9b3a1] md:flex" aria-label="Primary">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-[#fff6ec]">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#pricing"
            className="text-sm text-[#c9b3a1] transition-colors hover:text-[#fff6ec]"
          >
            Sign in
          </a>
          <a href="#cta" className="btn-primary !min-h-10 !px-5 !text-sm">
            Start free
          </a>
        </div>

        <button
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#fff6ec] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      {open && (
        <nav
          className="border-t border-white/10 bg-[#100b08]/95 px-5 py-4 backdrop-blur-xl md:hidden"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-[15px] text-[#fff6ec] transition-colors hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
            <a href="#cta" onClick={() => setOpen(false)} className="btn-primary mt-2">
              Start free
            </a>
          </div>
        </nav>
      )}
    </header>
  );
};
