import { useCallback, useEffect, useState } from 'react'
import { Download, FileText, Loader2, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { employeApi, reportingApi } from '../api/modules'
import type { IdLabel, KpiReport, RapportRH } from '../api/types'
import { ErrorBlock, fmtDate, Spinner, useToasts } from '../components/ui'
import { downloadKpiPdf, downloadRapportHistoryPdf } from '../services/pdf'

const CATEGORIES = ['Effectifs', 'Congés', 'Recrutement', 'Formation', 'Finance']

const CAT_COLORS: Record<string, string> = {
  Effectifs: '#0F1E3D', Congés: '#C9A227', Recrutement: '#10B981',
  Formation: '#F59E0B', Finance: '#6366F1',
}

export default function KPI() {
  const { success, error: toastError } = useToasts()

  const [categorie, setCategorie] = useState('')
  const [departement, setDepartement] = useState('')
  const [depts, setDepts] = useState<IdLabel[]>([])
  const [kpis, setKpis] = useState<KpiReport[]>([])
  const [rapports, setRapports] = useState<RapportRH[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [k, r] = await Promise.all([
        reportingApi.kpis({ categorie: categorie || undefined, departement: departement || undefined }),
        reportingApi.rapports(),
      ])
      setKpis(k)
      setRapports(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [categorie, departement])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    employeApi.departements().then(setDepts).catch(() => {})
  }, [])

  const chartData = kpis.slice(0, 12).map((k) => ({ name: k.nom.length > 22 ? k.nom.slice(0, 20) + '…' : k.nom, valeur: parseFloat(k.valeur.replace(',', '.')) || 0, cat: k.categorie }))

  const rapportComplet = async () => {
    setGenerating(true)
    try {
      // Génération PDF 100 % côté client à partir des indicateurs réellement affichés
      downloadKpiPdf(kpis, { categorie: categorie || undefined, departement: departement || undefined })
      success('Rapport RH complet généré et téléchargé (PDF)')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setGenerating(false)
    }
  }

  const exporterHistoriquePdf = () => {
    try {
      downloadRapportHistoryPdf(rapports)
      success('Historique des rapports exporté en PDF')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l\'export')
    }
  }

  const exportXlsx = async () => {
    try {
      await reportingApi.exportXlsx({ categorie: categorie || undefined, departement: departement || undefined })
      success('Export Excel téléchargé')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">KPI & Reporting</h1>
        <div className="flex gap-2">
          <button onClick={rapportComplet} disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60" style={{ background: '#0F1E3D' }}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Rapport RH complet
          </button>
          <button onClick={exportXlsx}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50">
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCategorie('')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: categorie === '' ? '#0F1E3D' : '#fff', color: categorie === '' ? '#fff' : '#6B7280', border: `1px solid ${categorie === '' ? '#0F1E3D' : '#E5E7EB'}` }}>
            Toutes
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategorie(categorie === c ? '' : c)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: categorie === c ? CAT_COLORS[c] : '#fff', color: categorie === c ? '#fff' : '#6B7280', border: `1px solid ${categorie === c ? CAT_COLORS[c] : '#E5E7EB'}` }}>
              {c}
            </button>
          ))}
        </div>
        <select value={departement} onChange={(e) => setDepartement(e.target.value)}
          className="text-xs rounded-lg border border-gray-200 px-3 py-2 outline-none">
          <option value="">Tous les départements</option>
          {depts.map((d) => <option key={d.id} value={d.nom}>{d.nom}</option>)}
        </select>
      </div>

      {loading ? (
        <Spinner label="Calcul des indicateurs..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <>
          {/* Indicateurs */}
          <div className="grid grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-xl font-bold" style={{ color: CAT_COLORS[k.categorie] ?? '#0F1E3D' }}>{k.valeur}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate" title={k.nom}>{k.nom}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{k.categorie} · {k.unite}</div>
              </div>
            ))}
          </div>

          {/* Graphique */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Indicateurs ({categorie || 'toutes catégories'})</h3>
            {chartData.length === 0 ? (
              <div className="text-center py-16 text-sm" style={{ color: '#9CA3AF' }}>Aucun indicateur pour ces filtres</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                  <Bar dataKey="valeur" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={CAT_COLORS[d.cat] ?? '#0F1E3D'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Historique des rapports */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Historique des rapports générés ({rapports.length})</h3>
              {rapports.length > 0 && (
                <button onClick={exporterHistoriquePdf}
                  className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#0F1E3D' }}
                  title="Exporter l'historique des rapports en PDF">
                  <Download size={12} /> Exporter PDF
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Titre', 'Type', 'Format', 'Généré le', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rapports.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucun rapport généré</td></tr>
                ) : rapports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs font-medium text-gray-900">{r.titre}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{r.typeRapport}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{r.format}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(r.dateGeneration)}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => reportingApi.rapportDownload(r.id).then(() => success('Rapport téléchargé')).catch((e) => toastError(e.message))}
                        className="flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: '#0F1E3D' }}>
                        <RefreshCw size={11} /> Re-télécharger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
