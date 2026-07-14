const root = document.documentElement;
const glow = document.querySelector('.cursor-glow');
const menu = document.querySelector('.menu-button');
const panel = document.querySelector('.index-panel');

document.querySelectorAll('[data-scroll]').forEach((button) => {
  button.addEventListener('click', () => document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }));
});

menu.addEventListener('click', () => {
  const open = panel.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});

panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => panel.classList.remove('open')));

window.addEventListener('pointermove', (event) => {
  glow.style.opacity = '1';
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
}, { passive: true });

const photos = [...document.querySelectorAll('.floating-photo')];
window.addEventListener('pointermove', (event) => {
  const x = (event.clientX / window.innerWidth - .5) * 8;
  const y = (event.clientY / window.innerHeight - .5) * 8;
  photos.forEach((photo, index) => {
    const multiplier = (index + 1) * .33;
    photo.style.translate = `${x * multiplier}px ${y * multiplier}px`;
  });
}, { passive: true });

document.querySelector('.rsvp').addEventListener('click', (event) => {
  const button = event.currentTarget;
  button.innerHTML = 'Your name is on the list <b>✦</b>';
  button.style.background = '#c45a34';
  button.style.color = '#fff4e2';
});
