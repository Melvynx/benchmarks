import { finePointer, pick, reducedMotion, shuffle } from "./utils";

type Realm = { num: string; name: string; img: string; pos: string; prophecies: string[] };

const REALMS: Realm[] = [
  {
    num: "I",
    name: "The Cabinet",
    img: "/img/still-life-1400.webp",
    pos: "88% 40%",
    prophecies: [
      "You will be given a room with one window and every view. The bust by the door already knows your name.",
      "Somewhere a saffron silk is being folded for you. It will be unfolded the moment you arrive, and never again.",
      "Your belongings have gone ahead of you. They are happier than you would expect.",
    ],
  },
  {
    num: "II",
    name: "The Academy",
    img: "/img/scholarly-900.webp",
    pos: "31% 45%",
    prophecies: [
      "You will finally win the argument you lost years ago. The volcano will take your side.",
      "A library with your handwriting in the margin of every book. You won't remember writing it. You did.",
      "Lessons begin at noon and end whenever you fall asleep beneath the golden urn. Attendance is optional; wonder is not.",
    ],
  },
  {
    num: "III",
    name: "The Valley",
    img: "/img/valley-900.webp",
    pos: "64% 50%",
    prophecies: [
      "A river that runs uphill on Sundays will carry you home. Bring nothing; the trees have arranged the rest.",
      "There is a saffron meadow with your silhouette already pressed into the grass. It has been waiting, patiently, warm.",
      "The glacier blushes when spoken to. You will speak to it often, and it will never tire of you.",
    ],
  },
  {
    num: "IV",
    name: "The Temple",
    img: "/img/temple-900.webp",
    pos: "50% 50%",
    prophecies: [
      "The door is always ajar. Someone keeps a lamp lit and pretends it is for no one in particular.",
      "You will arrive after midnight, as the best guests do. The stars have been polished for the occasion.",
      "Inside it is exactly as warm as the kitchen of your childhood. Take off your shoes.",
    ],
  },
];

export function initOracle(section: HTMLElement) {
  const deck = section.querySelector<HTMLElement>(".deck")!;
  const cards = [...section.querySelectorAll<HTMLButtonElement>(".card")];
  const prophecy = section.querySelector<HTMLElement>(".prophecy")!;
  const label = section.querySelector<HTMLElement>(".prophecy__label")!;
  const text = section.querySelector<HTMLElement>(".prophecy__text")!;
  const again = section.querySelector<HTMLButtonElement>(".prophecy__again")!;
  const glow = section.querySelector<HTMLElement>(".oracle__glow")!;
  const idleLabel = label.textContent ?? "";

  let order = shuffle([0, 1, 2, 3]);
  let drawn = -1;
  let busy = false;

  cards.forEach((card, i) => {
    const off = i - (cards.length - 1) / 2;
    card.style.setProperty("--off", String(off));
    card.style.setProperty("--abs", String(Math.abs(off)));
  });

  const draw = (j: number) => {
    if (drawn >= 0 || busy) return;
    drawn = j;
    const realm = REALMS[order[j]];
    const card = cards[j];
    const art = card.querySelector<HTMLElement>(".card__art")!;
    art.style.setProperty("--img", `url(${realm.img})`);
    art.style.setProperty("--pos", realm.pos);
    card.querySelector(".card__num")!.textContent = realm.num;
    card.querySelector(".card__name")!.textContent = realm.name;
    card.setAttribute("aria-label", `Drawn: ${realm.name}`);

    deck.classList.add("is-drawn");
    card.classList.add("is-chosen");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");

    const words = pick(realm.prophecies).split(" ");
    text.innerHTML = words.map((w, i) => `<span class="pw" style="--i:${i}">${w}</span>`).join(" ");
    label.textContent = `Your passage — ${realm.name}`;
    window.setTimeout(() => prophecy.classList.add("is-shown"), reducedMotion ? 0 : 650);
  };

  const reset = () => {
    if (drawn < 0 || busy) return;
    busy = true;
    prophecy.classList.remove("is-shown");
    cards[drawn].classList.remove("is-chosen");
    deck.classList.remove("is-drawn");
    const wait = reducedMotion ? 0 : 750;
    window.setTimeout(() => {
      deck.classList.add("is-gathering");
      window.setTimeout(() => {
        order = shuffle([0, 1, 2, 3]);
        cards.forEach((c, i) => {
          c.style.setProperty("--jitter", `${(Math.random() - 0.5) * 14}deg`);
          c.setAttribute("aria-label", `Draw card ${i + 1}`);
        });
        deck.classList.remove("is-gathering");
        label.textContent = idleLabel;
        text.textContent = "";
        drawn = -1;
        busy = false;
      }, reducedMotion ? 0 : 520);
    }, wait);
  };

  cards.forEach((card, j) => {
    card.addEventListener("click", () => draw(j));
    if (!finePointer) return;
    card.addEventListener("pointermove", (e) => {
      if (card.classList.contains("is-chosen")) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--rx", `${(0.5 - py) * 18}deg`);
      card.style.setProperty("--ry", `${(px - 0.5) * 22}deg`);
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });
  again.addEventListener("click", reset);

  if (finePointer) {
    section.addEventListener("pointermove", (e) => {
      const r = section.getBoundingClientRect();
      glow.style.transform = `translate3d(${e.clientX - r.left}px, ${e.clientY - r.top}px, 0) translate(-50%, -50%)`;
    });
  }
}
