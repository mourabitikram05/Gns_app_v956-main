import { useCallback, useEffect, useState } from 'react'
import { Clock, ChevronRight, LogIn, LogOut, ChevronDown, FileText, Receipt, Sun, User, CalendarDays, Target, LayoutDashboard } from 'lucide-react'
import { congesApi, dashboardApi, documentsApi, employeApi, fraisApi, pointageApi, sondageApi } from '../api/modules'
import type {
  DemandeConge, DemandeDocument, EmployeProfile, EvenementItem, MonEquipeMember, NoteFrais, Pointage, SondageDuJour,
} from '../api/types'
import {
  avatarColor, ErrorBlock, fmtDate, Spinner, STATUS_BADGES, useToasts,
} from '../components/ui'
import { downloadPresencePdf } from '../services/pdf'

const TABS = ['Vacances', 'Note de frais', 'Documents']

export default function DashboardCollab() {
  const { success, error: toastError } = useToasts()

  const [activeTab, setActiveTab] = useState('Vacances')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfile] = useState<EmployeProfile | null>(null)
  const [demandes, setDemandes] = useState<DemandeConge[]>([])
  const [frais, setFrais] = useState<NoteFrais[]>([])
  const [documents, setDocuments] = useState<DemandeDocument[]>([])
  const [evenements, setEvenements] = useState<EvenementItem[]>([])
  const [equipe, setEquipe] = useState<MonEquipeMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [now, setNow] = useState(new Date())
  const [pointage, setPointage] = useState<Pointage | null>(null)
  const [sondage, setSondage] = useState<SondageDuJour | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const mois = new Date().getMonth() + 1
    const annee = new Date().getFullYear()
    try {
      const [p, d, f, doc, ev, eq, pt, sd] = await Promise.all([
        employeApi.me(),
        congesApi.mesDemandes(mois, annee),
        fraisApi.mesNotes(),
        documentsApi.mesDemandes(),
        dashboardApi.evenementsAVenir(),
        dashboardApi.monEquipe(),
        pointageApi.aujourdhui(),
        sondageApi.aujourdhui(),
      ])
      setProfile(p)
      setDemandes(d)
      setFrais(f.filter((n) => {
        const t = new Date(n.date + 'T00:00:00')
        return t.getMonth() + 1 === mois && t.getFullYear() === annee
      }))
      setDocuments(doc.filter((x) => {
        const t = new Date(x.dateDemande)
        return t.getMonth() + 1 === mois && t.getFullYear() === annee
      }))
      setEvenements(ev)
      setEquipe(eq)
      setPointage(pt)
      setSondage(sd)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const punch = async () => {
    try {
      const updated = pointage?.heureDepart
        ? null
        : pointage
          ? await pointageApi.depart()
          : await pointageApi.arrivee()
      setPointage(updated)
      success(pointage ? 'Départ pointé — compteur RH mis à jour' : 'Arrivée pointée — compteur RH mis à jour')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const navigate = (screen: string) => window.dispatchEvent(new CustomEvent('gns:navigate', { detail: screen }))

  const voter = async (option: string) => {
    if (!sondage || sondage.aVote) return
    try {
      const updated = await sondageApi.repondre(sondage.id, option)
      setSondage(updated)
      success('Votre réponse a été enregistrée')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="p-6">
        <Spinner label="Chargement de votre espace..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorBlock message={error} onRetry={load} />
      </div>
    )
  }

  const rows = activeTab === 'Vacances' ? demandes.map((d) => ({
    avatar: d.employeInitiales, name: d.employeNom, type: d.typeNom,
    period: `${fmtDate(d.dateDebut)} → ${fmtDate(d.dateFin)}`, duration: `${d.nombreJours} jour(s)`, status: d.statut,
  }))
    : activeTab === 'Note de frais' ? frais.map((f) => ({
      avatar: f.employeInitiales, name: f.employeNom, type: f.titre,
      period: fmtDate(f.date), duration: `${f.montantTotal.toLocaleString('fr-FR')} ${f.devise}`, status: f.statut,
    }))
    : activeTab === 'Documents' ? documents.map((d) => ({
      avatar: d.employeInitiales, name: d.employeNom, type: d.typeDocument,
      period: fmtDate(d.dateDemande), duration: d.format, status: d.statut,
    }))
    : null

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bonjour, {profile?.prenom ?? 'collaborateur'}</h1>
          <p className="text-sm text-gray-500 mt-1">Bienvenue sur votre espace personnel GNS.</p>
        </div>
        {/* Menu + Nouvelle demande */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              try {
                downloadPresencePdf(pointage ? [pointage] : [], profile?.nomComplet)
                success('Mon pointage exporté en PDF')
              } catch (err) {
                toastError(err instanceof Error ? err.message : 'Erreur lors de l\u2019export PDF')
              }
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
            title="Exporter mon pointage au format PDF">
            Export PDF
          </button>
          <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 flex items-center gap-1.5"
            style={{ background: '#0F1E3D' }}>
            + Nouvelle demande <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              {[
                { label: 'Congés / Absences', icon: Sun, screen: 'conges-collab' },
                { label: 'Note de frais', icon: Receipt, screen: 'frais-collab' },
                { label: 'Document', icon: FileText, screen: 'docs-collab' },
              ].map((m) => {
                const Icon = m.icon
                return (
                  <button key={m.screen} onClick={() => { setMenuOpen(false); navigate(m.screen) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors text-gray-700">
                    <Icon size={15} style={{ color: '#0F1E3D' }} /> {m.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile card */}
        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ background: avatarColor(profile?.id ?? 0) }}>
              {profile?.initiales ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-gray-900 truncate">{profile?.nomComplet}</div>
              <div className="text-sm text-gray-500 truncate">{profile?.poste ?? '—'}</div>
              <div className="text-xs mt-0.5" style={{ color: '#C9A227' }}>
                {profile?.departement ?? ''}{profile?.dateNaissance ? ` · né le ${fmtDate(profile.dateNaissance)}` : ''}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Profil', icon: User, action: 'annuaire' },
              { label: 'Calendrier', icon: CalendarDays, action: 'conges-collab' },
              { label: 'Missions', icon: Target, action: 'missions' },
              { label: 'Docs', icon: FileText, action: 'docs-collab' },
            ].map((sh, i) => {
              const Icon = sh.icon
              return (
                <button key={i} onClick={() => sh.action === 'missions'
                  ? toastError(`Vos missions : ${profile?.missions?.length ? profile.missions.join(' · ') : 'aucune mission renseignée'}`)
                  : navigate(sh.action)}
                  className="flex flex-col items-center gap-1.5 py-2 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-600">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F0F4FF' }}>
                    <Icon size={14} style={{ color: '#0F1E3D' }} />
                  </span>
                  {sh.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Temps de travail / pointage réel */}
        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-900">{timeStr}</div>
          <div className="text-xs text-gray-500 mt-1 capitalize">{dateStr}</div>
          <button
            onClick={punch}
            className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: pointage && !pointage.heureDepart ? '#c9a227' : '#0f1e3d' }}
          >
            {pointage && !pointage.heureDepart ? <LogOut size={14} /> : <LogIn size={14} />}
            {pointage && !pointage.heureDepart ? 'Pointer le départ' : pointage ? 'Pointer l\'arrivée' : 'Pointer l\'arrivée'}
          </button>
          {pointage && (
            <div className="text-xs mt-2 flex items-center gap-1" style={{ color: pointage.heureDepart ? '#6B7280' : '#10B981' }}>
              <Clock size={11} />
              {pointage.heureDepart
                ? `Départ pointé à ${pointage.heureDepart.slice(0, 5)} · ${pointage.duree ?? ''}`
                : pointage.heureArrivee
                  ? `Arrivée ${pointage.heureArrivee.slice(0, 5)} · En poste`
                  : 'En poste'}
            </div>
          )}
        </div>

        {/* Sondage du jour */}
        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
              <Sun size={14} style={{ color: '#C9A227' }} /> Sondage du jour
            </h3>
            {sondage?.aVote && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>
                ✓ Déjà voté
              </span>
            )}
          </div>
          {!sondage ? (
            <div className="text-xs text-gray-500">Aucun sondage disponible aujourd'hui</div>
          ) : sondage.aVote ? (
            <div className="space-y-2.5">
              <div className="text-sm font-medium text-gray-800 leading-snug">{sondage.question}</div>
              {sondage.options.map((opt) => {
                const count = sondage.reponsesParOption[opt] ?? 0
                const pct = sondage.totalReponses > 0 ? Math.round((count / sondage.totalReponses) * 100) : 0
                const choisie = sondage.optionChoisie === opt
                return (
                  <div key={opt} className={`relative overflow-hidden rounded-lg px-3 py-2 border ${choisie ? 'border-amber-500' : 'border-gray-100'}`}
                    style={{ background: choisie ? '#FEF3C7' : '#F7F8FA' }}>
                    <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: choisie ? '#FDE68A66' : '#C9A22722' }} />
                    <div className="relative flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800">{opt}{choisie && <span className="ml-1 text-amber-700">(votre choix)</span>}</span>
                      <span className="font-semibold text-gray-600">{count} · {pct}%</span>
                    </div>
                  </div>
                )
              })}
              <div className="text-[10px] text-gray-400">{sondage.totalReponses} réponse(s) — sondage du {fmtDate(sondage.date)}</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-800 leading-snug">{sondage.question}</div>
              {sondage.options.map((opt) => (
                <button key={opt} onClick={() => voter(opt)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all hover:opacity-90"
                  style={{ background: '#F7F8FA', borderColor: '#E5E7EB', color: '#374151' }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suivi des demandes */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Suivi des demandes — mois en cours</h3>
          <button onClick={() => navigate(activeTab === 'Vacances' ? 'conges-collab' : activeTab === 'Note de frais' ? 'frais-collab' : 'docs-collab')}
            className="text-xs font-medium hover:underline" style={{ color: '#C9A227' }}>
            Voir tout
          </button>
        </div>
        <div className="flex gap-0 border-b border-gray-100 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0"
              style={{ borderColor: activeTab === tab ? '#0F1E3D' : 'transparent', color: activeTab === tab ? '#0F1E3D' : '#6B7280' }}>
              {tab}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          {rows === null ? (
            <div className="px-5 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>
              Module « {activeTab} » non encore connecté au backend
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Collaborateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Période</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Durée / Montant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">Aucune demande ce mois-ci</td></tr>
                ) : rows.map((row, i) => {
                  const badge = STATUS_BADGES[row.status] ?? { bg: '#F3F4F6', color: '#4B5563', label: row.status }
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: '#0F1E3D' }}>{row.avatar}</div>
                          <span className="font-medium text-gray-900">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.type}</td>
                      <td className="px-4 py-3 text-gray-500">{row.period}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{row.duration}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-2 gap-4">
        {/* Prochains événements */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Prochains événements</h3>
            <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
          </div>
          <div className="divide-y divide-gray-50">
            {evenements.length === 0 && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucun événement à venir</div>
            )}
            {evenements.map((ev, i) => (
              <div key={ev.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: i % 3 === 0 ? '#0F1E3D' : i % 3 === 1 ? '#C9A227' : '#10B981' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{ev.titre}</div>
                  <div className="text-xs text-gray-500">
                    {fmtDate(ev.dateDebut)}{ev.dateFin !== ev.dateDebut ? ` → ${fmtDate(ev.dateFin)}` : ''}{ev.lieu ? ` · ${ev.lieu}` : ''}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: '#0F1E3D18', color: '#0F1E3D' }}>
                  {ev.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mon équipe */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Mon équipe</h3>
            <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
          </div>
          <div className="divide-y divide-gray-50">
            {equipe.length === 0 && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucun collègue trouvé</div>
            )}
            {equipe.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: i === 0 ? '#C9A227' : avatarColor(m.id) }}>{m.initiales}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{m.nomComplet}</div>
                  <div className="text-xs text-gray-500 truncate">{m.poste ?? ''}{m.poste && m.departement ? ' · ' : ''}{m.departement ?? ''}</div>
                </div>
                <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} title="En ligne" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
