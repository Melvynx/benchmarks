import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { usePersistedAppState } from './hooks/usePersistedAppState'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  const [state, dispatch] = usePersistedAppState()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage state={state} dispatch={dispatch} />} />
        <Route path="/settings" element={<SettingsPage state={state} dispatch={dispatch} />} />
      </Routes>
    </BrowserRouter>
  )
}
