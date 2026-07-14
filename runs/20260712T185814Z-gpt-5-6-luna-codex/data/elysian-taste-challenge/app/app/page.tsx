"use client";

import { useEffect, useState } from "react";

const botanicalImage =
  "https://codelynx.mlvcdn.com/uploads/2026-07-12/2026-07-12-colorful-botanical-dark-blue.png";

const notes = [
  {
    title: "Nocturne",
    copy: "A blue hour accord: iris, mineral air, and the quiet after rain.",
    mark: "01",
  },
  {
    title: "Citrine",
    copy: "Warm light held in the dark. A bright note with a long shadow.",
    mark: "02",
  },
  {
    title: "Verdant",
    copy: "The green edge of something wild, still becoming itself.",
    mark: "03",
  },
];

export default function Home() {
  const [activeNote, setActiveNote] = useState(0);
  const [isQuiet, setIsQuiet] = useState(false);

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      document.documentElement.style.setProperty("--pointer-x", `${x * 12}px`);
      document.documentElement.style.setProperty("--pointer-y", `${y * 12}px`);
    };

    window.addEventListener("pointermove", handlePointer, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointer);
  }, []);

  return (
    <main className={isQuiet ? "elysian quiet-mode" : "elysian"}>
      <div className="grain" aria-hidden="true" />

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Elysian home">
          Elysian<span className="wordmark-dot">·</span>
        </a>
        <p className="header-caption">A study in sensory imagination</p>
        <button
          className="quiet-toggle"
          type="button"
          aria-pressed={isQuiet}
          onClick={() => setIsQuiet((value) => !value)}
        >
          <span className="quiet-dot" aria-hidden="true" />
          {isQuiet ? "Awaken" : "Quiet mode"}
        </button>
      </header>

      <nav className="side-nav" aria-label="Primary navigation">
        <a className="side-nav-link active" href="#threshold">
          <span>01</span>
          Threshold
        </a>
        <a className="side-nav-link" href="#notes">
          <span>02</span>
          Notes
        </a>
        <a className="side-nav-link" href="#ritual">
          <span>03</span>
          Ritual
        </a>
      </nav>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy" id="threshold">
          <p className="eyebrow">Elysian / Volume 01</p>
          <h1 id="hero-title">
            <span>A garden</span>
            <span className="hero-line hero-line-offset">beyond</span>
            <span className="hero-line-italic">the visible.</span>
          </h1>
          <p className="hero-deck">
            Olfactory objects for the beautifully curious. Made somewhere
            between memory and myth.
          </p>
          <a className="enter-link" href="#notes">
            <span>Enter the collection</span>
            <span className="enter-arrow" aria-hidden="true">
              ↘
            </span>
          </a>
        </div>

        <div
          className="hero-art"
          role="img"
          aria-label="Colorful botanical forms floating over a dark blue field"
          style={{ backgroundImage: `url(${botanicalImage})` }}
        >
          <div className="hero-art-shade" aria-hidden="true" />
          <div className="hero-art-ring ring-one" aria-hidden="true" />
          <div className="hero-art-ring ring-two" aria-hidden="true" />
          <div className="hero-art-label" aria-hidden="true">
            <span>Field note</span>
            <strong>Flora / after dark</strong>
          </div>
          <span className="hero-art-index" aria-hidden="true">
            45° 12′ 08″ N
          </span>
        </div>

        <div className="hero-footer">
          <span>Keep scrolling</span>
          <span className="scroll-line" aria-hidden="true" />
          <span>For those who look twice</span>
        </div>
      </section>

      <section
        className="notes-section section-shell"
        id="notes"
        aria-labelledby="notes-title"
      >
        <div className="section-intro">
          <p className="eyebrow">The collection / 001—003</p>
          <h2 id="notes-title">
            Scent is a <em>doorway.</em>
          </h2>
          <p className="section-deck">
            Three compositions, built as invitations. Wear one and the room
            rearranges itself around you.
          </p>
        </div>

        <div className="note-stage">
          <div className="note-card note-card-shadow" aria-hidden="true" />
          <div className="note-card note-card-main">
            <div className="note-card-topline">
              <span>Elysian / extrait</span>
              <span>{notes[activeNote].mark} of 03</span>
            </div>
            <div className="note-card-orbit" aria-hidden="true">
              <span className="orbit-dot" />
              <span className="orbit-label">{notes[activeNote].title}</span>
            </div>
            <div className="note-card-copy">
              <p className="note-card-kicker">A scent study</p>
              <h3>{notes[activeNote].title}</h3>
              <p>{notes[activeNote].copy}</p>
            </div>
            <span className="note-card-coordinate">E / 001.003 / 24</span>
          </div>

          <div
            className="note-list"
            role="tablist"
            aria-label="Collection notes"
          >
            {notes.map((note, index) => (
              <button
                className={
                  index === activeNote ? "note-tab selected" : "note-tab"
                }
                key={note.title}
                type="button"
                role="tab"
                aria-selected={index === activeNote}
                onClick={() => setActiveNote(index)}
              >
                <span className="note-tab-number">{note.mark}</span>
                <span>{note.title}</span>
                <span className="note-tab-arrow" aria-hidden="true">
                  {index === activeNote ? "↗" : "→"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        className="ritual-section section-shell"
        id="ritual"
        aria-labelledby="ritual-title"
      >
        <div
          className="ritual-image"
          style={{ backgroundImage: `url(${botanicalImage})` }}
        >
          <span className="ritual-image-caption">A visual memory / 002</span>
        </div>
        <div className="ritual-copy">
          <p className="eyebrow">The Elysian ritual</p>
          <h2 id="ritual-title">
            Leave a little <em>mystery</em> in the air.
          </h2>
          <p>
            Elysian is made slowly: rare materials, considered proportions, and
            room for the imagination to finish the work. Nothing shouts.
            Everything lingers.
          </p>
          <div className="ritual-details">
            <div>
              <span>01</span>
              <strong>Concentrated</strong>
              <small>25% extrait de parfum</small>
            </div>
            <div>
              <span>02</span>
              <strong>Unhurried</strong>
              <small>Made in small atmospheres</small>
            </div>
          </div>
          <a className="text-link" href="mailto:hello@elysian.house">
            Begin a conversation <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer className="site-footer section-shell">
        <div>
          <a className="wordmark footer-wordmark" href="#top">
            Elysian<span className="wordmark-dot">·</span>
          </a>
          <p className="footer-note">For the beautifully curious, always.</p>
        </div>
        <div className="footer-meta">
          <span>© 2026 Elysian House</span>
          <span>Made somewhere between memory and myth</span>
        </div>
        <a className="back-top" href="#top">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </footer>
    </main>
  );
}
