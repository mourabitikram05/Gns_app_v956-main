import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import { ToastProvider } from './components/ui'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './screens/Login'
import Inscription from './screens/Inscription'
import DashboardRH from './screens/DashboardRH'
import DashboardCollab from './screens/DashboardCollab'
import CongesCollab from './screens/CongesCollab'
import CongesRH from './screens/CongesRH'
import FraisCollab from './screens/FraisCollab'
import FraisRH from './screens/FraisRH'
import DocsCollab from './screens/DocsCollab'
import DocsRH from './screens/DocsRH'
import Recrutement from './screens/Recrutement'
import Annuaire from './screens/Annuaire'
import Evenements from './screens/Evenements'
import KPI from './screens/KPI'
import AccesControl from './screens/AccesControl'
import Structures from './screens/Structures'
import Profil from './screens/Profil'
import Parametres from './screens/Parametres'

/** Écrans réservés au profil RH (le collaborateur n'y a pas accès). */
const RH_ONLY = new Set(['dashboard-rh', 'conges-rh', 'frais-rh', 'docs-rh', 'kpi', 'acces', 'recrutement', 'structures'])

const SCREENS: Record<string, React.ReactNode> = {
  'dashboard-rh': <DashboardRH />,
  'dashboard-collab': <DashboardCollab />,
  'conges-collab': <CongesCollab />,
  'conges-rh': <CongesRH />,
  'frais-collab': <FraisCollab />,
  'frais-rh': <FraisRH />,
  'docs-collab': <DocsCollab />,
  'docs-rh': <DocsRH />,
  'recrutement': <Recrutement />,
  'annuaire': <Annuaire />,
  'evenements': <Evenements />,
  'kpi': <KPI />,
  'acces': <AccesControl />,
  'structures': <Structures />,
  'profil': <Profil />,
  'parametres': <Parametres />,
}

function AppInner() {
  const { user, isRh } = useAuth()
  const [screen, setScreen] = useState('dashboard-rh')
  const [authView, setAuthView] = useState<'login' | 'inscription'>('login')

  useEffect(() => {
    // Bascule connexion / inscription depuis les pages d'authentification
    const onAuthNav = (e: Event) => {
      const target = (e as CustomEvent<string>).detail
      if (target === 'login' || target === 'inscription') setAuthView(target)
    }
    window.addEventListener('gns:navigate-auth', onAuthNav)
    return () => window.removeEventListener('gns:navigate-auth', onAuthNav)
  }, [])

  useEffect(() => {
    // Retour à l'écran par défaut du rôle quand l'utilisateur change
    setScreen(isRh ? 'dashboard-rh' : 'dashboard-collab')
  }, [user?.email, isRh])

  useEffect(() => {
    // Navigation déclenchée depuis un écran (ex. bouton "Message" de l'annuaire)
    const onNavigate = (e: Event) => {
      const target = (e as CustomEvent<string>).detail
      if (target) setScreen(target)
    }
    window.addEventListener('gns:navigate', onNavigate)
    return () => window.removeEventListener('gns:navigate', onNavigate)
  }, [])

  if (!user) {
    return authView === 'inscription' ? <Inscription /> : <Login />
  }

  const target = RH_ONLY.has(screen) && !isRh ? (isRh ? 'dashboard-rh' : 'dashboard-collab') : screen

  return (
    <Layout activeScreen={target} onNavigate={setScreen}>
      {SCREENS[target] ?? <DashboardCollab />}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AuthProvider>
  )
}
