const root = document.documentElement;
const body = document.body;
const scenes = [...document.querySelectorAll('[data-scene]')];
const realmLinks = [...document.querySelectorAll('[data-realm-link]')];
const revealItems = [...document.querySelectorAll('[data-reveal]')];
const cursorOrbit = document.querySelector('.cursor-orbit');
const heroScene = document.querySelector('#threshold');
const currentScene = document.querySelector('#current');
const nocturneScene = document.querySelector('#nocturne');
const announcement = document.querySelector('#realm-announcement');
const touchInstruction = document.querySelector('.touch-instruction');

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;

const state = {
  targetPointerX: window.innerWidth * 0.62,
  targetPointerY: window.innerHeight * 0.42,
  pointerX: window.innerWidth * 0.62,
  pointerY: window.innerHeight * 0.42,
  targetCurrent: 0,
  current: 0,
  targetTemple: 0,
  temple: 0,
  pointerActive: false,
  frame: 0,
};

function sectionProgress(section) {
  if (!section) return 0;
  const rect = section.getBoundingClientRect();
  const travel = Math.max(1, rect.height - window.innerHeight);
  return clamp(-rect.top / travel);
}

function updateScrollTargets() {
  state.targetCurrent = sectionProgress(currentScene);
  state.targetTemple = sectionProgress(nocturneScene);

  if (!finePointerQuery.matches && !motionQuery.matches && heroScene) {
    const heroRect = heroScene.getBoundingClientRect();
    const heroProgress = clamp(-heroRect.top / Math.max(1, window.innerHeight * 0.82));
    state.targetPointerX = window.innerWidth * (0.62 - heroProgress * 0.25);
    state.targetPointerY = window.innerHeight * (0.42 + heroProgress * 0.19);
  }

  requestFrame();
}

function setActiveRealm(realm, announce = false) {
  if (!realm || body.dataset.realm === realm) return;

  body.dataset.realm = realm;
  realmLinks.forEach((link) => {
    const isActive = link.dataset.realmLink === realm;
    link.classList.toggle('is-active', isActive);
    if (isActive) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });

  if (announce && announcement) {
    const activeLink = realmLinks.find((link) => link.dataset.realmLink === realm);
    const label = activeLink?.querySelector('.sr-only')?.textContent;
    if (label) announcement.textContent = `${label} is now in view.`;
  }
}

const sceneObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) setActiveRealm(visible.target.dataset.scene);
  },
  {
    rootMargin: '-24% 0px -28% 0px',
    threshold: [0, 0.15, 0.35, 0.55],
  },
);

scenes.forEach((scene) => sceneObserver.observe(scene));

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  },
  { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
);

revealItems.forEach((item) => revealObserver.observe(item));

function render() {
  state.frame = 0;
  const reducedMotion = motionQuery.matches;
  const finePointer = finePointerQuery.matches;
  const easing = reducedMotion ? 1 : 0.095;

  state.current = lerp(state.current, state.targetCurrent, easing);
  state.temple = lerp(state.temple, state.targetTemple, easing);
  state.pointerX = lerp(state.pointerX, state.targetPointerX, reducedMotion ? 1 : 0.14);
  state.pointerY = lerp(state.pointerY, state.targetPointerY, reducedMotion ? 1 : 0.14);

  const pointerPercentX = clamp(state.pointerX / window.innerWidth) * 100;
  const pointerPercentY = clamp(state.pointerY / window.innerHeight) * 100;
  const pointerOffsetX = finePointer && !reducedMotion ? (pointerPercentX - 50) * 0.22 : 0;
  const pointerOffsetY = finePointer && !reducedMotion ? (pointerPercentY - 50) * 0.16 : 0;
  const templeScale = reducedMotion ? 1.15 : 0.88 + state.temple * 3.15;
  const templeShift = reducedMotion ? 0 : (0.5 - state.temple) * 18;
  const heroReverseX = pointerOffsetX * -0.55;
  const heroReverseY = pointerOffsetY * -0.55;
  const heroStrongX = pointerOffsetX * -1.7;
  const heroStrongY = pointerOffsetY * -1.7;
  const heroSoftX = pointerOffsetX * 0.22;
  const heroSoftY = pointerOffsetY * 0.22;
  const currentUnderlayShift = (state.current - 0.5) * -2.5;
  const riverShiftX = (state.current - 0.5) * -7;
  const riverShiftY = (state.current - 0.5) * 3;
  const riverScale = 1.02 + state.current * 0.08;
  const riverImageShift = (state.current - 0.5) * -4;

  root.style.setProperty('--pointer-x', `${pointerPercentX}%`);
  root.style.setProperty('--pointer-y', `${pointerPercentY}%`);
  root.style.setProperty('--pointer-px', `${state.pointerX}px`);
  root.style.setProperty('--pointer-py', `${state.pointerY}px`);
  root.style.setProperty('--hero-shift-x', `${pointerOffsetX}px`);
  root.style.setProperty('--hero-shift-y', `${pointerOffsetY}px`);
  root.style.setProperty('--hero-shift-x-reverse', `${heroReverseX}px`);
  root.style.setProperty('--hero-shift-y-reverse', `${heroReverseY}px`);
  root.style.setProperty('--hero-shift-x-strong', `${heroStrongX}px`);
  root.style.setProperty('--hero-shift-y-strong', `${heroStrongY}px`);
  root.style.setProperty('--hero-shift-x-soft', `${heroSoftX}px`);
  root.style.setProperty('--hero-shift-y-soft', `${heroSoftY}px`);
  root.style.setProperty('--current-progress', state.current.toFixed(4));
  root.style.setProperty('--realm-script-shift', `${(state.current * -2).toFixed(3)}vw`);
  root.style.setProperty('--current-underlay-shift', `${currentUnderlayShift.toFixed(3)}rem`);
  root.style.setProperty('--current-ghost-shift', `${(state.current * -7).toFixed(3)}vw`);
  root.style.setProperty('--river-shift-x', `${riverShiftX.toFixed(3)}vw`);
  root.style.setProperty('--river-shift-y', `${riverShiftY.toFixed(3)}svh`);
  root.style.setProperty('--river-scale', riverScale.toFixed(4));
  root.style.setProperty('--river-image-shift', `${riverImageShift.toFixed(3)}vw`);
  root.style.setProperty('--temple-scale', templeScale.toFixed(4));
  root.style.setProperty('--temple-shift', `${templeShift.toFixed(2)}px`);
  root.style.setProperty('--temple-image-scale', (1.12 - state.current * 0.02).toFixed(4));

  const unsettled =
    Math.abs(state.current - state.targetCurrent) > 0.001 ||
    Math.abs(state.temple - state.targetTemple) > 0.001 ||
    Math.abs(state.pointerX - state.targetPointerX) > 0.1 ||
    Math.abs(state.pointerY - state.targetPointerY) > 0.1;

  if (unsettled) requestFrame();
}

