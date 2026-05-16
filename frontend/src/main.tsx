import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { bootstrapPrefs } from './lib/prefs'
import { applyTheme } from './lib/theme'
import StudioWorkflowManager from './StudioWorkflowManager'

bootstrapPrefs() // 在 React 渲染前应用 dark mode,避免初次加载白底闪
applyTheme()     // 应用本周主题强调色(写 :root CSS 变量),渲染前完成避免闪色

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioWorkflowManager />
  </StrictMode>,
)
