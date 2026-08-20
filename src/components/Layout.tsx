import { useEffect, useState } from 'react'
import {
  LayoutDashboard, CalendarDays, Receipt, FileText, Calendar,
  Briefcase, BookOpen, PartyPopper,
  BarChart3, Shield, Bell, Search, ChevronDown, LogOut,
  Settings, User, Menu, X, Wrench, FileDown
} from 'lucide-react'
import gnsLogo from '@/imports/GNS_logo.png'
import { useAuth } from '../context/AuthContext'
import { notificationsApi } from '../api/modules'
import type { NotificationItem } from '../api/types'
import { fmtDateTime, useToasts } from './ui'

const NAV_ITEMS = [
  { id: 'dashboard-rh', label: 'Dashboard RH', icon: LayoutDashboard, group: 'Vue RH', rhOnly: true },
  { id: 'dashboard-collab', label: 'Mon Dashboard', icon: User, group: 'Vue RH', rhOnly: false },
  { id: 'conges-rh', label: 'Congés RH', icon: CalendarDays, group: 'Gestion', rhOnly: true },
  { id: 'conges-collab', label: 'Mes Congés', icon: Calendar, group: 'Gestion', rhOnly: false },
  { id: 'frais-rh', label: 'Notes de frais RH', icon: Receipt, group: 'Gestion', rhOnly: true },
  { id: 'frais-collab', label: 'Mes frais', icon: Receipt, group: 'Gestion', rhOnly: false },
  { id: 'docs-rh', label: 'Documents RH', icon: FileText, group: 'Ressources', rhOnly: true },
  { id: 'docs-collab', label: 'Mes Documents', icon: FileText, group: 'Ressources', rhOnly: false },
  { id: 'recrutement', label: 'Recrutement', icon: Briefcase, group: 'Communication', rhOnly: true },  
  { id: 'annuaire', label: 'Annuaire', icon: BookOpen, group: 'Communication', rhOnly: false },
  { id: 'evenements', label: 'Événements', icon: PartyPopper, group: 'Communication', rhOnly: false },
  { id: 'kpi', label: 'KPI & Reporting', icon: BarChart3, group: 'Admin', rhOnly: true },
  { id: 'structures', label: 'Structures RH', icon: Wrench, group: 'Admin', rhOnly: true },
  { id: 'acces', label: 'Contrôle d\'accès', icon: Shield, group: 'Admin', rhOnly: true },
]

function notificationScreen(type: string | null, isRh: boolean): string | null {
  if (!type) return null
  const rh = isRh ? '-rh' : '-collab'
  if (type.startsWith('CONGE')) return 'conges' + rh
  if (type.startsWith('FRAIS')) return 'frais' + rh
  if (type.startsWith('DOCUMENT')) return 'docs' + rh
  if (type.startsWith('EVENEMENT')) return 'evenements'
  if (type.startsWith('CANDIDATURE') || type.startsWith('ENTRETIEN') || type.startsWith('EMBAUCHE')) return 'recrutement'
  return null
}

const ROLE_LABELS: Record<string, string> = {
  COLLABORATEUR: 'Collaborateur',
  RESPONSABLE_RH: 'Responsable RH',
  ADMIN: 'Administrateur',
}

