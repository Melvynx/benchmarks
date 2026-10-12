import type { Params } from '../sim/params'

export type Tone = 'green' | 'blue' | 'red' | 'violet' | 'sand'

export interface ControlDef {
  key: keyof Params
  label: string
  min: number
  max: number
  step: number
  hint: string
  format: (v: number) => string
}

export interface ControlGroup {
  id: string
  title: string
  tone: Tone
  emoji: string
  restart?: boolean
  controls: ControlDef[]
}

const num = (digits: number, unit = '') => (v: number) => `${v.toFixed(digits)}${unit}`

export const CONTROL_GROUPS: ControlGroup[] = [
  {
    id: 'fruit',
    title: 'Fruit trees',
    tone: 'green',
    emoji: '🍏',
    controls: [
      {
        key: 'fruitGrowth',
        label: 'Fruit growth speed',
        min: 0.02,
        max: 0.4,
        step: 0.01,
        hint: 'How quickly a tree grows the next fruit.',
        format: (v) => `1 per ${(1 / v).toFixed(1)}s`,
      },
      {
        key: 'fruitLimit',
        label: 'Fruit limit',
        min: 1,
        max: 12,
        step: 1,
        hint: 'Most fruit one tree can hold.',
        format: (v) => `${v} / tree`,
      },
      {
        key: 'fruitDelay',
        label: 'Fruit return delay',
        min: 0,
        max: 20,
        step: 0.5,
        hint: 'How long a tree rests after someone takes fruit.',
        format: num(1, 's'),
      },
    ],
  },
  {
    id: 'blue',
    title: 'Blue blobs',
    tone: 'blue',
    emoji: '🫐',
    controls: [
      {
        key: 'blueUse',
        label: 'Energy use',
        min: 0.3,
        max: 2.5,
        step: 0.05,
        hint: 'How hungry blue blobs are while moving and waiting.',
        format: num(2, '×'),
      },
      { key: 'blueSpeed', label: 'Speed', min: 1, max: 5, step: 0.1, hint: 'Top walking speed.', format: num(1, ' u/s') },
      { key: 'blueVision', label: 'Vision', min: 3, max: 16, step: 0.5, hint: 'How far they can spot fruit and danger.', format: num(1, ' u') },
      { key: 'blueCopy', label: 'Copy threshold', min: 50, max: 98, step: 1, hint: 'Energy needed before making a new blue blob.', format: num(0) },
      { key: 'blueEatTime', label: 'Eating time', min: 0.3, max: 5, step: 0.1, hint: 'How long each fruit takes to munch.', format: num(1, 's') },
    ],
  },
  {
    id: 'red',
    title: 'Red blobs',
    tone: 'red',
    emoji: '🍓',
    controls: [
      {
        key: 'redUse',
        label: 'Energy use',
        min: 0.3,
        max: 2.5,
        step: 0.05,
        hint: 'How hungry red blobs are while moving and waiting.',
        format: num(2, '×'),
      },
      { key: 'redSpeed', label: 'Speed', min: 1, max: 5, step: 0.1, hint: 'Top walking speed.', format: num(1, ' u/s') },
      { key: 'redVision', label: 'Vision', min: 3, max: 16, step: 0.5, hint: 'How far they can spot blue blobs.', format: num(1, ' u') },
      {
        key: 'redStrength',
        label: 'Contact strength',
        min: 4,
        max: 60,
        step: 1,
        hint: 'Energy a red blob draws from a blue blob per contact.',
        format: num(0, ' energy'),
      },
      { key: 'redCopy', label: 'Copy threshold', min: 50, max: 98, step: 1, hint: 'Energy needed before making a new red blob.', format: num(0) },
      { key: 'redPause', label: 'Pause time', min: 0.5, max: 10, step: 0.1, hint: 'How long red rests after a successful contact.', format: num(1, 's') },
    ],
  },
  {
    id: 'traits',
    title: 'Inheritance',
    tone: 'violet',
    emoji: '🧬',
    controls: [
      {
        key: 'mutation',
        label: 'Trait wobble',
        min: 0,
        max: 0.3,
        step: 0.01,
        hint: 'How much speed and vision can change from parent to child.',
        format: (v) => `${Math.round(v * 100)}%`,
      },
    ],
  },
  {
    id: 'world',
    title: 'Starting world',
    tone: 'sand',
    emoji: '🌍',
    restart: true,
    controls: [
      { key: 'trees', label: 'Fruit trees', min: 2, max: 32, step: 1, hint: 'Number of trees in the dish.', format: num(0) },
      { key: 'startBlue', label: 'Starting blue', min: 2, max: 200, step: 1, hint: 'Blue blobs at the start.', format: num(0) },
      { key: 'startRed', label: 'Starting red', min: 0, max: 60, step: 1, hint: 'Red blobs at the start.', format: num(0) },
      { key: 'worldSize', label: 'World size', min: 14, max: 44, step: 1, hint: 'Radius of the round dish.', format: num(0, ' u') },
    ],
  },
]