function requestFrame() {
  if (state.frame) return;
  state.frame = window.requestAnimationFrame(render);
}

function handlePointerMove(event) {
  if (!finePointerQuery.matches || motionQuery.matches) return;
  state.targetPointerX = event.clientX;
  state.targetPointerY = event.clientY;
  state.pointerActive = true;
  cursorOrbit?.classList.add('is-visible');
  requestFrame();
}

function resetPointer() {
  state.targetPointerX = window.innerWidth * 0.62;
  state.targetPointerY = window.innerHeight * 0.42;
  state.pointerActive = false;
  cursorOrbit?.classList.remove('is-visible');
  requestFrame();
}

window.addEventListener('pointermove', handlePointerMove, { passive: true });
document.documentElement.addEventListener('pointerleave', resetPointer);
window.addEventListener('scroll', updateScrollTargets, { passive: true });
window.addEventListener('resize', () => {
  if (!state.pointerActive) resetPointer();
  updateScrollTargets();
});

for (const control of document.querySelectorAll('a, button')) {
  control.addEventListener('pointerenter', () => cursorOrbit?.classList.add('is-over-control'));
  control.addEventListener('pointerleave', () => cursorOrbit?.classList.remove('is-over-control'));
}

const annotationToggle = document.querySelector('.annotation-toggle');
const annotations = document.querySelector('#annotations');

annotationToggle?.addEventListener('click', () => {
  const nextState = annotationToggle.getAttribute('aria-pressed') !== 'true';
  annotationToggle.setAttribute('aria-pressed', String(nextState));
  annotationToggle.querySelector('.annotation-toggle__label').textContent = nextState
    ? 'Hide annotations'
    : 'Reveal annotations';
  annotations?.classList.toggle('is-visible', nextState);
  annotations?.setAttribute('aria-hidden', String(!nextState));
});

const dialog = document.querySelector('#fifth-realm');
const dialogTrigger = document.querySelector('#open-fifth');

dialogTrigger?.addEventListener('click', () => {
  if (!dialog) return;
  body.classList.add('dialog-open');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
});

dialog?.addEventListener('close', () => {
  body.classList.remove('dialog-open');
});

dialog?.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  dialog.close();
});

realmLinks.forEach((link, index) => {
  link.addEventListener('click', () => setActiveRealm(link.dataset.realmLink, true));
  link.addEventListener('keydown', (event) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % realmLinks.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + realmLinks.length) % realmLinks.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = realmLinks.length - 1;
    else return;

    event.preventDefault();
    realmLinks[nextIndex].focus();
  });
});

function handleArtError(image) {
  image.classList.add('is-error');
  image.closest('.art-frame')?.classList.add('has-error');
}

for (const image of document.querySelectorAll('img[data-art]')) {
  image.addEventListener('error', () => handleArtError(image));
  if (image.complete && image.naturalWidth === 0) handleArtError(image);
}

function handlePreferenceChange() {
  if (touchInstruction) {
    touchInstruction.textContent = motionQuery.matches
      ? 'Continue to the next realm'
      : 'Scroll to disturb the still life';
  }

  if (motionQuery.matches) {
    resetPointer();
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }
  updateScrollTargets();
}

motionQuery.addEventListener?.('change', handlePreferenceChange);
finePointerQuery.addEventListener?.('change', handlePreferenceChange);

handlePreferenceChange();
requestFrame();
