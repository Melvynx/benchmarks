import { createWorld, stepWorld } from '../src/sim/engine'
import { PRESETS } from '../src/sim/presets'
import { summarize } from '../src/sim/summary'
import type { Params, World } from '../src/sim/types'

let failed = 0

function actionName(agent: { action: string }) {
  return agent.action
}

function expect(cond: boolean, msg: string) {
  if (cond) console.log('ok', msg)
  else {
    failed += 1
    console.error('FAIL', msg)
  }
}

function run(params: Params, ticks: number) {
  const world = createWorld(params)
  for (let i = 0; i < ticks; i += 1) stepWorld(world)
  return world
}

function series(world: World) {
  return {
    fruit: world.history.map((sample) => sample.fruit),
    blue: world.history.map((sample) => sample.blue),
    red: world.history.map((sample) => sample.red),
  }
}

function spark(values: number[], width = 70) {
  if (values.length === 0) return ''
  const blocks = '▁▂▃▄▅▆▇█'
  const buckets: number[] = []
  for (let i = 0; i < width; i += 1) {
    const start = Math.floor((i * values.length) / width)
    const end = Math.max(start + 1, Math.floor(((i + 1) * values.length) / width))
    let peak = 0
    for (let j = start; j < end; j += 1) peak = Math.max(peak, values[j])
    buckets.push(peak)
  }
  const max = Math.max(...buckets, 1)
  return buckets.map((value) => blocks[Math.min(7, Math.floor((value / max) * 7.999))]).join('')
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

function report(name: string, world: World) {
  const data = series(world)
  const story = summarize(world.history)
  const finite = world.agents.every((agent) => Number.isFinite(agent.energy))
  console.log(`\n== ${name} tick ${world.tick} cap ${world.hitCap} finite ${finite}`)
  console.log(`blue max ${Math.max(...data.blue)} end ${data.blue.at(-1)} mean ${mean(data.blue).toFixed(1)} born ${world.bornBlue} died ${world.diedBlue}`)
  console.log(`red  max ${Math.max(...data.red)} end ${data.red.at(-1)} mean ${mean(data.red).toFixed(1)} born ${world.bornRed} died ${world.diedRed}`)
  console.log(`fruit max ${Math.max(...data.fruit).toFixed(1)} end ${data.fruit.at(-1)?.toFixed(1)} mean ${mean(data.fruit).toFixed(1)}`)
  console.log('blue ', spark(data.blue))
  console.log('red  ', spark(data.red))
  console.log('fruit', spark(data.fruit))
  console.log(story.lines.join(' | '), 'lag', story.lagTicks)
  return story
}

function micro() {
  const base = PRESETS[0].params
  const eatWorld = createWorld({
    ...base,
    startTrees: 1,
    startBlue: 1,
    startRed: 0,
    fruitLimit: 3,
    blueCopy: 400,
    blueVision: 12,
    seed: 3,
    worldSize: 8,
  })
  const eater = eatWorld.agents[0]
  const fruit = eatWorld.trees[0].fruits[0]
  eater.x = fruit.x
  eater.z = fruit.z
  eater.energy = 20
  eater.action = 'wander'
  eater.timer = 0
  const before = eater.energy
  for (let i = 0; i < eatWorld.params.blueEatTime + 4; i += 1) stepWorld(eatWorld)
  expect(fruit.growth === 0 && fruit.delay > 0, 'eating spends a fruit and starts the return delay')
  expect(eater.energy > before, 'eating restores blue energy')

  const delay = fruit.delay
  for (let i = 0; i < delay + Math.ceil(1 / eatWorld.params.fruitGrowth) + 5; i += 1) stepWorld(eatWorld)
  const regrown = eatWorld.trees[0].fruits.find((item) => item.id === fruit.id)
  expect(!!regrown && regrown.growth >= 1, 'fruit returns after the delay')

  const contactWorld = createWorld({
    ...base,
    startTrees: 1,
    startBlue: 1,
    startRed: 1,
    seed: 4,
    worldSize: 8,
  })
  const blue = contactWorld.agents.find((agent) => agent.kind === 'blue')!
  const red = contactWorld.agents.find((agent) => agent.kind === 'red')!
  const meal = contactWorld.trees[0].fruits[0]
  blue.x = meal.x
  blue.z = meal.z
  blue.energy = 40
  blue.action = 'eat'
  blue.timer = 30
  blue.timerMax = 30
  blue.targetFruit = meal.id
  meal.reservedBy = blue.id
  red.x = blue.x + 0.4
  red.z = blue.z
  red.energy = 30
  red.action = 'wander'
  const blueBefore = blue.energy
  const redBefore = red.energy
  stepWorld(contactWorld)
  expect(red.energy > redBefore, 'contact feeds the red blob')
  expect(blue.energy < blueBefore, 'contact spends blue energy')
  const redAction = actionName(red)
  expect(redAction === 'contact' || redAction === 'pause', 'red blob pauses after contact')

  const birthWorld = createWorld({
    ...base,
    startTrees: 1,
    startBlue: 1,
    startRed: 0,
    blueVision: 0.5,
    blueCopy: 80,
    seed: 8,
    worldSize: 9,
  })
  const parent = birthWorld.agents[0]
  parent.x = birthWorld.radius - 1.2
  parent.z = 0
  parent.energy = 160
  parent.birthCd = 0
  parent.age = 80
  parent.action = 'wander'
  parent.timer = 0
  const count = birthWorld.agents.length
  stepWorld(birthWorld)
  expect(birthWorld.agents.length === count + 1, 'copying adds one blue blob')
  expect(parent.energy < 160, 'copying spends stored energy')
  const child = birthWorld.agents.find((agent) => agent.parentId === parent.id)
  expect(!!child && child.energy < parent.energy + 80, 'the child does not appear for free')
}

micro()

const ticks = 12000
for (const preset of PRESETS) {
  const world = run(preset.params, ticks)
  const story = report(preset.id, world)
  const data = series(world)
  expect(world.agents.every((agent) => Number.isFinite(agent.energy)), `${preset.id} energies stay finite`)
  const ups = data.fruit.filter((value, index) => index > 0 && value > data.fruit[index - 1] + 0.15).length
  const downs = data.fruit.filter((value, index) => index > 0 && value < data.fruit[index - 1] - 0.15).length
  if (preset.id === 'balanced' || preset.id === 'fruit-rich' || preset.id === 'low-fruit') {
    expect(ups > 3 && downs > 3, `${preset.id} fruit is eaten and regrows`)
    expect(!world.hitCap, `${preset.id} stays under the safety cap`)
  }
  if (preset.id === 'balanced') {
    expect(Math.max(...data.blue) > 15 && Math.max(...data.red) > 6, 'balanced both groups grow')
    expect((data.blue.at(-1) ?? 0) > 0 && (data.red.at(-1) ?? 0) > 0, 'balanced groups are still alive')
    expect(
      story.lines.some((line) => line.includes('followed') || line.includes('balanced')),
      'balanced story mentions the wave',
    )
  }
}

const rich = run(PRESETS.find((preset) => preset.id === 'fruit-rich')!.params, ticks)
const low = run(PRESETS.find((preset) => preset.id === 'low-fruit')!.params, ticks)
const richBlue = Math.max(...series(rich).blue)
const lowBlue = Math.max(...series(low).blue)
const lowPop = mean(series(low).blue) + mean(series(low).red)
const richPop = mean(series(rich).blue) + mean(series(rich).red)
expect(richBlue > lowBlue * 1.6, `fruit-rich blues (${richBlue}) outgrow low-fruit blues (${lowBlue})`)
expect(lowPop < richPop * 0.65, `low-fruit population stays smaller (${lowPop.toFixed(1)} vs ${richPop.toFixed(1)})`)

const heavy = run(PRESETS.find((preset) => preset.id === 'red-heavy')!.params, ticks)
const heavyStory = summarize(heavy.history)
const heavyBlue = series(heavy).blue
const heavyRed = series(heavy).red
const early = mean(heavyBlue.slice(0, 30))
const later = Math.min(...heavyBlue.slice(40, 140))
expect(early > later, `red-heavy blues dip (${early.toFixed(1)} -> ${later.toFixed(1)})`)
expect(heavyRed.at(-1)! < Math.max(...heavyRed) * 0.7, 'red-heavy reds fall off their peak')
console.log('red-heavy story:', heavyStory.lines.join(' | '))

if (failed > 0) {
  throw new Error(`${failed} failed`)
}
console.log('\nall checks passed')
