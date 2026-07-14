import { useEffect, useRef, useState } from 'react'
import botanical from './assets/elysian-botanical.webp'
import './App.css'

const notes = [
  {
    name: 'Night jasmine',
    type: 'Heart / 01',
    detail: 'White petals, solar warmth, a trace of skin.',
    position: '38% 42%',
    tone: 'jasmine',
  },
  {
    name: 'Saffron smoke',
    type: 'Pulse / 02',
    detail: 'Golden spice dissolving into midnight air.',
    position: '82% 35%',
    tone: 'saffron',
  },
  {
    name: 'Velvet leaf',
    type: 'Shadow / 03',
    detail: 'Crushed green, mineral rain, deep blue woods.',
    position: '58% 72%',
    tone: 'velvet',
  },
]

function ArrowIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 24h32M28 12l12 12-12 12" />
    </svg>
  )
}

function App() {
  const heroRef = useRef<HTMLElement>(null)
  const [activeNote, setActiveNote] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [introVisible, setIntroVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroVisible(false), 1900)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.16 },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const handleHeroPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (!heroRef.current) return
    const bounds = heroRef.current.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = ((event.clientY - bounds.top) / bounds.height) * 100
    heroRef.current.style.setProperty('--pointer-x', `${x}%`)
    heroRef.current.style.setProperty('--pointer-y', `${y}%`)
  }

  const closeMenu = () => setMenuOpen(false)
  const selectedNote = notes[activeNote]

  return (
    <main>
      <div className={`intro-curtain ${introVisible ? '' : 'is-gone'}`} aria-hidden="true">
        <p>The garden opens</p>
        <div className="intro-word" aria-label="Elysian">
          {'ELYSIAN'.split('').map((letter, index) => (
            <span key={`${letter}-${index}`}>{letter}</span>
          ))}
        </div>
        <p>after dark</p>
      </div>

      <section
        className="hero"
        ref={heroRef}
        onPointerMove={handleHeroPointer}
        style={{ '--botanical': `url(${botanical})` } as React.CSSProperties}
      >
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="dream-lens" aria-hidden="true">
          <div className="dream-lens-image" />
          <span>Move through the bloom</span>
        </div>

        <header className="site-header">
          <a className="wordmark" href="#top" aria-label="Elysian home">
            Elysian
          </a>
          <p className="edition">Maison botanique · Paris / 2026</p>
          <button
            className="menu-button"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span>{menuOpen ? 'Close' : 'Menu'}</span>
            <i aria-hidden="true" />
          </button>
        </header>

        <nav id="site-menu" className={`site-menu ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <a href="#essence" onClick={closeMenu}>The essence</a>
          <a href="#notes" onClick={closeMenu}>Scent notes</a>
          <a href="#ritual" onClick={closeMenu}>The ritual</a>
          <a href="#invitation" onClick={closeMenu}>Private invitation</a>
        </nav>

        <div className="hero-title" aria-label="Elysian">
          <span>Ely</span><span>sian</span>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">Nocturne, Eau de Parfum Nº 01</p>
          <h1>A garden no daylight knows.</h1>
        </div>

        <a className="hero-cta" href="#essence">
          <span>Enter after dark</span>
          <ArrowIcon />
        </a>

        <p className="hero-side-note">Distilled from flowers imagined at the edge of sleep.</p>
      </section>

      <section className="manifesto" id="essence">
        <div className="manifesto-kicker" data-reveal>
          <span>01</span>
          <p>An olfactory fiction</p>
        </div>
        <div className="manifesto-copy" data-reveal>
          <p className="manifesto-lead">Elysian is not a place.</p>
          <h2>It is the hour between <em>desire</em> and memory.</h2>
        </div>
        <div className="manifesto-aside" data-reveal>
          <p>
            A concentrated botanical perfume composed in the dark: voluptuous white flowers,
            electric saffron, and leaves still wet from an impossible rain.
          </p>
          <p className="coordinates">48.8566° N<br />2.3522° E</p>
        </div>
        <div className="botanical-triptych" aria-label="Details from the Elysian botanical world" data-reveal>
          <figure className="petal-frame petal-one">
            <img src={botanical} alt="Pink and white flower in the Elysian botanical artwork" />
          </figure>
          <figure className="petal-frame petal-two">
            <img src={botanical} alt="Golden flower in the Elysian botanical artwork" />
          </figure>
          <figure className="petal-frame petal-three">
            <img src={botanical} alt="Deep teal leaves in the Elysian botanical artwork" />
          </figure>
          <span className="triptych-caption">One garden. Three states of longing.</span>
        </div>
      </section>

      <section className={`notes-section tone-${selectedNote.tone}`} id="notes">
        <div className="notes-heading" data-reveal>
          <p>Composition / Parfum</p>
          <h2>Three notes.<br />One beautiful haunting.</h2>
        </div>

        <div className="scent-orbit" data-reveal>
          <div
            className="scent-image"
            style={{ backgroundImage: `url(${botanical})`, backgroundPosition: selectedNote.position }}
            aria-hidden="true"
          />
          <div className="orbit-line orbit-one" aria-hidden="true" />
          <div className="orbit-line orbit-two" aria-hidden="true" />
          <p className="orbit-copy" aria-live="polite">{selectedNote.detail}</p>
          <span className="orbit-index">0{activeNote + 1}</span>
        </div>

        <div className="note-selector" role="tablist" aria-label="Explore fragrance notes" data-reveal>
          {notes.map((note, index) => (
            <button
              key={note.name}
              type="button"
              role="tab"
              aria-selected={activeNote === index}
              className={activeNote === index ? 'is-active' : ''}
              onClick={() => setActiveNote(index)}
            >
              <span>{note.type}</span>
              <strong>{note.name}</strong>
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="ritual" id="ritual">
        <div className="ritual-image" style={{ backgroundImage: `url(${botanical})` }} aria-hidden="true">
          <div className="ritual-marquee">
            <span>Wear at dusk · Leave before morning · Wear at dusk · Leave before morning ·</span>
            <span aria-hidden="true">Wear at dusk · Leave before morning · Wear at dusk · Leave before morning ·</span>
          </div>
        </div>
        <div className="ritual-content">
          <div className="ritual-number" data-reveal>03 / The ritual</div>
          <h2 data-reveal>Apply where the night can find you.</h2>
          <ol data-reveal>
            <li><span>Pulse</span><p>One drop at the hollow of the throat.</p></li>
            <li><span>Veil</span><p>A second in the air; step slowly through.</p></li>
            <li><span>Remain</span><p>Let the final note belong only to memory.</p></li>
          </ol>
        </div>
      </section>

      <footer className="invitation" id="invitation" style={{ '--botanical': `url(${botanical})` } as React.CSSProperties}>
        <div className="invitation-image" aria-hidden="true" />
        <div className="invitation-content" data-reveal>
          <p>First distillation · 300 numbered flacons</p>
          <h2>Enter the<br /><em>unreal.</em></h2>
          <a href="mailto:concierge@elysian.paris">
            <span>Request a private invitation</span>
            <ArrowIcon />
          </a>
        </div>
        <div className="footer-meta">
          <span>© 2026 Elysian</span>
          <span>Paris · New York · Somewhere after midnight</span>
          <a href="#top">Return to the bloom ↑</a>
        </div>
      </footer>
    </main>
  )
}

export default App
