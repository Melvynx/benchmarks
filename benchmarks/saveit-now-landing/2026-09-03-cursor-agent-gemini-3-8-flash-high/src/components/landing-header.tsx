"use client";

import { useState } from "react";
import { LandingAppButton } from "./landing-app-button";
import { MenuIcon, XIcon, SparklesIcon } from "lucide-react";

export const LandingHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Agentic Flow", href: "#workflow" },
    { label: "100% Promise", href: "#promise" },
    { label: "iOS Experience", href: "#ios" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#090708]/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a
          href="/"
          className="group flex items-center gap-2.5 text-lg font-medium tracking-tight text-[#f7f3ee]"
          aria-label="SaveIt.now Home"
        >
          <span className="flex size-7 items-center justify-center rounded-lg border border-[#ff6b2b]/40 bg-[#ff6b2b]/15 shadow-[0_0_15px_rgba(255,107,43,0.35)] transition-transform group-hover:scale-105">
            <SparklesIcon className="size-4 text-[#ff9e59]" />
          </span>
          <span className="font-editorial text-xl tracking-tight">SaveIt.now</span>
        </a>

        <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#c4b5a8] md:flex" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#f7f3ee]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LandingAppButton
            authIntent="signin"
            className="text-xs tracking-wide"
            signedOutChildren="Sign In"
            variant="outline"
          />
          <a
            href="#pricing"
            className="inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-[#ff6b2b] to-[#ff8533] px-4 text-xs font-semibold text-white shadow-[0_0_20px_rgba(255,107,43,0.35)] transition-all hover:brightness-110 hover:shadow-[0_0_25px_rgba(255,107,43,0.5)]"
          >
            Start Free
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-[#c4b5a8] hover:text-white md:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-white/[0.08] bg-[#0c090b] px-6 py-6 md:hidden">
          <nav className="flex flex-col gap-4 text-sm font-medium text-[#c4b5a8]">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 transition-colors hover:text-[#f7f3ee]"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-white/[0.08]">
              <LandingAppButton
                authIntent="signin"
                className="w-full text-xs"
                signedOutChildren="Sign In"
                variant="outline"
              />
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ff6b2b] to-[#ff8533] px-4 text-xs font-semibold text-white text-center shadow-[0_0_20px_rgba(255,107,43,0.35)]"
              >
                Start Free
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
