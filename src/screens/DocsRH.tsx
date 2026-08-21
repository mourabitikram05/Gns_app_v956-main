import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search, Check, X, Loader2, Download, Plus, FileText, Eye, Clock,
  FileCheck2, Ban, Calendar, Hash, User, Info, AlertTriangle, Inbox, FileDown,
} from 'lucide-react'
import { documentsApi } from '../api/modules'
import type { DemandeDocument, StatsDocuments } from '../api/types'
import { ErrorBlock, fmtDate, Pagination, Spinner, useToasts } from '../components/ui'
import { downloadDocumentOfficielPdf, downloadDocumentPdf } from '../services/pdf'

const STATUS_META: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  EN_TRAITEMENT: { label: 'À traiter', bg: '#FFFBEB', color: '#B45309', dot: '#F59E0B' },
  DISPONIBLE: { label: 'Traité', bg: '#ECFDF5', color: '#047857', dot: '#10B981' },
  REFUSE: { label: 'Refusé', bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
}

const PAGE_SIZE = 8

export default function DocsRH() {
  const { success, error: toastError } = useToasts()

  const [demandes, setDemandes] = useState<DemandeDocument[]>([])
  const [stats, setStats] = useState<StatsDocuments>({ total: 0, aTraiter: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [page, setPage] = useState(1)
  const [acting, setActing] = useState<number | null>(null)
  const [showRefuse, setShowRefuse] = useState<DemandeDocument | null>(null)
  const [motif, setMotif] = useState('')
  const [detail, setDetail] = useState<DemandeDocument | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [d, s] = await Promise.all([documentsApi.demandesRH(), documentsApi.stats()])
      setDemandes(d)
      setStats(s)
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
  }, [search, filterStatut])

  const filtered = useMemo(() => demandes.filter((r) => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q
      || r.employeNom.toLowerCase().includes(q)
      || r.typeDocument.toLowerCase().includes(q)
      || r.reference.toLowerCase().includes(q)
    const matchStatut = !filterStatut || r.statut === filterStatut
    return matchSearch && matchStatut
  }), [demandes, search, filterStatut])

  const traiteCeMois = useMemo(() => demandes.filter((d) => {
    const t = new Date(d.dateDemande)
    const now = new Date()
    return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear() && d.statut !== 'EN_TRAITEMENT'
  }).length, [demandes])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  )

  const traiter = async (d: DemandeDocument) => {
    setActing(d.id)
    try {
      await documentsApi.traiter(d.id)
      success(`Document ${d.reference} généré`)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(null)
    }
  }

  const refuser = async () => {
    if (!showRefuse || !motif.trim()) return
    setActing(showRefuse.id)
    try {
      await documentsApi.refuser(showRefuse.id, motif.trim())
      success(`Demande ${showRefuse.reference} refusée`)
      setShowRefuse(null)
      setMotif('')
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(null)
    }
  }

  const download = async (d: DemandeDocument) => {
    try {
      // Document officiel généré côté client — présentation professionnelle garantie
      downloadDocumentOfficielPdf(d)
      success(`Document ${d.reference} téléchargé (PDF officiel)`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const exporter = async () => {
    setExporting(true)
    try {
      await documentsApi.exporterExcel()
      success('Export Excel téléchargé')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l’export')
    } finally {
      setExporting(false)
    }
  }

  const exporterPdf = async () => {
    setExportingPdf(true)
    try {
      // Génération PDF 100 % côté client avec les données réellement affichées (filtres inclus)
      downloadDocumentPdf(filtered, stats, `Demandes de documents — ${filtered.length} demande(s)`)
      success('Export PDF téléchargé')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l’export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const StatusBadge = ({ statut }: { statut: string }) => {
    const meta = STATUS_META[statut] ?? { label: statut, bg: '#F3F4F6', color: '#4B5563', dot: '#9CA3AF' }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
        style={{ background: meta.bg, color: meta.color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
        {meta.label}
      </span>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col flex-1">
      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les demandes de documents administratifs des collaborateurs.</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('gns:navigate', { detail: 'docs-collab' }))}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
          style={{ background: '#000000', boxShadow: '0 4px 12px -4px rgba(15,30,61,0.4)' }}
        >
          <Plus size={16} />
          Demander un document
        </button>
      </div>

      {loading ? (
        <Spinner label="Chargement des demandes..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FFFBEB' }}>
                <Clock size={20} style={{ color: '#B45309' }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{stats.aTraiter}</div>
                <div className="text-xs text-gray-500 mt-1">Demandes à traiter</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ECFDF5' }}>
                <FileCheck2 size={20} style={{ color: '#047857' }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{traiteCeMois}</div>
                <div className="text-xs text-gray-500 mt-1">Traitées ce mois</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
                <FileText size={20} style={{ color: '#000000' }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{stats.total}</div>
                <div className="text-xs text-gray-500 mt-1">Total des demandes</div>
              </div>
            </div>
          </div>

          {/* Table des demandes */}
          <section className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden grow shrink-0">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                <Inbox size={15} style={{ color: '#000000' }} />
              </span>
              <h2 className="font-semibold text-gray-900">Demandes de documents</h2>
              <span className="text-xs text-gray-400 ml-auto hidden sm:block">{filtered.length} demande{filtered.length > 1 ? 's' : ''}</span>
            </div>

            {/* Barre d'outils */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2.5 flex-1 sm:max-w-xs rounded-lg border border-gray-200 px-3 py-2 bg-gray-50/60 focus-within:border-gray-300 focus-within:bg-white transition-colors">
                <Search size={15} style={{ color: '#9CA3AF' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Collaborateur, référence, type..."
                  className="bg-transparent text-sm outline-none flex-1 placeholder-gray-400 min-w-0" />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 bg-gray-50/60 overflow-x-auto">
                {[{ key: '', label: 'Tous' }, { key: 'EN_TRAITEMENT', label: 'À traiter' }, { key: 'DISPONIBLE', label: 'Traités' }, { key: 'REFUSE', label: 'Refusés' }].map((s) => (
                  <button key={s.key || 'all'} onClick={() => setFilterStatut(s.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                      filterStatut === s.key ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                    style={filterStatut === s.key ? { background: '#000000' } : undefined}>
                    {s.label}
                  </button>
                ))}
              </div>
              <button onClick={exporterPdf} disabled={exportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:pointer-events-none transition-colors whitespace-nowrap"
                title="Exporter le rapport au format PDF">
                {exportingPdf ? <Loader2 size={14} className="animate-spin" style={{ color: '#000000' }} /> : <FileText size={14} style={{ color: '#000000' }} />}
                Exporter PDF
              </button>
              <button onClick={exporter} disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:pointer-events-none transition-colors whitespace-nowrap"
                title="Exporter la liste au format Excel">
                {exporting ? <Loader2 size={14} className="animate-spin" style={{ color: '#000000' }} /> : <FileDown size={14} style={{ color: '#000000' }} />}
                Exporter Excel
              </button>
            </div>

            {/* Tableau */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: '#FAFAFB' }}>
                    {['Référence', 'Collaborateur', 'Type de document', 'Date', 'Statut', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: '#F3F4F6' }}>
                            <Search size={20} style={{ color: '#9CA3AF' }} />
                          </div>
                          <p className="text-sm text-gray-500">Aucune demande ne correspond à votre recherche.</p>
                        </div>
                      </td>
                    </tr>
                  ) : pageRows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono font-medium text-gray-500">{r.reference}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: r.statut === 'REFUSE' ? '#B91C1C' : r.statut === 'DISPONIBLE' ? '#047857' : '#000000' }}>
                            {r.employeInitiales}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">{r.employeNom}</div>
                            {r.departement && <div className="text-[11px] text-gray-400 truncate">{r.departement}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#F0F4FF' }}>
                            <FileText size={13} style={{ color: '#000000' }} />
                          </span>
                          <span className="text-xs font-medium text-gray-800">{r.typeDocument}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} style={{ color: '#9CA3AF' }} />
                          {fmtDate(r.dateDemande)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge statut={r.statut} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setDetail(r)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            title="Consulter la demande">
                            <Eye size={14} />
                          </button>
                          {r.statut === 'EN_TRAITEMENT' ? (
                            <>
                              <button onClick={() => traiter(r)} disabled={acting === r.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-all"
                                style={{ background: '#059669' }}>
                                {acting === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Traiter
                              </button>
                              <button onClick={() => setShowRefuse(r)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-700 border border-red-200 hover:bg-red-50 transition-colors">
                                <X size={12} /> Refuser
                              </button>
                            </>
                          ) : r.statut === 'DISPONIBLE' ? (
                            <button onClick={() => download(r)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                              <Download size={12} /> PDF
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic truncate max-w-[150px] block" title={r.motifRefus ?? undefined}>
                              {r.motifRefus ?? 'Refusé'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={filtered.length}
              itemLabel={(from, to) => `${from}–${to} sur ${filtered.length} demandes`}
            />
          </section>
        </>
      )}

      {/* Modal — Refus */}
      {showRefuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease]" onClick={() => setShowRefuse(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[modalIn_0.2s_ease-out] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#FEF2F2' }}>
                  <Ban size={17} style={{ color: '#B91C1C' }} />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 leading-tight">Refuser la demande</h3>
                  <p className="text-xs text-gray-500 font-mono">{showRefuse.reference}</p>
                </div>
              </div>
              <button onClick={() => setShowRefuse(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3" style={{ background: '#FFFBEB' }}>
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#B45309' }} />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Le motif sera visible par <strong>{showRefuse.employeNom}</strong> sur son espace personnel.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Motif du refus <span className="text-red-500">*</span></label>
                <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} autoFocus
                  placeholder="Motif obligatoire..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none resize-none placeholder-gray-400 focus:border-red-300 focus:ring-2 focus:ring-red-50 transition-all" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowRefuse(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={refuser} disabled={!motif.trim() || acting === showRefuse.id}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#B91C1C', boxShadow: '0 4px 12px -4px rgba(185,28,28,0.4)' }}>
                  {acting === showRefuse.id && <Loader2 size={14} className="animate-spin" />}
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Consultation de la demande */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease]" onClick={() => setDetail(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-[modalIn_0.2s_ease-out] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F0F4FF' }}>
                  <FileText size={17} style={{ color: '#000000' }} />
                </span>
                <div>
                  <h2 className="font-semibold text-gray-900 leading-tight">Demande de document</h2>
                  <p className="text-xs text-gray-500 font-mono">{detail.reference}</p>
                </div>
              </div>
              <button onClick={() => setDetail(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Statut + collaborateur */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#000000' }}>
                    {detail.employeInitiales}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{detail.employeNom}</div>
                    <div className="text-xs text-gray-400 truncate">{detail.departement ?? '—'}</div>
                  </div>
                </div>
                <StatusBadge statut={detail.statut} />
              </div>

              {/* Métadonnées */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                  <Hash size={14} style={{ color: '#9CA3AF' }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Référence</div>
                    <div className="text-xs font-medium text-gray-700 font-mono">{detail.reference}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                  <FileText size={14} style={{ color: '#9CA3AF' }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Type</div>
                    <div className="text-xs font-medium text-gray-700 truncate">{detail.typeDocument}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                  <Calendar size={14} style={{ color: '#9CA3AF' }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Date de demande</div>
                    <div className="text-xs font-medium text-gray-700">{fmtDate(detail.dateDemande)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                  <User size={14} style={{ color: '#9CA3AF' }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Format</div>
                    <div className="text-xs font-medium text-gray-700">{detail.format === 'DIGITAL' ? 'Digital' : 'Papier'}</div>
                  </div>
                </div>
                {detail.remarque && (
                  <div className="sm:col-span-2 flex items-start gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                    <Info size={14} style={{ color: '#9CA3AF', marginTop: 1 }} />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Remarque du collaborateur</div>
                      <div className="text-xs font-medium text-gray-700">{detail.remarque}</div>
                    </div>
                  </div>
                )}
                {detail.motifRefus && (
                  <div className="sm:col-span-2 flex items-start gap-2.5 rounded-lg px-3.5 py-2.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <Ban size={14} style={{ color: '#B91C1C', marginTop: 1 }} />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">Motif du refus</div>
                      <div className="text-xs font-medium text-red-800">{detail.motifRefus}</div>
                    </div>
                  </div>
                )}
                {detail.signataire && (
                  <div className="sm:col-span-2 flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                    <FileCheck2 size={14} style={{ color: '#047857' }} />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Signataire</div>
                      <div className="text-xs font-medium text-gray-700">
                        {detail.signataire}{detail.dateSignature ? ` · le ${fmtDate(detail.dateSignature)}` : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setDetail(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Fermer
                </button>
                {detail.statut === 'EN_TRAITEMENT' && (
                  <button onClick={() => { setDetail(null); traiter(detail) }} disabled={acting === detail.id}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
                    style={{ background: '#059669' }}>
                    {acting === detail.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Marquer comme traité
                  </button>
                )}
                {detail.statut === 'DISPONIBLE' && (
                  <button onClick={() => { setDetail(null); download(detail) }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2 transition-all"
                    style={{ background: '#000000' }}>
                    <Download size={14} /> Télécharger le PDF
                  </button>
                )}
                {detail.statut === 'REFUSE' && (
                  <button onClick={() => setDetail(null)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    Compris
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
