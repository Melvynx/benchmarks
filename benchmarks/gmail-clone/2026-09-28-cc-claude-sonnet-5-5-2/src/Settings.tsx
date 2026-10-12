import { useState } from 'react'
import { Icon } from './Icon'
import { useApp } from './ctx'
import { Modal } from './ui'
import { cx } from './util'

export function Settings({ onClose }: { onClose: () => void }) {
  const { s, act, toast } = useApp()
  const st = s.settings
  const [name, setName] = useState('')
  const set = (patch: Partial<typeof st>) => act({ t: 'settings', patch })
  const Seg = <T extends string>({ v, opts, on }: { v: T; opts: [T, string][]; on: (v: T) => void }) => (
    <div className="seg">{opts.map(([k, l]) => <button key={k} className={cx(v === k && 'on')} onClick={() => on(k)}>{l}</button>)}</div>
  )
  return (
    <Modal title="Settings" onClose={onClose} wide>
      <div className="set-row"><div><b>Theme</b><small>Match your system or choose one</small></div>
        <Seg v={st.theme} opts={[['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]} on={(theme) => set({ theme })} /></div>
      <div className="set-row"><div><b>Density</b><small>How much fits on screen</small></div>
        <Seg v={st.density} opts={[['comfortable', 'Comfortable'], ['compact', 'Compact']]} on={(density) => set({ density })} /></div>
      <div className="set-row"><div><b>Inbox categories</b><small>Primary, Social, Promotions and Updates tabs</small></div>
        <button className={cx('switch', st.tabs && 'on')} role="switch" aria-checked={st.tabs} aria-label="Inbox categories" onClick={() => set({ tabs: !st.tabs })}><i /></button></div>
      <div className="set-row"><div><b>Message preview</b><small>Show snippets in the message list</small></div>
        <button className={cx('switch', st.preview && 'on')} role="switch" aria-checked={st.preview} aria-label="Message preview" onClick={() => set({ preview: !st.preview })}><i /></button></div>
      <div className="set-row"><div><b>Undo send</b><small>Time to change your mind</small></div>
        <select value={st.undoSeconds} onChange={(e) => set({ undoSeconds: +e.target.value })}>{[5, 8, 10, 20, 30].map((n) => <option key={n} value={n}>{n} seconds</option>)}</select></div>
      <div className="set-row"><div><b>Simulated replies</b><small>Contacts occasionally reply to what you send</small></div>
        <button className={cx('switch', st.autoReply && 'on')} role="switch" aria-checked={st.autoReply} aria-label="Simulated replies" onClick={() => set({ autoReply: !st.autoReply })}><i /></button></div>
      <div className="set-col"><b>Signature</b><textarea rows={2} value={st.signature} onChange={(e) => set({ signature: e.target.value })} placeholder="No signature" /></div>
      <div className="set-col"><b>Labels</b>
        <div className="lab-list">{s.labels.map((l) => (
          <span key={l.id} className="lchip big" style={{ ['--c' as string]: l.color }}>{l.name}<button aria-label={`Delete label ${l.name}`} onClick={() => act({ t: 'delLabel', id: l.id }, `Label ${l.name} deleted`)}><Icon n="x" s={12} /></button></span>
        ))}</div>
        <form className="new-label inline" onSubmit={(e) => {
          e.preventDefault(); const n = name.trim(); if (!n) return
          act({ t: 'addLabel', label: { id: n.toLowerCase().replace(/\W+/g, '-') + '-' + Math.random().toString(36).slice(2, 5), name: n, color: ['#1a73e8', '#188038', '#e37400', '#8430ce', '#d93025', '#12857a'][s.labels.length % 6] } }); setName('')
        }}><input placeholder="New label name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn sm" disabled={!name.trim()}>Create</button></form>
      </div>
      <div className="set-row danger-zone"><div><b>Reset demo mailbox</b><small>Restore the original messages and clear your changes</small></div>
        <button className="btn outline" onClick={() => { if (confirm('Reset the mailbox to its original state?')) { localStorage.removeItem('mail-state-v2'); localStorage.removeItem('mail-pool'); location.hash = '#/inbox'; location.reload() } else toast('Reset canceled') }}>Reset</button></div>
    </Modal>
  )
}

export function Shortcuts({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [['c', 'Compose'], ['/', 'Search'], ['j / k', 'Next / previous'], ['o or Enter', 'Open conversation'], ['u', 'Back to list'], ['x', 'Select'], ['s', 'Star'], ['e', 'Archive'], ['# or Delete', 'Move to Trash'], ['!', 'Report spam'], ['r', 'Reply'], ['a', 'Reply all'], ['f', 'Forward'], ['Shift + i', 'Mark as read'], ['Shift + u', 'Mark as unread'], ['z', 'Undo'], ['g then i', 'Go to Inbox'], ['g then s', 'Go to Starred'], ['g then t', 'Go to Sent'], ['g then d', 'Go to Drafts'], ['g then a', 'Go to All Mail'], ['Ctrl/⌘ + Enter', 'Send message'], ['Esc', 'Close / clear'], ['?', 'This help']]
  return <Modal title="Keyboard shortcuts" onClose={onClose} wide><div className="kbd-grid">{rows.map(([k, d]) => <div key={k}><kbd>{k}</kbd><span>{d}</span></div>)}</div></Modal>
}
