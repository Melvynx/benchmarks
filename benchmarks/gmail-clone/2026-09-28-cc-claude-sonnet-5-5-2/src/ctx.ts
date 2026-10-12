import { createContext, useContext } from 'react'
import type { Action } from './store'
import type { State } from './types'
import type { ComposeState } from './Compose'

export type Ctx = {
  s: State; act: (a: Action, msg?: string) => void; toast: (msg: string, o?: { label: string; fn: () => void }) => void
  nav: (path: string) => void; view: string; openId: string | null; q: string
  sel: Set<string>; setSel: (s: Set<string>) => void
  openCompose: (init?: Partial<ComposeState>) => void; updateCompose: (id: string, p: Partial<ComposeState>) => void
  composes: ComposeState[]; closeCompose: (id: string) => void; discardCompose: (id: string) => void; sendCompose: (c: ComposeState, d: import('./types').Draft, at?: number) => void
  replyTo: (threadId: string, kind: 'reply' | 'all' | 'forward', msgId?: string) => void
  preview: (a: import('./types').Att, from: string) => void
  refresh: () => void; cursor: number; setCursor: (n: number) => void
}
export const C = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(C)
