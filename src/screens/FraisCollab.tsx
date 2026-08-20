import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { X, Upload, Loader2, Eye } from 'lucide-react'
import { fraisApi } from '../api/modules'
import type { NoteFrais, SyntheseFrais } from '../api/types'
import { ErrorBlock, fmtDate, Spinner, useToasts } from '../components/ui'

const CURRENCIES = ['MAD', 'USD', 'EUR']
const PRIORITIES = ['Normale', 'Haute', 'Urgente']

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  EN_ATTENTE: { bg: '#FEF3C7', color: '#92400E', label: 'En attente' },
  EN_COURS: { bg: '#DBEAFE', color: '#1D4ED8', label: 'En cours' },
  REMBOURSEE: { bg: '#D1FAE5', color: '#065F46', label: 'Remboursée' },
  REFUSEE: { bg: '#FEE2E2', color: '#991B1B', label: 'Refusée' },
  ANNULEE: { bg: '#F3F4F6', color: '#4B5563', label: 'Annulée' },
}

export default function FraisCollab() {
  const { success, error: toastError } = useToasts()

  const [notes, setNotes] = useState<NoteFrais[]>([])
  const [synthese, setSynthese] = useState<SyntheseFrais | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<NoteFrais | null>(null)
  const [detail, setDetail] = useState<NoteFrais | null>(null)
  const [saving, setSaving] = useState(false)

  const [titre, setTitre] = useState('')
  const [devise, setDevise] = useState('MAD')
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState('')
  const [priorite, setPriorite] = useState('Normale')
  const [remarque, setRemarque] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [n, s] = await Promise.all([fraisApi.mesNotes(), fraisApi.synthese()])
      setNotes(n)
      setSynthese(s)
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
    const ouvrir = () => openCreate()
    window.addEventListener('gns:nouvelle-frais', ouvrir)
    return () => window.removeEventListener('gns:nouvelle-frais', ouvrir)
  }, [])

  const openCreate = () => {
    setEditing(null)
    setTitre(''); setDevise('MAD'); setMontant(''); setDate(new Date().toISOString().slice(0, 10))
    setPriorite('Normale'); setRemarque(''); setFiles([])
    setShowModal(true)
  }

  const openEdit = (n: NoteFrais) => {
    setEditing(n)
    setTitre(n.titre); setDevise(n.devise); setMontant(String(n.montantTotal))
    setDate(n.date); setPriorite(n.priorite); setRemarque(n.remarque ?? ''); setFiles([])
    setShowModal(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = { titre: titre.trim(), devise, date, priorite, remarque: remarque.trim() || null, montantTotal: Number(montant) || 0, depenses: [] }
    try {
      if (editing) {
        await fraisApi.modifier(editing.id, payload, files)
        success('Note modifiée')
      } else {
        await fraisApi.creer(payload, files)
        success('Note soumise pour validation')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const annuler = async (n: NoteFrais) => {
    if (!window.confirm(`Annuler la note ${n.reference} ?`)) return
    try {
      await fraisApi.annuler(n.id)
      success('Note annulée')
      setDetail(null)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const downloadJustif = (url: string) => {
    const fileName = url.split('/').pop()
    if (!fileName) return
    fraisApi.justificatif(fileName)
      .then(() => success('Justificatif téléchargé'))
      .catch((e) => toastError(e.message))
  }

  const cards = [
    { label: 'En attente', value: synthese?.enAttente, color: '#F59E0B' },
    { label: 'En cours', value: synthese?.enCours, color: '#3B82F6' },
    { label: 'Remboursée', value: synthese?.remboursee, color: '#10B981' },
    { label: 'Refusée', value: synthese?.refusee, color: '#EF4444' },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes Notes de frais</h1>
        <button onClick={openCreate}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#000000' }}>
          + Nouvelle note de frais
        </button>
      </div>

      {loading ? (
        <Spinner label="Chargement de vos notes..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <>
          {/* Cartes de synthèse */}
          <div className="grid grid-cols-4 gap-4">
            {cards.map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value?.count ?? 0}</div>
                <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
                <div className="text-xs mt-1 font-medium" style={{ color: '#6B7280' }}>
                  {new Intl.NumberFormat('fr-FR').format(c.value?.montant ?? 0)} MAD
                </div>
              </div>
            ))}
          </div>

          {/* Historique */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Historique des notes</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Référence', 'Titre/Motif', 'Date', 'Dépenses', 'Montant', 'Statut', ''].map((h) => (
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
                        <div className="text-xs font-medium text-gray-900">{n.titre}</div>
                        <div className="text-xs text-gray-400">{n.priorite}</div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(n.date)}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{n.nbDepenses} dépense(s)</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{n.montantTotal.toLocaleString('fr-FR')} {n.devise}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => { fraisApi.detail(n.id).then(setDetail).catch((e) => toastError(e.message)) }}
                          className="text-xs font-semibold hover:underline" style={{ color: '#000000' }}>
                          Ouvrir
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modale nouvelle note */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">{editing ? 'Modifier la note' : 'Nouvelle note de frais'}</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Titre / Motif *</label>
                <input value={titre} onChange={(e) => setTitre(e.target.value)} required placeholder="Ex. Mission client"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Devise</label>
                  <select value={devise} onChange={(e) => setDevise(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Montant total *</label>
                  <input type="number" min={0} step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} required placeholder="0.00"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Priorité</label>
                  <select value={priorite} onChange={(e) => setPriorite(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Justificatifs</label>
                <label className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors block">
                  <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">
                    {files.length > 0 ? `${files.length} fichier(s) sélectionné(s)` : 'Glissez un fichier ou cliquez pour sélectionner'}
                  </p>
                  <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg" style={{ background: '#F7F8FA' }}>
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Remarque</label>
                <textarea value={remarque} onChange={(e) => setRemarque(e.target.value)} rows={2} placeholder="Précisions..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: '#000000' }}>
                  {saving && <Loader2 size={13} className="animate-spin" />} {editing ? 'Enregistrer' : 'Demander'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale détail */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">{detail.titre}</h2>
                <div className="text-xs text-gray-400 font-mono">{detail.reference}</div>
              </div>
              <button onClick={() => setDetail(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Date', value: fmtDate(detail.date) },
                { label: 'Priorité', value: detail.priorite },
                { label: 'Montant', value: `${detail.montantTotal.toLocaleString('fr-FR')} ${detail.devise}` },
                { label: 'Statut', value: STATUS_MAP[detail.statut]?.label ?? detail.statut },
              ].map((row, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-medium text-gray-900">{row.value}</span>
                </div>
              ))}
              {detail.motifRefus && (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
                  <span className="font-semibold">Motif du refus : </span>{detail.motifRefus}
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Dépenses</div>
                <div className="space-y-1.5">
                  {detail.depenses.length === 0 && <div className="text-xs text-gray-400">Aucune dépense détaillée</div>}
                  {detail.depenses.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg" style={{ background: '#F7F8FA' }}>
                      <span className="text-gray-700">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Justificatifs ({(detail.justificatifs ?? []).length})</div>
                <div className="flex flex-wrap gap-2">
                  {(detail.justificatifs ?? []).map((url, i) => (
                    <button key={i} onClick={() => downloadJustif(url)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <Eye size={11} /> {url.split('/').pop()}
                    </button>
                  ))}
                </div>
              </div>
              {detail.statut === 'EN_ATTENTE' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setDetail(null); openEdit(detail) }}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50">Modifier</button>
                  <button onClick={() => annuler(detail)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90" style={{ background: '#B91C1C' }}>
                    Annuler la note
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
