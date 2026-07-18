import { useMailStore } from '@/store/mail-store'
import { useIsMobile } from '@/hooks/use-media-query'
import { useThemeEffect } from '@/hooks/use-theme-effect'
import { useMailKeyboardShortcuts } from '@/hooks/use-mail-keyboard-shortcuts'
import { TopBar } from './topbar'
import { Sidebar } from './sidebar'
import { MailListPane } from './mail-list-pane'
import { ThreadView } from './thread-view'
import { ComposeStack } from './compose-stack'
import { Snackbar } from './snackbar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog'

export function MailApp() {
  useThemeEffect()
  useMailKeyboardShortcuts()

  const isMobile = useIsMobile()
  const sidebarCollapsed = useMailStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useMailStore((s) => s.toggleSidebar)
  const mobileNavOpen = useMailStore((s) => s.mobileNavOpen)
  const setMobileNavOpen = useMailStore((s) => s.setMobileNavOpen)
  const selectedThreadId = useMailStore((s) => s.selectedThreadId)
  const shortcutsOpen = useMailStore((s) => s.shortcutsDialogOpen)
  const setShortcutsOpen = useMailStore((s) => s.setShortcutsDialogOpen)

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <TopBar onMenuClick={() => (isMobile ? setMobileNavOpen(true) : toggleSidebar())} />

      <div className="flex min-h-0 flex-1">
        {!isMobile && <Sidebar collapsed={sidebarCollapsed} />}

        {isMobile && (
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <div onClick={() => setMobileNavOpen(false)}>
                <Sidebar collapsed={false} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        <main className="min-w-0 flex-1 overflow-hidden bg-card sm:my-2 sm:mr-2 sm:rounded-2xl sm:border sm:border-border">
          {selectedThreadId ? <ThreadView threadId={selectedThreadId} /> : <MailListPane />}
        </main>
      </div>

      <ComposeStack />
      <Snackbar />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}
