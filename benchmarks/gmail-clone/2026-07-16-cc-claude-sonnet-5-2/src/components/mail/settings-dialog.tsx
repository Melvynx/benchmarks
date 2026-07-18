import { RotateCcw } from 'lucide-react'
import { useMailStore } from '@/store/mail-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const THEME_OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
] as const

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const theme = useMailStore((s) => s.theme)
  const setTheme = useMailStore((s) => s.setTheme)
  const density = useMailStore((s) => s.density)
  const toggleDensity = useMailStore((s) => s.toggleDensity)
  const resetDemoData = useMailStore((s) => s.resetDemoData)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Personalize how your inbox looks and behaves.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-sm font-medium">Theme</p>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    theme === opt.id
                      ? 'border-accent bg-accent/10 font-medium text-accent'
                      : 'border-border-strong hover:bg-surface-hover'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Density</p>
              <p className="text-xs text-muted-foreground">
                Compact reduces spacing in the message list
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleDensity}>
              {density === 'comfortable' ? 'Comfortable' : 'Compact'}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Demo data</p>
              <p className="text-xs text-muted-foreground">
                Restore the inbox to its original seeded state
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetDemoData()
                onOpenChange(false)
              }}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
