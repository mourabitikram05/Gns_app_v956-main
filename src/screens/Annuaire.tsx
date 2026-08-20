import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  Search, Phone, Mail, MapPin, X, Plus, Pencil, Ban, ChevronLeft, ChevronRight,
  Save, UserCheck, Briefcase, CalendarDays, IdCard, FileDown
} from 'lucide-react'
import { annuaireApi, employeApi } from '../api/modules'
import type { EmployeDetail, EmployeListItem, IdLabel } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { avatarColor, ErrorBlock, fmtDate, Spinner, useToasts } from '../components/ui'
import { downloadEmployeePdf } from '../services/pdf'

interface EmployeFormState {
  matricule: string
  nom: string
  prenom: string
  email: string
  telephone: string
  bureau: string
  cin: string
  nationalite: string
  dateNaissance: string
  dateEmbauche: string
  departementId: string
  posteId: string
  equipeId: string
  responsableId: string
  statut: string
  missions: string
}

const EMPTY_FORM: EmployeFormState = {
  matricule: '', nom: '', prenom: '', email: '', telephone: '', bureau: '',
  cin: '', nationalite: 'Marocaine', dateNaissance: '', dateEmbauche: '',
  departementId: '', posteId: '', equipeId: '', responsableId: '', statut: 'ACTIF',
  missions: '',
}

