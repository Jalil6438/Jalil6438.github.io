import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './quran-hifz-tracker'
import ErrorBoundary from './components/ErrorBoundary'
import { trackUsage } from './usageCounter'

trackUsage()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
