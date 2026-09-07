import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: number
  message: string
  actions: ToastAction[]
  /** Milliseconds; 0 keeps it until dismissed. */
  duration: number
  createdAt: number
}

interface ToastContextValue {
  toasts: Toast[]
  show: (message: string, opts?: { actions?: ToastAction[]; duration?: number }) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback<ToastContextValue['show']>(
    (message, opts) => {
      const id = nextId++
      const duration = opts?.duration ?? 6000
      // Only one toast at a time, matching how the real thing behaves.
      setToasts((list) => {
        list.forEach((t) => {
          const timer = timers.current.get(t.id)
          if (timer) window.clearTimeout(timer)
          timers.current.delete(t.id)
        })
        return [{ id, message, actions: opts?.actions ?? [], duration, createdAt: Date.now() }]
      })
      if (duration > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => window.clearTimeout(t))
  }, [])

  const value = useMemo(() => ({ toasts, show, dismiss }), [toasts, show, dismiss])
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
