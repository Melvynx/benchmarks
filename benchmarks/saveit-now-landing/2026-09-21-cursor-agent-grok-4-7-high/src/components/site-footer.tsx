import { nav } from "../nav";
import { ArcMark } from "./arc-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-5 py-14 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <a href="#top" className="inline-flex min-h-11 items-center gap-2.5">
            <ArcMark className="h-4 w-7 text-coral" />
            <span className="font-display text-xl font-semibold tracking-[-0.03em]">
              SaveIt.now
            </span>
          </a>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Your home for bookmarks. You save something. You can ask for it
            later.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-1">
            {nav.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ivory"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} SaveIt.now</p>
        <a
          href="https://saveit.now"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center underline decoration-ivory/30 underline-offset-4 hover:text-ivory hover:decoration-ivory"
        >
          saveit.now
        </a>
      </div>
    </footer>
  );
}
