import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import gnsLogo from '@/imports/logo-transparent.png?inline'
import { setDefaultLogo } from './services/pdf'

// Logo officiel GNS TECHNOLOGIES pour les en-têtes de tous les PDF générés
setDefaultLogo(gnsLogo)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
