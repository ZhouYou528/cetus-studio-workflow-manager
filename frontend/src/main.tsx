import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { bootstrapPrefs } from './lib/prefs'
import StudioWorkflowManager from './StudioWorkflowManager'

bootstrapPrefs() // 在 React 渲染前应用 dark mode,避免初次加载白底闪

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioWorkflowManager />
  </StrictMode>,
)
