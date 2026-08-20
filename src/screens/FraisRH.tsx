import { useCallback, useEffect, useState } from 'react'
import { Search, Check, X, Loader2, Eye, FileDown } from 'lucide-react'
import { fraisApi } from '../api/modules'
import type { NoteFrais } from '../api/types'
import { ErrorBlock, fmtDate, Spinner, useToasts } from '../components/ui'
import { downloadNotesFraisPdf } from '../services/pdf'

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  EN_ATTENTE: { bg: '#FEF3C7', color: '#92400E', label: 'En attente' },
  EN_COURS: { bg: '#DBEAFE', color: '#1D4ED8', label: 'En cours' },
  REMBOURSEE: { bg: '#D1FAE5', color: '#065F46', label: 'Remboursée' },
  REFUSEE: { bg: '#FEE2E2', color: '#991B1B', label: 'Refusée' },
  ANNULEE: { bg: '#F3F4F6', color: '#4B5563', label: 'Annulée' },
}

const STATUTS = ['', 'EN_ATTENTE', 'EN_COURS', 'REMBOURSEE', 'REFUSEE']

export default function FraisRH() {
  const { success, error: toastError } = useToasts()

  const [notes, setNotes] = useState<NoteFrais[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState('')
  const [acting, setActing] = useState<number | null>(null)
  const [showRefuse, setShowRefuse] = useState<NoteFrais | null>(null)
  const [motif, setMotif] = useState('')
  const [detail, setDetail] = useState<NoteFrais | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setNotes(await fraisApi.notesRH({ q: search || undefined, statut: statut || undefined }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [search, statut])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const agir = async (n: NoteFrais, action: 'valider' | 'rembourser' | 'refuser') => {
    setActing(n.id)
    try {
      if (action === 'valider') {
        await fraisApi.valider(n.id)
        success(`Note ${n.reference} validée`)
      } else if (action === 'rembourser') {
        await fraisApi.rembourser(n.id)
        success(`Note ${n.reference} remboursée`)
      } else {
        if (!motif.trim()) return
        await fraisApi.refuser(n.id, motif.trim())
        success(`Note ${n.reference} refusée`)
        setShowRefuse(null)
        setMotif('')
      }
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(null)
    }
  }

  const downloadJustif = (url: string) => {
    const fileName = url.split('/').pop()
    if (!fileName) return
    fraisApi.justificatif(fileName)
      .then(() => success('Justificatif téléchargé'))
      .catch((e) => toastError(e.message))
  }

  const enAttente = notes.filter((n) => n.statut === 'EN_ATTENTE').length
  const enCours = notes.filter((n) => n.statut === 'EN_COURS').length

  const [exportingPdf, setExportingPdf] = useState(false)
  const exporterPdf = () => {
    setExportingPdf(true)
    try {
      downloadNotesFraisPdf(notes)
      success('Notes de frais exportées en PDF')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l\'export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Notes de frais — Vue RH</h1>
        <div className="flex gap-2">
          <button
            onClick={exporterPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
            title="Exporter les notes de frais au format PDF"
          >
            <FileDown size={15} style={{ color: '#000000' }} /> {exportingPdf ? 'Génération...' : 'Exporter PDF'}
          </button>
          <button
            onClick={() => fraisApi.exporterNotes()
              .then(() => success('Export Excel téléchargé'))
              .catch((e) => toastError(e.message))}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileDown size={15} style={{ color: '#000000' }} /> Exporter Excel
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="Chargement des notes..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total notes', value: notes.length, color: '#000000', bg: '#F3F4F6' },
              { label: 'En attente', value: enAttente, color: '#F59E0B', bg: '#FEF3C7' },
              { label: 'En cours', value: enCours, color: '#3B82F6', bg: '#DBEAFE' },
              { label: 'Remboursées', value: notes.filter((n) => n.statut === 'REMBOURSEE').length, color: '#10B981', bg: '#D1FAE5' },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: k.bg, color: k.color }}>{k.value}</div>
                <div className="text-sm font-medium text-gray-700">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Filtres + tableau */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-gray-200 flex-1 max-w-xs" style={{ background: '#F7F8FA' }}>
                <Search size={13} style={{ color: '#9CA3AF' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher collaborateur, titre..."
                  className="bg-transparent text-xs outline-none flex-1" />
              </div>
              <select value={statut} onChange={(e) => setStatut(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 px-3 py-2 outline-none">
                {STATUTS.map((s) => (
                  <option key={s} value={s}>{s === '' ? 'Tous les statuts' : STATUS_MAP[s].label}</option>
                ))}
              </select>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Référence', 'Collaborateur', 'Titre', 'Date', 'Montant', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {notes.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucune note de frais</td></tr>
                ) : notes.map((n) => {
                  const badge = STATUS_MAP[n.statut]
                  return (
                    <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-gray-400">{n.reference}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#000000] text-white flex items-center justify-center text-[10px] font-bold">{n.employeInitiales}</div>
                          <span className="text-xs font-medium text-gray-900">{n.employeNom}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-700">{n.titre} <span className="text-gray-400">({n.nbDepenses} dép.)</span></td>
                      <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(n.date)}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{n.montantTotal.toLocaleString('fr-FR')} {n.devise}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 items-center">
                          <button onClick={() => { fraisApi.detail(n.id).then(setDetail).catch((e) => toastError(e.message)) }}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50" title="Justificatifs">
                            <Eye size={12} />
                          </button>
                          {n.statut === 'EN_ATTENTE' && (
                            <>
                              <button onClick={() => agir(n, 'valider')} disabled={acting === n.id}
                                className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-50" style={{ color: '#10B981', border: '1px solid #D1FAE5' }}>
                                {acting === n.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              </button>
                              <button onClick={() => setShowRefuse(n)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: '#EF4444', border: '1px solid #FEE2E2' }}>
                                <X size={12} />
                              </button>
                            </>
                          )}
                          {n.statut === 'EN_COURS' && (
                            <button onClick={() => agir(n, 'rembourser')} disabled={acting === n.id}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-50" style={{ background: '#10B981' }}>
                              Rembourser
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
        </>
      )}

      {/* Modal refus */}
      {showRefuse && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Refuser {showRefuse.reference}</h3>
              <button onClick={() => setShowRefuse(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">Motif du refus pour <strong>{showRefuse.employeNom}</strong> :</p>
              <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} placeholder="Motif obligatoire..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowRefuse(null)} className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button onClick={() => agir(showRefuse, 'refuser')} disabled={!motif.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ background: '#B91C1C' }}>
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Détail / justificatifs */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#000000' }}>
                  {detail.employeInitiales}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{detail.employeNom}</h2>
                  <div className="text-[11px] text-gray-400 font-mono">{detail.reference}</div>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Bandeau statut */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={STATUS_MAP[detail.statut] ? {
                  background: STATUS_MAP[detail.statut].bg,
                  border: `1px solid ${STATUS_MAP[detail.statut].color}`,
                } : undefined}>
                <span className="text-sm font-semibold" style={{ color: STATUS_MAP[detail.statut]?.color ?? '#374151' }}>
                  {STATUS_MAP[detail.statut]?.label ?? detail.statut}
                </span>
                <span className="text-lg font-bold text-gray-900">{detail.montantTotal.toLocaleString('fr-FR')} {detail.devise}</span>
              </div>

              {/* Grille d'informations */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg px-3 py-2.5" style={{ background: '#F7F8FA' }}>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Date</div>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">{fmtDate(detail.date)}</div>
                </div>
                <div className="rounded-lg px-3 py-2.5" style={{ background: '#F7F8FA' }}>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Priorité</div>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">{detail.priorite}</div>
                </div>
                {detail.remarque && (
                  <div className="col-span-2 rounded-lg px-3 py-2.5" style={{ background: '#F7F8FA' }}>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Remarque</div>
                    <div className="text-sm text-gray-900 mt-0.5">{detail.remarque}</div>
                  </div>
                )}
                {detail.nbDepenses > 0 && (
                  <div className="col-span-2 rounded-lg px-3 py-2.5" style={{ background: '#F7F8FA' }}>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Dépenses ({detail.nbDepenses})</div>
                    <div className="text-sm text-gray-900 mt-0.5 flex flex-wrap gap-1.5">
                      {detail.depenses.map((d, i) => (
                        <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#E5E7EB', color: '#374151' }}>{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {detail.statut === 'REFUSEE' && detail.motifRefus && (
                <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
                  <span className="font-semibold">Motif du refus : </span>{detail.motifRefus}
                </div>
              )}

              {/* Justificatifs — ouverture dans le navigateur */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Justificatifs joints ({(detail.justificatifs ?? []).length})</div>
                {(detail.justificatifs ?? []).length === 0 ? (
                  <div className="text-xs text-gray-400">Aucun justificatif</div>
                ) : (detail.justificatifs ?? []).map((url, i) => (
                  <button key={i} onClick={() => downloadJustif(url)}
                    className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 mb-1.5">
                    <Eye size={11} style={{ color: '#000000' }} /> {url.split('/').pop()}
                  </button>
                ))}
                {(detail.justificatifs ?? []).length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">Le justificatif s'ouvre dans le navigateur — téléchargez-le ensuite si besoin.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
