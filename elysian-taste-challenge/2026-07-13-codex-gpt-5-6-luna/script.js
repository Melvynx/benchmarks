document.documentElement.classList.add('js');

const archivePanel = document.querySelector('[data-archive-panel]');
const archiveTriggers = document.querySelectorAll('[data-archive-trigger]');
const archiveClose = document.querySelector('[data-archive-close]');
const archiveForm = document.querySelector('[data-archive-form]');
const formMessage = document.querySelector('.form-message');
const toast = document.querySelector('[data-toast]');

const atlasContent = {
  'still-life': {
    index: 'Room A / The still room',
    heading: 'The table remembers everything.',
    copy: 'Glass, fruit, and a blue hour folded into one quiet arrangement. For the visitor who likes a little evidence.',
  },
  scholar: {
    index: "Room B / The scholar's garden",
    heading: 'A thought can have a landscape.',
    copy: 'Marble, cypress, and the long pause after a question. Enter with a book you have not finished.',
  },
  valley: {
    index: 'Room C / The breathing valley',
    heading: 'The river knows another way through.',
    copy: 'A green distance, a bright current, and weather moving over the ridge. Stay until your shoulders lower.',
  },
  temple: {
    index: 'Room D / The night temple',
    heading: 'Gold is brightest after dark.',
    copy: 'A small temple keeps watch beneath a patient sky. For evenings that need somewhere to go.',
  },
};

function setArchive(open) {
  if (!archivePanel) return;
  archivePanel.classList.toggle('is-open', open);
  archivePanel.setAttribute('aria-hidden', String(!open));
  archivePanel.inert = !open;
  archiveTriggers.forEach((trigger) => trigger.setAttribute('aria-expanded', String(open)));
  document.body.classList.toggle('archive-is-open', open);
  if (open) {
    window.setTimeout(() => document.querySelector('#email')?.focus(), 480);
  }
}

if (archivePanel) archivePanel.inert = true;

archiveTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => setArchive(true));
});

archiveClose?.addEventListener('click', () => setArchive(false));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setArchive(false);
});

archiveForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = archiveForm.querySelector('input');
  if (!input?.value) return;
  formMessage.textContent = 'The next note will find you there.';
  input.value = '';
});

const parallaxRoot = document.querySelector('[data-parallax-root]');
const scene = document.querySelector('.hero__scene');
const pieces = document.querySelectorAll('.art-piece');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function resetParallax() {
  if (!parallaxRoot) return;
  parallaxRoot.style.setProperty('--hero-x', '0px');
  parallaxRoot.style.setProperty('--hero-y', '0px');
  scene?.style.setProperty('--scene-x', '0px');
  scene?.style.setProperty('--scene-y', '0px');
  pieces.forEach((piece) => {
    piece.style.setProperty('--piece-x', '0px');
    piece.style.setProperty('--piece-y', '0px');
  });
}

if (parallaxRoot && !reduceMotion.matches) {
  parallaxRoot.addEventListener('pointermove', (event) => {
    const bounds = parallaxRoot.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 28;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 28;
    parallaxRoot.style.setProperty('--hero-x', `${x}px`);
    parallaxRoot.style.setProperty('--hero-y', `${y}px`);
    scene?.style.setProperty('--scene-x', `${x}px`);
    scene?.style.setProperty('--scene-y', `${y}px`);
    pieces.forEach((piece) => {
      const depth = Number(piece.dataset.depth || 1);
      piece.style.setProperty('--piece-x', `${x * depth}px`);
      piece.style.setProperty('--piece-y', `${y * depth}px`);
    });
  });
  parallaxRoot.addEventListener('pointerleave', resetParallax);
}

const atlasStage = document.querySelector('[data-atlas-stage]');
const atlasButtons = document.querySelectorAll('[data-atlas-key]');
const atlasImages = document.querySelectorAll('[data-atlas-image]');
const atlasIndex = document.querySelector('[data-atlas-index]');
const atlasHeading = document.querySelector('[data-atlas-heading]');
const atlasCopy = document.querySelector('[data-atlas-copy]');

function selectAtlas(key) {
  const content = atlasContent[key];
  if (!content) return;
  atlasStage?.setAttribute('data-active', key);
  atlasButtons.forEach((button) => {
    const active = button.dataset.atlasKey === key;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  atlasImages.forEach((image) => image.classList.toggle('is-active', image.dataset.atlasImage === key));
  if (atlasIndex) atlasIndex.textContent = content.index;
  if (atlasHeading) atlasHeading.textContent = content.heading;
  if (atlasCopy) atlasCopy.textContent = content.copy;
}

atlasButtons.forEach((button) => {
  button.addEventListener('click', () => selectAtlas(button.dataset.atlasKey));
});

const scrollLinks = document.querySelectorAll('[data-scroll-link]');
scrollLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
});

let toastTimer;
document.querySelector('[data-collect]')?.addEventListener('click', () => {
  if (!toast) return;
  toast.textContent = 'Fragment kept in your imaginary cabinet.';
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
});

const imageFallbacks = {
  'still-life': 'oklch(0.34 0.13 321)',
  scholar: 'oklch(0.38 0.08 74)',
  valley: 'oklch(0.32 0.11 230)',
  temple: 'oklch(0.28 0.08 286)',
};

document.querySelectorAll('img').forEach((image) => {
  image.addEventListener('error', () => {
    image.classList.add('is-broken');
    const parent = image.closest('[data-atlas-image], .art-piece');
    const key = parent?.dataset.atlasImage || parent?.className.match(/(?:still-life|scholar|valley|temple)/)?.[0];
    if (parent && key && imageFallbacks[key]) parent.style.background = imageFallbacks[key];
  });
});