interface LayoutProps {
  activeScreen: string
  onNavigate: (id: string) => void
  children: React.ReactNode
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Layout({ activeScreen, onNavigate, children }: LayoutProps) {
  const { user, logout, isRh } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const [demandeOpen, setDemandeOpen] = useState(false)
  const { success, error: toastError } = useToasts()

  const loadNotifications = () => {
    notificationsApi.lister()
      .then((data) => {
        setNotifCount(data.count)
        setNotifs(data.items)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!user) return
    loadNotifications()
    const timer = setInterval(loadNotifications, 60_000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const ouvrirProfil = () => {
    setUserMenuOpen(false)
    onNavigate('profil')
  }

  const nouvelleDemande = (type: 'CONGE' | 'FRAIS' | 'DOC' ) => {
    setDemandeOpen(false)
    if (type === 'CONGE') {
      window.dispatchEvent(new CustomEvent('gns:nouvelle-demande'))
      onNavigate('conges-collab')
    } else if (type === 'FRAIS') {
      window.dispatchEvent(new CustomEvent('gns:nouvelle-frais'))
      onNavigate('frais-collab')
    } else if (type === 'DOC') {
      window.dispatchEvent(new CustomEvent('gns:nouvelle-doc'))
      onNavigate('docs-collab')
    } else {
      toastError("Le module Interventions n'est pas encore connecté")
    }
  }

  const ouvrirParametres = () => {
    setUserMenuOpen(false)
    onNavigate('parametres')
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.toutLire()
      loadNotifications()
    } catch {
      /* silencieux */
    }
  }

  const visibleItems = NAV_ITEMS.filter((i) => isRh || !i.rhOnly)
  const groups = [...new Set(visibleItems.map((i) => i.group))]
  const nom = user?.nomComplet || user?.email || 'Utilisateur'
  const initials = userInitials(nom)
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F7F8FA' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden"
        style={{
          width: sidebarOpen ? 240 : 64,
          background: '#000000',
          borderRight: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        {/* Logo
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', minHeight: 64 }}>
          <div className="flex-shrink-0 w-8 h-8 overflow-hidden rounded">
            <img src={gnsLogo} alt="GNS Technologies" className="w-full h-full object-cover" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="text-white font-bold text-sm leading-tight whitespace-nowrap">GNS</div>
              <div className="text-xs whitespace-nowrap" style={{ color: '#C9A227' }}>TECHNOLOGIES</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X size={14} color="#9CA3AF" /> : <Menu size={14} color="#9CA3AF" />}
          </button>
        </div> */}
        
        {/* Logo officiel */}
<div className="flex items-center gap-3 px-4 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', minHeight: 64 }}>
  {sidebarOpen ? (
    <img src={gnsLogo} alt="GNS Technologies" className="h-14 w-auto" />
  ) : (
    <div className="w-8 h-8 overflow-hidden rounded flex-shrink-0">
      <img src={gnsLogo} alt="GNS" className="w-full h-full object-cover object-left" />
    </div>
  )}
  <button
    onClick={() => setSidebarOpen(!sidebarOpen)}
    className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
  >
    {sidebarOpen ? <X size={14} color="#9CA3AF" /> : <Menu size={14} color="#9CA3AF" />}
  </button>
</div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {groups.map(group => {
            const items = visibleItems.filter(i => i.group === group)
            return (
              <div key={group} className="mb-2">
                {sidebarOpen && (
                  <div className="px-4 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {group}
                  </div>
                )}
                {items.map(item => {
                  const Icon = item.icon
                  const active = activeScreen === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-all duration-150"
                      style={{
                        color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                        background: active ? 'rgba(201,162,39,0.18)' : 'transparent',
                        borderLeft: active ? '2px solid #C9A227' : '2px solid transparent',
                      }}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <Icon size={16} className="flex-shrink-0" style={{ color: active ? '#C9A227' : 'rgba(255,255,255,0.6)' }} />
                      {sidebarOpen && <span className="truncate font-medium">{item.label}</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{ background: '#C9A227' }}>{initials}</div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <div className="text-white text-xs font-semibold truncate">{nom}</div>
                <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{roleLabel}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 flex-shrink-0"
          style={{ height: 64, background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md rounded-lg px-3 py-2" style={{ background: '#F7F8FA', border: '1px solid #E5E7EB' }}>
            <Search size={15} style={{ color: '#9CA3AF' }} />
            <input
              className="bg-transparent text-sm outline-none flex-1 placeholder-gray-400"
              placeholder="Rechercher..."
              onKeyDown={(e) => { if (e.key === 'Enter') onNavigate('annuaire') }}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors relative"
              >
                <Bell size={18} style={{ color: '#6B7280' }} />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                    style={{ background: '#EF4444', fontSize: 10 }}>
                    {notifCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications</span>
                    <button onClick={markAllRead} className="text-xs font-medium hover:underline" style={{ color: '#C9A227' }}>
                      Tout marquer lu
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs" style={{ color: '#9CA3AF' }}>
                        Aucune notification
                      </div>
                    ) : notifs.map((n) => {
                      const target = notificationScreen(n.type, isRh)
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            notificationsApi.lireUne(n.id).catch(() => {})
                            setNotifOpen(false)
                            if (target) onNavigate(target)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{ background: n.lu ? '#D1D5DB' : '#C9A227' }} />
                            <div>
                              <div className="text-sm font-medium">{n.message}</div>
                              <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{fmtDateTime(n.dateEnvoi)}</div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => {
                      notificationsApi.exporter()
                        .then(() => success('Export Excel téléchargé'))
                        .catch((e) => toastError(e.message))
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    style={{ color: '#000000' }}
                  >
                    <FileDown size={13} /> Exporter l'historique
                  </button>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: '#C9A227' }}>{initials}</div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{nom}</span>
                <ChevronDown size={14} style={{ color: '#9CA3AF' }} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-sm font-semibold text-gray-900 truncate">{nom}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>{user?.email}</div>
                  </div>
                  <button
                    onClick={ouvrirProfil}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    <User size={15} style={{ color: '#6B7280' }} />
                    Mon profil
                  </button>
                  <button
                    onClick={ouvrirParametres}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    <Settings size={15} style={{ color: '#6B7280' }} />
                    Paramètres
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); logout() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    <LogOut size={15} style={{ color: '#6B7280' }} />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>

            {/* New request dropdown */}
            <div className="relative">
              <button
                onClick={() => setDemandeOpen(!demandeOpen)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#C9A227', border: '2px solid #000000', color: '#000000', boxShadow: '0 4px 14px -4px rgba(201,162,39,0.6)' }}
              >
                + Nouvelle demande <ChevronDown size={14} />
              </button>
              {demandeOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  {[
                    { key: 'CONGE' as const, label: 'Congés / absences', icon: CalendarDays },
                    { key: 'FRAIS' as const, label: 'Note de frais', icon: Receipt },
                    { key: 'DOC' as const, label: 'Document', icon: FileText },
                    // { key: 'INTERVENTION' as const, label: 'Intervention', icon: Wrench },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <button key={item.key} onClick={() => nouvelleDemande(item.key)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors text-gray-700">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                          <Icon size={15} style={{ color: '#000000' }} />
                        </span>
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Click away */}
      {(userMenuOpen || notifOpen || demandeOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setUserMenuOpen(false); setNotifOpen(false); setDemandeOpen(false) }} />
      )}

      {/* Les pages Profil et Paramètres sont des écrans dédiés (voir App.tsx) */}
    </div>
  )
}
