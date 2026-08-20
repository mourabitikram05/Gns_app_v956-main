import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Upload, X, Pencil, Ban, Loader2 } from 'lucide-react'
import { congesApi, employeApi } from '../api/modules'
import type { DemandeConge, EmployeProfile, SoldeResponse, TypeConge } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { ErrorBlock, fmtDate, MONTHS_FR, Spinner, STATUS_BADGES, useToasts, workingDays } from '../components/ui'
import { downloadCongePdf } from '../services/pdf'



export default function CongesCollab() {
  const { user } = useAuth()
  const { success, error: toastError } = useToasts()

  const [calView, setCalView] = useState<'mensuel' | 'liste'>('mensuel')

  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1) // 1-12
  const [profile, setProfile] = useState<EmployeProfile | null>(null)
  const [solde, setSolde] = useState<SoldeResponse | null>(null)
  const [types, setTypes] = useState<TypeConge[]>([])
  const [demandes, setDemandes] = useState<DemandeConge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modale de demande
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DemandeConge | null>(null)
  const [modalTypeId, setModalTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [remark, setRemark] = useState('')
  const [justificatif, setJustificatif] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  // Détail
  const [detail, setDetail] = useState<DemandeConge | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadSolde = useCallback(() => {
    congesApi.solde().then(setSolde).catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [mesDemandes, profileData] = await Promise.all([
        congesApi.mesDemandes(month, year),
        employeApi.me(),
      ])
      setDemandes(mesDemandes)
      setProfile(profileData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadSolde()
    congesApi.types().then(setTypes).catch(() => {})
  }, [loadSolde])

  // Ouverture de la modale depuis le bouton global "+ Nouvelle demande"
  useEffect(() => {
    const ouvrir = () => openCreate()
    window.addEventListener('gns:nouvelle-demande', ouvrir)
    return () => window.removeEventListener('gns:nouvelle-demande', ouvrir)
  }, [types])

  // ---------------- Navigation mois ----------------
  const previousMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) } else setMonth((m) => m + 1)
  }

  // ---------------- Calendrier ----------------
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const eventsByDay: Record<number, DemandeConge[]> = {}
  for (const d of demandes) {
    const start = new Date(d.dateDebut + 'T00:00:00')
    const end = new Date(d.dateFin + 'T00:00:00')
    const cursor = new Date(start)
    while (cursor <= end) {
      if (cursor.getFullYear() === year && cursor.getMonth() === month - 1) {
        const day = cursor.getDate()
        if (!eventsByDay[day]) eventsByDay[day] = []
        eventsByDay[day].push(d)
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  const openDetail = (id: number) => {
    setDetailLoading(true)
    setDetail(null)
    congesApi.detail(id)
      .then(setDetail)
      .catch((e) => toastError(e.message))
      .finally(() => setDetailLoading(false))
  }

  // ---------------- Modale demande ----------------
  const openCreate = () => {
    setEditing(null)
    setModalTypeId(types[0] ? String(types[0].id) : '')
    setStartDate('')
    setEndDate('')
    setRemark('')
    setJustificatif(null)
    setShowModal(true)
  }

  const openEdit = (d: DemandeConge) => {
    setEditing(d)
    setModalTypeId(String(d.typeCongeId))
    setStartDate(d.dateDebut)
    setEndDate(d.dateFin)
    setRemark(d.motif ?? '')
    setJustificatif(null)
    setShowModal(true)
  }

  const selectedType = types.find((t) => String(t.id) === modalTypeId)
  const daysCount = startDate && endDate ? workingDays(startDate, endDate) : 0

  const submitDemande = async (e: FormEvent) => {
    e.preventDefault()
    if (!modalTypeId || !startDate || !endDate) return
    setSaving(true)
    try {
      const payload = { typeCongeId: Number(modalTypeId), dateDebut: startDate, dateFin: endDate, motif: remark.trim() || undefined }
      if (editing) {
        await congesApi.modifier(editing.id, payload, justificatif)
        success('Demande modifiée')
      } else {
        await congesApi.creer(payload, justificatif)
        success('Demande envoyée pour validation')
      }
      setShowModal(false)
      loadSolde()
      loadData()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const annuler = async (id: number) => {
    if (!window.confirm('Annuler cette demande ?')) return
    try {
      await congesApi.annuler(id)
      success('Demande annulée')
      setDetail(null)
      loadSolde()
      loadData()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const kpis = [
    { label: 'Solde au 31/12', value: solde ? `${Math.round(solde.soldeAu31Decembre)} j` : '—', color: '#000000' },
    { label: 'Solde à ce jour', value: solde ? `${Math.round(solde.soldeACeJour)} j` : '—', color: '#C9A227' },
    { label: 'Jours pris', value: solde ? `${Math.round(solde.joursPris)} j` : '—', color: '#10B981' },
    { label: 'Absent. justifiée', value: solde ? `${Math.round(solde.absencesJustifiees)} j` : '—', color: '#F59E0B' },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile?.nomComplet ?? user?.nomComplet ?? 'Mon espace'}</h1>
          <p className="text-sm text-gray-500">
            {profile?.poste ?? ''}{profile?.poste && profile?.departement ? ' · ' : ''}{profile?.departement ?? ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              try {
                downloadCongePdf(demandes, solde, 'Mes demandes de congé')
                success('Mes demandes de congé exportées en PDF')
              } catch (err) {
                toastError(err instanceof Error ? err.message : 'Erreur lors de l\u2019export PDF')
              }
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
            title="Exporter mes demandes de congé au format PDF"
          >
            Export PDF
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
            style={{ background: '#000000' }}
          >
            + Demander un congé
          </button>
        </div>
      </div>

      {/* Contenu congés */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5 space-y-5">
          {/* KPI bar */}
          <div className="grid grid-cols-4 gap-3">
            {kpis.map((k, i) => (
              <div key={i} className="rounded-xl p-4 border" style={{ borderColor: k.color + '30', background: k.color + '08' }}>
                <div className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Calendar nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={previousMonth} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <ChevronLeft size={15} />
              </button>
              <span className="font-semibold text-gray-900">{MONTHS_FR[month - 1]} {year}</span>
              <button onClick={nextMonth} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(['mensuel', 'liste'] as const).map(v => (
                <button key={v} onClick={() => setCalView(v)}
                  className="px-3 py-1.5 text-xs font-medium transition-colors capitalize"
                  style={{ background: calView === v ? '#000000' : '#fff', color: calView === v ? '#fff' : '#6B7280' }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <Spinner label="Chargement de vos demandes..." />
          ) : error ? (
            <ErrorBlock message={error} onRetry={loadData} />
          ) : calView === 'mensuel' ? (
            <div>
              <div className="grid grid-cols-7 mb-1">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const ev = eventsByDay[day]
                  return (
                    <div key={day}
                      onClick={() => ev?.[0] && openDetail(ev[0].id)}
                      className="min-h-16 rounded-lg p-1 border transition-colors hover:border-gray-300 cursor-pointer"
                      style={{
                        borderColor: ev ? (ev[0].couleur ?? '#10B981') + '40' : '#F3F4F6',
                        background: ev ? (ev[0].couleur ?? '#10B981') + '10' : '#FAFAFA',
                      }}>
                      <div className="text-xs font-medium text-gray-700 mb-1">{day}</div>
                      {ev?.slice(0, 3).map((e, ei) => (
                        <div key={ei} className="text-xs px-1 rounded truncate mb-0.5"
                          style={{ background: e.couleur ?? '#10B981', color: '#fff', fontSize: 10 }}>
                          {e.typeNom}
                        </div>
                      ))}
                      {ev && ev.length > 3 && (
                        <div className="text-[10px] font-medium" style={{ color: '#6B7280' }}>+{ev.length - 3}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {demandes.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>Aucune demande ce mois-ci</div>
              ) : demandes.map((d) => {
                const badge = STATUS_BADGES[d.statut]
                return (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderColor: (d.couleur ?? '#10B981') + '30' }} onClick={() => openDetail(d.id)}>
                    <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: d.couleur ?? '#10B981' }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{d.typeNom}</div>
                      <div className="text-xs text-gray-500">
                        {fmtDate(d.dateDebut)} → {fmtDate(d.dateFin)} · {d.nombreJours} j
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    {d.statut === 'EN_ATTENTE' && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(d) }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100"
                          style={{ color: '#000000', border: '1px solid #E5E7EB' }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={(ev) => { ev.stopPropagation(); annuler(d.id) }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50"
                          style={{ color: '#B91C1C', border: '1px solid #FECACA' }}>
                          <Ban size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal demande */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {editing ? 'Modifier la demande' : 'Demander un congé / absence'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitDemande} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Type de demande</label>
                <select value={modalTypeId} onChange={(e) => setModalTypeId(e.target.value)} required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400">
                  {types.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </select>
              </div>
              <div className="rounded-lg px-3 py-2 text-sm flex items-center justify-between" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                <span style={{ color: '#0369A1' }}>Solde disponible :</span>
                <span className="font-semibold" style={{ color: '#0369A1' }}>
                  {selectedType?.consommeSolde
                    ? `${Math.round(solde?.soldeACeJour ?? 0)} jours`
                    : 'Non débité du solde'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date de début</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date de fin</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
              </div>
              {startDate && endDate && (
                <div className="text-sm font-medium text-center py-2 rounded-lg" style={{ background: '#F0FDF4', color: '#166534' }}>
                  Total calculé : {daysCount} jour(s) ouvré(s)
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Justificatif {selectedType?.besoinJustificatif ? '(obligatoire)' : '(optionnel)'}
                </label>
                <label className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors block">
                  <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">
                    {justificatif ? justificatif.name : 'Glissez un fichier ou cliquez pour sélectionner'}
                  </p>
                  <input type="file" className="hidden"
                    onChange={(e) => setJustificatif(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Remarque</label>
                <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none"
                  placeholder="Précisions éventuelles..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#000000' }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editing ? 'Enregistrer les modifications' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-gray-900">{detail.reference}</div>
                <div className="text-xs text-gray-500">Demandé le {fmtDate(detail.dateDemande)}</div>
              </div>
              <button onClick={() => setDetail(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {detailLoading ? (
                <Spinner label="Chargement..." />
              ) : (
                <>
                  {[
                    { label: 'Type', value: detail.typeNom },
                    { label: 'Période', value: `${fmtDate(detail.dateDebut)} → ${fmtDate(detail.dateFin)}` },
                    { label: 'Total', value: `${detail.nombreJours} jour(s)` },
                    { label: 'Description', value: detail.motif ?? '—' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="font-medium text-gray-900 text-right">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Statut</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={detail.statut === 'APPROUVEE'
                        ? { background: '#D1FAE5', color: '#065F46' }
                        : detail.statut === 'REFUSEE'
                          ? { background: '#FEE2E2', color: '#991B1B' }
                          : detail.statut === 'ANNULEE'
                            ? { background: '#F3F4F6', color: '#4B5563' }
                            : { background: '#FEF3C7', color: '#92400E' }}>
                      {STATUS_BADGES[detail.statut]?.label ?? detail.statut}
                    </span>
                  </div>
                  {detail.statut === 'REFUSEE' && detail.motifRefus && (
                    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
                      <span className="font-semibold">Motif du refus : </span>{detail.motifRefus}
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-xs font-semibold text-gray-500 mb-2">Historique de validation</div>
                    <div className="space-y-2">
                      {detail.historique.length === 0 && (
                        <div className="text-xs text-gray-400">Demande en attente de traitement</div>
                      )}
                      {detail.historique.map((h, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-sm">{h.decision === 'APPROUVEE' ? '✅' : h.decision === 'REFUSEE' ? '❌' : '📝'}</span>
                          <div>
                            <div className="text-xs font-medium text-gray-900">
                              {h.decision === 'APPROUVEE' ? 'Validé par' : h.decision === 'REFUSEE' ? 'Refusé par' : 'Annulé par'} {h.validateur}
                              {h.motif ? ` — ${h.motif}` : ''}
                            </div>
                            <div className="text-xs text-gray-400">{fmtDate(h.dateValidation)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {detail.statut === 'EN_ATTENTE' && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => { setDetail(null); openEdit(detail) }}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1">
                        <Pencil size={11} /> Modifier
                      </button>
                      <button onClick={() => annuler(detail.id)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 flex items-center justify-center gap-1"
                        style={{ background: '#B91C1C' }}>
                        <Ban size={11} /> Annuler la demande
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
