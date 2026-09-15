import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ThemeToggle from './components/ThemeToggle'
import { applyStoredTheme } from './hooks/useTheme'

// Re-apply the persisted data-theme (pre-paint script in index.html ran first).
applyStoredTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ThemeToggle />
  </StrictMode>,
)
