import './assets/design-system.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './weetory/Shell'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
