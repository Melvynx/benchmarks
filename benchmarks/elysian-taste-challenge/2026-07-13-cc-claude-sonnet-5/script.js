(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarse =
    window.matchMedia("(hover: none), (pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 860;

  /* ---------------- custom cursor ---------------- */
  if (!isCoarse && !reduceMotion) {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    loop();

    document.querySelectorAll("a, button, .c-card, .chapter-slide").forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("expand"));
      el.addEventListener("mouseleave", () => ring.classList.remove("expand"));
    });
  }

  /* ---------------- scroll progress rail ---------------- */
  const progressFill = document.querySelector(".progress-fill");
  function updateProgress() {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    progressFill.style.height = pct + "%";
  }

  /* ---------------- nav mobile toggle ---------------- */
  const navToggle = document.querySelector(".nav-toggle");
  const mobileMenu = document.getElementById("mobileMenu");
  navToggle.addEventListener("click", () => {
    const open = navToggle.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
    mobileMenu.classList.toggle("open", open);
  });
  mobileMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      navToggle.classList.remove("open");
      mobileMenu.classList.remove("open");
    })
  );

  /* ---------------- reveal on scroll ---------------- */
  const revealTargets = document.querySelectorAll(
    ".reveal-word, .reveal-fade, .reveal-lines, .c-card"
  );
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  revealTargets.forEach((el) => revealObserver.observe(el));

  /* ---------------- staggered card delays ---------------- */
  document.querySelectorAll(".c-card").forEach((el, i) => {
    el.style.transitionDelay = `${i * 0.09}s`;
  });

  /* ---------------- parallax on [data-speed] ---------------- */
  const parallaxEls = Array.from(document.querySelectorAll("[data-speed]"));
  function updateParallax() {
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.speed) || 0.2;
      const rect = el.closest("section, .hero").getBoundingClientRect();
      const offset = rect.top;
      const shift = offset * speed;
      el.style.transform = `translate3d(0, ${shift}px, 0)`;
    });
  }

  /* ---------------- rAF scroll loop ---------------- */
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateProgress();
        if (!reduceMotion) updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- chapters: wheel -> horizontal scroll ---------------- */
  const track = document.querySelector(".chapters-track-wrap");
  if (track) {
    track.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          const atStart = track.scrollLeft <= 0 && e.deltaY < 0;
          const atEnd =
            track.scrollLeft + track.clientWidth >= track.scrollWidth - 1 &&
            e.deltaY > 0;
          if (!atStart && !atEnd) {
            e.preventDefault();
            track.scrollLeft += e.deltaY;
          }
        }
      },
      { passive: false }
    );
  }

  /* ---------------- waitlist form ---------------- */
  const form = document.getElementById("waitlistForm");
  const note = document.getElementById("formNote");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("emailField").value.trim();
      if (!email) return;
      note.textContent = `Your name has been set beside the others. Await word from the garden, ${email.split("@")[0]}.`;
      note.classList.add("success");
      form.reset();
      form.querySelector("button").disabled = true;
      setTimeout(() => {
        form.querySelector("button").disabled = false;
      }, 1200);
    });
  }

  /* ---------------- hero title line reveal on load ---------------- */
  window.addEventListener("load", () => {
    document.querySelectorAll(".reveal-line").forEach((el, i) => {
      el.style.animation = `line-up .9s ${0.15 + i * 0.08}s var(--ease-out, cubic-bezier(.16,1,.3,1)) both`;
    });
    document.querySelector(".eyebrow")?.classList.add("in");
    setTimeout(() => document.querySelector(".hero-sub")?.classList.add("in"), 500);
  });

  const styleTag = document.createElement("style");
  styleTag.textContent = `
    @keyframes line-up {
      from { transform: translateY(110%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(styleTag);
})();
