import { AppToaster } from './components/AppToaster'
import './assets/design-system.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './weetory/Shell'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppToaster>
      <App />
    </AppToaster>
  </StrictMode>
)