export default function Annuaire() {
  const { isRh } = useAuth()
  const { success, error: toastError } = useToasts()

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [dept, setDept] = useState<string | null>(null)
  const [depts, setDepts] = useState<IdLabel[]>([])
  const [postes, setPostes] = useState<IdLabel[]>([])
  const [equipes, setEquipes] = useState<IdLabel[]>([])
  const [responsables, setResponsables] = useState<IdLabel[]>([])
  const [allCompetences, setAllCompetences] = useState<IdLabel[]>([])

  const [items, setItems] = useState<EmployeListItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [selected, setSelected] = useState<EmployeListItem | null>(null)
  const [detail, setDetail] = useState<EmployeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<EmployeFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showFullProfile, setShowFullProfile] = useState(false)
  const [showSkills, setShowSkills] = useState(false)
  const [skillSelection, setSkillSelection] = useState<Set<number>>(new Set())

  // ---------------- Recherche (debounce) ----------------
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // ---------------- Référentiels ----------------
  useEffect(() => {
    employeApi.departements().then(setDepts).catch(() => {})
    employeApi.postes().then(setPostes).catch(() => {})
    employeApi.equipes().then(setEquipes).catch(() => {})
    employeApi.competences().then(setAllCompetences).catch(() => {})
    annuaireApi.rechercher({ size: 100 })
      .then((res) => setResponsables(res.content.map((e) => ({ id: e.id, nom: e.nomComplet }))))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await annuaireApi.rechercher({
        q: debounced, departement: dept ?? undefined, page, size: 12,
      })
      setItems(result.content)
      setTotal(result.totalElements)
      setTotalPages(result.totalPages)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [debounced, dept, page])

  // Export PDF complet de l'annuaire (tous les collaborateurs, sans pagination)
  const [exportingPdf, setExportingPdf] = useState(false)
  const exporterPdf = async () => {
    setExportingPdf(true)
    try {
      const all = await annuaireApi.rechercher({ size: 10000, inactifs: true })
      downloadEmployeePdf(all.content)
      success(`Annuaire PDF téléchargé (${all.content.length} collaborateur(s))`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l\'export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  useEffect(() => {
    load()
  }, [load])

  // ---------------- Détail ----------------
  useEffect(() => {
    if (!selected) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    annuaireApi.detail(selected.id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selected])

  useEffect(() => {
    setPage(0)
  }, [debounced, dept])

  // ---------------- Actions RH ----------------
  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (emp: EmployeListItem) => {
    annuaireApi.detail(emp.id).then((d) => {
      setEditId(d.id)
      setForm({
        matricule: d.matricule, nom: d.nom, prenom: d.prenom, email: d.email,
        telephone: d.telephone ?? '', bureau: d.bureau ?? '', cin: d.cin ?? '',
        nationalite: d.nationalite ?? 'Marocaine',
        dateNaissance: d.dateNaissance ?? '', dateEmbauche: d.dateEmbauche ?? '',
        departementId: d.departementId ? String(d.departementId) : '',
        posteId: d.posteId ? String(d.posteId) : '',
        equipeId: d.equipeId ? String(d.equipeId) : '',
        responsableId: d.responsableId ? String(d.responsableId) : '',
        statut: d.statut,
        missions: (d.missions ?? []).join('\n'),
      })
      setShowForm(true)
    }).catch((e) => toastError(e.message))
  }

  const submitForm = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      matricule: form.matricule.trim(),
      cin: form.cin.trim() || null,
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim() || null,
      adresse: 'Casablanca, Maroc',
      dateNaissance: form.dateNaissance || null,
      dateEmbauche: form.dateEmbauche || null,
      statut: form.statut,
      bureau: form.bureau.trim() || null,
      nationalite: form.nationalite.trim() || null,
      departementId: Number(form.departementId),
      posteId: form.posteId ? Number(form.posteId) : null,
      equipeId: form.equipeId ? Number(form.equipeId) : null,
      responsableId: form.responsableId ? Number(form.responsableId) : null,
      competenceIds: [],
      missions: form.missions.split('\n').map((m) => m.trim()).filter(Boolean),
    }
    try {
      if (editId) {
        await annuaireApi.modifier(editId, payload)
        success('Collaborateur modifié')
      } else {
        await annuaireApi.creer(payload)
        success('Collaborateur créé')
      }
      setShowForm(false)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const desactiver = async (emp: EmployeListItem) => {
    if (!window.confirm(`Désactiver ${emp.nomComplet} ? Il ne sera plus visible dans l'annuaire.`)) return
    try {
      await annuaireApi.desactiver(emp.id)
      success('Collaborateur désactivé')
      setSelected(null)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const saveSkills = async () => {
    if (!detail) return
    try {
      await annuaireApi.ajouterCompetences(detail.id, [...skillSelection])
      success('Compétences mises à jour')
      setShowSkills(false)
      const refreshed = await annuaireApi.detail(detail.id)
      setDetail(refreshed)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const removeSkill = async (skillName: string) => {
    if (!detail) return
    const competence = allCompetences.find((c) => c.nom === skillName)
    if (!competence) return
    try {
      await annuaireApi.retirerCompetence(detail.id, competence.id)
      const refreshed = await annuaireApi.detail(detail.id)
      setDetail(refreshed)
      success('Compétence retirée')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const input = (key: keyof EmployeFormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Annuaire d'entreprise</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">{total} collaborateur(s)</div>
          <button
            onClick={exporterPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 transition-all hover:bg-gray-50 disabled:opacity-60"
            title="Exporter l'annuaire au format PDF"
          >
            <FileDown size={15} style={{ color: '#000000' }} /> {exportingPdf ? 'Génération...' : 'Exporter PDF'}
          </button>
          <button
            onClick={() => annuaireApi.exportExcel()
              .then(() => success('Export Excel téléchargé'))
              .catch((e) => toastError(e.message))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 transition-all hover:bg-gray-50"
          >
            <FileDown size={15} style={{ color: '#000000' }} /> Exporter Excel
          </button>
          {isRh && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: '#000000', boxShadow: '0 4px 12px -4px rgba(15,30,61,0.4)' }}
            >
              <Plus size={15} /> Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border border-gray-200 flex-1 max-w-md" style={{ background: '#F7F8FA' }}>
          <Search size={15} style={{ color: '#9CA3AF' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, poste, compétence..."
            className="bg-transparent text-sm outline-none flex-1" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button key="Tous" onClick={() => setDept(null)}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: dept === null ? '#000000' : '#fff',
              color: dept === null ? '#fff' : '#6B7280',
              border: `1px solid ${dept === null ? '#000000' : '#E5E7EB'}`,
            }}>
            Tous
          </button>
          {depts.map((d) => (
            <button key={d.id} onClick={() => setDept(dept === d.nom ? null : d.nom)}
              className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: dept === d.nom ? '#000000' : '#fff',
                color: dept === d.nom ? '#fff' : '#6B7280',
                border: `1px solid ${dept === d.nom ? '#000000' : '#E5E7EB'}`,
              }}>
              {d.nom}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <Spinner label="Chargement de l'annuaire..." />
      ) : loadError ? (
        <ErrorBlock message={loadError} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="text-center py-14 text-sm" style={{ color: '#9CA3AF' }}>
          Aucun collaborateur trouvé
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {items.map((emp) => (
            <div key={emp.id} onClick={() => setSelected(selected?.id === emp.id ? null : emp)}
              className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
              style={{ borderColor: selected?.id === emp.id ? '#000000' : '#E5E7EB' }}>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white mb-3"
                  style={{ background: avatarColor(emp.id) }}>
                  {emp.initiales}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{emp.nomComplet}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{emp.poste ?? '—'}</p>
                <span className="text-xs px-2 py-0.5 rounded-full mt-2 font-medium" style={{ background: '#F3F4F6', color: '#374151' }}>
                  {emp.departement ?? '—'}
                </span>
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone size={11} /> {emp.telephone ?? '—'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail size={11} /> <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={11} /> {emp.bureau ?? '—'}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {emp.competences.slice(0, 2).map((s, si) => (
                  <span key={si} className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm text-gray-600">Page {page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed right-0 top-16 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl z-30 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Fiche contact</h3>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <X size={15} style={{ color: '#9CA3AF' }} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <Spinner label="Chargement..." />
            ) : (
              <>
                <div className="text-center mb-5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3"
                    style={{ background: avatarColor(detail.id) }}>{detail.initiales}</div>
                  <h2 className="font-bold text-gray-900 text-lg">{detail.nomComplet}</h2>
                  <p className="text-sm text-gray-500">{detail.poste ?? '—'}</p>
                  <span className="text-xs px-2 py-1 rounded-full font-medium mt-1 inline-block" style={{ background: 'F3F4F6', color: '#000000' }}>
                    {detail.departement ?? '—'}
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: Phone, label: 'Téléphone', value: detail.telephone ?? '—' },
                    { icon: Mail, label: 'Email', value: detail.email },
                    { icon: MapPin, label: 'Bureau', value: detail.bureau ?? '—' },
                  ].map((item, i) => {
                    const Icon = item.icon
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: '#F7F8FA' }}>
                        <Icon size={14} style={{ color: '#6B7280' }} />
                        <div className="min-w-0">
                          <div className="text-xs text-gray-400">{item.label}</div>
                          <div className="text-sm text-gray-900 truncate">{item.value}</div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="p-2.5 rounded-lg" style={{ background: '#F7F8FA' }}>
                    <div className="text-xs text-gray-400 mb-1.5">Manager</div>
                    <div className="text-sm font-medium text-gray-900">{detail.manager ?? '—'}</div>
                  </div>
                  {detail.missions?.length > 0 && (
                    <div className="p-2.5 rounded-lg" style={{ background: '#F7F8FA' }}>
                      <div className="text-xs text-gray-400 mb-2">Missions</div>
                      <div className="space-y-1">
                        {detail.missions.map((m, mi) => (
                          <div key={mi} className="flex items-center gap-1.5 text-xs text-gray-700">
                            <span style={{ color: '#C9A227' }}>•</span> {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-2.5 rounded-lg" style={{ background: '#F7F8FA' }}>
                    <div className="text-xs text-gray-400 mb-2 flex items-center justify-between">
                      <span>Compétences</span>
                      {isRh && (
                        <button onClick={() => { setSkillSelection(new Set()); setShowSkills(true) }}
                          className="text-xs font-semibold hover:underline" style={{ color: '#C9A227' }}>
                          Gérer
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {detail.competences.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1"
                          style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                          {s}
                          {isRh && (
                            <button onClick={() => removeSkill(s)} className="hover:opacity-70">×</button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowFullProfile(true)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90" style={{ background: '#000000' }}>
                    Profil complet
                  </button>
                </div>
                {isRh && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => openEdit(selected)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1">
                      <Pencil size={11} /> Modifier
                    </button>
                    <button onClick={() => desactiver(selected)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 flex items-center justify-center gap-1"
                      style={{ background: '#B91C1C' }}>
                      <Ban size={11} /> Désactiver
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal formulaire employé */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">{editId ? 'Modifier le collaborateur' : 'Ajouter un collaborateur'}</h2>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitForm} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Matricule *</label>
                  <input {...input('matricule')} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">CIN</label>
                  <input {...input('cin')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nom *</label>
                  <input {...input('nom')} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prénom *</label>
                  <input {...input('prenom')} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                  <input {...input('email')} type="email" required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone</label>
                  <input {...input('telephone')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Bureau</label>
                  <input {...input('bureau')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Département *</label>
                  <select {...input('departementId')} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400">
                    <option value="">— Choisir —</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Poste</label>
                  <select {...input('posteId')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400">
                    <option value="">— Choisir —</option>
                    {postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Équipe</label>
                  <select {...input('equipeId')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400">
                    <option value="">— Choisir —</option>
                    {equipes.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable</label>
                  <select {...input('responsableId')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400">
                    <option value="">— Choisir —</option>
                    {responsables.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date naissance</label>
                  <input {...input('dateNaissance')} type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date embauche</label>
                  <input {...input('dateEmbauche')} type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nationalité</label>
                  <input {...input('nationalite')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Missions (une par ligne)</label>
                  <textarea value={form.missions} rows={3}
                    onChange={(e) => setForm((f) => ({ ...f, missions: e.target.value }))}
                    placeholder={'Ex. Supervision équipe support\nVeille technologique'}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Statut</label>
                  <select {...input('statut')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400">
                    <option value="ACTIF">Actif</option>
                    <option value="INACTIF">Inactif</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#000000' }}>
                  <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal profil complet */}
      {showFullProfile && detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Profil complet</h2>
              <button onClick={() => setShowFullProfile(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { icon: IdCard, label: 'Matricule', value: detail.matricule },
                { icon: IdCard, label: 'CIN', value: detail.cin ?? '—' },
                { icon: CalendarDays, label: 'Date de naissance', value: fmtDate(detail.dateNaissance) },
                { icon: UserCheck, label: 'Sexe', value: detail.sexe ?? '—' },
                { icon: UserCheck, label: 'Nationalité', value: detail.nationalite ?? '—' },
                { icon: Briefcase, label: 'Date d\'embauche', value: fmtDate(detail.dateEmbauche) },
                { icon: Briefcase, label: 'Équipe', value: detail.equipe ?? '—' },
                { icon: UserCheck, label: 'Statut', value: detail.statut === 'ACTIF' ? 'Actif' : 'Inactif' },
              ].map((row, i) => {
                const Icon = row.icon
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: '#F7F8FA' }}>
                    <Icon size={14} style={{ color: '#6B7280' }} />
                    <div className="flex-1">
                      <div className="text-xs text-gray-400">{row.label}</div>
                      <div className="text-sm text-gray-900 font-medium">{row.value}</div>
                    </div>
                  </div>
                )
              })}
              <button onClick={() => setShowFullProfile(false)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: '#000000' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestion compétences */}
      {showSkills && detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Compétences — {detail.nomComplet}</h2>
              <button onClick={() => setShowSkills(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto">
                {allCompetences.map((c) => {
                  const checked = skillSelection.has(c.id) || detail.competences.includes(c.nom)
                  return (
                    <button
                      key={c.id}
                      disabled={detail.competences.includes(c.nom)}
                      onClick={() => setSkillSelection((prev) => {
                        const next = new Set(prev)
                        if (next.has(c.id)) next.delete(c.id)
                        else next.add(c.id)
                        return next
                      })}
                      className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-50"
                      style={{
                        background: checked ? '#000000' : '#F3F4F6',
                        color: checked ? '#fff' : '#374151',
                        border: `1px solid ${checked ? '#000000' : '#E5E7EB'}`,
                      }}>
                      {c.nom}
                    </button>
                  )
                })}
              </div>
              <button onClick={saveSkills}
                className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: '#000000' }}>
                Enregistrer les compétences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
