/**
 * ELYSIAN — SENSORY CARTOGRAPHY & INTERACTIVE ENGINE
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. STATE & INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  const state = {
    theme: 'nocturne',
    audioPlaying: false,
    audioCtx: null,
    droneOscs: [],
    droneGain: null,
    blend: {
      relic: 65,
      lyceum: 40,
      fluvial: 80,
      astral: 55,
    },
  };

  const announcer = document.getElementById('screenReaderAnnouncer');

  function announce(message) {
    if (announcer) {
      announcer.textContent = message;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ATMOSPHERIC THEME SWITCHER
  // ═══════════════════════════════════════════════════════════════════════════
  const themeBtns = document.querySelectorAll('.theme-btn');

  function applyTheme(themeName) {
    state.theme = themeName;
    document.documentElement.dataset.theme = themeName;
    themeBtns.forEach((btn) => {
      const isActive = btn.dataset.theme === themeName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    try {
      localStorage.setItem('elysian_theme', themeName);
    } catch (e) {}

    announce(`Atmospheric horizon shifted to ${themeName}`);
    drawSigil();
  }

  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
    });
  });

  try {
    const saved = localStorage.getItem('elysian_theme');
    if (saved) applyTheme(saved);
  } catch (e) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. GENERATIVE WEB AUDIO SYNTHESIZER
  // ═══════════════════════════════════════════════════════════════════════════
  const audioToggleBtn = document.getElementById('audioToggleBtn');

  function initAudio() {
    if (!state.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioCtx();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  function startDrone() {
    initAudio();
    if (state.droneGain) return;

    const ctx = state.audioCtx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.08, now + 3);
    masterGain.connect(ctx.destination);
    state.droneGain = masterGain;

    // Harmonic Drone frequencies: C#2 (69.3Hz), G#2 (103.83Hz), C#3 (138.59Hz), F#3 (185.0Hz)
    const freqs = [69.3, 103.83, 138.59, 185.0];
    state.droneOscs = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);

      // Gentle LFO filter modulation
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400 + i * 150, now);

      gain.gain.setValueAtTime(0.25 / (i + 1), now);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start();
      return osc;
    });

    state.audioPlaying = true;
    audioToggleBtn.classList.add('playing');
    audioToggleBtn.setAttribute('aria-pressed', 'true');
    announce('Ethereal soundscape awakened');
  }

  function stopDrone() {
    if (!state.droneGain || !state.audioCtx) return;
    const now = state.audioCtx.currentTime;
    state.droneGain.gain.linearRampToValueAtTime(0, now + 1.5);
    setTimeout(() => {
      state.droneOscs.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      state.droneOscs = [];
      if (state.droneGain) {
        state.droneGain.disconnect();
        state.droneGain = null;
      }
    }, 1600);

    state.audioPlaying = false;
    audioToggleBtn.classList.remove('playing');
    audioToggleBtn.setAttribute('aria-pressed', 'false');
    announce('Soundscape silenced');
  }

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      if (state.audioPlaying) {
        stopDrone();
      } else {
        startDrone();
      }
    });
  }

  // Chime trigger for realms & buttons
  function playHarmonicChime(freq = 432, type = 'sine') {
    if (!state.audioCtx) {
      initAudio();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    const ctx = state.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.1);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.9);
  }

  // Sound triggers for realm buttons
  document.querySelectorAll('.btn-sound-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pitch = parseFloat(btn.dataset.pitch || '528');
      playHarmonicChime(pitch, 'sine');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CELESTIAL CANVAS (PARTICLES & ASTRAL NODES)
  // ═══════════════════════════════════════════════════════════════════════════
  const canvas = document.getElementById('celestialCanvas');
  let ctx = null;
  let particles = [];
  let width = 0;
  let height = 0;
  let mouse = { x: -1000, y: -1000, radius: 150 };

  if (canvas) {
    ctx = canvas.getContext('2d');

    function resizeCanvas() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    }

    function initParticles() {
      const count = Math.min(Math.floor((width * height) / 14000), 100);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: Math.random() * 1.8 + 0.6,
          baseAlpha: Math.random() * 0.5 + 0.2,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    function drawParticles() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const colorMap = {
        nocturne: '212, 175, 55',
        aurora: '244, 114, 182',
        meridian: '201, 160, 80',
        crepuscule: '224, 122, 95',
      };
      const rgb = colorMap[state.theme] || '212, 175, 55';

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse repulsion
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * 1.5;
          p.x -= (dx / dist) * force;
          p.y -= (dy / dist) * force;
        }

        const alpha = p.baseAlpha + Math.sin(p.pulse) * 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${Math.max(0.1, alpha)})`;
        ctx.shadowColor = `rgba(${rgb}, 0.8)`;
        ctx.shadowBlur = 6;
        ctx.fill();

        // Connect nearby particles with delicate constellation lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const d2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d2 < 120) {
            const lineAlpha = (1 - d2 / 120) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${rgb}, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(drawParticles);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
      mouse.x = -1000;
      mouse.y = -1000;
    });

    resizeCanvas();
    requestAnimationFrame(drawParticles);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CUSTOM INERTIAL CURSOR
  // ═══════════════════════════════════════════════════════════════════════════
  const cursor = document.getElementById('customCursor');
  const cursorText = cursor ? cursor.querySelector('.custom-cursor-text') : null;

  if (cursor) {
    let mouseX = -100, mouseY = -100;
    let cursorX = -100, cursorY = -100;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function updateCursor() {
      cursorX += (mouseX - cursorX) * 0.2;
      cursorY += (mouseY - cursorY) * 0.2;
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      requestAnimationFrame(updateCursor);
    }
    requestAnimationFrame(updateCursor);

    // Interactive element hover behaviors
    document.querySelectorAll('a, button, input[type="range"], .realm-preview-card, .sensory-pillar').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('active');
        const customAction = el.dataset.cursor || '';
        if (cursorText) cursorText.textContent = customAction;
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('active');
        if (cursorText) cursorText.textContent = '';
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SENSORY SYNTHESIZER & GENERATIVE SIGIL
  // ═══════════════════════════════════════════════════════════════════════════
  const relicSlider = document.getElementById('sliderRelic');
  const lyceumSlider = document.getElementById('sliderLyceum');
  const fluvialSlider = document.getElementById('sliderFluvial');
  const astralSlider = document.getElementById('sliderAstral');

  const sigilCanvas = document.getElementById('sigilCanvas');
  const sigilCtx = sigilCanvas ? sigilCanvas.getContext('2d') : null;
  const accordTitle = document.getElementById('accordTitle');
  const accordDesc = document.getElementById('accordDesc');
  const btnHarmonize = document.getElementById('btnHarmonize');

  function updateBlend() {
    if (!relicSlider) return;
    state.blend.relic = parseInt(relicSlider.value, 10);
    state.blend.lyceum = parseInt(lyceumSlider.value, 10);
    state.blend.fluvial = parseInt(fluvialSlider.value, 10);
    state.blend.astral = parseInt(astralSlider.value, 10);

    document.getElementById('valRelic').textContent = `${state.blend.relic}%`;
    document.getElementById('valLyceum').textContent = `${state.blend.lyceum}%`;
    document.getElementById('valFluvial').textContent = `${state.blend.fluvial}%`;
    document.getElementById('valAstral').textContent = `${state.blend.astral}%`;

    generateAccordNomenclature();
    drawSigil();
  }

  function generateAccordNomenclature() {
    const { relic, lyceum, fluvial, astral } = state.blend;
    const max = Math.max(relic, lyceum, fluvial, astral);

    let name = 'Harmonic Quad-Resonance';
    let desc = 'A meticulously calibrated synthesis balancing terrestrial depth, scholarly order, river vitality, and celestial light.';

    if (max === relic && relic > 70) {
      name = 'Nocturne of Smoked Obsidian & Solera';
      desc = 'A deep, gravitational profile infused with petrified fig, aged velvet tannins, and century-old parchment shadows.';
    } else if (max === lyceum && lyceum > 70) {
      name = 'Treatise of Sunlit Cypress & Cold Marble';
      desc = 'An intellectual, architectural accord characterized by crisp Mediterranean ozone, crushed laurel, and warm limestone.';
    } else if (max === fluvial && fluvial > 70) {
      name = 'Prism Cataract of High Arcadia';
      desc = 'A luminous, hyper-vibrant cascade brimming with glacial spring ozone, wild mountain iris, and crushed mint ferns.';
    } else if (max === astral && astral > 70) {
      name = 'Meridian of Saffron Agarwood & Starlight';
      desc = 'A transcendent cosmic formula featuring golden kyara incense, celestial embers, and sacred temple smoke.';
    }

    if (accordTitle) accordTitle.textContent = name;
    if (accordDesc) accordDesc.textContent = desc;
  }

  function drawSigil() {
    if (!sigilCtx || !sigilCanvas) return;
    const size = sigilCanvas.width = sigilCanvas.height = 220;
    sigilCtx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const { relic, lyceum, fluvial, astral } = state.blend;

    const rRelic = (relic / 100) * 85 + 15;
    const rLyceum = (lyceum / 100) * 85 + 15;
    const rFluvial = (fluvial / 100) * 85 + 15;
    const rAstral = (astral / 100) * 85 + 15;

    sigilCtx.save();
    sigilCtx.translate(cx, cy);

    // Outer concentric sacred geometry ring
    sigilCtx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    sigilCtx.lineWidth = 1;
    sigilCtx.beginPath();
    sigilCtx.arc(0, 0, 95, 0, Math.PI * 2);
    sigilCtx.stroke();

    sigilCtx.beginPath();
    sigilCtx.arc(0, 0, 75, 0, Math.PI * 2);
    sigilCtx.setLineDash([4, 4]);
    sigilCtx.stroke();
    sigilCtx.setLineDash([]);

    // 4-point dynamic polygon
    sigilCtx.beginPath();
    sigilCtx.moveTo(0, -rAstral); // North: Astral
    sigilCtx.lineTo(rLyceum, 0);  // East: Lyceum
    sigilCtx.lineTo(0, rRelic);   // South: Relic
    sigilCtx.lineTo(-rFluvial, 0);// West: Fluvial
    sigilCtx.closePath();

    sigilCtx.fillStyle = 'rgba(212, 175, 55, 0.15)';
    sigilCtx.fill();
    sigilCtx.strokeStyle = '#f4e4ba';
    sigilCtx.lineWidth = 1.5;
    sigilCtx.shadowColor = '#d4af37';
    sigilCtx.shadowBlur = 10;
    sigilCtx.stroke();

    // Astral crosshairs and nodes
    const points = [
      [0, -rAstral],
      [rLyceum, 0],
      [0, rRelic],
      [-rFluvial, 0],
    ];

    points.forEach(([px, py]) => {
      sigilCtx.beginPath();
      sigilCtx.arc(px, py, 4, 0, Math.PI * 2);
      sigilCtx.fillStyle = '#ffffff';
      sigilCtx.fill();
    });

    // Central core bindu
    sigilCtx.beginPath();
    sigilCtx.arc(0, 0, 5, 0, Math.PI * 2);
    sigilCtx.fillStyle = '#d4af37';
    sigilCtx.fill();

    sigilCtx.restore();
  }

  [relicSlider, lyceumSlider, fluvialSlider, astralSlider].forEach((slider) => {
    if (slider) {
      slider.addEventListener('input', updateBlend);
    }
  });

  if (btnHarmonize) {
    btnHarmonize.addEventListener('click', () => {
      const { relic, lyceum, fluvial, astral } = state.blend;
      // Play 4-part harmonic chord
      playHarmonicChime(220 * (relic / 50), 'triangle');
      setTimeout(() => playHarmonicChime(330 * (lyceum / 50), 'sine'), 100);
      setTimeout(() => playHarmonicChime(440 * (fluvial / 50), 'sine'), 200);
      setTimeout(() => playHarmonicChime(554.37 * (astral / 50), 'triangle'), 300);

      announce(`Formula harmonized: ${accordTitle ? accordTitle.textContent : 'Bespoke Blend'}`);
    });
  }

  // Initial draw
  updateBlend();

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. STILL-LIFE MAGNIFYING LOUPE INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════
  const stillLifeWrap = document.getElementById('stillLifeWrap');
  const stillLifeImg = document.getElementById('stillLifeImg');
  const magnifierLens = document.getElementById('magnifierLens');

  if (stillLifeWrap && stillLifeImg && magnifierLens) {
    magnifierLens.style.backgroundImage = `url("${stillLifeImg.src}")`;

    stillLifeWrap.addEventListener('mousemove', (e) => {
      const rect = stillLifeWrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        magnifierLens.style.display = 'block';
        magnifierLens.style.left = `${x - 70}px`;
        magnifierLens.style.top = `${y - 70}px`;

        const bgX = (x / rect.width) * 100;
        const bgY = (y / rect.height) * 100;
        magnifierLens.style.backgroundPosition = `${bgX}% ${bgY}%`;
        magnifierLens.style.backgroundSize = `${rect.width * 2.2}px ${rect.height * 2.2}px`;
      } else {
        magnifierLens.style.display = 'none';
      }
    });

    stillLifeWrap.addEventListener('mouseleave', () => {
      magnifierLens.style.display = 'none';
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. PRIVATE SALON / RESERVATION DIALOG & WAX SEAL RITUAL
  // ═══════════════════════════════════════════════════════════════════════════
  const bookingDialog = document.getElementById('bookingDialog');
  const openDialogBtns = document.querySelectorAll('.open-booking-btn');
  const closeDialogBtn = document.getElementById('closeDialogBtn');
  const dossierForm = document.getElementById('dossierForm');
  const waxSealBtn = document.getElementById('waxSealBtn');
  const confirmationCard = document.getElementById('confirmationCard');
  const confirmationDetails = document.getElementById('confirmationDetails');

  openDialogBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (bookingDialog && typeof bookingDialog.showModal === 'function') {
        bookingDialog.showModal();
        announce('The Private Salon Dossier opened');
      }
    });
  });

  if (closeDialogBtn && bookingDialog) {
    closeDialogBtn.addEventListener('click', () => {
      bookingDialog.close();
      announce('The Private Salon Dossier closed');
    });
  }

  // Click outside backdrop to close
  if (bookingDialog) {
    bookingDialog.addEventListener('click', (e) => {
      const rect = bookingDialog.getBoundingClientRect();
      const inDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!inDialog) {
        bookingDialog.close();
      }
    });
  }

  if (waxSealBtn) {
    waxSealBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('guestName');
      const emailInput = document.getElementById('guestEmail');
      const ritualSelect = document.getElementById('ritualSelect');

      const name = (nameInput && nameInput.value.trim()) || 'Distinguished Initiate';
      const ritual = (ritualSelect && ritualSelect.options[ritualSelect.selectedIndex].text) || 'The Astral Meridian Tasting';

      waxSealBtn.classList.add('sealed');
      playHarmonicChime(880, 'triangle');

      setTimeout(() => {
        if (dossierForm) dossierForm.style.display = 'none';
        if (confirmationCard) {
          confirmationCard.classList.add('show');
          if (confirmationDetails) {
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            confirmationDetails.innerHTML = `
              <p><strong>Registry Dossier No.:</strong> ELY-2026-${Math.floor(1000 + Math.random() * 9000)}</p>
              <p><strong>Inscribed For:</strong> ${name}</p>
              <p><strong>Curated Experience:</strong> ${ritual}</p>
              <p><strong>Sealed Under:</strong> ${dateStr} · The Meridian Chamber</p>
            `;
          }
        }
        announce(`Inscription sealed for ${name}`);
      }, 500);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. SMOOTH PARALLAX & INTERSECTION REVEALS
  // ═══════════════════════════════════════════════════════════════════════════
  const masthead = document.querySelector('.masthead');
  window.addEventListener('scroll', () => {
    if (masthead) {
      if (window.scrollY > 50) {
        masthead.classList.add('scrolled');
      } else {
        masthead.classList.remove('scrolled');
      }
    }
  }, { passive: true });

  // Intersection Observer for graceful fade-ins
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.realm-showcase, .manifesto-grid, .synth-console, .atlas-section').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(el);
  });

})();
