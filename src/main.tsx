// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import App from './App'
// import './index.css'
// import gnsLogo from '@/imports/logo-transparent.png?inline'
// import { setDefaultLogo } from './services/pdf'

// // Logo officiel GNS TECHNOLOGIES pour les en-têtes de tous les PDF générés
// setDefaultLogo(gnsLogo)

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
// )
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import gnsLogoUrl from '@/imports/GNS_logo.png'
import gnsLogoInline from '@/imports/GNS_logo.png?inline'
import { setDefaultLogo } from './services/pdf'

// Logo officiel GNS TECHNOLOGIES pour les en-têtes de tous les PDF générés.
// Le suffixe ?inline fournit un data URL directement utilisable par jsPDF.
setDefaultLogo(gnsLogoInline)

// Secours robuste : si le bundler ne produit pas un data URL utilisable,
// on convertit l'URL de l'asset en data URL au chargement de l'application.
fetch(gnsLogoUrl)
  .then((r) => r.blob())
  .then(
    (blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      }),
  )
  .then((dataUrl) => setDefaultLogo(dataUrl))
  .catch(() => {})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
