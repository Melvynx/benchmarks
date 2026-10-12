const rooms = [
  {
    name: "Atelier",
    line: "The table remembers a mountain it has never visited.",
  },
  {
    name: "Library",
    line: "He reads the volcano as if it were a page.",
  },
  {
    name: "Valley",
    line: "One tree defected to gold. The river kept the minutes.",
  },
  {
    name: "Night house",
    line: "The door is darker than the stars around it.",
  },
];

const compositeCopy = {
  name: "One window",
  line: "The frame already held a mountain. The other rooms climbed in.",
};

const arch = document.querySelector("#arch");
const solos = [...document.querySelectorAll(".solo")];
const spines = [...document.querySelectorAll(".spines button")];
const kicker = document.querySelector("#arch-kicker");
const line = document.querySelector("#arch-line");
const reunite = document.querySelector(".reunite");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = window.matchMedia("(pointer: fine)").matches;

let index = -1;
let pointer = null;

function showComposite() {
  index = -1;
  arch.classList.remove("is-solo");
  solos.forEach((img) => img.classList.remove("is-on"));
  spines.forEach((btn) => btn.setAttribute("aria-checked", "false"));
  kicker.textContent = compositeCopy.name;
  line.textContent = compositeCopy.line;
  reunite.hidden = true;
}

function showRoom(next) {
  if (next === index) return;
  index = next;
  arch.classList.add("is-solo");
  solos.forEach((img, i) => img.classList.toggle("is-on", i === next));
  spines.forEach((btn, i) => {
    btn.setAttribute("aria-checked", i === next ? "true" : "false");
  });
  kicker.textContent = rooms[next].name;
  line.textContent = rooms[next].line;
  reunite.hidden = false;
}

spines.forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = Number(btn.dataset.index);
    if (next === index) showComposite();
    else showRoom(next);
  });
});

reunite.addEventListener("click", showComposite);

arch.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  pointer = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    dragged: false,
  };
});

arch.addEventListener("pointermove", (event) => {
  if (fine && !reduce) {
    const rect = arch.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    arch.style.setProperty("--px", px.toFixed(4));
    arch.style.setProperty("--py", py.toFixed(4));
  }

  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (!pointer.dragged) {
    if (Math.abs(dx) < 12) return;
    if (Math.abs(dx) < Math.abs(dy)) {
      pointer = null;
      return;
    }
    pointer.dragged = true;
    arch.setPointerCapture(event.pointerId);
  }
  const rect = arch.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  showRoom(Math.round(ratio * (rooms.length - 1)));
});

function endPointer(event) {
  if (!pointer || (event && pointer.id !== event.pointerId)) return;
  pointer = null;
}

arch.addEventListener("pointerup", endPointer);
arch.addEventListener("pointercancel", endPointer);
arch.addEventListener("pointerleave", () => {
  if (pointer) return;
  arch.style.setProperty("--px", "0");
  arch.style.setProperty("--py", "0");
});

arch.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    event.preventDefault();
    showRoom(Math.min(rooms.length - 1, index < 0 ? 0 : index + 1));
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (index <= 0) showComposite();
    else showRoom(index - 1);
  } else if (event.key === "Home") {
    event.preventDefault();
    showComposite();
  } else if (event.key === "End") {
    event.preventDefault();
    showRoom(rooms.length - 1);
  }
});

const roomSections = [...document.querySelectorAll(".room")];
if (reduce || !("IntersectionObserver" in window)) {
  roomSections.forEach((section) => section.classList.add("is-in"));
} else {
  const reveal = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        reveal.unobserve(entry.target);
      });
    },
    { threshold: 0.22 },
  );
  roomSections.forEach((section) => reveal.observe(section));
}

const navLinks = [...document.querySelectorAll(".running-head nav a")];
const watched = ["atelier", "library", "valley", "night", "ledger"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const visible = new Map();
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
        else visible.delete(entry.target.id);
      });
      const order = ["atelier", "library", "valley", "night"];
      const current = order.find((id) => visible.has(id) && !visible.has("ledger"));
      navLinks.forEach((link) => {
        const on = link.getAttribute("href") === `#${current}`;
        link.classList.toggle("is-current", on);
        if (on) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-42% 0px -48% 0px", threshold: [0, 0.25, 0.6] },
  );
  watched.forEach((section) => spy.observe(section));
}

const form = document.querySelector("#key-form");
const guest = document.querySelector("#guest");
const error = document.querySelector("#form-error");
const success = document.querySelector("#success");
const guestName = document.querySelector("#guest-name");
const intro = document.querySelector("#ledger-intro");
const ledger = document.querySelector("#ledger");

guest.addEventListener("input", () => {
  if (!error.hidden) {
    error.hidden = true;
    guest.removeAttribute("aria-invalid");
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = guest.value.trim();
  if (!name) {
    guest.setAttribute("aria-invalid", "true");
    error.hidden = false;
    guest.focus();
    return;
  }
  guestName.textContent = name;
  intro.hidden = true;
  form.hidden = true;
  success.hidden = false;
  ledger.classList.add("is-open");
});
