import { MailApp } from '@/mail-app'
import { ComposeProvider } from '@/store/compose'
import { MailProvider } from '@/store/mail-store'
import { SettingsProvider } from '@/store/settings'
import { ToastProvider } from '@/store/toast'

export default function App() {
  return (
    <MailProvider>
      <SettingsProvider>
        <ToastProvider>
          <ComposeProvider>
            <MailApp />
          </ComposeProvider>
        </ToastProvider>
      </SettingsProvider>
    </MailProvider>
  )
}
