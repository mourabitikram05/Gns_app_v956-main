/// <reference types="vite/client" />

// Assets inlinés en data URL (logo officiel pour les PDF)
declare module '*?inline' {
  const src: string
  export default src
}
