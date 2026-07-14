/* ═══════════════════════════════════════════════════════════
   ELYSIAN — interaction layer
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  /* ── gate ── */
  const gate = $("#gate");
  if (gate) {
    if (reduced) gate.remove();
    else {
      window.addEventListener("load", () => gate.classList.add("gate--open"));
      setTimeout(() => gate.classList.add("gate--open"), 2200); // failsafe
      gate.addEventListener("transitionend", (e) => {
        if (e.propertyName === "transform") gate.remove();
      });
    }
  }

  /* ── reveals ── */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* ── nav: hide on scroll down, chapter dots ── */
  const nav = $("#nav");
  let lastY = 0;
  const dotLinks = $$(".nav__dots a");
  const chapters = dotLinks.map((a) => $(a.getAttribute("href")));
  const chapterIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      const i = chapters.indexOf(e.target);
      if (i > -1 && e.isIntersecting) {
        dotLinks.forEach((d, j) => d.classList.toggle("on", j === i));
      }
    }),
    { threshold: 0.25 }
  );
  chapters.forEach((c) => c && chapterIO.observe(c));

  /* ── cursor ── */
  const cursor = $("#cursor");
  const cursorLabel = $("#cursorLabel");
  let cx = -100, cy = -100, tx = -100, ty = -100;
  if (fine && !reduced && cursor) {
    document.addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add("cursor--on");
    });
    document.addEventListener("mouseleave", () => cursor.classList.remove("cursor--on"));
    const hoverables = "a, button, .artifact__row";
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest(hoverables);
      cursor.classList.toggle("cursor--hover", !!t);
      cursorLabel.textContent = t && t.closest(".artifact") ? "inspect" : "";
    });
  }

  /* ── artifact lens (desktop) / accordion (touch) ── */
  const lens = $("#lens");
  const lensImg = $("#lensImg");
  const lensTag = $("#lensTag");
  let lensOn = false, lx = 0, ly = 0;

  $$(".artifact").forEach((li) => {
    const row = $(".artifact__row", li);
    const pos = li.dataset.pos, zoom = li.dataset.zoom;
    const tag = $(".artifact__inline figcaption", li)?.textContent || "";

    if (fine && !reduced) {
      row.addEventListener("mouseenter", () => {
        lensImg.style.backgroundPosition = pos;
        lensImg.style.backgroundSize = zoom;
        lensTag.textContent = tag;
        lens.classList.add("lens--on");
        lensOn = true;
      });
      row.addEventListener("mouseleave", () => {
        lens.classList.remove("lens--on");
        lensOn = false;
      });
    }
    row.addEventListener("click", () => {
      if (fine && !reduced) return;
      const wasOpen = li.classList.contains("open");
      $$(".artifact.open").forEach((o) => o.classList.remove("open"));
      if (!wasOpen) li.classList.add("open");
    });
  });

  /* ── portal (Chapter III arch) ── */
  const portal = $("#valley");
  const portalFrame = $("#portalFrame");

  /* ── parallax targets ── */
  const parallaxEls = $$("[data-parallax]").map((el) => ({
    el, k: parseFloat(el.dataset.parallax) || 0.1
  }));
  const heroLetters = $(".hero__letters");
  const plateImg = $(".collection__plateImg");
  const scholarsImg = $(".scholars__img");
  const portalImg = $(".portal__img");

  /* ── unified rAF loop ── */
  let ticking = false;
  function frame() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    // nav hide/show
    if (nav) {
      nav.classList.toggle("nav--hidden", y > lastY && y > vh * 0.8);
      lastY = y;
    }

    if (!reduced) {
      // simple parallax
      for (const { el, k } of parallaxEls) {
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2 - vh / 2;
        el.style.transform = `translateY(${(-mid * k).toFixed(1)}px)`;
      }
      // hero title texture drift
      if (heroLetters) {
        const p = clamp01(y / vh);
        heroLetters.style.backgroundPosition = `50% ${40 + p * 30}%`;
      }
      // background-position drifts on plates
      const drift = (el, from, to, axis = "y") => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const p = clamp01(1 - (r.top + r.height) / (vh + r.height));
        const v = lerp(from, to, p);
        el.style.backgroundPosition = axis === "y" ? `50% ${v}%` : `${v}% 55%`;
      };
      drift(plateImg, 18, 55);
      drift(scholarsImg, 18, 55, "x");
      drift(portalImg, 20, 78, "x");

      // portal arch opening
      if (portal && portalFrame) {
        const r = portal.getBoundingClientRect();
        const total = r.height - vh;
        const p = clamp01(-r.top / total);
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const vmin = Math.min(vh, window.innerWidth) / 100;
        const w = lerp(34 * vmin, window.innerWidth + 4, ease);
        const h = lerp(52 * vmin, vh + 4, ease);
        const radius = lerp(999, 0, clamp01((ease - 0.55) / 0.45));
        portalFrame.style.setProperty("--pw", w + "px");
        portalFrame.style.setProperty("--ph", h + "px");
        portalFrame.style.setProperty("--pr", radius + "px");
        portalFrame.style.setProperty("--pcap", clamp01((ease - 0.6) / 0.3).toFixed(3));
      }
    }
    // cursor + lens chase
    if (fine && !reduced) {
      cx = lerp(cx, tx, 0.22); cy = lerp(cy, ty, 0.22);
      if (cursor) cursor.style.transform = `translate(${cx - 7}px, ${cy - 7}px)`;
      if (lensOn) {
        lx = lerp(lx, tx, 0.12); ly = lerp(ly, ty, 0.12);
        const vx = tx - lx;
        const px = Math.min(lx + 30, window.innerWidth - 270);
        const py = Math.min(Math.max(ly - 300, 12), window.innerHeight - 350);
        lens.style.transform =
          `translate(${px}px, ${py}px) rotate(${Math.max(-8, Math.min(8, vx * 0.08))}deg)`;
      }
    }
  }
  if (fine && !reduced) {
    // continuous loop: cursor smoothing needs every frame anyway
    (function loop() { frame(); requestAnimationFrame(loop); })();
  } else {
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  /* ── temple starfield ── */
  const canvas = $("#stars");
  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    let stars = [], shooting = null, W = 0, H = 0, running = false;

    function resize() {
      const r = canvas.parentElement.getBoundingClientRect();
      W = canvas.width = r.width * devicePixelRatio;
      H = canvas.height = r.height * devicePixelRatio;
      stars = Array.from({ length: Math.min(220, (W * H) / 18000) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * 0.62,
        r: (Math.random() * 1.4 + 0.3) * devicePixelRatio,
        tw: Math.random() * Math.PI * 2,
        sp: 0.008 + Math.random() * 0.025
      }));
    }
    function draw(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.tw += s.sp;
        const a = 0.35 + Math.abs(Math.sin(s.tw)) * 0.6;
        ctx.globalAlpha = a;
        ctx.fillStyle = "#f4efe6";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // occasional shooting star
      if (!shooting && Math.random() < 0.004) {
        shooting = { x: Math.random() * W * 0.7 + W * 0.15, y: Math.random() * H * 0.25, l: 0 };
      }
      if (shooting) {
        shooting.l += 0.04;
        const dx = shooting.l * W * 0.16, dy = shooting.l * H * 0.07;
        const grad = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x + dx, shooting.y + dy);
        grad.addColorStop(0, "rgba(244,239,230,0)");
        grad.addColorStop(1, "rgba(247,185,84,0.9)");
        ctx.globalAlpha = 1 - shooting.l;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4 * devicePixelRatio;
        ctx.beginPath();
        ctx.moveTo(shooting.x, shooting.y);
        ctx.lineTo(shooting.x + dx, shooting.y + dy);
        ctx.stroke();
        if (shooting.l >= 1) shooting = null;
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }
    const starIO = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !running) { running = true; resize(); requestAnimationFrame(draw); }
        else if (!e.isIntersecting) running = false;
      });
    }, { threshold: 0.05 });
    starIO.observe(canvas);
    window.addEventListener("resize", () => { if (running) resize(); }, { passive: true });
  }

  /* ── temple CTA ── */
  const cta = $("#audienceBtn");
  if (cta) {
    cta.addEventListener("click", () => {
      cta.classList.toggle("done");
    });
  }
})();
