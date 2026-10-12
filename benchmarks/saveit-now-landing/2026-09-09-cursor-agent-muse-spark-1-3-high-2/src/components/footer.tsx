import { ArrowRightIcon, BookmarkIcon } from "lucide-react";

export function Footer() {
  return (
    <>
      <section id="cta" className="relative scroll-mt-20 overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <img src="/images/landing-v2/home.png" alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-[#100b08]/62" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#100b08] via-transparent to-[#100b08]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 lg:py-36">
          <p className="eyebrow reveal justify-center">Your home for bookmarks</p>
          <h2 className="display-xl reveal mx-auto mt-5 max-w-3xl text-4xl text-white sm:text-6xl">
            Stop losing links. <em className="text-[#ffc36b]">Just save it.</em>
          </h2>
          <p className="reveal mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#f3d9bd]">
            Keep the article, the video, the idea. Your agent will keep it
            organized and bring it back the moment you ask.
          </p>
          <div className="reveal mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#top" className="btn-primary">
              Start saving free
              <ArrowRightIcon className="size-4" />
            </a>
            <a href="#pricing" className="btn-ghost">
              See Pro at $5 per month
            </a>
          </div>
          <p className="reveal mt-4 text-sm text-[#e8d5c2]">
            Free to start. No credit card needed.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0c0806]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
            <div>
              <a href="#top" className="flex items-center gap-2.5" aria-label="Back to top">
                <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5a1f] to-[#ff8a3d]">
                  <BookmarkIcon className="size-4 text-white" fill="currentColor" />
                </span>
                <span className="text-[17px] font-semibold tracking-tight text-[#fff6ec]">
                  SaveIt.now
                </span>
              </a>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#8f7a6b]">
                Your home for bookmarks. Save in one tap, find in plain words,
                keep everything that matters.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-[#fff6ec]">Product</h3>
                <nav className="mt-3 flex flex-col gap-2" aria-label="Product">
                  <a href="#workflow" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">Workflow</a>
                  <a href="#promise" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">Promise</a>
                  <a href="#ios" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">iOS app</a>
                  <a href="#pricing" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">Pricing</a>
                </nav>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#fff6ec]">Resources</h3>
                <nav className="mt-3 flex flex-col gap-2" aria-label="Resources">
                  <a href="#faq" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">FAQ</a>
                  <a href="#cta" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">Get started</a>
                  <a href="#top" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">Back to top</a>
                </nav>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#fff6ec]">Company</h3>
                <nav className="mt-3 flex flex-col gap-2" aria-label="Company">
                  <a href="#cta" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">Contact</a>
                  <a href="#pricing" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">Privacy</a>
                  <a href="#pricing" className="text-sm text-[#8f7a6b] hover:text-[#fff6ec]">Terms</a>
                </nav>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#8f7a6b]">
              © {new Date().getFullYear()} SaveIt.now. Your home for bookmarks.
            </p>
            <p className="text-sm text-[#8f7a6b]">Save it once. Find it forever.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
