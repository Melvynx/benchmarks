export type TimeFormat = '12h' | '24h'

export type Mode = 'meeting' | 'base'

/** Hours are integers 0–23. `sleep` is exclusive; `wake > sleep` means overnight. */
export interface AwakeWindow {
  wake: number
  sleep: number
}

export interface Settings extends AwakeWindow {
  format: TimeFormat
}
