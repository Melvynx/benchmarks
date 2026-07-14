const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const cursor = document.querySelector(".cursor");
const cursorText = cursor.querySelector("span");

window.addEventListener("pointermove", (event) => {
  cursor.style.left = `${event.clientX}px`;
  cursor.style.top = `${event.clientY}px`;
  cursor.classList.add("visible");
}, { passive: true });

document.querySelectorAll("[data-cursor], button, a").forEach((element) => {
  element.addEventListener("pointerenter", () => {
    cursor.classList.add("active");
    cursorText.textContent = element.dataset.cursor || (element.tagName === "A" ? "GO" : "OPEN");
  });
  element.addEventListener("pointerleave", () => {
    cursor.classList.remove("active");
    cursorText.textContent = "ENTER";
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("in-view");
    observer.unobserve(entry.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min((index % 4) * 80, 240)}ms`;
  observer.observe(element);
});

if (!reduceMotion) {
  const parallaxItems = document.querySelectorAll("[data-parallax]");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      parallaxItems.forEach((item) => {
        const rect = item.closest("section").getBoundingClientRect();
        const amount = Number(item.dataset.parallax);
        item.style.translate = `0 ${rect.top * amount}px`;
      });
      ticking = false;
    });
  }, { passive: true });
}

const river = document.querySelector(".river-window");
river.addEventListener("pointermove", (event) => {
  const rect = river.getBoundingClientRect();
  river.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
  river.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
});

const orrery = document.querySelector(".orrery");
document.querySelector(".observatory").addEventListener("pointermove", (event) => {
  if (reduceMotion) return;
  const x = ((event.clientY / innerHeight) - 0.5) * -8;
  const y = ((event.clientX / innerWidth) - 0.5) * 10;
  orrery.style.setProperty("--orrery-x", `${x}deg`);
  orrery.style.setProperty("--orrery-y", `${y}deg`);
});

document.querySelectorAll(".magnetic").forEach((button) => {
  button.addEventListener("pointermove", (event) => {
    if (reduceMotion) return;
    const rect = button.getBoundingClientRect();
    button.style.translate = `${(event.clientX - rect.left - rect.width / 2) * 0.12}px ${(event.clientY - rect.top - rect.height / 2) * 0.12}px`;
  });
  button.addEventListener("pointerleave", () => { button.style.translate = "0 0"; });
});

const dialog = document.querySelector(".key-dialog");
document.querySelectorAll("[data-open-dialog]").forEach((button) => button.addEventListener("click", () => dialog.showModal()));
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

const soundButton = document.querySelector(".sound-toggle");
let audioContext;
let ambientGain;
soundButton.addEventListener("click", () => {
  const active = soundButton.getAttribute("aria-pressed") !== "true";
  soundButton.setAttribute("aria-pressed", String(active));
  soundButton.querySelector(".sound-label").textContent = active ? "SOUND ON" : "SOUND OFF";
  if (!audioContext) {
    audioContext = new AudioContext();
    ambientGain = audioContext.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(audioContext.destination);
    [55, 82.4, 110].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = index === 1 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = [0.025, 0.012, 0.008][index];
      oscillator.connect(gain).connect(ambientGain);
      oscillator.start();
    });
  }
  audioContext.resume();
  ambientGain.gain.cancelScheduledValues(audioContext.currentTime);
  ambientGain.gain.linearRampToValueAtTime(active ? 0.5 : 0, audioContext.currentTime + 0.8);
});
