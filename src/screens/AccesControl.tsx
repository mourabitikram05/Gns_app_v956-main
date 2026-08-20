import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Shield, Users, Key, Clock, Activity, Download, X, Loader2, UserPlus, Pencil, ShieldCheck } from 'lucide-react'
import { annuaireApi, securiteApi } from '../api/modules'
import type { AuditEntry, EmployeListItem, Permission, UtilisateurCompte } from '../api/types'
import { ErrorBlock, Spinner, useToasts } from '../components/ui'

const TABS = [
  { id: 'permissions', label: 'Matrice des permissions', icon: Key },
  { id: 'utilisateurs', label: 'Utilisateurs', icon: Users },
  { id: 'audit', label: 'Journal d\'audit', icon: Activity },
]

const ROLE_LABELS: Record<string, string> = {
  COLLABORATEUR: 'Collaborateur', RESPONSABLE_RH: 'Responsable RH', ADMIN: 'Administrateur',
}

export default function AccesControl() {
  const { success, error: toastError } = useToasts()

  const [tab, setTab] = useState('permissions')
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Record<string, string[]>>({})
  const [utilisateurs, setUtilisateurs] = useState<UtilisateurCompte[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUser, setShowUser] = useState(false)
  const [editUser, setEditUser] = useState<UtilisateurCompte | null>(null)
  const [form, setForm] = useState({ email: '', password: '', role: 'COLLABORATEUR', employeId: '' })
  const [employes, setEmployes] = useState<EmployeListItem[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [p, r, u, a, emp] = await Promise.all([
        securiteApi.permissions(), securiteApi.roles(), securiteApi.utilisateurs(), securiteApi.audit(),
        annuaireApi.rechercher({ size: 500 }),
      ])
      setPermissions(p)
      setRoles(r)
      setUtilisateurs(u)
      setAudit(a)
      setEmployes(emp.content ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const togglePermission = async (role: string, code: string) => {
    const current = roles[role] ?? []
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    // Optimiste
    setRoles((prev) => ({ ...prev, [role]: next }))
    try {
      const result = await securiteApi.majPermissions(role, next)
      setRoles(result)
      success(current.includes(code) ? `Permission retirée à ${ROLE_LABELS[role] ?? role}` : `Permission accordée à ${ROLE_LABELS[role] ?? role}`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
      load()
    }
  }

  const openCreate = () => {
    setEditUser(null)
    setForm({ email: '', password: '', role: 'COLLABORATEUR', employeId: '' })
    setShowUser(true)
  }

  const submitUser = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editUser) {
        const body: Record<string, unknown> = {}
        if (form.role) body.role = form.role
        if (form.password) body.password = form.password
        if (form.password === '' && form.email !== '') body.statut = form.email === 'INACTIF' ? 'INACTIF' : 'ACTIF'
        await securiteApi.modifierUtilisateur(editUser.id, body)
        success('Compte modifié')
      } else {
        await securiteApi.creerUtilisateur({ email: form.email, password: form.password, role: form.role, employeId: form.employeId ? Number(form.employeId) : null })
        success('Compte créé')
      }
      setShowUser(false)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatut = async (u: UtilisateurCompte) => {
    try {
      await securiteApi.modifierUtilisateur(u.id, { statut: u.statut === 'ACTIF' ? 'INACTIF' : 'ACTIF' })
      success(u.statut === 'ACTIF' ? `Compte ${u.email} désactivé (token révoqué)` : `Compte ${u.email} réactivé`)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const validerCompte = async (u: UtilisateurCompte) => {
    try {
      await securiteApi.validerCompte(u.id)
      success(`Compte ${u.email} validé — l'utilisateur peut maintenant se connecter`)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const refuserCompte = async (u: UtilisateurCompte) => {
    try {
      await securiteApi.refuserCompte(u.id)
      success(`Demande de compte ${u.email} refusée`)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  /** Badge de statut de compte (Actif / En attente / Refusé / Désactivé). */
  const badgeStatut = (statut: string) => {
    switch (statut) {
      case 'ACTIF':
        return { bg: '#D1FAE5', color: '#065F46', label: 'Actif' }
      case 'EN_ATTENTE':
        return { bg: '#FEF3C7', color: '#92400E', label: 'En attente' }
      case 'REFUSE':
        return { bg: '#FEE2E2', color: '#991B1B', label: 'Refusé' }
      default:
        return { bg: '#F3F4F6', color: '#4B5563', label: 'Désactivé' }
    }
  }

  const enAttente = utilisateurs.filter((u) => u.statut === 'EN_ATTENTE')
  const modules = [...new Set(permissions.map((p) => p.module))]
  const roleList = Object.keys(roles)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contrôle d'accès & Sécurité</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
              style={{ borderColor: tab === t.id ? '#000000' : 'transparent', color: tab === t.id ? '#000000' : '#6B7280' }}>
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <Spinner label="Chargement des données de sécurité..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : tab === 'permissions' ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Matrice des permissions par rôle</h3>
            <p className="text-xs text-gray-500 mt-0.5">Retirer une permission bloque réellement l'accès côté backend (403).</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Module / Permission</th>
                {roleList.map((r) => (
                  <th key={r} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ROLE_LABELS[r] ?? r}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {modules.map((module) => (
                <>
                  <tr key={module} className="bg-gray-50/50">
                    <td colSpan={roleList.length + 1} className="px-5 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: '#000000' }}>
                      <Shield size={11} className="inline mr-1" /> {module}
                    </td>
                  </tr>
                  {permissions.filter((p) => p.module === module).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-2.5 text-xs text-gray-700">{p.nom} <span className="text-gray-400 font-mono">({p.code})</span></td>
                      {roleList.map((r) => {
                        const checked = (roles[r] ?? []).includes(p.code)
                        return (
                          <td key={r} className="px-4 py-2.5 text-center">
                            <button onClick={() => togglePermission(r, p.code)}
                              className="w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-colors"
                              style={{ borderColor: checked ? '#000000' : '#D1D5DB', background: checked ? '#000000' : '#fff' }}>
                              {checked && <span className="text-white text-[10px] font-bold">✓</span>}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'utilisateurs' ? (
        <div className="space-y-5">
          {/* Demandes de création de compte en attente de validation */}
          {enAttente.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between"
                style={{ background: '#FFFBEB' }}>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock size={15} style={{ color: '#B45309' }} />
                  Demandes de comptes en attente ({enAttente.length})
                </h3>
                <span className="text-[11px] font-medium text-amber-700">
                  Ces utilisateurs ne peuvent pas se connecter tant que la demande n'est pas traitée.
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {enAttente.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{u.email}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {u.employeNom ?? '—'} · {ROLE_LABELS[u.role] ?? u.role} · demandé le{' '}
                        {u.dateCreation ? new Date(u.dateCreation).toLocaleDateString('fr-FR') : '—'}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => refuserCompte(u)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50"
                        style={{ color: '#991B1B', background: '#FEF2F2' }}>
                        <X size={11} className="inline mr-1" />Refuser
                      </button>
                      <button onClick={() => validerCompte(u)}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 flex items-center gap-1"
                        style={{ background: '#000000' }}>
                        <ShieldCheck size={12} /> Valider le compte
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Comptes utilisateurs ({utilisateurs.length})</h3>
              <button onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#000000' }}>
                <UserPlus size={13} /> Créer un compte
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Email', 'Employé lié', 'Rôle', 'Statut', 'Dernière connexion', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {utilisateurs.map((u) => {
                  const badge = badgeStatut(u.statut)
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs font-medium text-gray-900">{u.email}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{u.employeNom ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: u.role === 'COLLABORATEUR' ? '#F3F4F6' : u.role === 'ADMIN' ? '#FEF3C7' : '#DBEAFE', color: u.role === 'ADMIN' ? '#92400E' : '#1D4ED8' }}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{u.derniereConnexion ? new Date(u.derniereConnexion).toLocaleString('fr-FR') : '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditUser(u); setForm({ email: u.email, password: '', role: u.role, employeId: String(u.employeId ?? '') }); setShowUser(true) }}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Pencil size={11} /></button>
                          {u.statut === 'EN_ATTENTE' ? (
                            <>
                              <button onClick={() => refuserCompte(u)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg"
                                style={{ background: '#FEE2E2', color: '#991B1B' }}>Refuser</button>
                              <button onClick={() => validerCompte(u)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg"
                                style={{ background: '#000000' }}>Valider</button>
                            </>
                          ) : (
                            <button onClick={() => toggleStatut(u)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg"
                              style={{ background: u.statut === 'ACTIF' ? '#FEE2E2' : '#D1FAE5', color: u.statut === 'ACTIF' ? '#991B1B' : '#065F46' }}>
                              {u.statut === 'ACTIF' ? 'Désactiver' : 'Activer'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Journal d'audit ({audit.length})</h3>
            <button onClick={() => securiteApi.exportAudit().then(() => success('Journal exporté en Excel')).catch((e) => toastError(e.message))}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50">
              <Download size={12} /> Export Excel
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-[560px] overflow-y-auto">
            {audit.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucune activité enregistrée</div>
            ) : audit.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: a.action.includes('REFUS') || a.action.includes('DESACTIV') ? '#EF4444' : a.action.includes('VALIDATION') || a.action.includes('CONNEXION') ? '#10B981' : '#C9A227' }} />
                <div className="flex-1">
                  <div className="text-sm text-gray-700">{a.detail ?? a.action}</div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <span className="font-medium">{a.acteur ?? 'système'}</span> · {new Date(a.dateAction).toLocaleString('fr-FR')}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#F3F4F6', color: '#374151' }}>
                  <Clock size={9} className="inline mr-0.5" />{a.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal utilisateur */}
      {showUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editUser ? `Modifier — ${editUser.email}` : 'Créer un compte'}</h2>
              <button onClick={() => setShowUser(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <form onSubmit={submitUser} className="p-6 space-y-3">
              {!editUser && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                    <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mot de passe *</label>
                    <input type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Employé lié</label>
                    <select value={form.employeId} onChange={(e) => setForm((f) => ({ ...f, employeId: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                      <option value="">— Créer automatiquement la fiche employé —</option>
                      {employes.map((e) => <option key={e.id} value={e.id}>{e.nomComplet} ({e.departement ?? '—'})</option>)}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">Si aucun employé n'est choisi, une fiche employé est créée automatiquement (statistiques mises à jour).</p>
                  </div>
                </>
              )}
              {editUser && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rôle *</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUser(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: '#000000' }}>
                  {saving && <Loader2 size={13} className="animate-spin" />} Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
