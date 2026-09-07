export function Footer() {
  return (
    <footer className="border-t border-line bg-bg pb-10">
      <div className="mx-auto max-w-6xl px-6 pt-14">
        <div className="grid gap-12 md:grid-cols-[1.2fr_2fr]">
          <div>
            <a
              href="#top"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              SaveIt.now
            </a>
            <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-muted">
              Your home for bookmarks. Just save it. We handle capture,
              understanding, organization, and retrieval.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Product</h3>
              <nav className="mt-3 flex flex-col gap-2" aria-label="Product">
                <a href="#how" className="text-sm text-muted transition-colors hover:text-ink">
                  How it works
                </a>
                <a href="#promise" className="text-sm text-muted transition-colors hover:text-ink">
                  Promise
                </a>
                <a href="#ios" className="text-sm text-muted transition-colors hover:text-ink">
                  iOS
                </a>
                <a href="#pricing" className="text-sm text-muted transition-colors hover:text-ink">
                  Pricing
                </a>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink">Resources</h3>
              <nav className="mt-3 flex flex-col gap-2" aria-label="Resources">
                <a href="/docs" className="text-sm text-muted transition-colors hover:text-ink">
                  Docs
                </a>
                <a href="/posts" className="text-sm text-muted transition-colors hover:text-ink">
                  Blog
                </a>
                <a href="/changelog" className="text-sm text-muted transition-colors hover:text-ink">
                  Changelog
                </a>
                <a href="/tools" className="text-sm text-muted transition-colors hover:text-ink">
                  Tools
                </a>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink">Company</h3>
              <nav className="mt-3 flex flex-col gap-2" aria-label="Company">
                <a href="/about" className="text-sm text-muted transition-colors hover:text-ink">
                  About
                </a>
                <a href="/contact" className="text-sm text-muted transition-colors hover:text-ink">
                  Contact
                </a>
                <a
                  href="https://twitter.com/saveitnow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted transition-colors hover:text-ink"
                >
                  Twitter
                </a>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink">Legal</h3>
              <nav className="mt-3 flex flex-col gap-2" aria-label="Legal">
                <a href="/privacy" className="text-sm text-muted transition-colors hover:text-ink">
                  Privacy
                </a>
                <a href="/terms" className="text-sm text-muted transition-colors hover:text-ink">
                  Terms
                </a>
              </nav>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} SaveIt.now. All rights reserved.
          </p>
          <p className="text-sm text-muted">Just save it.</p>
        </div>
      </div>
    </footer>
  );
}
