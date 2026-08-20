import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MapPin, Clock, Users, X, Trash2, Download, Loader2 } from 'lucide-react'
import { evenementsApi } from '../api/modules'
import type { EvenementItem } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { ErrorBlock, fmtDate, Spinner, useToasts } from '../components/ui'

const TYPE_COLORS: Record<string, string> = {
  Formation: '#0F1E3D', Séminaire: '#C9A227', Réunion: '#6366F1',
  Atelier: '#F59E0B', Célébration: '#EC4899', 'Team Building': '#10B981',
  Conférence: '#8B5CF6', 'Événement sportif': '#14B8A6',
}

const TYPE_CHOICES = ['Formation', 'Séminaire', 'Réunion', 'Atelier', 'Célébration', 'Team Building', 'Conférence', 'Événement sportif']

export default function Evenements() {
  const { isRh } = useAuth()
  const { success, error: toastError } = useToasts()

  const [events, setEvents] = useState<EvenementItem[]>([])
  const [category, setCategory] = useState('Tous')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<EvenementItem | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showInscrits, setShowInscrits] = useState(false)
  const [inscrits, setInscrits] = useState<{ employeId: number; nomComplet: string; email: string; departement: string | null; dateInscription: string }[]>([])
  const [saving, setSaving] = useState(false)

  // Formulaire
  const [form, setForm] = useState({ titre: '', type: TYPE_CHOICES[0], date: '', heure: '', lieu: '', participantsMax: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setEvents(await evenementsApi.lister())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categories = ['Tous', 'Mes inscriptions', ...new Set(events.map((e) => e.type).filter((t): t is string => !!t))]

  const filtered = category === 'Tous' ? events
    : category === 'Mes inscriptions' ? events.filter((e) => e.inscrit)
    : events.filter((e) => e.type === category)

  const now = new Date()
  const kpis = [
    { label: 'Événements à venir', value: events.filter((e) => new Date(e.dateDebut + 'T00:00:00') >= now).length, color: '#0F1E3D' },
    { label: 'Participants inscrits', value: events.reduce((s, e) => s + e.inscrits, 0), color: '#C9A227' },
    { label: 'Ce mois', value: events.filter((e) => { const d = new Date(e.dateDebut + 'T00:00:00'); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).length, color: '#10B981' },
    { label: 'Mes inscriptions', value: events.filter((e) => e.inscrit).length, color: '#6366F1' },
  ]

  const toggleRegister = async (ev: EvenementItem) => {
    try {
      const updated = ev.inscrit
        ? await evenementsApi.desinscrire(ev.id)
        : await evenementsApi.inscrire(ev.id)
      setEvents((prev) => prev.map((e) => (e.id === ev.id ? updated : e)))
      if (selected?.id === ev.id) setSelected(updated)
      success(ev.inscrit ? 'Désinscription effectuée' : 'Inscription enregistrée')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const colorOf = (ev: EvenementItem) => TYPE_COLORS[ev.type ?? ''] ?? '#0F1E3D'

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await evenementsApi.creer({
        titre: form.titre.trim(), type: form.type, date: form.date,
        heure: form.heure || null, lieu: form.lieu.trim() || null,
        participantsMax: Number(form.participantsMax) || 0,
      })
      success('Événement publié')
      setShowCreate(false)
      setForm({ titre: '', type: TYPE_CHOICES[0], date: '', heure: '', lieu: '', participantsMax: '' })
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const removeEvent = async (ev: EvenementItem) => {
    if (!window.confirm(`Supprimer l'événement « ${ev.titre} » ?`)) return
    try {
      await evenementsApi.supprimer(ev.id)
      success('Événement supprimé')
      setSelected(null)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const openInscrits = async (ev: EvenementItem) => {
    try {
      setInscrits(await evenementsApi.inscrits(ev.id))
      setShowInscrits(true)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Événements d'entreprise</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ateliers, formations, célébrations</p>
        </div>
        {isRh && (
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#0F1E3D' }}>
            + Créer un événement
          </button>
        )}
      </div>

      {/* Catégories avec capacité */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(
          events.reduce<Record<string, { inscrits: number; max: number }>>((acc, e) => {
            const t = e.type ?? 'Autre'
            if (!acc[t]) acc[t] = { inscrits: 0, max: 0 }
            acc[t].inscrits += e.inscrits
            acc[t].max += e.participantsMax
            return acc
          }, {})
        ).map(([type, cap]) => (
          <div key={type} className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ background: (TYPE_COLORS[type] ?? '#0F1E3D') + '10', borderColor: (TYPE_COLORS[type] ?? '#0F1E3D') + '30' }}>
            <span className="text-xs font-semibold" style={{ color: TYPE_COLORS[type] ?? '#0F1E3D' }}>{type}</span>
            <span className="text-xs text-gray-500">{cap.inscrits}/{cap.max > 0 ? cap.max : '∞'}</span>
          </div>
        ))}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: category === cat ? '#0F1E3D' : '#fff',
              color: category === cat ? '#fff' : '#6B7280',
              border: `1px solid ${category === cat ? '#0F1E3D' : '#E5E7EB'}`,
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <Spinner label="Chargement des événements..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-sm" style={{ color: '#9CA3AF' }}>Aucun événement dans cette catégorie</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((ev) => {
            const color = colorOf(ev)
            const fillPct = ev.participantsMax > 0 ? Math.min(100, Math.round((ev.inscrits / ev.participantsMax) * 100)) : 0
            return (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-1.5" style={{ background: color }} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: color + '18', color }}>
                      {ev.type}
                    </span>
                    {ev.inscrit && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>
                        ✓ Inscrit
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 leading-tight mb-3">{ev.titre}</h3>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock size={11} /> {fmtDate(ev.dateDebut)}{ev.dateFin !== ev.dateDebut ? ` → ${fmtDate(ev.dateFin)}` : ''}{ev.heureDebut ? ` · ${ev.heureDebut.slice(0, 5)}` : ''}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={11} /> {ev.lieu ?? '—'}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {ev.inscrits}{ev.participantsMax > 0 ? `/${ev.participantsMax}` : ''} participants
                      </span>
                      {ev.participantsMax > 0 && <span>{fillPct}%</span>}
                    </div>
                    {ev.participantsMax > 0 && (
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${fillPct}%`, background: color }} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelected(ev)}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      Détails
                    </button>
                    <button
                      onClick={() => toggleRegister(ev)}
                      disabled={!ev.inscrit && ev.complet}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: ev.inscrit ? '#EF4444' : ev.complet ? '#9CA3AF' : color }}>
                      {ev.complet && !ev.inscrit ? 'Complet' : ev.inscrit ? 'Se désinscrire' : "S'inscrire"}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="h-2 rounded-t-2xl" style={{ background: colorOf(selected) }} />
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{selected.titre}</h2>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: colorOf(selected) + '18', color: colorOf(selected) }}>
                  {selected.type}
                </span>
                {selected.inscrit && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>✓ Inscrit</span>
                )}
              </div>
              {[
                { icon: Clock, label: 'Date & heure', value: `${fmtDate(selected.dateDebut)}${selected.dateFin !== selected.dateDebut ? ` → ${fmtDate(selected.dateFin)}` : ''}${selected.heureDebut ? ` · ${selected.heureDebut.slice(0, 5)}` : ''}` },
                { icon: MapPin, label: 'Lieu', value: selected.lieu ?? '—' },
                { icon: Users, label: 'Participants', value: `${selected.inscrits}${selected.participantsMax > 0 ? ` / ${selected.participantsMax}` : ''}${selected.participantsMax > 0 ? ` (${Math.round(selected.tauxRemplissage)}%)` : ''}` },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#F7F8FA' }}>
                    <Icon size={14} style={{ color: colorOf(selected) }} />
                    <div>
                      <div className="text-xs text-gray-400">{item.label}</div>
                      <div className="text-sm font-medium text-gray-900">{item.value}</div>
                    </div>
                  </div>
                )
              })}
              {isRh && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openInscrits(selected)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1">
                    <Users size={11} /> Liste des inscrits
                  </button>
                  <button onClick={() => evenementsApi.exportInscrits(selected.id).then(() => success('Export Excel téléchargé')).catch((e) => toastError(e.message))}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1">
                    <Download size={11} /> Export Excel
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setSelected(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Fermer</button>
              {isRh && (
                <button onClick={() => removeEvent(selected)}
                  className="py-2.5 px-4 rounded-lg text-sm font-semibold text-white hover:opacity-90 flex items-center gap-1" style={{ background: '#B91C1C' }}>
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
              <button onClick={() => { toggleRegister(selected) }}
                disabled={!selected.inscrit && selected.complet}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                style={{ background: selected.inscrit ? '#EF4444' : colorOf(selected) }}>
                {selected.inscrit ? 'Se désinscrire' : selected.complet ? 'Complet' : "S'inscrire"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inscrits modal (RH) */}
      {showInscrits && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Inscrits — {selected.titre}</h2>
              <button onClick={() => setShowInscrits(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
              {inscrits.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>Aucun inscrit pour le moment</div>
              ) : inscrits.map((i) => (
                <div key={i.employeId} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: '#F7F8FA' }}>
                  <div className="w-8 h-8 rounded-full bg-[#0F1E3D] text-white flex items-center justify-center text-xs font-bold">
                    {i.nomComplet.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{i.nomComplet}</div>
                    <div className="text-xs text-gray-500">{i.email} · {i.departement ?? '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create modal (RH) */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Créer un événement</h2>
              <button onClick={() => setShowCreate(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <form onSubmit={submitCreate} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Titre *</label>
                <input required value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                  placeholder="Nom de l'événement" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                  <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Heure</label>
                  <input type="time" value={form.heure} onChange={(e) => setForm((f) => ({ ...f, heure: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type *</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {TYPE_CHOICES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Participants max</label>
                  <input type="number" min={0} value={form.participantsMax} onChange={(e) => setForm((f) => ({ ...f, participantsMax: e.target.value }))}
                    placeholder="0 = illimité" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Lieu</label>
                <input value={form.lieu} onChange={(e) => setForm((f) => ({ ...f, lieu: e.target.value }))}
                  placeholder="Salle, adresse..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: '#0F1E3D' }}>
                  {saving && <Loader2 size={13} className="animate-spin" />} Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
