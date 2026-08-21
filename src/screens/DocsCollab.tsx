import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  X, Download, Loader2, FileText, Plus, Search, Eye, Calendar,
  Monitor, Printer, FileCheck2, Clock, FileX2, Inbox, Info, Hash, User, FileDown,
} from 'lucide-react'
import { documentsApi } from '../api/modules'
import type { DemandeDocument, IdLabel } from '../api/types'
import { ErrorBlock, fmtDate, Pagination, Spinner, useToasts } from '../components/ui'
import { downloadDocumentOfficielPdf, downloadDocumentPdf } from '../services/pdf'

const STATUS_META: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  DISPONIBLE: { label: 'Disponible', bg: '#ECFDF5', color: '#047857', dot: '#10B981' },
  EN_TRAITEMENT: { label: 'En traitement', bg: '#FFFBEB', color: '#B45309', dot: '#F59E0B' },
  REFUSE: { label: 'Refusé', bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
}

const FORMAT_META: Record<string, { label: string; icon: typeof Monitor }> = {
  DIGITAL: { label: 'Digital', icon: Monitor },
  PAPIER: { label: 'Papier', icon: Printer },
}

const PAGE_SIZE = 8

export default function DocsCollab() {
  const { success, error: toastError } = useToasts()

  const [demandes, setDemandes] = useState<DemandeDocument[]>([])
  const [types, setTypes] = useState<IdLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [docType, setDocType] = useState('')
  const [format, setFormat] = useState<'DIGITAL' | 'PAPIER'>('DIGITAL')
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<DemandeDocument | null>(null)

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [d, t] = await Promise.all([documentsApi.mesDemandes(), documentsApi.types()])
      setDemandes(d)
      setTypes(t)
      if (!docType && t.length > 0) setDocType(String(t[0].id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const ouvrir = () => setShowModal(true)
    window.addEventListener('gns:nouvelle-doc', ouvrir)
    return () => window.removeEventListener('gns:nouvelle-doc', ouvrir)
  }, [])

  // Réinitialise la pagination quand la recherche ou le filtre change
  useEffect(() => {
    setPage(1)
  }, [search, filterStatut])

  const dispoDocs = useMemo(() => demandes.filter((d) => d.statut === 'DISPONIBLE'), [demandes])

  // « Nouveau » : document disponible depuis moins de 30 jours
  const isRecent = useCallback((d: DemandeDocument) => {
    const t = new Date(d.dateDemande)
    const now = new Date()
    return now.getTime() - t.getTime() <= 30 * 24 * 60 * 60 * 1000
  }, [])

  const stats = useMemo(() => ({
    dispo: dispoDocs.length,
    enTraitement: demandes.filter((d) => d.statut === 'EN_TRAITEMENT').length,
    refuse: demandes.filter((d) => d.statut === 'REFUSE').length,
  }), [demandes, dispoDocs])

  const filtered = useMemo(() => demandes.filter((r) => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q
      || r.reference.toLowerCase().includes(q)
      || r.typeDocument.toLowerCase().includes(q)
      || (r.format ?? '').toLowerCase().includes(q)
    const matchStatut = !filterStatut || r.statut === filterStatut
    return matchSearch && matchStatut
  }), [demandes, search, filterStatut])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await documentsApi.creerDemande({ typeDocumentId: Number(docType), format, remarque: remark.trim() || undefined })
      success('Demande enregistrée')
      setShowModal(false)
      setRemark('')
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const download = async (d: DemandeDocument) => {
    try {
      // Document officiel généré côté client — présentation professionnelle garantie
      downloadDocumentOfficielPdf(d)
      success(`Document ${d.reference} téléchargé (PDF officiel)`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur de téléchargement')
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
      // Génération PDF 100 % côté client avec les données réellement affichées
      downloadDocumentPdf(demandes, null, `Mes demandes de documents — ${demandes.length} demande(s)`)
      success('Export PDF téléchargé')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l’export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const FormatBadge = ({ value }: { value: string }) => {
    const meta = FORMAT_META[value] ?? FORMAT_META.DIGITAL
    const Icon = meta.icon
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md"
        style={{ background: '#F3F4F6', color: '#374151' }}>
        <Icon size={12} style={{ color: '#6B7280' }} />
        {meta.label}
      </span>
    )
  }

  const StatusBadge = ({ statut }: { statut: string }) => {
    const meta = STATUS_META[statut] ?? { label: statut, bg: '#F3F4F6', color: '#4B5563', dot: '#9CA3AF' }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: meta.bg, color: meta.color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
        {meta.label}
      </span>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto flex flex-col flex-1">
      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Mes Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Demandez et consultez vos documents administratifs et RH.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
          style={{ background: '#000000', boxShadow: '0 4px 12px -4px rgba(15,30,61,0.4)' }}
        >
          <Plus size={16} />
          Demander un document
        </button>
      </div>

      {loading ? (
        <Spinner label="Chargement de vos documents..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <>
          {/* Mini indicateurs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ECFDF5' }}>
                <FileCheck2 size={19} style={{ color: '#047857' }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{stats.dispo}</div>
                <div className="text-xs text-gray-500 mt-1">Documents disponibles</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FFFBEB' }}>
                <Clock size={19} style={{ color: '#B45309' }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{stats.enTraitement}</div>
                <div className="text-xs text-gray-500 mt-1">Demandes en traitement</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FEF2F2' }}>
                <FileX2 size={19} style={{ color: '#B91C1C' }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{stats.refuse}</div>
                <div className="text-xs text-gray-500 mt-1">Demandes refusées</div>
              </div>
            </div>
          </div>

          {/* Documents disponibles */}
          <section className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EEF2FF' }}>
                  <FileText size={15} style={{ color: '#000000' }} />
                </span>
                <h2 className="font-semibold text-gray-900">Documents disponibles</h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#047857' }}>
                {dispoDocs.length} disponible{dispoDocs.length > 1 ? 's' : ''}
              </span>
            </div>
            {dispoDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: '#F3F4F6' }}>
                  <Inbox size={22} style={{ color: '#9CA3AF' }} />
                </div>
                <p className="text-sm text-gray-500">Aucun document disponible pour le moment.</p>
                <p className="text-xs text-gray-400 mt-1">Vos demandes traitées par le service RH apparaîtront ici.</p>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {dispoDocs.map((doc) => (
                  <div key={doc.id}
                    className="flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-200/80 hover:border-gray-300 hover:shadow-sm transition-all group">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'F3F4F6' }}>
                      <FileText size={20} style={{ color: '#000000' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">{doc.typeDocument}</span>
                        {isRecent(doc) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                            style={{ background: '#DBEAFE', color: '#1D4ED8' }}>Nouveau</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="font-mono text-gray-400">{doc.reference}</span>
                        <span>·</span>
                        <span>{fmtDate(doc.dateDemande)}</span>
                        <span>·</span>
                        <FormatBadge value={doc.format} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPreview(doc)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        title="Consulter le document">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => download(doc)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-white hover:opacity-90"
                        style={{ background: '#000000' }}
                        title="Télécharger le PDF">
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Historique des demandes */}
          <section className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden grow shrink-0">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                <Clock size={15} style={{ color: '#000000' }} />
              </span>
              <h2 className="font-semibold text-gray-900">Historique des demandes</h2>
              <span className="text-xs text-gray-400 ml-auto hidden sm:block">{filtered.length} demande{filtered.length > 1 ? 's' : ''}</span>
            </div>

            {/* Barre d'outils */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2.5 flex-1 sm:max-w-xs rounded-lg border border-gray-200 px-3 py-2 bg-gray-50/60 focus-within:border-gray-300 focus-within:bg-white transition-colors">
                <Search size={15} style={{ color: '#9CA3AF' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Référence, type, format..."
                  className="bg-transparent text-sm outline-none flex-1 placeholder-gray-400 min-w-0" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 hidden sm:block">Statut</span>
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 bg-gray-50/60 overflow-x-auto">
                {[{ key: '', label: 'Tous' }, { key: 'DISPONIBLE', label: 'Disponibles' }, { key: 'EN_TRAITEMENT', label: 'En traitement' }, { key: 'REFUSE', label: 'Refusées' }].map((s) => (
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
                title="Exporter mon historique au format PDF">
                {exportingPdf ? <Loader2 size={14} className="animate-spin" style={{ color: '#000000' }} /> : <FileText size={14} style={{ color: '#000000' }} />}
                Exporter PDF
              </button>
              <button onClick={exporter} disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:pointer-events-none transition-colors whitespace-nowrap"
                title="Exporter mon historique au format Excel">
                {exporting ? <Loader2 size={14} className="animate-spin" style={{ color: '#000000' }} /> : <FileDown size={14} style={{ color: '#000000' }} />}
                Exporter Excel
              </button>
            </div>
            </div>

            {/* Tableau */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: '#FAFAFB' }}>
                    {['Référence', 'Type de document', 'Format', 'Date', 'Statut', 'Actions'].map((h) => (
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
                  ) : pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono font-medium text-gray-500">{row.reference}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'F3F4F6' }}>
                            <FileText size={13} style={{ color: '#000000' }} />
                          </span>
                          <span className="text-xs font-medium text-gray-800">{row.typeDocument}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><FormatBadge value={row.format} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} style={{ color: '#9CA3AF' }} />
                          {fmtDate(row.dateDemande)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge statut={row.statut} /></td>
                      <td className="px-5 py-3.5">
                        {row.statut === 'DISPONIBLE' ? (
                          <button onClick={() => download(row)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                            <Download size={12} /> PDF
                          </button>
                        ) : row.statut === 'REFUSE' ? (
                          <span className="text-xs text-gray-400 italic truncate max-w-[160px] block" title={row.motifRefus ?? undefined}>
                            {row.motifRefus ?? 'Refusé'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
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

      {/* Modal — Nouvelle demande de document */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease]" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-[modalIn_0.2s_ease-out] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'F3F4F6' }}>
                  <FileText size={17} style={{ color: '#000000' }} />
                </span>
                <div>
                  <h2 className="font-semibold text-gray-900 leading-tight">Demander un document</h2>
                  <p className="text-xs text-gray-500">Le service RH traitera votre demande.</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-5">
              {/* Type de document */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2.5">Type de document <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {types.length === 0 ? (
                    <div className="col-span-full text-sm text-gray-400 py-4 text-center">Aucun type de document disponible</div>
                  ) : types.map((t) => {
                    const selected = docType === String(t.id)
                    return (
                      <button type="button" key={t.id} onClick={() => setDocType(String(t.id))}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-[#000000] ring-1 ring-[#000000]'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                        style={selected ? { background: '#F7F9FE' } : undefined}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: selected ? '#000000' : '#F3F4F6' }}>
                          <FileText size={14} style={{ color: selected ? '#fff' : '#6B7280' }} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm font-medium truncate ${selected ? 'text-gray-900' : 'text-gray-700'}`}>{t.nom}</span>
                        </span>
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? 'border-[#000000]' : 'border-gray-300'}`}>
                          {selected && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000000' }} />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2.5">Format souhaité</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {([{ key: 'DIGITAL', label: 'Digital', desc: 'Envoi par email', icon: Monitor }, { key: 'PAPIER', label: 'Papier', desc: 'Retrait au bureau', icon: Printer }] as const).map((f) => {
                    const selected = format === f.key
                    const Icon = f.icon
                    return (
                      <button type="button" key={f.key} onClick={() => setFormat(f.key)}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-[#000000] ring-1 ring-[#000000]'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                        style={selected ? { background: '#F7F9FE' } : undefined}>
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: selected ? '#000000' : '#F3F4F6' }}>
                          <Icon size={16} style={{ color: selected ? '#fff' : '#6B7280' }} />
                        </span>
                        <span>
                          <span className={`block text-sm font-semibold ${selected ? 'text-gray-900' : 'text-gray-700'}`}>{f.label}</span>
                          <span className="block text-[11px] text-gray-400">{f.desc}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Remarques */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Remarques <span className="font-normal text-gray-400">(optionnel)</span></label>
                <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3}
                  placeholder="Précisions éventuelles..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none resize-none placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving || !docType}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#000000', boxShadow: '0 4px 12px -4px rgba(15,30,61,0.4)' }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Envoyer la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Aperçu du document */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease]" onClick={() => setPreview(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl animate-[modalIn_0.2s_ease-out] overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                  <FileText size={17} style={{ color: '#000000' }} />
                </span>
                <div>
                  <h2 className="font-semibold text-gray-900 leading-tight">{preview.typeDocument}</h2>
                  <p className="text-xs text-gray-500 font-mono">{preview.reference}</p>
                </div>
              </div>
              <button onClick={() => setPreview(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 space-y-5">
              {/* Aperçu du document */}
              <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="h-1.5" style={{ background: '#000000' }} />
                <div className="p-6 sm:p-8" style={{ fontFamily: 'Georgia, serif' }}>
                  <div className="text-center mb-6">
                    <div className="font-bold text-xl tracking-wide" style={{ color: '#000000' }}>GNS TECHNOLOGIES</div>
                    <div className="text-xs text-gray-500 mt-1">Société à Responsabilité Limitée · Casablanca, Maroc</div>
                  </div>
                  <div className="text-center font-bold text-lg mb-6 underline decoration-2 underline-offset-4" style={{ color: '#000000' }}>
                    {preview.typeDocument.toUpperCase()}
                  </div>
                  <div className="text-sm leading-7 text-gray-700 space-y-2.5">
                    <p>Document délivré à <strong>{preview.employeNom}</strong>,</p>
                    <p>format <strong>{preview.format === 'DIGITAL' ? 'numérique' : 'papier'}</strong>{preview.remarque ? `, remarque : « ${preview.remarque} »` : ''}.</p>
                    <p>Ce document a été généré et certifié par le service RH de GNS Technologies.</p>
                  </div>
                  <div className="flex justify-end mt-8">
                    <div className="text-right">
                      <div className="text-sm text-gray-700">Casablanca, le {fmtDate(preview.dateDemande)}</div>
                      <div className="mt-4 inline-block rounded-full border-2 px-3.5 py-2 text-center"
                        style={{ borderColor: '#000000', color: '#000000', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>
                        GNS TECHNOLOGIES ✓ CERTIFIÉ
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métadonnées */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                  <User size={14} style={{ color: '#9CA3AF' }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Titulaire</div>
                    <div className="text-xs font-medium text-gray-700 truncate">{preview.employeNom}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                  <Hash size={14} style={{ color: '#9CA3AF' }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Référence</div>
                    <div className="text-xs font-medium text-gray-700 font-mono">{preview.reference}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                  <Calendar size={14} style={{ color: '#9CA3AF' }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Date de demande</div>
                    <div className="text-xs font-medium text-gray-700">{fmtDate(preview.dateDemande)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                  <Monitor size={14} style={{ color: '#9CA3AF' }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Format</div>
                    <div className="text-xs font-medium text-gray-700">{preview.format === 'DIGITAL' ? 'Digital' : 'Papier'}</div>
                  </div>
                </div>
                {preview.signataire && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                    <Info size={14} style={{ color: '#9CA3AF' }} />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Signataire</div>
                      <div className="text-xs font-medium text-gray-700 truncate">{preview.signataire}</div>
                    </div>
                  </div>
                )}
                {preview.remarque && (
                  <div className="sm:col-span-2 flex items-start gap-2.5 rounded-lg border border-gray-100 px-3.5 py-2.5">
                    <Info size={14} style={{ color: '#9CA3AF', marginTop: 1 }} />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Remarque</div>
                      <div className="text-xs font-medium text-gray-700">{preview.remarque}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button onClick={() => setPreview(null)}
                className="sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                Fermer
              </button>
              <button onClick={() => download(preview)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-95 flex items-center justify-center gap-2 transition-all"
                style={{ background: '#000000', boxShadow: '0 4px 12px -4px rgba(15,30,61,0.4)' }}>
                <Download size={15} /> Télécharger le PDF réel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
