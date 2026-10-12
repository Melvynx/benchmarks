import type { Action, Kind } from './sim/engine';

const HEAD = ['Mi', 'Po', 'Bu', 'Lo', 'Nu', 'Ki', 'Zo', 'Fi', 'Tu', 'Ba', 'Pi', 'Do', 'Mo', 'Wi', 'Ju', 'Sa'];
const TAIL = ['mo', 'bo', 'pi', 'lu', 'ta', 'ni', 'ko', 'zu', 'ri', 'pa', 'do', 'be', 'fu', 'li', 'mi', 'to'];

export function blobName(id: number) {
  const h = Math.imul(id + 7, 2654435761) >>> 0;
  return HEAD[h % HEAD.length] + TAIL[(h >>> 8) % TAIL.length];
}

export interface ActionInfo {
  label: string;
  detail: string;
  lockLabel: string;
}

const ACTIONS: Record<Action, ActionInfo> = {
  seek: { label: 'Looking for fruit', detail: 'Hungry, walking to the nearest ripe fruit.', lockLabel: '' },
  gather: { label: 'Gathering at a tree', detail: 'Waiting where fruit is about to ripen.', lockLabel: '' },
  wander: { label: 'Wandering', detail: 'Strolling with nothing urgent to do.', lockLabel: '' },
  idle: { label: 'Waiting', detail: 'Standing still. Waiting costs a little energy too.', lockLabel: '' },
  flee: { label: 'Escaping a red blob', detail: 'Spotted a red blob and running away.', lockLabel: '' },
  spread: { label: 'Giving space', detail: 'Too crowded here, drifting apart.', lockLabel: '' },
  eat: { label: 'Snacking', detail: 'Chewing fruit. Busy and easy to catch.', lockLabel: 'Eating time left' },
  startled: { label: 'Startled', detail: 'Just got touched, recoiling.', lockLabel: 'Startle left' },
  bud: { label: 'Making a copy', detail: 'Spending stored energy on a new blob.', lockLabel: 'Copy animation left' },
  hunt: { label: 'Hunting blue', detail: 'Chasing a blue blob it can see.', lockLabel: '' },
  nuzzle: { label: 'Gentle contact', detail: 'Touching a blue blob and taking a little energy.', lockLabel: 'Contact animation left' },
  pause: { label: 'Digesting', detail: 'Resting after a contact before hunting again.', lockLabel: 'Pause time left' },
};

export function actionInfo(action: Action, kind: Kind, dead: boolean): ActionInfo {
  if (dead) return { label: 'Faded away', detail: 'This blob is gone.', lockLabel: '' };
  const info = ACTIONS[action];
  if (kind === 'red' && action === 'idle') return { ...info, detail: 'Catching its breath. Waiting costs a little energy.' };
  return info;
}
