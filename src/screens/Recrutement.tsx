import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Plus, X, Download, CalendarClock, Star, GripVertical, UserCheck, FileDown, Search,
  Pencil, Trash2, Eye, Users, KanbanSquare, CheckCircle2, Lock,
} from 'lucide-react'
import { recrutementApi } from '../api/modules'
import type { CandidatItem, Candidature, OffreEmploi } from '../api/types'
import { ErrorBlock, Spinner, useToasts } from '../components/ui'
import {
  downloadCandidatsPdf, downloadOffresPdf, downloadRecrutementPdf,
} from '../services/pdf'

const COLUMNS: { key: Candidature['etape']; label: string; color: string }[] = [
  { key: 'BOITE_RECEPTION', label: 'Boîte réception', color: '#0F1E3D' },
  { key: 'BROUILLON', label: 'Brouillon', color: '#6B7280' },
  { key: 'ENTRETIEN_TEL', label: 'Entretien tél.', color: '#F59E0B' },
  { key: 'ENTRETIEN_PHYSIQUE', label: 'Entretien physique', color: '#C9A227' },
  { key: 'EMBAUCHE', label: 'Embauché', color: '#10B981' },
]

export default function Recrutement() {
  const { success, error: toastError } = useToasts()

  const [tab, setTab] = useState<'kanban' | 'candidats'>('kanban')
  const [offres, setOffres] = useState<OffreEmploi[]>([])
  const [candidats, setCandidats] = useState<CandidatItem[]>([])
  const [offreId, setOffreId] = useState<number | null>(null)
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCandidats, setLoadingCandidats] = useState(false)
  const [error, setError] = useState('')
  const [showOffre, setShowOffre] = useState(false)
  const [showCandidat, setShowCandidat] = useState(false)
  const [detail, setDetail] = useState<Candidature | null>(null)
  const [dragId, setDragId] = useState<number | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [editingOffre, setEditingOffre] = useState<OffreEmploi | null>(null)
  const [editingCandidat, setEditingCandidat] = useState<CandidatItem | null>(null)
  const [offreSearch, setOffreSearch] = useState('')
  const [candSearch, setCandSearch] = useState('')
  const [kanbanSearch, setKanbanSearch] = useState('')

  // Formulaire offre
  const [offreForm, setOffreForm] = useState({ titre: '', departement: '', typeContrat: 'CDI', niveau: '', mode: 'HYBRIDE' })
  // Formulaire candidat
  const [candForm, setCandForm] = useState({ offreId: '', nom: '', prenom: '', email: '', telephone: '', linkedin: '' })
  const [cv, setCv] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const loadOffres = useCallback(async () => {
    try {
      const list = await recrutementApi.offres()
      setOffres(list)
      setOffreId((current) => {
        if (current && list.some((o) => o.id === current)) return current
        return list.length > 0 ? list[0].id : null
      })
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadOffres()
  }, [loadOffres])

  const loadCandidatures = useCallback(async (oid: number) => {
    setLoading(true)
    setError('')
    try {
      setCandidatures(await recrutementApi.candidatures(oid))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (offreId) loadCandidatures(offreId)
  }, [offreId, loadCandidatures])

  const loadCandidats = useCallback(async () => {
    setLoadingCandidats(true)
    try {
      setCandidats(await recrutementApi.candidats())
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur de chargement des candidats')
    } finally {
      setLoadingCandidats(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'candidats') loadCandidats()
  }, [tab, loadCandidats])

  // ------------------------- Filtres / recherche -------------------------
  const offresFiltrees = useMemo(() => {
    const q = offreSearch.trim().toLowerCase()
    if (!q) return offres
    return offres.filter((o) =>
      [o.titre, o.departement, o.typeContrat, o.niveau].some((v) => v?.toLowerCase().includes(q)))
  }, [offres, offreSearch])

  const candidatsFiltres = useMemo(() => {
    const q = candSearch.trim().toLowerCase()
    if (!q) return candidats
    return candidats.filter((k) =>
      [k.nomComplet, k.email, k.telephone, k.offres].some((v) => v?.toLowerCase().includes(q)))
  }, [candidats, candSearch])

  const candidaturesFiltrees = useMemo(() => {
    const q = kanbanSearch.trim().toLowerCase()
    if (!q) return candidatures
    return candidatures.filter((c) =>
      [c.nomComplet, c.email, c.offreTitre].some((v) => v?.toLowerCase().includes(q)))
  }, [candidatures, kanbanSearch])

  const byColumn = (key: string) => candidaturesFiltrees.filter((c) => c.etape === key)

  // ------------------------- Kanban -------------------------
  const dropOn = async (etape: Candidature['etape']) => {
    if (dragId == null) return
    try {
      const updated = await recrutementApi.changerEtape(dragId, etape)
      setCandidatures((prev) => prev.map((c) => (c.id === dragId ? updated : c)))
      if (detail?.id === dragId) setDetail(updated)
      success('Étape mise à jour (persistée)')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setDragId(null)
    }
  }

  // ------------------------- Offres -------------------------
  const ouvrirCreationOffre = () => {
    setEditingOffre(null)
    setOffreForm({ titre: '', departement: '', typeContrat: 'CDI', niveau: '', mode: 'HYBRIDE' })
    setShowOffre(true)
  }

  const ouvrirEditionOffre = (o: OffreEmploi) => {
    setEditingOffre(o)
    setOffreForm({
      titre: o.titre, departement: o.departement ?? '', typeContrat: o.typeContrat ?? 'CDI',
      niveau: o.niveau ?? '', mode: o.mode ?? 'HYBRIDE',
    })
    setShowOffre(true)
  }

  const submitOffre = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingOffre) {
        await recrutementApi.modifierOffre(editingOffre.id, { ...offreForm, statut: editingOffre.statut })
        success('Offre modifiée')
      } else {
        await recrutementApi.publierOffre({ ...offreForm, statut: 'OUVERTE' })
        success('Offre publiée')
      }
      setShowOffre(false)
      setEditingOffre(null)
      setOffreForm({ titre: '', departement: '', typeContrat: 'CDI', niveau: '', mode: 'HYBRIDE' })
      await loadOffres()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const changerStatutOffre = async (o: OffreEmploi) => {
    const nouveau = o.statut === 'CLOTUREE' ? 'OUVERTE' : 'CLOTUREE'
    if (!window.confirm(`${nouveau === 'CLOTUREE' ? 'Clôturer' : 'Réouvrir'} l'offre « ${o.titre} » ?`)) return
    try {
      const updated = await recrutementApi.changerStatutOffre(o.id, nouveau)
      setOffres((prev) => prev.map((x) => (x.id === o.id ? updated : x)))
      success(`Offre ${nouveau === 'CLOTUREE' ? 'clôturée' : 'réouverte'}`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const supprimerOffre = async (o: OffreEmploi) => {
    if (!window.confirm(`Supprimer l'offre « ${o.titre} » et toutes ses candidatures ? Cette action est irréversible.`)) return
    try {
      await recrutementApi.supprimerOffre(o.id)
      success('Offre supprimée')
      if (offreId === o.id) setOffreId(null)
      await loadOffres()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  // ------------------------- Candidats -------------------------
  const submitCandidat = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await recrutementApi.ajouterCandidat({ ...candForm, offreId: Number(candForm.offreId) }, cv)
      success('Candidature enregistrée')
      setShowCandidat(false)
      setCandForm({ offreId: String(offreId ?? ''), nom: '', prenom: '', email: '', telephone: '', linkedin: '' })
      setCv(null)
      if (offreId) await loadCandidatures(offreId)
      await loadOffres()
      if (tab === 'candidats') await loadCandidats()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const submitCandidatEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingCandidat) return
    setSaving(true)
    try {
      const updated = await recrutementApi.modifierCandidat(editingCandidat.id, {
        nom: candForm.nom, prenom: candForm.prenom, email: candForm.email,
        telephone: candForm.telephone, linkedin: candForm.linkedin,
      })
      setCandidats((prev) => prev.map((k) => (k.id === updated.id ? updated : k)))
      success('Candidat modifié')
      setEditingCandidat(null)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const ouvrirEditionCandidat = (k: CandidatItem) => {
    setEditingCandidat(k)
    setCandForm({
      offreId: String(offreId ?? ''), nom: k.nom, prenom: k.prenom, email: k.email,
      telephone: k.telephone ?? '', linkedin: k.linkedin ?? '',
    })
  }

  const supprimerCandidat = async (k: CandidatItem) => {
    if (!window.confirm(`Supprimer le candidat « ${k.nomComplet} » et toutes ses candidatures ?`)) return
    try {
      await recrutementApi.supprimerCandidat(k.id)
      success('Candidat supprimé')
      setCandidats((prev) => prev.filter((x) => x.id !== k.id))
      if (offreId) await loadCandidatures(offreId)
      await loadOffres()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const supprimerCandidature = async (c: Candidature) => {
    if (!window.confirm(`Supprimer la candidature de ${c.nomComplet} pour « ${c.offreTitre} » ?`)) return
    try {
      await recrutementApi.supprimerCandidature(c.id)
      success('Candidature supprimée')
      setDetail(null)
      setCandidatures((prev) => prev.filter((x) => x.id !== c.id))
      await loadOffres()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  // ------------------------- Actions candidature -------------------------
  const planifierEntretien = async (c: Candidature) => {
    const str = window.prompt('Date et heure de l\'entretien (format : 2026-09-01T10:00) :')
    if (!str) return
    try {
      const updated = await recrutementApi.planifierEntretien(c.id, str)
      setCandidatures((prev) => prev.map((x) => (x.id === c.id ? updated : x)))
      setDetail(updated)
      success('Entretien planifié — recruteurs notifiés')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const embaucher = async (c: Candidature) => {
    if (!window.confirm(`Embaucher ${c.nomComplet} ? Une fiche employé sera créée dans le Core RH.`)) return
    try {
      const updated = await recrutementApi.embaucher(c.id)
      setCandidatures((prev) => prev.map((x) => (x.id === c.id ? updated : x)))
      setDetail(updated)
      success('Candidat embauché — fiche employé créée')
      loadOffres()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  // ------------------------- Exports -------------------------
  const exporterPdf = async () => {
    setExportingPdf(true)
    try {
      const offre = offres.find((o) => o.id === offreId)
      downloadRecrutementPdf(offres, candidatures, offre?.titre)
      success('Rapport de recrutement exporté en PDF')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l\'export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const exporterOffresPdf = () => {
    try {
      downloadOffresPdf(offresFiltrees)
      success('Offres d\'emploi exportées en PDF')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const exporterCandidatsPdf = () => {
    try {
      downloadCandidatsPdf(candidatsFiltres)
      success('Candidats exportés en PDF')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const downloadCv = (c: Candidature) => {
    if (!c.cvNom) return
    recrutementApi.cv(c.cvNom)
      .then(() => success('CV téléchargé'))
      .catch((e) => toastError(e.message))
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Recrutement</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exporterPdf} disabled={exportingPdf}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
            title="Exporter le rapport de recrutement (offres + candidatures) au format PDF">
            <FileDown size={14} style={{ color: '#0F1E3D' }} /> {exportingPdf ? 'Génération...' : 'Rapport PDF'}
          </button>
          <button onClick={() => recrutementApi.exporterCandidatures()
            .then(() => success('Export Excel téléchargé'))
            .catch((e) => toastError(e.message))}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={14} style={{ color: '#0F1E3D' }} /> Export Excel
          </button>
          <button onClick={() => setShowCandidat(true)} disabled={!offreId}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <Plus size={14} /> Ajouter un candidat
          </button>
          <button onClick={ouvrirCreationOffre}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#0F1E3D' }}>
            + Publier une offre
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        <button onClick={() => setTab('kanban')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'kanban' ? 'border-[#0F1E3D] text-[#0F1E3D]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <KanbanSquare size={15} /> Kanban
        </button>
        <button onClick={() => setTab('candidats')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'candidats' ? 'border-[#0F1E3D] text-[#0F1E3D]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Users size={15} /> Candidats ({candidats.length})
        </button>
      </div>

      {/* Panneau des offres */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-gray-900">Offres d'emploi ({offresFiltrees.length})</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={offreSearch} onChange={(e) => setOffreSearch(e.target.value)}
                placeholder="Rechercher une offre..." className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none w-56" />
            </div>
            <button onClick={exporterOffresPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50"
              title="Exporter les offres d'emploi en PDF">
              <FileDown size={13} style={{ color: '#0F1E3D' }} /> PDF
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
          {offresFiltrees.length === 0 && (
            <div className="col-span-full text-center py-6 text-sm" style={{ color: '#9CA3AF' }}>
              Aucune offre{offreSearch ? ' pour cette recherche' : ' — publiez votre première offre'}
            </div>
          )}
          {offresFiltrees.map((o) => {
            const ouverte = o.statut !== 'CLOTUREE'
            const selected = offreId === o.id
            return (
              <div key={o.id}
                className={`rounded-xl border p-3.5 transition-all ${selected ? 'ring-2 ring-[#0F1E3D]/20 border-[#0F1E3D]/40' : 'border-gray-100 hover:shadow-md'}`}
                style={{ background: selected ? '#F7F8FA' : '#fff' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button onClick={() => { setOffreId(o.id); setTab('kanban') }}
                      className="text-sm font-semibold text-gray-900 hover:underline text-left">{o.titre}</button>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {[o.departement, o.typeContrat, o.niveau, o.mode].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${ouverte ? '' : ''}`}
                    style={ouverte
                      ? { background: '#D1FAE5', color: '#065F46' }
                      : { background: '#F3F4F6', color: '#6B7280' }}>
                    {ouverte ? 'Ouverte' : 'Clôturée'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-gray-500">
                    <strong className="text-gray-800">{o.totalCandidatures}</strong> candidature(s)
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setOffreId(o.id); setTab('kanban') }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100" title="Voir le kanban"
                      style={{ color: '#0F1E3D' }}><Eye size={13} /></button>
                    <button onClick={() => ouvrirEditionOffre(o)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100" title="Modifier"
                      style={{ color: '#C9A227' }}><Pencil size={13} /></button>
                    <button onClick={() => changerStatutOffre(o)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100" title={ouverte ? 'Clôturer' : 'Réouvrir'}
                      style={{ color: '#6366F1' }}>{ouverte ? <Lock size={13} /> : <CheckCircle2 size={13} />}</button>
                    <button onClick={() => supprimerOffre(o)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50" title="Supprimer"
                      style={{ color: '#EF4444' }}><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {tab === 'kanban' ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">Offre :</label>
              <select value={offreId ?? ''} onChange={(e) => setOffreId(Number(e.target.value))}
                className="text-sm rounded-lg border border-gray-200 px-3 py-2 outline-none max-w-xs">
                {offres.map((o) => <option key={o.id} value={o.id}>{o.titre} ({o.totalCandidatures})</option>)}
              </select>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={kanbanSearch} onChange={(e) => setKanbanSearch(e.target.value)}
                placeholder="Rechercher un candidat..." className="pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none w-64" />
            </div>
          </div>

          {loading ? (
            <Spinner label="Chargement des candidatures..." />
          ) : error ? (
            <ErrorBlock message={error} onRetry={() => offreId && loadCandidatures(offreId)} />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {COLUMNS.map((col) => {
                const items = byColumn(col.key)
                const offre = offres.find((o) => o.id === offreId)
                const count = offre?.candidaturesParEtape?.[col.key] ?? items.length
                return (
                  <div key={col.key} className="flex-1 min-w-[220px] bg-gray-50 rounded-xl p-3 border border-gray-100"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(col.key)}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: col.color }}>
                        {col.label}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: col.color + '18', color: col.color }}>{count}</span>
                    </div>
                    <div className="space-y-2 min-h-[80px]">
                      {items.map((c) => (
                        <div key={c.id} draggable onDragStart={() => setDragId(c.id)}
                          onClick={() => setDetail(c)}
                          className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          style={{ borderLeft: `3px solid ${col.color}` }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-[#0F1E3D] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {c.initiales}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-gray-900 truncate">{c.nomComplet}</div>
                              <div className="text-[10px] text-gray-400 truncate">{c.email}</div>
                            </div>
                            <GripVertical size={12} className="ml-auto text-gray-300 flex-shrink-0" />
                          </div>
                          {c.dateEntretien && (
                            <div className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#F59E0B' }}>
                              <CalendarClock size={10} /> {new Date(c.dateEntretien).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div className="text-center text-[10px] text-gray-300 py-6 border border-dashed border-gray-200 rounded-lg">Glissez une carte ici</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={candSearch} onChange={(e) => setCandSearch(e.target.value)}
                placeholder="Rechercher un candidat (nom, email, offre)..." className="pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none w-80" />
            </div>
            <button onClick={exporterCandidatsPdf}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50"
              title="Exporter les candidats en PDF">
              <FileDown size={13} style={{ color: '#0F1E3D' }} /> Exporter PDF
            </button>
          </div>

          {loadingCandidats ? (
            <Spinner label="Chargement des candidats..." />
          ) : candidatsFiltres.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 py-14 text-center text-sm" style={{ color: '#9CA3AF' }}>
              Aucun candidat enregistré
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100" style={{ background: '#F7F8FA' }}>
                    <th className="px-4 py-3 font-semibold">Candidat</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Téléphone</th>
                    <th className="px-4 py-3 font-semibold">Offres postulées</th>
                    <th className="px-4 py-3 font-semibold text-center">Candidatures</th>
                    <th className="px-4 py-3 font-semibold text-center">CV</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {candidatsFiltres.map((k) => (
                    <tr key={k.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0F1E3D] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {k.initiales}
                          </div>
                          <span className="font-medium text-gray-900">{k.nomComplet}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{k.email}</td>
                      <td className="px-4 py-3 text-gray-600">{k.telephone ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{k.offres || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-xs font-bold rounded-full"
                          style={{ background: '#0F1E3D14', color: '#0F1E3D' }}>{k.nbCandidatures}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {k.cvDisponible
                          ? <span className="text-xs font-semibold text-emerald-600">Oui</span>
                          : <span className="text-xs text-gray-300">Non</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => ouvrirEditionCandidat(k)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100" title="Modifier"
                            style={{ color: '#C9A227' }}><Pencil size={13} /></button>
                          <button onClick={() => supprimerCandidat(k)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50" title="Supprimer"
                            style={{ color: '#EF4444' }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal publier / modifier offre */}
      {showOffre && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingOffre ? `Modifier l'offre — ${editingOffre.titre}` : "Publier une offre d'emploi"}</h2>
              <button onClick={() => { setShowOffre(false); setEditingOffre(null) }} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <form onSubmit={submitOffre} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Titre *</label>
                <input required value={offreForm.titre} onChange={(e) => setOffreForm((f) => ({ ...f, titre: e.target.value }))}
                  placeholder="Ex. Développeur Full-Stack" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Département</label>
                  <input value={offreForm.departement} onChange={(e) => setOffreForm((f) => ({ ...f, departement: e.target.value }))}
                    placeholder="Tech" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type de contrat</label>
                  <select value={offreForm.typeContrat} onChange={(e) => setOffreForm((f) => ({ ...f, typeContrat: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {['CDI', 'CDD', 'Stage', 'Freelance'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Niveau d'expérience</label>
                  <input value={offreForm.niveau} onChange={(e) => setOffreForm((f) => ({ ...f, niveau: e.target.value }))}
                    placeholder="Confirmé" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mode de travail</label>
                  <select value={offreForm.mode} onChange={(e) => setOffreForm((f) => ({ ...f, mode: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {['HYBRIDE', 'REMOTE', 'SUR_PLACE'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowOffre(false); setEditingOffre(null) }} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ background: '#0F1E3D' }}>
                  {saving ? 'Enregistrement...' : (editingOffre ? 'Enregistrer' : 'Publier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajouter candidat (création candidature) */}
      {showCandidat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Ajouter un candidat</h2>
              <button onClick={() => setShowCandidat(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <form onSubmit={submitCandidat} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Offre *</label>
                <select required value={candForm.offreId || String(offreId ?? '')} onChange={(e) => setCandForm((f) => ({ ...f, offreId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                  {offres.map((o) => <option key={o.id} value={o.id}>{o.titre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nom *</label>
                  <input required value={candForm.nom} onChange={(e) => setCandForm((f) => ({ ...f, nom: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prénom *</label>
                  <input required value={candForm.prenom} onChange={(e) => setCandForm((f) => ({ ...f, prenom: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                <input type="email" required value={candForm.email} onChange={(e) => setCandForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone</label>
                  <input value={candForm.telephone} onChange={(e) => setCandForm((f) => ({ ...f, telephone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">LinkedIn</label>
                  <input value={candForm.linkedin} onChange={(e) => setCandForm((f) => ({ ...f, linkedin: e.target.value }))}
                    placeholder="linkedin.com/in/..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">CV (PDF)</label>
                <input type="file" accept=".pdf" onChange={(e) => setCv(e.target.files?.[0] ?? null)}
                  className="w-full text-xs" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCandidat(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ background: '#0F1E3D' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal modifier candidat */}
      {editingCandidat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Modifier le candidat</h2>
              <button onClick={() => setEditingCandidat(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <form onSubmit={submitCandidatEdit} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nom *</label>
                  <input required value={candForm.nom} onChange={(e) => setCandForm((f) => ({ ...f, nom: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prénom *</label>
                  <input required value={candForm.prenom} onChange={(e) => setCandForm((f) => ({ ...f, prenom: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                <input type="email" required value={candForm.email} onChange={(e) => setCandForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone</label>
                  <input value={candForm.telephone} onChange={(e) => setCandForm((f) => ({ ...f, telephone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">LinkedIn</label>
                  <input value={candForm.linkedin} onChange={(e) => setCandForm((f) => ({ ...f, linkedin: e.target.value }))}
                    placeholder="linkedin.com/in/..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingCandidat(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ background: '#0F1E3D' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Détail candidature */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0F1E3D] text-white flex items-center justify-center font-bold">{detail.initiales}</div>
                <div>
                  <div className="font-semibold text-gray-900">{detail.nomComplet}</div>
                  <div className="text-xs text-gray-400">{detail.offreTitre}</div>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Email', value: detail.email },
                { label: 'Téléphone', value: detail.telephone ?? '—' },
                { label: 'LinkedIn', value: detail.linkedin ?? '—' },
                { label: 'Étape', value: COLUMNS.find((c) => c.key === detail.etape)?.label ?? detail.etape },
                { label: 'Reçu le', value: new Date(detail.dateCreation).toLocaleDateString('fr-FR') },
              ].map((row, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-medium text-gray-900 truncate">{row.value}</span>
                </div>
              ))}
              {detail.cvDisponible && (
                <button onClick={() => downloadCv(detail)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50">
                  <Download size={12} /> Télécharger le CV ({detail.cvNom})
                </button>
              )}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Historique</div>
                <div className="space-y-1.5">
                  {detail.historique.map((h, i) => (
                    <div key={i} className="text-xs text-gray-600 px-3 py-2 rounded-lg" style={{ background: '#F7F8FA' }}>{h}</div>
                  ))}
                </div>
              </div>
              {detail.etape !== 'EMBAUCHE' && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => planifierEntretien(detail)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1">
                    <CalendarClock size={11} /> Planifier un entretien
                  </button>
                  <button onClick={() => embaucher(detail)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 flex items-center justify-center gap-1" style={{ background: '#10B981' }}>
                    <UserCheck size={11} /> Embaucher
                  </button>
                </div>
              )}
              {detail.etape === 'EMBAUCHE' && (
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#D1FAE5', color: '#065F46' }}>
                  <Star size={11} /> Candidat embauché — fiche employé créée
                </div>
              )}
              <button onClick={() => supprimerCandidature(detail)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-red-100 hover:bg-red-50"
                style={{ color: '#EF4444' }}>
                <Trash2 size={11} /> Supprimer la candidature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
