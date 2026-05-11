import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StudioWorkflowManager from './StudioWorkflowManager'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioWorkflowManager />
  </StrictMode>,
)
