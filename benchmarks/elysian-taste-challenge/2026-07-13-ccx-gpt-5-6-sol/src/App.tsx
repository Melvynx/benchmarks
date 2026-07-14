import { useEffect, useRef, useState, type PointerEvent } from 'react'

const notes = [
  {
    id: 'azalea',
    index: 'I',
    label: 'First light',
    name: 'Electric azalea',
    detail: 'A white bloom cut through with pink heat—bright, impossible, immediate.',
  },
  {
    id: 'saffron',
    index: 'II',
    label: 'At the heart',
    name: 'Saffron petal',
    detail: 'Golden warmth with a mineral edge, held just before it becomes sweet.',
  },
  {
    id: 'leaf',
    index: 'III',
    label: 'After midnight',
    name: 'Inked leaf',
    detail: 'Cool rain, dark chlorophyll and the soft static of a gathering storm.',
  },
]

function App() {
  const heroRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [activeNote, setActiveNote] = useState(0)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible')
        })
      },
      { threshold: 0.18 },
    )

    revealItems.forEach((item) => observer.observe(item))

    let frame = 0
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0
      progressRef.current?.style.setProperty('transform', `scaleX(${progress})`)
      document.documentElement.style.setProperty('--page-shift', `${window.scrollY * 0.06}px`)
      frame = 0
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress)
    }

    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const moveLens = (event: PointerEvent<HTMLElement>) => {
    const target = heroRef.current
    if (!target) return

    const bounds = target.getBoundingClientRect()
    const x = event.clientX - bounds.left
    const y = event.clientY - bounds.top
    target.style.setProperty('--lens-x', `${x}px`)
    target.style.setProperty('--lens-y', `${y}px`)
    target.style.setProperty('--lens-bg-x', `${(x / bounds.width) * 100}%`)
    target.style.setProperty('--lens-bg-y', `${(y / bounds.height) * 100}%`)
    target.style.setProperty('--lens-opacity', '1')
  }

  const hideLens = () => heroRef.current?.style.setProperty('--lens-opacity', '0')

  return (
    <main>
      <div className="page-progress" aria-hidden="true">
        <div ref={progressRef} className="page-progress__fill" />
      </div>

      <nav className="nav" aria-label="Primary navigation">
        <a className="nav__monogram" href="#top" aria-label="Elysian, home">
          <span>E</span>
        </a>
        <p className="nav__edition">Maison de botanique impossible · Est. 2026</p>
        <div className="nav__links">
          <a href="#the-bloom">The bloom</a>
          <a href="#formula">Formula</a>
          <a className="nav__cta" href="#edition">
            Private edition
          </a>
        </div>
      </nav>

      <section
        ref={heroRef}
        id="top"
        className="hero"
        onPointerMove={moveLens}
        onPointerLeave={hideLens}
      >
        <img
          className="hero__art"
          src="/elysian-botanical.webp"
          alt="A surreal garden of white, pink and saffron flowers against deep blue foliage"
          fetchPriority="high"
        />
        <div className="hero__veil" aria-hidden="true" />
        <div className="hero__lens" aria-hidden="true">
          <span>Look closer</span>
        </div>

        <div className="hero__meta hero__meta--left">
          <span>Extrait de parfum</span>
          <span>33° after midnight</span>
        </div>
        <div className="hero__meta hero__meta--right">
          <span>Paris · Mahé</span>
          <span>Edition N° 01 / 500</span>
        </div>

        <div className="hero__statement">
          <p className="hero__eyebrow">A flower that only exists after midnight.</p>
          <h1 className="hero__word" aria-label="Elysian">
            <span aria-hidden="true">E</span>
            <span aria-hidden="true">L</span>
            <span aria-hidden="true">Y</span>
            <span aria-hidden="true">S</span>
            <span aria-hidden="true">I</span>
            <span aria-hidden="true">A</span>
            <span aria-hidden="true">N</span>
          </h1>
          <div className="hero__foot">
            <p>
              Nocturne 01 distills the hour when a garden stops being seen and begins to be felt.
            </p>
            <a className="text-link text-link--light" href="#the-bloom">
              Enter the nocturne <span aria-hidden="true">↘</span>
            </a>
          </div>
        </div>

        <div className="hero__scroll" aria-hidden="true">
          <span>Descend after daylight</span>
          <i />
        </div>
      </section>

      <section id="the-bloom" className="manifesto section-shell">
        <div className="manifesto__aside" data-reveal>
          <p className="kicker">The first nocturne</p>
          <p className="vertical-copy">OLFAC­TORY SPECIMEN / 01</p>
        </div>
        <div className="manifesto__copy" data-reveal>
          <p className="manifesto__lead">Some gardens are real.</p>
          <h2>This one is remembered.</h2>
          <div className="manifesto__body">
            <p>
              Elysian composes perfume as landscape: not a list of notes, but weather, distance,
              colour and the uncanny sensation of returning somewhere you have never been.
            </p>
            <p>
              Nocturne 01 begins in white light, burns saffron at its heart, then disappears into
              rain-dark leaves. It wears close, then blooms without warning.
            </p>
          </div>
        </div>
      </section>

      <section className="triptych" aria-label="Studies of the Elysian botanical garden">
        <div className="triptych__panel triptych__panel--one" data-reveal>
          <span>Azalea / charge</span>
        </div>
        <div className="triptych__panel triptych__panel--two" data-reveal>
          <span>Saffron / heat</span>
        </div>
        <div className="triptych__panel triptych__panel--three" data-reveal>
          <span>Leaf / storm</span>
        </div>
      </section>

      <section id="formula" className="formula section-shell">
        <header className="formula__header" data-reveal>
          <p className="kicker">An anatomy of Nocturne 01</p>
          <h2>Three moments.<br />One impossible place.</h2>
        </header>

        <div className="formula__content">
          <div className="notes" role="list" aria-label="Fragrance notes" data-reveal>
            {notes.map((note, index) => (
              <button
                key={note.id}
                className={`note ${activeNote === index ? 'is-active' : ''}`}
                type="button"
                role="listitem"
                onClick={() => setActiveNote(index)}
                onMouseEnter={() => setActiveNote(index)}
                aria-pressed={activeNote === index}
              >
                <span className="note__index">{note.index}</span>
                <span className="note__label">{note.label}</span>
                <strong>{note.name}</strong>
                <span className="note__mark" aria-hidden="true">+</span>
              </button>
            ))}
          </div>

          <div className="formula__specimen" data-reveal>
            <div className={`specimen specimen--${activeNote + 1}`} aria-hidden="true">
              <div className="specimen__orbit specimen__orbit--outer" />
              <div className="specimen__orbit specimen__orbit--inner" />
              <div className="specimen__core" />
              <span>{notes[activeNote].index}</span>
            </div>
            <div className="formula__description" aria-live="polite">
              <p>{notes[activeNote].label}</p>
              <h3>{notes[activeNote].name}</h3>
              <span>{notes[activeNote].detail}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="ribbon" aria-hidden="true">
        <div>
          <span>WEAR THE HOUR BETWEEN WORLDS</span><i>✦</i>
          <span>WEAR THE HOUR BETWEEN WORLDS</span><i>✦</i>
          <span>WEAR THE HOUR BETWEEN WORLDS</span><i>✦</i>
          <span>WEAR THE HOUR BETWEEN WORLDS</span><i>✦</i>
        </div>
      </div>

      <section id="edition" className="edition section-shell">
        <div className="edition__visual" data-reveal>
          <div className="edition__halo" aria-hidden="true" />
          <div className="bottle" aria-label="Nocturne 01 perfume bottle">
            <div className="bottle__cap" />
            <div className="bottle__neck" />
            <div className="bottle__glass">
              <div className="bottle__shine" />
              <div className="bottle__liquid" />
              <div className="bottle__label">
                <span>ELYSIAN</span>
                <i>NOCTURNE</i>
                <strong>N° 01</strong>
                <small>PARIS · MAHÉ</small>
              </div>
            </div>
          </div>
          <p className="edition__caption">Hand-filled · 50 ml · Extrait de parfum</p>
        </div>

        <div className="edition__copy" data-reveal>
          <p className="kicker">The private edition</p>
          <h2>Only five hundred<br />will enter the garden.</h2>
          <p className="edition__intro">
            Each bottle is numbered by hand, wrapped in midnight silk and accompanied by a pressed
            botanical study from the house archive.
          </p>
          <div className="edition__facts">
            <div><span>Concentration</span><strong>28% extrait</strong></div>
            <div><span>Release</span><strong>Autumn equinox</strong></div>
            <div><span>Edition</span><strong>500 numbered bottles</strong></div>
          </div>

          {joined ? (
            <div className="joined" role="status">
              <span>✦</span>
              <div>
                <strong>The gate is open.</strong>
                <p>You are on the private edition list.</p>
              </div>
            </div>
          ) : (
            <form
              className="request-form"
              onSubmit={(event) => {
                event.preventDefault()
                setJoined(true)
              }}
            >
              <label htmlFor="email">Request private access</label>
              <div className="request-form__field">
                <input id="email" name="email" type="email" placeholder="Your email address" required />
                <button type="submit" aria-label="Request private access">
                  <span>Enter</span><i aria-hidden="true">↗</i>
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <footer className="footer">
        <div className="footer__top">
          <p>For those who prefer the garden after dark.</p>
          <div>
            <a href="#top">Instagram</a>
            <a href="#top">Maison</a>
            <a href="#top">Contact</a>
          </div>
        </div>
        <p className="footer__word" aria-hidden="true">ELYSIAN</p>
        <div className="footer__bottom">
          <span>© 2026 Elysian Parfums</span>
          <span>Paris · Mahé · Somewhere after midnight</span>
        </div>
      </footer>
    </main>
  )
}

export default App
