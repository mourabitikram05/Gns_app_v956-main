import { useEffect, useState } from 'react'
import {
  LayoutDashboard, CalendarDays, Receipt, FileText, Calendar,
  Briefcase, BookOpen, PartyPopper,
  BarChart3, Shield, Bell, Search, ChevronDown, LogOut,
  Settings, User, Menu, X, Wrench, FileDown , PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import gnsLogo from '@/imports/GNS_logo.png'
import gnsIconLogo from '@/imports/GNS_icon.png'   
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
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false) // ← nouveau : menu du sidebar
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
     {/* Sidebar */}
<aside
  className="flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden"
  style={{
    width: sidebarOpen ? 240 : 72,
    background: '#0A0A0A',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  }}
>
  {/* Logo */}
 {/* En-tête — logo cliquable, pas de bouton séparé */}
  <div
    className="relative flex items-center justify-center flex-shrink-0"
    style={{ minHeight: 68, padding: sidebarOpen ? '18px 16px' : '14px 8px' }}
  >
    {sidebarOpen ? (
      <>
        <img src={gnsLogo} alt="GNS Technologies" className="h-12 w-auto" />
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          title="Réduire le menu"
        >
          <PanelLeftClose size={15} color="#D1D5DB" />
        </button>
      </>
    ) : (
      <button
        onClick={() => setSidebarOpen(true)}
        className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="Ouvrir le menu"
      >
        <img src={gnsIconLogo} alt="GNS" className="w-8 h-8 object-contain transition-opacity group-hover:opacity-0" />
        <PanelLeftOpen
          size={17}
          color="#C9A227"
          className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </button>
    )}
  </div>
  <div className="h-px flex-shrink-0" style={{ background: 'linear-gradient(90deg, #C9A227 0%, rgba(201,162,39,0) 70%)' }} />

  {/* Nav */}
  <nav className="flex-1 overflow-y-auto py-3">
    {groups.map((group, gi) => {
      const items = visibleItems.filter((i) => i.group === group)
      return (
        <div
          key={group}
          className="pb-2 mb-2"
          style={gi > 0 ? { borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 } : undefined}
        >
          {sidebarOpen && (
            <div
              className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.28)' }}
            >
              {group}
            </div>
          )}
          {items.map((item) => {
            const Icon = item.icon
            const active = activeScreen === item.id
            return (
              <div key={item.id} className="relative px-2">
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                    style={{ height: 18, background: '#C9A227' }}
                  />
                )}
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-white/5 ${
                    sidebarOpen ? '' : 'justify-center'
                  }`}
                  style={{
                    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                    background: active ? 'rgba(201,162,39,0.12)' : 'transparent',
                  }}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon
                    size={17}
                    className="flex-shrink-0"
                    style={{ color: active ? '#C9A227' : 'rgba(255,255,255,0.45)' }}
                  />
                  {sidebarOpen && <span className="truncate font-medium">{item.label}</span>}
                </button>
              </div>
            )
          })}
        </div>
      )
    })}
  </nav>

  {/* User */}
{/* User */}
<div
  className="relative p-2.5 flex-shrink-0"
  style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
>
  <button
    onClick={() => setSidebarMenuOpen(!sidebarMenuOpen)}
    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${sidebarOpen ? '' : 'justify-center'}`}
    style={{
      background: sidebarMenuOpen ? 'rgba(201,162,39,0.12)' : 'transparent',
      boxShadow: sidebarMenuOpen ? 'inset 0 0 0 1px rgba(201,162,39,0.3)' : 'none',
    }}
    onMouseEnter={(e) => { if (!sidebarMenuOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
    onMouseLeave={(e) => { if (!sidebarMenuOpen) e.currentTarget.style.background = 'transparent' }}
  >
    <div
      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white transition-all"
      style={{
        background: '#C9A227',
        boxShadow: sidebarMenuOpen ? '0 0 0 2px rgba(201,162,39,0.6)' : '0 0 0 2px rgba(201,162,39,0.25)',
      }}
    >
      {initials}
    </div>
    {sidebarOpen && (
      <>
        <div className="flex-1 overflow-hidden text-left">
          <div className="text-white text-xs font-semibold truncate">{nom}</div>
          <div className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{roleLabel}</div>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: sidebarMenuOpen ? '#C9A227' : 'rgba(255,255,255,0.4)',
            transform: sidebarMenuOpen ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.2s ease, color 0.2s ease',
          }}
        />
      </>
    )}
  </button>

  {sidebarMenuOpen && (
    <div
      className="absolute bottom-full left-2 right-2 mb-2 rounded-xl overflow-hidden shadow-2xl border z-50"
      style={{ background: '#242424', borderColor: 'rgba(201,162,39,0.25)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="text-sm font-semibold text-white truncate">{nom}</div>
        <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</div>
      </div>
      <button
        onClick={() => { setSidebarMenuOpen(false); ouvrirProfil() }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/8"
        style={{ color: 'rgba(255,255,255,0.8)' }}
      >
        <User size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
        Mon profil
      </button>
      <button
        onClick={() => { setSidebarMenuOpen(false); ouvrirParametres() }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/8"
        style={{ color: 'rgba(255,255,255,0.8)' }}
      >
        <Settings size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
        Paramètres
      </button>
      <button
        onClick={() => { setSidebarMenuOpen(false); logout() }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10"
        style={{ color: '#F87171' }}
      >
        <LogOut size={15} style={{ color: '#F87171' }} />
        Déconnexion
      </button>
    </div>
  )}
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
        <main className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>

      {/* Click away */}
{(userMenuOpen || notifOpen || demandeOpen || sidebarMenuOpen) && (
  <div
    className="fixed inset-0 z-40"
    onClick={() => {
      setUserMenuOpen(false)
      setNotifOpen(false)
      setDemandeOpen(false)
      setSidebarMenuOpen(false)
    }}
  />
)}

      {/* Les pages Profil et Paramètres sont des écrans dédiés (voir App.tsx) */}
    </div>
  )
}
