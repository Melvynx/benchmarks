import type { Action } from './types'

export function actionLabel(action: Action): string {
  switch (action) {
    case 'seek':
      return 'Looking for fruit'
    case 'gather':
      return 'Gathering near a tree'
    case 'avoid':
      return 'Avoiding the crowd'
    case 'flee':
      return 'Moving away from red'
    case 'eat':
      return 'Eating'
    case 'digest':
      return 'Finishing a bite'
    case 'hunt':
      return 'Looking for a blue blob'
    case 'contact':
      return 'Gentle contact'
    case 'rest':
      return 'Pausing after contact'
    case 'birth':
      return 'Splitting off a new blob'
    default:
      return 'Wandering'
  }
}

export function blobName(id: number): string {
  const syl = ['mip', 'lumi', 'boo', 'nori', 'pip', 'kiki', 'mo', 'dot', 'zaz', 'fig', 'rumi', 'toto', 'nub', 'bean', 'pop']
  return `${syl[Math.abs(id) % syl.length]}-${Math.abs(id * 7) % 90}`
}

const LOCKED: Action[] = ['eat', 'digest', 'contact', 'rest', 'birth']

export function showsTimeLeft(action: Action): boolean {
  return LOCKED.includes(action)
}
