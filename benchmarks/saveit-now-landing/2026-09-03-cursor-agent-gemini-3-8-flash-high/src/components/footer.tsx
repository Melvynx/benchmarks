"use client";

import { SparklesIcon } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#070506] py-16 text-xs text-[#8f7e72]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand & Mission */}
          <div className="space-y-4 md:col-span-4">
            <a href="/" className="inline-flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg border border-[#ff6b2b]/40 bg-[#ff6b2b]/15 text-[#ff8533]">
                <SparklesIcon className="size-3.5" />
              </span>
              <span className="font-editorial text-xl font-medium tracking-tight text-[#f7f3ee]">
                SaveIt.now
              </span>
            </a>
            <p className="max-w-xs text-xs leading-relaxed text-[#a8978b]">
              Your home for bookmarks. Autonomous capture, neural understanding,
              and instant natural language recall without manual filing.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:col-span-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#f7f3ee]">
                Product
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#workflow" className="hover:text-white transition-colors">
                    Agentic Workflow
                  </a>
                </li>
                <li>
                  <a href="#promise" className="hover:text-white transition-colors">
                    100% Promise
                  </a>
                </li>
                <li>
                  <a href="#ios" className="hover:text-white transition-colors">
                    iOS Mobile App
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing Plans
                  </a>
                </li>
                <li>
                  <a href="/changelog" className="hover:text-white transition-colors">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#f7f3ee]">
                Platform
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="/extensions" className="hover:text-white transition-colors">
                    Chrome Extension
                  </a>
                </li>
                <li>
                  <a href="/extensions" className="hover:text-white transition-colors">
                    Firefox Add-on
                  </a>
                </li>
                <li>
                  <a href="/ios" className="hover:text-white transition-colors">
                    Safari Extension
                  </a>
                </li>
                <li>
                  <a href="/docs/api" className="hover:text-white transition-colors">
                    Developer API
                  </a>
                </li>
                <li>
                  <a href="/docs" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#f7f3ee]">
                Company & Legal
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="/about" className="hover:text-white transition-colors">
                    About SaveIt
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="mailto:hi@saveit.now" className="hover:text-white transition-colors">
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.06] pt-8 text-[11px] text-[#706257]">
          <p>© 2026 SaveIt.now. All rights reserved.</p>
          <p>
            Designed for continuous clarity. Autonomous bookmarking without the noise.
          </p>
        </div>
      </div>
    </footer>
  );
}
