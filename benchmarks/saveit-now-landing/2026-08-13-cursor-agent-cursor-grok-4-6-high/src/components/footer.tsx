export function Footer() {
  return (
    <footer className="border-t border-line px-5 py-14 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-ink">
              SaveIt.now
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-mute">
              Your home for bookmarks. Save it. Find it again.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-ink">Product</p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-mute">
                <a className="hover:text-ink" href="#workflow">
                  How it works
                </a>
                <a className="hover:text-ink" href="#pricing">
                  Pricing
                </a>
                <a className="hover:text-ink" href="/ios">
                  iOS app
                </a>
                <a className="hover:text-ink" href="https://saveit.now/extensions">
                  Extensions
                </a>
                <a className="hover:text-ink" href="/docs">
                  Docs
                </a>
              </nav>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Company</p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-mute">
                <a className="hover:text-ink" href="/about">
                  About
                </a>
                <a className="hover:text-ink" href="/contact">
                  Contact
                </a>
                <a
                  className="hover:text-ink"
                  href="https://twitter.com/saveitnow"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Twitter
                </a>
              </nav>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Legal</p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-mute">
                <a className="hover:text-ink" href="/privacy">
                  Privacy
                </a>
                <a className="hover:text-ink" href="/terms">
                  Terms
                </a>
              </nav>
            </div>
          </div>
        </div>

        <p className="text-sm text-mute">
          © {new Date().getFullYear()} SaveIt.now. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
