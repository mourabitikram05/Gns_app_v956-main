import { useState, type FormEvent } from 'react'
import {
  User, ShieldCheck, Bell, SlidersHorizontal, Settings, KeyRound,
  Loader2, Eye, EyeOff, Lock, Mail, IdCard, BadgeCheck, ArrowRight, Info, Languages, UserCog,
} from 'lucide-react'
import { authApi } from '../api/modules'
import { useToasts } from '../components/ui'
import { useAuth } from '../context/AuthContext'

type SectionId = 'compte' | 'securite' | 'notifications' | 'preferences' | 'administration'

const ROLE_LABELS: Record<string, string> = {
  COLLABORATEUR: 'Collaborateur',
  RESPONSABLE_RH: 'Responsable RH',
  ADMIN: 'Administrateur',
}

export default function Parametres() {
  const { user, isRh } = useAuth()
  const { success, error: toastError } = useToasts()

  const [section, setSection] = useState<SectionId>('compte')

  /* ---------- Sécurité : mot de passe ---------- */
  const [form, setForm] = useState({ ancien: '', nouveau: '', confirmation: '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  /* ---------- Notifications ---------- */
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() => ({
    conges: localStorage.getItem('gns_pref_conges') !== 'off',
    frais: localStorage.getItem('gns_pref_frais') !== 'off',
    evenements: localStorage.getItem('gns_pref_evenements') !== 'off',
    documents: localStorage.getItem('gns_pref_documents') !== 'off',
  }))

  /* ---------- Préférences : langue ---------- */
  const [langue, setLangue] = useState<string>(() => localStorage.getItem('gns_langue') || 'fr')

  const toggleNotif = (key: string) => {
    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(`gns_pref_${key}`, next[key] ? 'on' : 'off')
      return next
    })
  }

  const changeLangue = (value: string) => {
    setLangue(value)
    localStorage.setItem('gns_langue', value)
    document.documentElement.lang = value
  }

  /** Indicateur de robustesse du mot de passe (0-4). */
  const forceMdp = (pwd: string): number => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const FORCE_LABELS = ['Trop court', 'Faible', 'Moyen', 'Bon', 'Excellent']
  const FORCE_COLORS = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981']

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.ancien) errs.ancien = 'Veuillez saisir votre mot de passe actuel'
    if (form.nouveau.length < 6) errs.nouveau = 'Le nouveau mot de passe doit contenir au moins 6 caractères'
    if (form.nouveau !== form.confirmation) errs.confirmation = 'La confirmation ne correspond pas au nouveau mot de passe'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      await authApi.changePassword(form.ancien, form.nouveau)
      success('Mot de passe modifié avec succès')
      setForm({ ancien: '', nouveau: '', confirmation: '' })
      setErrors({})
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe')
    } finally {
      setSaving(false)
    }
  }

  const NOTIF_ITEMS = [
    { key: 'conges', label: 'Congés & absences', desc: 'Validations, refus et changements de statut' },
    { key: 'frais', label: 'Notes de frais', desc: 'Suivi de vos remboursements' },
    { key: 'evenements', label: 'Événements', desc: 'Nouveaux événements et rappels' },
    { key: 'documents', label: 'Documents', desc: 'Documents disponibles et traités' },
  ]

  const NAV_ITEMS: { id: SectionId; label: string; icon: typeof User; adminOnly?: boolean }[] = [
    { id: 'compte', label: 'Mon compte', icon: User },
    { id: 'securite', label: 'Sécurité', icon: ShieldCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Préférences', icon: SlidersHorizontal },
    { id: 'administration', label: 'Administration', icon: Settings, adminOnly: true },
  ]
  const visibleNav = NAV_ITEMS.filter((n) => !n.adminOnly || isRh)

  const statutBadge = () => {
    switch (user?.statut) {
      case 'EN_ATTENTE':
        return { bg: '#FEF3C7', color: '#92400E', label: 'En attente de validation' }
      case 'REFUSE':
        return { bg: '#FEE2E2', color: '#991B1B', label: 'Compte refusé' }
      default:
        return { bg: '#D1FAE5', color: '#065F46', label: 'Compte actif' }
    }
  }
  const badge = statutBadge()

  const inputCls = (invalid?: boolean) =>
    `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 ` +
    (invalid
      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 '
      : 'border-gray-200 focus:border-[#000000] focus:ring-2 focus:ring-[#000000]/10')

  const CardTitle = ({ icon: Icon, title, desc }: { icon: typeof User; title: string; desc?: string }) => (
    <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-3.5">
      <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: '#F3F6FB', color: '#000000' }}>
        <Icon size={16} />
      </span>
      <div>
        <h3 className="font-semibold text-gray-900 leading-tight">{title}</h3>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* En-tête de page */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez votre compte, la sécurité et vos préférences</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
          style={{ background: badge.bg, color: badge.color }}>
          <BadgeCheck size={13} /> {badge.label}
        </span>
      </div>

      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        {/* Navigation latérale */}
        <aside className="lg:w-60 flex-shrink-0">
          <nav className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm">
            {visibleNav.map((n) => {
              const Icon = n.icon
              const active = section === n.id
              return (
                <button key={n.id} onClick={() => setSection(n.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  style={active ? { background: '#000000' } : undefined}>
                  <Icon size={15} style={active ? { color: '#C9A227' } : undefined} />
                  {n.label}
                </button>
              )
            })}
          </nav>
          <p className="text-[11px] text-gray-400 mt-3 px-2 leading-relaxed">
            GNS SIRH — Paramètres de votre espace personnel
          </p>
        </aside>

        {/* Contenu */}
        <main className="flex-1 space-y-6 min-w-0">
          {/* ---------- MON COMPTE ---------- */}
          {section === 'compte' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardTitle icon={User} title="Mon compte"
                desc="Informations de votre espace collaborateur" />
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white shadow-sm"
                    style={{ background: '#C9A227' }}>
                    {(user?.nomComplet || user?.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900 truncate">{user?.nomComplet ?? '—'}</div>
                    <div className="text-sm text-gray-500 truncate">{user?.email}</div>
                  </div>
                </div>

                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5 flex items-start gap-3">
                    <Mail size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#000000' }} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Adresse email</div>
                      <div className="text-sm font-medium text-gray-800 mt-0.5 truncate">{user?.email ?? '—'}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5 flex items-start gap-3">
                    <IdCard size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#000000' }} />
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Matricule</div>
                      <div className="text-sm font-medium text-gray-800 mt-0.5">{user?.matricule ?? '—'}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5 flex items-start gap-3">
                    <UserCog size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#000000' }} />
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Rôle</div>
                      <div className="text-sm font-medium text-gray-800 mt-0.5">
                        {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—'}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5 flex items-start gap-3">
                    <ShieldCheck size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#000000' }} />
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Statut</div>
                      <div className="text-sm font-medium mt-0.5" style={{ color: badge.color }}>{badge.label}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between rounded-xl px-4 py-3.5 border border-gray-100">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Info size={14} style={{ color: '#C9A227' }} />
                    Les informations personnelles se modifient depuis votre profil.
                  </div>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('gns:navigate', { detail: 'profil' }))}
                    className="flex items-center gap-1 text-xs font-semibold hover:underline"
                    style={{ color: '#000000' }}>
                    Ouvrir mon profil <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---------- SÉCURITÉ ---------- */}
          {section === 'securite' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardTitle icon={ShieldCheck} title="Sécurité du compte"
                desc="Changez votre mot de passe pour protéger votre accès" />
              <form onSubmit={submit} className="p-6 space-y-5 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe actuel *</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                    <input type={showOld ? 'text' : 'password'} required value={form.ancien}
                      onChange={(e) => setForm((f) => ({ ...f, ancien: e.target.value }))}
                      placeholder="Votre mot de passe actuel"
                      className={inputCls(!!errors.ancien) + ' pl-10 pr-10'} />
                    <button type="button" onClick={() => setShowOld((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Afficher / masquer le mot de passe">
                      {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.ancien && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.ancien}</p>}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nouveau mot de passe *</label>
                    <div className="relative">
                      <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                      <input type={showNew ? 'text' : 'password'} required value={form.nouveau}
                        onChange={(e) => setForm((f) => ({ ...f, nouveau: e.target.value }))}
                        placeholder="6 caractères minimum"
                        className={inputCls(!!errors.nouveau) + ' pl-10 pr-10'} />
                      <button type="button" onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Afficher / masquer le mot de passe">
                        {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {form.nouveau.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <span key={i} className="h-1 flex-1 rounded-full transition-colors"
                              style={{ background: i < forceMdp(form.nouveau) ? FORCE_COLORS[forceMdp(form.nouveau)] : '#E5E7EB' }} />
                          ))}
                        </div>
                        <p className="text-[11px] mt-1" style={{ color: FORCE_COLORS[forceMdp(form.nouveau)] }}>
                          Robustesse : {FORCE_LABELS[forceMdp(form.nouveau)]}
                        </p>
                      </div>
                    )}
                    {errors.nouveau && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.nouveau}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmation *</label>
                    <div className="relative">
                      <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                      <input type={showConfirm ? 'text' : 'password'} required value={form.confirmation}
                        onChange={(e) => setForm((f) => ({ ...f, confirmation: e.target.value }))}
                        placeholder="Répétez le nouveau mot de passe"
                        className={inputCls(!!errors.confirmation) + ' pl-10 pr-10'} />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Afficher / masquer le mot de passe">
                        {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {errors.confirmation && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.confirmation}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 shadow-sm"
                    style={{ background: '#000000' }}>
                    {saving && <Loader2 size={13} className="animate-spin" />} Enregistrer le nouveau mot de passe
                  </button>
                  <span className="text-[11px] text-gray-400">Au moins 6 caractères, mélange de types conseillé</span>
                </div>
              </form>
            </div>
          )}

          {/* ---------- NOTIFICATIONS ---------- */}
          {section === 'notifications' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardTitle icon={Bell} title="Notifications"
                desc="Choisissez les alertes que vous souhaitez recevoir" />
              <div className="divide-y divide-gray-50">
                {NOTIF_ITEMS.map((n) => (
                  <div key={n.key} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{n.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{n.desc}</div>
                    </div>
                    <button role="switch" aria-checked={notifs[n.key]}
                      onClick={() => toggleNotif(n.key)}
                      className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#000000]/30"
                      style={{ background: notifs[n.key] ? '#10B981' : '#D1D5DB' }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                        style={{ left: notifs[n.key] ? 22 : 2 }} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <Info size={12} /> Les préférences sont enregistrées automatiquement sur votre appareil.
                </p>
              </div>
            </div>
          )}

          {/* ---------- PRÉFÉRENCES ---------- */}
          {section === 'preferences' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardTitle icon={SlidersHorizontal} title="Préférences"
                desc="Personnalisez votre expérience de l'application" />
              <div className="p-6 max-w-xl">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Langue de l'application</label>
                <div className="flex items-center gap-2.5">
                  <Languages size={15} style={{ color: '#9CA3AF' }} />
                  <select value={langue} onChange={(e) => changeLangue(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#000000] focus:ring-2 focus:ring-[#000000]/10">
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  La langue sélectionnée est enregistrée et appliquée à votre session.
                </p>
              </div>
            </div>
          )}

          {/* ---------- ADMINISTRATION (RH uniquement) ---------- */}
          {section === 'administration' && isRh && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardTitle icon={Settings} title="Administration"
                desc="Outils de gestion réservés au service RH et aux administrateurs" />
              <div className="p-6 grid sm:grid-cols-3 gap-4">
                <button onClick={() => window.dispatchEvent(new CustomEvent('gns:navigate', { detail: 'acces' }))}
                  className="rounded-xl border border-gray-100 hover:border-[#000000]/30 hover:shadow-sm transition-all p-4 text-left group">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: '#F3F6FB', color: '#000000' }}>
                    <ShieldCheck size={16} />
                  </span>
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-[#000000]">Contrôle d'accès</div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Permissions, utilisateurs, demandes de comptes et journal d'audit</p>
                </button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('gns:navigate', { detail: 'structures' }))}
                  className="rounded-xl border border-gray-100 hover:border-[#000000]/30 hover:shadow-sm transition-all p-4 text-left group">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: '#F3F6FB', color: '#000000' }}>
                    <UserCog size={16} />
                  </span>
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-[#000000]">Structures</div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Départements et équipes de l'organisation</p>
                </button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('gns:navigate', { detail: 'kpi' }))}
                  className="rounded-xl border border-gray-100 hover:border-[#000000]/30 hover:shadow-sm transition-all p-4 text-left group">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: '#F3F6FB', color: '#000000' }}>
                    <SlidersHorizontal size={16} />
                  </span>
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-[#000000]">KPI & Reporting</div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Indicateurs clés et rapports d'activité</p>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
