const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('#site-nav');

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
});

const observed = document.querySelectorAll('.reveal, .split-reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });
observed.forEach((element) => observer.observe(element));

const dot = document.querySelector('.cursor-dot');
const ring = document.querySelector('.cursor-ring');
let pointerX = 0;
let pointerY = 0;
let ringX = 0;
let ringY = 0;

window.addEventListener('mousemove', (event) => {
  pointerX = event.clientX;
  pointerY = event.clientY;
  dot.style.left = `${pointerX}px`;
  dot.style.top = `${pointerY}px`;

  const stage = document.querySelector('.botanical-stage');
  if (stage && window.innerWidth > 800) {
    const dx = (pointerX / window.innerWidth - 0.5) * 18;
    const dy = (pointerY / window.innerHeight - 0.5) * 14;
    stage.style.marginLeft = `${dx}px`;
    stage.style.marginTop = `${dy}px`;
  }
});

function followPointer() {
  ringX += (pointerX - ringX) * 0.14;
  ringY += (pointerY - ringY) * 0.14;
  ring.style.left = `${ringX}px`;
  ring.style.top = `${ringY}px`;
  requestAnimationFrame(followPointer);
}
followPointer();

document.querySelectorAll('a, button, .note-card').forEach((element) => {
  element.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
  element.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
});

window.addEventListener('scroll', () => {
  const scroll = window.scrollY;
  const title = document.querySelector('.display-title');
  const stage = document.querySelector('.botanical-stage');
  if (scroll < window.innerHeight && window.innerWidth > 800) {
    title.style.transform = `translateY(${scroll * 0.12}px)`;
    stage.style.setProperty('--scroll-shift', `${scroll * 0.08}px`);
  }
}, { passive: true });
