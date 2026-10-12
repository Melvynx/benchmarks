import './style.css';

const state = { hunger: 58, happiness: 78, energy: 84, fed: 0, day: 1, sleeping: false, sound: true };
const $ = (id) => document.getElementById(id);
const petStage = $('pet-stage');
const toast = $('toast');
let toastTimer;
let audioContext;

function playChime(notes = [660, 880]) {
  if (!state.sound) return;
  try {
    audioContext ||= new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.055, audioContext.currentTime + index * 0.09 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + index * 0.09 + 0.24);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(audioContext.currentTime + index * 0.09);
      oscillator.stop(audioContext.currentTime + index * 0.09 + 0.25);
    });
  } catch {
    // Audio is an optional enhancement; the care interactions still work without it.
  }
}

function paint() {
  $('hunger-meter').style.width = `${state.hunger}%`;
  $('happy-meter').style.width = `${state.happiness}%`;
  $('energy-meter').style.width = `${state.energy}%`;
  $('hunger-text').textContent = state.hunger > 78 ? 'Nice and full' : state.hunger > 43 ? 'A little hungry' : 'Ready for a snack';
  $('happy-text').textContent = state.happiness > 82 ? 'Over the moon' : state.happiness > 56 ? 'Pretty happy' : 'Needs some love';
  $('energy-text').textContent = state.energy > 72 ? 'Bright-eyed' : state.energy > 40 ? 'Getting sleepy' : 'Ready for a nap';
  const mood = state.happiness > 85 && state.hunger > 60 ? ['☺', 'Over the moon'] : state.happiness < 45 ? ['☹', 'A little lonely'] : ['☺', 'Feeling good'];
  $('mood-pill').innerHTML = `<span>${mood[0]}</span><strong>${mood[1]}</strong>`;
  $('pet-action').textContent = state.sleeping ? 'Zzz…' : 'Cowdie';
  petStage.classList.toggle('sleeping', state.sleeping);
  $('nap-button').querySelector('strong').textContent = state.sleeping ? 'Wake Cowdie' : 'Take a nap';
  $('nap-button').querySelector('small').textContent = state.sleeping ? 'Cowdie is having a snooze' : 'Rest in the sunshine';
}

function say(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function celebrate(message, tip = message) {
  state.sleeping = false;
  petStage.classList.remove('sleeping');
  petStage.classList.remove('happy');
  void petStage.offsetWidth;
  petStage.classList.add('happy');
  playChime();
  setTimeout(() => petStage.classList.remove('happy'), 1150);
  $('care-tip').textContent = tip;
  say(message);
  paint();
}

$('feed-button').addEventListener('click', () => {
  if (state.hunger >= 96) {
    state.happiness = Math.min(100, state.happiness + 3);
    celebrate('Cowdie is too full for another carrot! 🐮', 'A very satisfied little moo');
    return;
  }
  state.hunger = Math.min(100, state.hunger + 29);
  state.happiness = Math.min(100, state.happiness + 9);
  state.energy = Math.min(100, state.energy + 5);
  state.fed++;
  celebrate('Crunch, crunch! Cowdie loved that 🥕', 'That carrot hit the spot!');
});

function cuddle() {
  state.happiness = Math.min(100, state.happiness + 15);
  if (state.sleeping) state.sleeping = false;
  state.energy = Math.max(0, state.energy - 2);
  celebrate('A cuddle for the sweetest cow 🫶', 'Cowdie feels so loved');
}
$('pet-button').addEventListener('click', cuddle);
petStage.addEventListener('click', cuddle);
petStage.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cuddle(); } });

$('nap-button').addEventListener('click', () => {
  if (state.sleeping) {
    state.sleeping = false;
    state.energy = Math.min(100, state.energy + 6);
    $('care-tip').textContent = 'Good morning, sleepy moo';
    say('Cowdie woke up feeling cozy ☀️');
  } else {
    state.sleeping = true;
    state.energy = Math.min(100, state.energy + 42);
    state.hunger = Math.max(0, state.hunger - 5);
    $('care-tip').textContent = 'Shhh… Cowdie is dreaming';
    say('Sweet dreams, little Cowdie 🌙');
  }
  paint();
});

$('sound-toggle').addEventListener('click', (event) => {
  state.sound = !state.sound;
  event.currentTarget.classList.toggle('off', !state.sound);
  $('sound-text').textContent = state.sound ? 'Sound on' : 'Sound off';
  say(state.sound ? 'Meadow sounds are on ♫' : 'Meadow sounds are off');
});

setInterval(() => {
  if (state.sleeping) return;
  state.hunger = Math.max(0, state.hunger - 1);
  if (Math.random() > .65) state.energy = Math.max(0, state.energy - 1);
  if (state.happiness > 55 && Math.random() > .82) state.happiness = Math.max(0, state.happiness - 1);
  paint();
}, 18000);

paint();
