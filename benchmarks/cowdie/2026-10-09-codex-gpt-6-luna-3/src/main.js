const app = document.querySelector('#app')

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Cowdie home"><span class="brand-mark">✳</span><span>little meadow</span></a>
      <div class="day-pill"><span class="sun-icon">☀</span> DAY <b id="day">04</b><span class="divider"></span><span class="streak">✦ 3 day streak</span></div>
      <button class="icon-button sound-toggle" aria-label="Toggle sound" title="Toggle sound"><span>♫</span></button>
    </header>

    <section class="intro">
      <p class="eyebrow"><span class="eyebrow-dot"></span> YOUR LITTLE PATCH OF HAPPY</p>
      <h1>GPT-6</h1>
      <p class="subtitle">A little love goes a long way.</p>
    </section>

    <section class="play-area" aria-label="Cowdie's meadow">
      <div class="weather"><span class="weather-sun">☼</span><div><b>Sunny day</b><small>Perfect for a little play</small></div></div>
      <div class="cloud cloud-one"></div><div class="cloud cloud-two"></div>
      <div class="sparkle s1">✦</div><div class="sparkle s2">✧</div><div class="sparkle s3">✦</div>
      <div class="float-heart">♥</div>
      <div class="pet-stage" id="petStage" role="button" tabindex="0" aria-label="Pet Cowdie">
        <div class="pet-shadow"></div>
        <div class="pet" id="pet">
          <div class="ear ear-left"><i></i></div><div class="ear ear-right"><i></i></div>
          <div class="body-blob">
            <div class="spot spot-one"></div><div class="spot spot-two"></div>
            <div class="head">
              <div class="head-spot"></div>
              <div class="eye eye-left"><i></i></div><div class="eye eye-right"><i></i></div>
              <div class="cheek cheek-left"></div><div class="cheek cheek-right"></div>
              <div class="muzzle"><span class="nostril n1"></span><span class="nostril n2"></span><span class="smile"></span></div>
            </div>
            <div class="hoof hoof-left"></div><div class="hoof hoof-right"></div>
            <div class="tail"><i></i></div>
          </div>
          <div class="bell"><i></i></div>
        </div>
        <div class="food-bubble" id="foodBubble">🍓</div>
        <div class="feed-heart">♥</div>
      </div>
      <div class="grass grass-back"></div><div class="ground"></div><div class="grass grass-front"></div>
      <div class="flower flower-a">🌼</div><div class="flower flower-b">🌸</div><div class="flower flower-c">🌼</div>
      <div class="name-tag"><span class="name-dot"></span><span><b>Cowdie</b><small id="moodLabel">feeling pretty good</small></span><span class="tag-heart">♡</span></div>
      <div class="tap-hint">✧ &nbsp; tap Cowdie for a little love</div>
      <div class="speech" id="speech" aria-live="polite">Mooorning! <span>☀</span></div>
    </section>

    <section class="care-card">
      <div class="care-heading"><div><p class="eyebrow">COWDIE'S LITTLE CHECK-IN</p><h2>How's my buddy?</h2></div><div class="more-dots">···</div></div>
      <div class="stats">
        <div class="stat"><div class="stat-top"><span class="stat-icon hunger">♧</span><span class="stat-name">Hunger</span><b id="hungerValue">42%</b></div><div class="meter"><i id="hungerMeter" style="width:42%"></i></div><small id="hungerText">Could use a snack</small></div>
        <div class="stat"><div class="stat-top"><span class="stat-icon joy">☻</span><span class="stat-name">Happiness</span><b id="happinessValue">82%</b></div><div class="meter"><i id="happinessMeter" style="width:82%"></i></div><small id="happyText">Giggly as a daisy</small></div>
        <div class="stat"><div class="stat-top"><span class="stat-icon energy">ϟ</span><span class="stat-name">Energy</span><b id="energyValue">68%</b></div><div class="meter"><i id="energyMeter" style="width:68%"></i></div><small id="energyText">Ready for a wiggle</small></div>
      </div>
      <div class="actions">
        <button class="action feed" data-action="feed"><span class="action-emoji">🍓</span><span><b>Feed</b><small>Give a lil snack</small></span><span class="action-arrow">↗</span></button>
        <button class="action play" data-action="play"><span class="action-emoji">🪁</span><span><b>Play</b><small>Let's have fun</small></span><span class="action-arrow">↗</span></button>
        <button class="action rest" data-action="rest"><span class="action-emoji">🌙</span><span><b>Rest</b><small>Take a cozy nap</small></span><span class="action-arrow">↗</span></button>
      </div>
    </section>
    <footer><span>made with a little moo-gic</span><span class="footer-flower">✿</span><span>♡ &nbsp; best buds forever</span></footer>
    <div class="toast" id="toast" role="status"></div>
  </main>
