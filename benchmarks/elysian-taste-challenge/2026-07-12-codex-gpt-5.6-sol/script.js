const root = document.documentElement;
const body = document.body;
const hero = document.querySelector('.hero');
const cursor = document.querySelector('.cursor');
const meter = document.querySelector('.scroll-meter span');
const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
const bloomButton = document.querySelector('.bloom-button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

body.classList.add('js-ready');
window.addEventListener('load', () => body.classList.add('is-loaded'), { once: true });
window.setTimeout(() => body.classList.add('is-loaded'), 1400);

const closeMenu = () => {
  menuButton.setAttribute('aria-expanded', 'false');
  menu.classList.remove('is-open');
  body.style.overflow = '';
};

menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('is-open', open);
  body.style.overflow = open ? 'hidden' : '';
});

menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

const updateScroll = () => {
  const range = document.documentElement.scrollHeight - window.innerHeight;
  const progress = range > 0 ? window.scrollY / range : 0;
  meter.style.transform = `scaleY(${progress})`;
};

window.addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

if (!reducedMotion.matches && window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    cursor.classList.add('is-visible');
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;

    const rect = hero.getBoundingClientRect();
    if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty('--lens-x', `${x}%`);
      hero.style.setProperty('--lens-y', `${y}%`);
      hero.style.setProperty('--lens-bg-x', `${x}%`);
      hero.style.setProperty('--lens-bg-y', `${y}%`);
    }
  });

  document.querySelectorAll('a, button').forEach((element) => {
    element.addEventListener('pointerenter', () => cursor.classList.add('is-link'));
    element.addEventListener('pointerleave', () => cursor.classList.remove('is-link'));
  });
}

const startBloom = () => {
  hero.classList.add('is-blooming');
  bloomButton.setAttribute('aria-pressed', 'true');
};

const stopBloom = () => {
  hero.classList.remove('is-blooming');
  bloomButton.setAttribute('aria-pressed', 'false');
};

bloomButton.addEventListener('pointerdown', startBloom);
bloomButton.addEventListener('pointerup', stopBloom);
bloomButton.addEventListener('pointerleave', stopBloom);
bloomButton.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') startBloom();
});
bloomButton.addEventListener('keyup', stopBloom);

const choices = {
  glass: {
    result: 'A greenhouse after rain. The glass is cold, the soil is awake.',
    match: 'Your garden: Verdant Sleep'
  },
  velvet: {
    result: 'A room after the music stops. Saffron, warm skin, one crushed flower.',
    match: 'Your garden: Petal Fever'
  },
  terrace: {
    result: 'A stone terrace before dawn. Jasmine hangs in the mineral air.',
    match: 'Your garden: Blue Hour'
  }
};

const ritual = document.querySelector('.ritual');
const result = document.querySelector('.ritual-result');
const match = document.querySelector('.ritual-match');

document.querySelectorAll('.ritual-choices button').forEach((button) => {
  button.addEventListener('click', () => {
    const choice = button.dataset.choice;
    ritual.dataset.choice = choice;
    result.textContent = choices[choice].result;
    match.textContent = choices[choice].match;

    document.querySelectorAll('.ritual-choices button').forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

if (!reducedMotion.matches) {
  window.addEventListener('scroll', () => {
    if (window.scrollY < window.innerHeight * 1.15) {
      const offset = window.scrollY * 0.12;
      root.style.setProperty('--hero-drift', `${offset}px`);
      document.querySelector('.hero-image').style.transform = `translate3d(0, ${offset}px, 0) scale(${hero.classList.contains('is-blooming') ? 1.035 : 1})`;
    }
  }, { passive: true });
}
