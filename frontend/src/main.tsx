import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { installStorageShim } from './lib/storage-shim'
import StudioWorkflowManager from './StudioWorkflowManager'

installStorageShim()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioWorkflowManager />
  </StrictMode>,
)