`

const stats = { hunger: 42, happiness: 82, energy: 68 }
const $ = (id) => document.getElementById(id)
let actionTimer

function updateStats() {
  for (const key of Object.keys(stats)) {
    const value = Math.round(stats[key])
    $(`${key}Value`).textContent = `${value}%`
    $(`${key}Meter`).style.width = `${value}%`
  }
  $('hungerText').textContent = stats.hunger < 25 ? 'All full and happy' : stats.hunger < 65 ? 'Could use a snack' : 'Getting a bit peckish'
  $('happyText').textContent = stats.happiness > 75 ? 'Giggly as a daisy' : stats.happiness > 45 ? 'Could use a little love' : 'Needs a cuddle'
  $('energyText').textContent = stats.energy > 65 ? 'Ready for a wiggle' : stats.energy > 35 ? 'A little sleepy' : 'Time for a cozy nap'
}

function showMessage(message, mood, animation) {
  $('speech').innerHTML = `${message} <span>${mood}</span>`
  $('moodLabel').textContent = animation === 'sleep' ? 'having a cozy nap' : animation === 'jump' ? 'having the best time' : animation === 'eat' ? 'very snack-appreciative' : 'feeling very loved'
  $('pet').classList.remove('eat', 'jump', 'sleep', 'loved')
  void $('pet').offsetWidth
  $('pet').classList.add(animation)
  $('petStage').classList.toggle('night-mode', animation === 'sleep')
  clearTimeout(actionTimer)
  actionTimer = setTimeout(() => {
    $('pet').classList.remove(animation)
    $('petStage').classList.remove('night-mode')
    $('moodLabel').textContent = 'feeling pretty good'
  }, 2500)
}

function care(action) {
  if (action === 'feed') {
    if (stats.hunger <= 3) {
      showMessage('I’m all full!', '🥰', 'loved')
      return
    }
    stats.hunger = Math.max(0, stats.hunger - 34)
    stats.happiness = Math.min(100, stats.happiness + 8)
    showMessage('Nom nom nom!', '🍓', 'eat')
    $('foodBubble').textContent = ['🍓', '🧁', '🍎', '🥕'][Math.floor(Math.random() * 4)]
  } else if (action === 'play') {
    stats.happiness = Math.min(100, stats.happiness + 13)
    stats.energy = Math.max(0, stats.energy - 12)
    stats.hunger = Math.min(100, stats.hunger + 4)
    showMessage('Wheee! Again!', '🪁', 'jump')
  } else {
    stats.energy = Math.min(100, stats.energy + 30)
    stats.happiness = Math.min(100, stats.happiness + 3)
    showMessage('Mmm... cozy...', '💤', 'sleep')
  }
  updateStats()
}

document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => care(button.dataset.action)))
$('petStage').addEventListener('click', () => {
  stats.happiness = Math.min(100, stats.happiness + 5)
  updateStats()
  showMessage('Hehe, that tickles!', '♡', 'loved')
})
$('petStage').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('petStage').click() }
})
document.querySelector('.sound-toggle').addEventListener('click', (event) => {
  event.currentTarget.classList.toggle('muted')
  event.currentTarget.innerHTML = event.currentTarget.classList.contains('muted') ? '<span>♪</span>' : '<span>♫</span>'
})
