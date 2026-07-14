const root = document.documentElement;
const hero = document.querySelector('.hero');
const revealItems = document.querySelectorAll('.reveal');
const ritualRows = document.querySelectorAll('.ritual-row');
const stageNumber = document.querySelector('.stage-number');
const stageTitle = document.querySelector('.ritual-stage h3');
const stageDescription = document.querySelector('.ritual-stage-copy p');
const stageArt = document.querySelector('.ritual-stage-art');
const signupForm = document.querySelector('.signup-form');
const formMessage = document.querySelector('.form-message');
const dialog = document.querySelector('.house-dialog');
const dialogClose = document.querySelector('.dialog-close');
const dialogConfirm = document.querySelector('.dialog-confirm');
const openLetterButtons = document.querySelectorAll('[data-open-letter]');

const ritualData = {
  '01': {
    title: 'Afterlight<br />No. 01',
    description: 'A violet hour you can hold. Worn low, it turns the room a little stranger.',
    color: 'oklch(0.29 0.1 278)',
  },
  '02': {
    title: 'Orangerie<br />Glass',
    description: 'A bright relic for the table. Citrus, rain, and the warmth left behind by a hand.',
    color: 'oklch(0.36 0.12 64)',
  },
  '03': {
    title: 'Moth to<br />Flame',
    description: 'A dark little orbit of smoke and silk, made for the hour when the house goes quiet.',
    color: 'oklch(0.24 0.09 330)',
  },
};

function updateScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  root.style.setProperty('--scroll-progress', `${progress}%`);
}

function moveWithPointer(event) {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const x = event.clientX - window.innerWidth / 2;
  const y = event.clientY - window.innerHeight / 2;
  root.style.setProperty('--pointer-x', `${x / 28}`);
  root.style.setProperty('--pointer-y', `${y / 28}`);
}

function setActiveRitual(row) {
  const ritual = ritualData[row.dataset.ritual];
  if (!ritual) return;

  ritualRows.forEach((item) => {
    const isActive = item === row;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-pressed', String(isActive));
  });
  stageNumber.textContent = row.dataset.ritual;
  stageTitle.innerHTML = ritual.title;
  stageDescription.textContent = ritual.description;
  stageArt.style.background = `radial-gradient(circle at 52% 49%, oklch(0.78 0.14 125 / 0.82) 0 8%, transparent 9%), radial-gradient(circle at 56% 42%, oklch(0.72 0.15 36 / 0.58) 0 20%, transparent 21%), radial-gradient(circle at 52% 46%, ${ritual.color} 0 41%, transparent 42%), oklch(0.2 0.08 283)`;
}

function openHouseNote() {
  if (typeof dialog.showModal === 'function') dialog.showModal();
}

function closeHouseNote() {
  dialog.close();
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('pointermove', moveWithPointer, { passive: true });
updateScrollProgress();

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 },
  );
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

ritualRows.forEach((row) => row.addEventListener('click', () => setActiveRitual(row)));
openLetterButtons.forEach((button) => button.addEventListener('click', openHouseNote));
dialogClose.addEventListener('click', closeHouseNote);
dialogConfirm.addEventListener('click', closeHouseNote);

dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  if (!inside) closeHouseNote();
});

signupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = signupForm.querySelector('input');
  if (!input.validity.valid) {
    formMessage.textContent = 'A real email lets the note find you.';
    input.focus();
    return;
  }
  formMessage.textContent = 'You are on the list. Keep a window open.';
  input.value = '';
});

hero.addEventListener('mouseleave', () => {
  root.style.setProperty('--pointer-x', '0');
  root.style.setProperty('--pointer-y', '0');
});
