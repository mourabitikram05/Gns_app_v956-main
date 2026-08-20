import { useCallback, useEffect, useState } from 'react'
import { Search, Download, Filter, X, ChevronLeft, ChevronRight, Check, Loader2, CalendarPlus, FileText as FileTextIcon, Upload } from 'lucide-react'
import { annuaireApi, congesApi } from '../api/modules'
import type { CalendrierEquipe, DemandeConge, EmployeListItem, TypeConge } from '../api/types'
import { ErrorBlock, fmtDate, MONTHS_FR, Spinner, STATUS_BADGES, useToasts } from '../components/ui'
import { downloadCalendrierPdf } from '../services/pdf'

export default function CongesRH() {
  const { success, error: toastError } = useToasts()

  const [tab, setTab] = useState<'calendrier' | 'liste'>('calendrier')
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  const [data, setData] = useState<CalendrierEquipe | null>(null)
  const [types, setTypes] = useState<TypeConge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterDept, setFilterDept] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [popup, setPopup] = useState<DemandeConge | null>(null)
  const [popupLoading, setPopupLoading] = useState(false)
  const [showRefuse, setShowRefuse] = useState(false)
  const [refuseMotif, setRefuseMotif] = useState('')
  const [acting, setActing] = useState(false)

  const [showReserve, setShowReserve] = useState(false)
  const [employes, setEmployes] = useState<EmployeListItem[]>([])
  const [reserve, setReserve] = useState({
    employeId: '', typeCongeId: '', dateDebut: '', dateFin: '', motif: '',
  })
  const [reserveJustificatif, setReserveJustificatif] = useState<File | null>(null)  // ← ajout
  const [saving, setSaving] = useState(false)

  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const weekendDays = new Set(days.filter(d => {
    const dow = new Date(year, month - 1, d).getDay()
    return dow === 0 || dow === 6
  }))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await congesApi.calendrierEquipe(month, year)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    congesApi.types().then(setTypes).catch(() => {})
    annuaireApi.rechercher({ size: 100 }).then((res) => setEmployes(res.content)).catch(() => {})
  }, [])

  // ---------------- Filtrage ----------------
  const depts = [...new Set((data?.employes ?? []).map((e) => e.departement).filter(Boolean))] as string[]
  const filtered = (data?.employes ?? []).filter((e) => {
    const matchSearch = !search
      || e.nom.toLowerCase().includes(search.toLowerCase())
      || (e.departement ?? '').toLowerCase().includes(search.toLowerCase())
    const matchDept = !filterDept || e.departement === filterDept
    return matchSearch && matchDept
  })

  const collabsEnConge = (data?.employes ?? []).filter((e) => Object.keys(e.jours).length > 0)
  const collabsEnCongeFiltres = collabsEnConge.filter((e) => {
    const matchSearch = !search
      || e.nom.toLowerCase().includes(search.toLowerCase())
      || (e.departement ?? '').toLowerCase().includes(search.toLowerCase())
    const matchDept = !filterDept || e.departement === filterDept
    return matchSearch && matchDept
  })

  const typeByCode = new Map(types.map((t) => [t.code, t]))

  // ---------------- Détail / actions ----------------
  const openDetail = (demandeId: number) => {
    setPopupLoading(true)
    setPopup(null)
    congesApi.detail(demandeId)
      .then(setPopup)
      .catch((e) => toastError(e.message))
      .finally(() => setPopupLoading(false))
  }

  const valider = async (id: number) => {
    setActing(true)
    try {
      await congesApi.valider(id)
      success('Demande validée — solde mis à jour')
      setPopup(null)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(false)
    }
  }

  const refuser = async () => {
    if (!popup || !refuseMotif.trim()) {
      toastError('Le motif de refus est obligatoire')
      return
    }
    setActing(true)
    try {
      await congesApi.refuser(popup.id, refuseMotif.trim())
      success('Demande refusée')
      setPopup(null)
      setShowRefuse(false)
      setRefuseMotif('')
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(false)
    }
  }

  const previousMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) } else setMonth((m) => m + 1)
  }

  const exportXlsx = async () => {
    try {
      await congesApi.exportXlsx(month, year)
      success('Planning exporté en Excel')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur d\'export')
    }
  }

  // ---------------- Réserver un congé ----------------
  const submitReserve = async () => {
    if (!reserve.employeId || !reserve.typeCongeId || !reserve.dateDebut || !reserve.dateFin) {
      toastError('Veuillez remplir tous les champs')
      return
    }
    setSaving(true)
    try {
      await congesApi.creer({
        employeId: Number(reserve.employeId),
        typeCongeId: Number(reserve.typeCongeId),
        dateDebut: reserve.dateDebut,
        dateFin: reserve.dateFin,
        motif: reserve.motif.trim() || undefined,
      },reserveJustificatif)
      success('Congé réservé pour le collaborateur')
      setShowReserve(false)
      setReserve({ employeId: '', typeCongeId: '', dateDebut: '', dateFin: '', motif: '' })
      setReserveJustificatif(null)   // ← reset
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const selectedReserveType = types.find((t) => String(t.id) === reserve.typeCongeId)


  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Congés — Vue RH</h1>
          <div className="flex items-center gap-1.5 ml-2">
            <button onClick={previousMonth} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold text-gray-700">{MONTHS_FR[month - 1]} {year}</span>
            <button onClick={nextMonth} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
              <Filter size={14} /> Filtres
            </button>
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 p-3">
                <div className="text-xs font-semibold text-gray-500 mb-2">Département</div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => { setFilterDept(null); setShowFilters(false) }}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: filterDept === null ? '#0F1E3D' : '#F3F4F6', color: filterDept === null ? '#fff' : '#374151' }}>
                    Tous
                  </button>
                  {depts.map((d) => (
                    <button key={d} onClick={() => { setFilterDept(filterDept === d ? null : d); setShowFilters(false) }}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: filterDept === d ? '#0F1E3D' : '#F3F4F6', color: filterDept === d ? '#fff' : '#374151' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (!data) { toastError('Aucune donnée à exporter'); return }
              try {
                downloadCalendrierPdf(data)
                success('Planning des congés exporté en PDF')
              } catch (err) {
                toastError(err instanceof Error ? err.message : 'Erreur lors de l\'export PDF')
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
            title="Exporter le planning des congés au format PDF">
            <FileTextIcon size={14} style={{ color: '#0F1E3D' }} /> Export PDF
          </button>
          <button onClick={exportXlsx} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
            <Download size={14} /> Export Excel
          </button>
          <button onClick={() => setShowReserve(true)} className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90"
            style={{ background: '#0F1E3D' }}>
            + Réserver un congé
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button onClick={() => setTab('calendrier')}
            className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
            style={{ borderColor: tab === 'calendrier' ? '#0F1E3D' : 'transparent', color: tab === 'calendrier' ? '#0F1E3D' : '#6B7280' }}>
            Calendrier des congés
          </button>
          <button onClick={() => setTab('liste')}
            className="px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
            style={{ borderColor: tab === 'liste' ? '#0F1E3D' : 'transparent', color: tab === 'liste' ? '#0F1E3D' : '#6B7280' }}>
            Collaborateurs en congé
            <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold" style={{ background: '#FEF3C7', color: '#92400E' }}>
              {collabsEnConge.length}
            </span>
          </button>
          <div className="ml-auto flex items-center px-4">
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 border border-gray-200" style={{ background: '#F7F8FA' }}>
              <Search size={13} style={{ color: '#9CA3AF' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="text-xs bg-transparent outline-none w-32" />
            </div>
          </div>
        </div>

        {loading ? (
          <Spinner label="Chargement du planning..." />
        ) : error ? (
          <div className="p-4"><ErrorBlock message={error} onRetry={load} /></div>
        ) : tab === 'calendrier' ? (
          <div className="overflow-x-auto">
            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 flex-wrap">
              {types.filter((t) => t.code).map((t) => (
                <div key={t.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: (t.couleur ?? '#0F1E3D') + '30', border: `1px solid ${t.couleur ?? '#0F1E3D'}40` }} />
                  <span className="text-xs text-gray-600">{t.nom}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <table className="w-full text-sm" style={{ minWidth: 900 }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-40 sticky left-0 bg-gray-50">Collaborateur</th>
                  {days.map(d => (
                    <th key={d} className="text-center text-xs font-medium py-2 px-0"
                      style={{ minWidth: 28, color: weekendDays.has(d) ? '#D1D5DB' : '#6B7280' }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={days.length + 1} className="px-4 py-10 text-center text-sm text-gray-400">Aucun collaborateur trouvé</td></tr>
                )}
                {filtered.map((collab) => (
                  <tr key={collab.employeId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: '#0F1E3D' }}>{collab.initiales}</div>
                        <div>
                          <div className="text-xs font-medium text-gray-900 whitespace-nowrap">{collab.nom}</div>
                          <div className="text-xs text-gray-400">{collab.departement}</div>
                        </div>
                      </div>
                    </td>
                    {days.map(d => {
                      const cell = collab.jours[d]
                      const typeInfo = cell ? typeByCode.get(cell.code) : null
                      return (
                        <td key={d} className="text-center py-1 px-0">
                          {cell ? (
                            <div
                              className="mx-auto w-6 h-6 rounded text-xs flex items-center justify-center font-bold cursor-pointer hover:opacity-80"
                              style={{ background: (cell.couleur ?? '#0F1E3D') + '22', color: cell.couleur ?? '#0F1E3D' }}
                              onClick={() => openDetail(cell.demandeId)}
                              title={`${cell.libelle}${typeInfo ? ` (${typeInfo.nom})` : ''}`}
                            >
                              {cell.code}
                            </div>
                          ) : (
                            <div className="mx-auto w-6 h-6" style={{ background: weekendDays.has(d) ? '#F9FAFB' : 'transparent' }} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {/* Effectif row */}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-4 py-2 text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50">Effectif présent</td>
                  {days.map(d => {
                    const present = data?.presentParJour[d]
                    return (
                      <td key={d} className="text-center text-xs py-2 font-medium text-gray-700">
                        {present ?? 0}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {collabsEnCongeFiltres.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>Aucun collaborateur en congé ce mois-ci</div>
            ) : collabsEnCongeFiltres.map((c) => {
              const premiereDemandeId = Object.values(c.jours)[0]?.demandeId
              return (
                <div key={c.employeId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => premiereDemandeId && openDetail(premiereDemandeId)}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: '#0F1E3D' }}>{c.initiales}</div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{c.nom}</div>
                    <div className="text-xs text-gray-500">{c.departement}</div>
                  </div>
                  <div className="text-xs font-medium" style={{ color: '#F59E0B' }}>
                    {Object.keys(c.jours).length} jour(s)
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Popup détail demande */}
      {popup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#0F1E3D' }}>
                  {popup.employeInitiales}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{popup.employeNom}</div>
                  <div className="text-[11px] text-gray-400">{popup.departement ?? ''}</div>
                </div>
              </div>
              <button onClick={() => setPopup(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {popupLoading ? (
                <Spinner label="Chargement..." />
              ) : (
                <>
                  {/* Bandeau statut */}
                  <div className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={STATUS_BADGES[popup.statut]?.bg ? {
                      background: STATUS_BADGES[popup.statut].bg,
                      border: `1px solid ${STATUS_BADGES[popup.statut].color}`,
                    } : undefined}>
                    <span className="text-sm font-semibold" style={{ color: STATUS_BADGES[popup.statut]?.color ?? '#374151' }}>
                      {STATUS_BADGES[popup.statut]?.label ?? popup.statut}
                    </span>
                    <span className="text-xs font-medium text-gray-600">{popup.reference}</span>
                  </div>

                  {/* Grille d'informations */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg px-3 py-2.5" style={{ background: '#F7F8FA' }}>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Type</div>
                      <div className="text-sm font-semibold text-gray-900 mt-0.5">{popup.typeNom}</div>
                    </div>
                    <div className="rounded-lg px-3 py-2.5" style={{ background: '#F7F8FA' }}>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total</div>
                      <div className="text-sm font-semibold text-gray-900 mt-0.5">{popup.nombreJours} jour(s)</div>
                    </div>
                    <div className="col-span-2 rounded-lg px-3 py-2.5" style={{ background: '#F7F8FA' }}>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Période</div>
                      <div className="text-sm font-medium text-gray-900 mt-0.5">
                        {fmtDate(popup.dateDebut)} → {fmtDate(popup.dateFin)}
                      </div>
                    </div>
                    {popup.motif && (
                      <div className="col-span-2 rounded-lg px-3 py-2.5" style={{ background: '#F7F8FA' }}>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Description</div>
                        <div className="text-sm text-gray-900 mt-0.5">{popup.motif}</div>
                      </div>
                    )}
                  </div>

                  {popup.justificatifUrl && (
                    <button onClick={() => congesApi.justificatif(popup.justificatifUrl!.split('/').pop() ?? '')
                      .then(() => success('Justificatif téléchargé'))
                      .catch((e) => toastError(e.message))}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50">
                      <FileTextIcon size={13} style={{ color: '#0F1E3D' }} /> Ouvrir le justificatif ({popup.justificatifUrl?.split('/').pop()})
                    </button>
                  )}

                  {popup.statut === 'REFUSEE' && popup.motifRefus && (
                    <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
                      <span className="font-semibold">Motif du refus : </span>{popup.motifRefus}
                    </div>
                  )}

                  {/* Historique de validation */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-xs font-semibold text-gray-500 mb-3">Historique de validation</div>
                    <div className="space-y-0">
                      {popup.historique.length === 0 && (
                        <div className="text-xs text-gray-400 py-1">Demande en attente de traitement</div>
                      )}
                      {popup.historique.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 relative pb-3">
                          {i < popup.historique.length - 1 && (
                            <span className="absolute left-[7px] top-5 bottom-0 w-px" style={{ background: '#E5E7EB' }} />
                          )}
                          <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: h.decision === 'APPROUVEE' ? '#D1FAE5' : h.decision === 'REFUSEE' ? '#FEE2E2' : '#FEF3C7',
                            }}>
                            {h.decision === 'APPROUVEE' ? <Check size={10} style={{ color: '#065F46' }} />
                              : h.decision === 'REFUSEE' ? <X size={10} style={{ color: '#991B1B' }} />
                                : <FileTextIcon size={9} style={{ color: '#92400E' }} />}
                          </span>
                          <div>
                            <div className="text-xs font-medium text-gray-900">
                              {h.decision === 'APPROUVEE' ? 'Validé par' : h.decision === 'REFUSEE' ? 'Refusé par' : 'Annulé par'} {h.validateur}
                            </div>
                            <div className="text-[11px] text-gray-400">{fmtDate(h.dateValidation)}{h.motif ? ` — ${h.motif}` : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {popup.statut === 'EN_ATTENTE' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setShowRefuse(true) }}
                        disabled={acting}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold border hover:bg-red-50 transition-colors disabled:opacity-60"
                        style={{ color: '#B91C1C', borderColor: '#FECACA' }}>
                        Refuser
                      </button>
                      <button
                        onClick={() => valider(popup.id)}
                        disabled={acting}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                        style={{ background: '#10B981' }}>
                        {acting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Valider
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal motif de refus */}
      {showRefuse && popup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Refuser la demande</h3>
              <button onClick={() => setShowRefuse(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">
                Motif du refus pour <span className="font-semibold">{popup.employeNom}</span> ({popup.typeNom}) :
              </p>
              <textarea
                value={refuseMotif}
                onChange={(e) => setRefuseMotif(e.target.value)}
                rows={3}
                placeholder="Motif obligatoire..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowRefuse(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={refuser} disabled={acting || !refuseMotif.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  style={{ background: '#B91C1C' }}>
                  {acting ? 'Envoi...' : 'Confirmer le refus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal réserver un congé */}
      {showReserve && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CalendarPlus size={16} style={{ color: '#0F1E3D' }} /> Réserver un congé
              </h2>
              <button onClick={() => setShowReserve(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Collaborateur *</label>
                <select
                  value={reserve.employeId}
                  onChange={(e) => setReserve((r) => ({ ...r, employeId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400">
                  <option value="">— Choisir —</option>
                  {employes.map((e) => (
                    <option key={e.id} value={e.id}>{e.nomComplet} — {e.departement ?? ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Type de congé *</label>
                <select
                  value={reserve.typeCongeId}
                  onChange={(e) => setReserve((r) => ({ ...r, typeCongeId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400">
                  <option value="">— Choisir —</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date de début *</label>
                  <input type="date" value={reserve.dateDebut}
                    onChange={(e) => setReserve((r) => ({ ...r, dateDebut: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date de fin *</label>
                  <input type="date" value={reserve.dateFin}
                    onChange={(e) => setReserve((r) => ({ ...r, dateFin: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
              </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Justificatif {selectedReserveType?.besoinJustificatif ? '(obligatoire)' : '(optionnel)'}
                  </label>
                  <label className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors block">
                    <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">
                      {reserveJustificatif ? reserveJustificatif.name : 'Glissez un fichier ou cliquez pour sélectionner'}
                    </p>
                    <input type="file" className="hidden"
                      onChange={(e) => setReserveJustificatif(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Motif</label>
                <textarea value={reserve.motif}
                  onChange={(e) => setReserve((r) => ({ ...r, motif: e.target.value }))} rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none"
                  placeholder="Précisions..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowReserve(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={submitReserve} disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: '#0F1E3D' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
