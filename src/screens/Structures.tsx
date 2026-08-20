import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2, Users, Plus, Search, Pencil, Trash2, X, Loader2, Layers,
  UserRound, Hash, CheckCircle2, AlertTriangle, FileDown,
} from 'lucide-react'
import { structuresApi, type DepartementItem, type EquipeItem } from '../api/modules'
import { ErrorBlock, Pagination, Spinner, useToasts } from '../components/ui'
import { downloadStructurePdf } from '../services/pdf'

const PAGE_SIZE = 8

type Onglet = 'departements' | 'equipes'

interface ModalEtat {
  mode: 'creer' | 'modifier'
  id: number | null
  nom: string
  description: string
  departementId: number | null
}

export default function Structures() {
  const { success, error: toastError } = useToasts()

  const [onglet, setOnglet] = useState<Onglet>('departements')
  const [departements, setDepartements] = useState<DepartementItem[]>([])
  const [equipes, setEquipes] = useState<EquipeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<ModalEtat | null>(null)
  const [saving, setSaving] = useState(false)
  const [suppression, setSuppression] = useState<{ type: Onglet; id: number; nom: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [d, e] = await Promise.all([structuresApi.departements(), structuresApi.equipes()])
      setDepartements(d)
      setEquipes(e)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [search, onglet])

  const filtrees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (onglet === 'departements') {
      return departements.filter((d) => !q
        || d.nom.toLowerCase().includes(q)
        || (d.description ?? '').toLowerCase().includes(q))
    }
    return equipes.filter((e) => !q
      || e.nom.toLowerCase().includes(q)
      || (e.departementNom ?? '').toLowerCase().includes(q))
  }, [onglet, departements, equipes, search])

  const totalPages = Math.max(1, Math.ceil(filtrees.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtrees.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const lignesDepartements = (onglet === 'departements' ? pageRows : []) as DepartementItem[]
  const lignesEquipes = (onglet === 'equipes' ? pageRows : []) as EquipeItem[]

  const ouvrirCreation = (type: Onglet) => {
    setModal({ mode: 'creer', id: null, nom: '', description: '', departementId: null })
  }

  const ouvrirModification = (type: Onglet, item: DepartementItem | EquipeItem) => {
    setModal({
      mode: 'modifier',
      id: item.id,
      nom: item.nom,
      description: item.description ?? '',
      departementId: 'departementId' in item ? item.departementId : null,
    })
  }

  const submit = async () => {
    if (!modal || !modal.nom.trim()) {
      toastError('Le nom est obligatoire')
      return
    }
    setSaving(true)
    try {
      if (onglet === 'departements') {
        if (modal.mode === 'creer') {
          await structuresApi.creerDepartement(modal.nom.trim(), modal.description.trim())
          success('Département créé')
        } else if (modal.id != null) {
          await structuresApi.modifierDepartement(modal.id, modal.nom.trim(), modal.description.trim())
          success('Département modifié')
        }
      } else if (modal.mode === 'creer') {
        await structuresApi.creerEquipe(modal.nom.trim(), modal.description.trim(), modal.departementId)
        success('Équipe créée')
      } else if (modal.id != null) {
        await structuresApi.modifierEquipe(modal.id, modal.nom.trim(), modal.description.trim(), modal.departementId)
        success('Équipe modifiée')
      }
      setModal(null)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const confirmerSuppression = async () => {
    if (!suppression) return
    setSaving(true)
    try {
      if (suppression.type === 'departements') {
        await structuresApi.supprimerDepartement(suppression.id)
        success('Département supprimé')
      } else {
        await structuresApi.supprimerEquipe(suppression.id)
        success('Équipe supprimée')
      }
      setSuppression(null)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const ongletInfo = onglet === 'departements'
    ? { titre: 'Départements', total: departements.length, totalEmployes: departements.reduce((s, d) => s + d.nbEmployes, 0) }
    : { titre: 'Équipes', total: equipes.length, totalEmployes: equipes.reduce((s, e) => s + e.nbEmployes, 0) }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Structures RH</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les départements et les équipes de l'entreprise.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              try {
                downloadStructurePdf(departements, equipes)
                success('Structures RH exportées en PDF')
              } catch (err) {
                toastError(err instanceof Error ? err.message : 'Erreur lors de l\'export PDF')
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
            title="Exporter les départements et équipes au format PDF"
          >
            <FileDown size={15} style={{ color: '#000000' }} /> Exporter PDF
          </button>
          <button
            onClick={() => ouvrirCreation(onglet)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
            style={{ background: '#000000', boxShadow: '0 4px 12px -4px rgba(15,30,61,0.4)' }}
          >
            <Plus size={16} />
            {onglet === 'departements' ? 'Ajouter un département' : 'Ajouter une équipe'}
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="Chargement des structures..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <>
          {/* Onglets */}
          <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-1.5 w-fit shadow-sm">
            {([{ key: 'departements', label: 'Départements', icon: Building2 },
              { key: 'equipes', label: 'Équipes', icon: Layers }] as const).map((o) => {
              const actif = onglet === o.key
              const Icon = o.icon
              return (
                <button key={o.key} onClick={() => setOnglet(o.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    actif ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                  style={actif ? { background: '#000000' } : undefined}>
                  <Icon size={15} />
                  {o.label}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${actif ? 'text-white/90' : 'text-gray-400'}`}
                    style={actif ? { background: 'rgba(255,255,255,0.15)' } : { background: '#F3F4F6' }}>
                    {o.key === 'departements' ? departements.length : equipes.length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Indicateurs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
                {onglet === 'departements' ? <Building2 size={20} style={{ color: '#000000' }} /> : <Layers size={20} style={{ color: '#000000' }} />}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{ongletInfo.total}</div>
                <div className="text-xs text-gray-500 mt-1">{ongletInfo.titre} au total</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FFFBEB' }}>
                <Users size={20} style={{ color: '#B45309' }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{ongletInfo.totalEmployes}</div>
                <div className="text-xs text-gray-500 mt-1">Employés rattachés</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ECFDF5' }}>
                <CheckCircle2 size={20} style={{ color: '#047857' }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">
                  {onglet === 'departements'
                    ? departements.filter((d) => d.nbEmployes > 0).length
                    : equipes.filter((e) => e.nbEmployes > 0).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">{ongletInfo.titre} actifs</div>
              </div>
            </div>
          </div>

          {/* Tableau */}
          <section className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                {onglet === 'departements' ? <Building2 size={15} style={{ color: '#000000' }} /> : <Layers size={15} style={{ color: '#000000' }} />}
              </span>
              <h2 className="font-semibold text-gray-900">Liste des {ongletInfo.titre.toLowerCase()}</h2>
              <span className="text-xs text-gray-400 ml-auto hidden sm:block">{filtrees.length} élément{filtrees.length > 1 ? 's' : ''}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2.5 flex-1 sm:max-w-xs rounded-lg border border-gray-200 px-3 py-2 bg-gray-50/60 focus-within:border-gray-300 focus-within:bg-white transition-colors">
                <Search size={15} style={{ color: '#9CA3AF' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={onglet === 'departements' ? 'Nom, description...' : 'Nom, département...'}
                  className="bg-transparent text-sm outline-none flex-1 placeholder-gray-400 min-w-0" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: '#FAFAFB' }}>
                    {onglet === 'departements'
                      ? ['Nom', 'Description', 'Employés', 'Équipes', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                      ))
                      : ['Nom', 'Département', 'Description', 'Employés', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: '#F3F4F6' }}>
                            <Search size={20} style={{ color: '#9CA3AF' }} />
                          </div>
                          <p className="text-sm text-gray-500">Aucun élément ne correspond à votre recherche.</p>
                        </div>
                      </td>
                    </tr>
                  ) : onglet === 'departements' ? (
                    lignesDepartements.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F0F4FF' }}>
                              <Building2 size={15} style={{ color: '#000000' }} />
                            </span>
                            <span className="text-xs font-semibold text-gray-900">{d.nom}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[260px] truncate">{d.description || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: d.nbEmployes > 0 ? '#ECFDF5' : '#F3F4F6', color: d.nbEmployes > 0 ? '#047857' : '#6B7280' }}>
                            <UserRound size={12} /> {d.nbEmployes}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">{d.nbEquipes}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => ouvrirModification('departements', d)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                              title="Modifier">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setSuppression({ type: 'departements', id: d.id, nom: d.nom })}
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                              title="Supprimer">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    lignesEquipes.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F0F4FF' }}>
                              <Layers size={15} style={{ color: '#000000' }} />
                            </span>
                            <span className="text-xs font-semibold text-gray-900">{e.nom}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {e.departementNom ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                              style={{ background: '#FFFBEB', color: '#B45309' }}>
                              <Building2 size={12} /> {e.departementNom}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[260px] truncate">{e.description || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: e.nbEmployes > 0 ? '#ECFDF5' : '#F3F4F6', color: e.nbEmployes > 0 ? '#047857' : '#6B7280' }}>
                            <UserRound size={12} /> {e.nbEmployes}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => ouvrirModification('equipes', e)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                              title="Modifier">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setSuppression({ type: 'equipes', id: e.id, nom: e.nom })}
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                              title="Supprimer">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={safePage} totalPages={totalPages} onChange={setPage} totalItems={filtrees.length}
              itemLabel={(from, to) => `${from}–${to} sur ${filtrees.length}`} />
          </section>
        </>
      )}

      {/* Modal — création / modification */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease]" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[modalIn_0.2s_ease-out] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F0F4FF' }}>
                  {onglet === 'departements' ? <Building2 size={17} style={{ color: '#000000' }} /> : <Layers size={17} style={{ color: '#000000' }} />}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 leading-tight">
                    {modal.mode === 'creer' ? `Ajouter un ${onglet === 'departements' ? 'département' : 'une équipe'}` : `Modifier ${onglet === 'departements' ? 'le département' : 'l\'équipe'}`}
                  </h3>
                  <p className="text-xs text-gray-500">{onglet === 'departements' ? 'Département de l\'organisation' : 'Équipe de travail rattachée à un département'}</p>
                </div>
              </div>
              <button onClick={() => setModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Nom <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100 transition-all">
                  <Hash size={14} style={{ color: '#9CA3AF' }} />
                  <input value={modal.nom} onChange={(e) => setModal({ ...modal, nom: e.target.value })}
                    placeholder={onglet === 'departements' ? 'ex. Ressources Humaines' : 'ex. Équipe Support'}
                    className="text-sm outline-none flex-1 placeholder-gray-400 bg-transparent" autoFocus />
                </div>
              </div>

              {onglet === 'equipes' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Département de rattachement</label>
                  <select
                    value={modal.departementId ?? ''}
                    onChange={(e) => setModal({ ...modal, departementId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all">
                    <option value="">— Aucun —</option>
                    {departements.map((d) => (
                      <option key={d.id} value={d.id}>{d.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Description <span className="font-normal text-gray-400">(optionnel)</span></label>
                <textarea value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} rows={3}
                  placeholder="Rôle, missions..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none resize-none placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={submit} disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#000000', boxShadow: '0 4px 12px -4px rgba(15,30,61,0.4)' }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {modal.mode === 'creer' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — confirmation de suppression */}
      {suppression && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease]" onClick={() => setSuppression(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[modalIn_0.2s_ease-out] overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FEF2F2' }}>
                  <AlertTriangle size={18} style={{ color: '#B91C1C' }} />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">Supprimer {onglet === 'departements' ? 'le département' : 'l\'équipe'}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Voulez-vous vraiment supprimer <strong>{suppression.nom}</strong> ?
                    Cette action est irréversible.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSuppression(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={confirmerSuppression} disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#B91C1C', boxShadow: '0 4px 12px -4px rgba(185,28,28,0.4)' }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
