import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users, UserPlus, TrendingDown, Heart, Clock, AlertCircle,
  Briefcase, GraduationCap, Check, X, ArrowUpRight, ArrowDownRight, Download, FileText,
  Sun, Plus, Loader2, Pencil, Trash2, CalendarRange, FileDown
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  annuaireApi, congesApi, dashboardApi, fraisApi, pointageApi, recrutementApi,
  securiteApi, sondageApi,
} from '../api/modules'
import type {
  AbsenceMensuelle, ActionAttente, ActiviteItem, Candidature, DemandeConge, DeptCount,
  KpiCard, NoteFrais, SondageDuJour,
} from '../api/types'
import { ErrorBlock, Spinner, useToasts } from '../components/ui'
import {
  downloadAlertesPdf, downloadDashboardPdf, downloadRapportMensuelPdf,
  type RapportMensuelData,
} from '../services/pdf'

const KPI_STYLES: Record<string, { icon: typeof Users; color: string }> = {
  effectif: { icon: Users, color: '#000000' },
  recrutements: { icon: UserPlus, color: '#C9A227' },
  absenteisme: { icon: TrendingDown, color: '#EF4444' },
  engagement: { icon: Heart, color: '#10B981' },
  conges_attente: { icon: Clock, color: '#F59E0B' },
  absences_jour: { icon: AlertCircle, color: '#EF4444' },
  postes_ouverts: { icon: Briefcase, color: '#000000' },
  formations: { icon: GraduationCap, color: '#C9A227' },
}

const DEPT_COLORS = ['#000000', '#C9A227', '#10B981', '#F59E0B', '#6366F1', '#14B8A6', '#8B5CF6', '#EF4444']

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const MOIS_LONGS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export default function DashboardRH() {
  const { success, error: toastError } = useToasts()

  const [kpis, setKpis] = useState<KpiCard[]>([])
  const [absences, setAbsences] = useState<AbsenceMensuelle[]>([])
  const [depts, setDepts] = useState<DeptCount[]>([])
  const [actions, setActions] = useState<ActionAttente[]>([])
  const [activite, setActivite] = useState<ActiviteItem[]>([])
  const [enPoste, setEnPoste] = useState(0)
  const [sondages, setSondages] = useState<SondageDuJour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState<number | null>(null)
  // Formulaire sondage
  const [sondageForm, setSondageForm] = useState({ question: '', options: ['', ''] })
  const [editingSondage, setEditingSondage] = useState<number | null>(null)
  const [sondageSaving, setSondageSaving] = useState(false)

  // ---------------- Rapport mensuel ----------------
  const now = new Date()
  const [rapportMois, setRapportMois] = useState(now.getMonth() + 1)
  const [rapportAnnee, setRapportAnnee] = useState(now.getFullYear())
  const [rapport, setRapport] = useState<RapportMensuelData | null>(null)
  const [rapportLoading, setRapportLoading] = useState(false)
  const [exportingDashboard, setExportingDashboard] = useState(false)
  const [exportingRapport, setExportingRapport] = useState(false)

  const todayStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const annees = useMemo(() => {
    const an = now.getFullYear()
    return [an - 2, an - 1, an, an + 1]
  }, [now])

  // Compteur "en poste" : polling léger (30 s) — reflète les pointages collaborateur
  useEffect(() => {
    const fetchEnPoste = () => {
      pointageApi.enPoste().then(setEnPoste).catch(() => {})
    }
    fetchEnPoste()
    const timer = setInterval(fetchEnPoste, 30000)
    return () => clearInterval(timer)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [k, a, d, act, av, sd] = await Promise.all([
        dashboardApi.kpis(),
        dashboardApi.absencesMensuelles(),
        dashboardApi.effectifsDepartement(),
        dashboardApi.actionsAttente(),
        dashboardApi.activiteRecent(),
        sondageApi.lister(),
      ])
      setKpis(k)
      setAbsences(a)
      setDepts(d)
      setActions(act)
      setActivite(av)
      setSondages(sd)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement du dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ---------------- Rapport mensuel : agrégation des données réelles ----------------

  /** Vérifie si une date ISO appartient au mois/année sélectionnés. */
  const inPeriod = useCallback((iso?: string | null): boolean => {
    if (!iso) return false
    const d = new Date(iso)
    return !Number.isNaN(d.getTime()) && d.getFullYear() === rapportAnnee && d.getMonth() === rapportMois - 1
  }, [rapportMois, rapportAnnee])

  const genererRapport = useCallback(async (): Promise<RapportMensuelData> => {
    setRapportLoading(true)
    try {
      const debut = `${rapportAnnee}-${String(rapportMois).padStart(2, '0')}-01`
      const fin = `${rapportAnnee}-${String(rapportMois).padStart(2, '0')}-${new Date(rapportAnnee, rapportMois, 0).getDate()}`

      // --- Employés (effectif total + nouveaux embauchés du mois) ---
      let totalEmployes: number | null = null
      let nouveauxEmployes: number | null = null
      try {
        const annuaire = await annuaireApi.rechercher({ size: 10000, inactifs: true })
        totalEmployes = annuaire.content.filter((e) => e.statut !== 'INACTIF').length
        const details = await Promise.all(
          annuaire.content.map((e) => annuaireApi.detail(e.id).catch(() => null)),
        )
        nouveauxEmployes = details.filter((d) => d && inPeriod(d.dateEmbauche)).length
      } catch {
        totalEmployes = null
        nouveauxEmployes = null
      }

      // --- Départs du mois (journal d'audit : DESACTIVATION_EMPLOYE) ---
      let departs: number | null = null
      try {
        const audit = await securiteApi.audit()
        departs = audit.filter((a) => a.action === 'DESACTIVATION_EMPLOYE' && inPeriod(a.dateAction)).length
      } catch {
        departs = null
      }

      // --- Congés du mois ---
      let congesMois: DemandeConge[] = []
      let congesApprouves: number | null = null
      let congesEnAttente: number | null = null
      try {
        const page = await congesApi.demandes({ size: 1000 })
        congesMois = page.content.filter((d) => inPeriod(d.dateDebut))
        congesApprouves = congesMois.filter((d) => d.statut === 'APPROUVEE').length
        congesEnAttente = congesMois.filter((d) => d.statut === 'EN_ATTENTE').length
      } catch {
        congesMois = []
        congesApprouves = null
        congesEnAttente = null
      }

      // --- Présences (calendrier équipe de la période) ---
      let presencesMoyenne: number | null = null
      try {
        const cal = await congesApi.calendrierEquipe(rapportMois, rapportAnnee)
        const totalPresences = Object.values(cal.presentParJour ?? {}).reduce((s, v) => s + (v ?? 0), 0)
        const nbJours = new Date(rapportAnnee, rapportMois, 0).getDate()
        presencesMoyenne = nbJours > 0 ? Math.round(totalPresences / nbJours) : 0
      } catch {
        presencesMoyenne = null
      }

      // --- Notes de frais du mois ---
      let fraisMois: NoteFrais[] = []
      let montantFrais = 0
      try {
        fraisMois = await fraisApi.notesRH({ debut, fin })
        montantFrais = fraisMois.reduce((s, n) => s + (n.montantTotal || 0), 0)
      } catch {
        fraisMois = []
        montantFrais = 0
      }

      // --- Recrutement du mois ---
      let offresPubliees: number | null = null
      let candidaturesMois: Candidature[] = []
      let embauches: number | null = null
      try {
        const offres = await recrutementApi.offres()
        offresPubliees = offres.filter((o) => inPeriod(o.datePublication)).length
        const toutes = (await Promise.all(
          offres.map((o) => recrutementApi.candidatures(o.id).catch(() => [] as Candidature[])),
        )).flat()
        candidaturesMois = toutes.filter((c) => inPeriod(c.dateCreation))
        embauches = candidaturesMois.filter((c) => c.etape === 'EMBAUCHE').length
      } catch {
        offresPubliees = null
        candidaturesMois = []
        embauches = null
      }

      // --- Statistiques (absences 8 mois + effectifs par département) ---
      let absencesMensuelles: AbsenceMensuelle[] = []
      let effectifsDepartement: DeptCount[] = []
      try {
        absencesMensuelles = await dashboardApi.absencesMensuelles()
        effectifsDepartement = await dashboardApi.effectifsDepartement()
      } catch {
        /* statistiques optionnelles */
      }

      // Absences du mois sélectionné (label abrégé fourni par le backend)
      const labelMois = MOIS_COURTS[rapportMois - 1]
      const absencesMois = absencesMensuelles.find((a) => a.mois === labelMois)?.jours ?? null

      const data: RapportMensuelData = {
        mois: rapportMois,
        annee: rapportAnnee,
        resume: {
          totalEmployes,
          nouveauxEmployes,
          departs,
          congesApprouves,
          congesEnAttente,
          absences: absencesMois,
          presencesMoyenne,
          notesFrais: fraisMois.length,
          montantFrais,
          offresPubliees,
          candidatures: candidaturesMois.length,
          embauches,
        },
        stats: { absencesMensuelles, effectifsDepartement },
        details: {
          conges: congesMois.slice(0, 200),
          notesFrais: fraisMois.slice(0, 200),
          candidatures: candidaturesMois.slice(0, 200),
        },
      }
      setRapport(data)
      return data
    } finally {
      setRapportLoading(false)
    }
  }, [rapportMois, rapportAnnee, inPeriod])

  /** Génère + télécharge immédiatement le PDF du rapport mensuel. */
  const exporterRapportPdf = async () => {
    setExportingRapport(true)
    try {
      const data = rapport ?? await genererRapport()
      downloadRapportMensuelPdf(data)
      success(`Rapport mensuel ${MOIS_LONGS[data.mois - 1]} ${data.annee} exporté en PDF`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l\'export du rapport mensuel')
    } finally {
      setExportingRapport(false)
    }
  }

  const exporterDashboardPdf = async () => {
    setExportingDashboard(true)
    try {
      downloadDashboardPdf({ kpis, absences, depts, actions, activite, enPoste })
      success('Export PDF du dashboard téléchargé')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l\'export PDF')
    } finally {
      setExportingDashboard(false)
    }
  }

  const exporterAlertesPdf = () => {
    try {
      downloadAlertesPdf(actions)
      success('Alertes RH exportées en PDF')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur lors de l\'export des alertes')
    }
  }

  const handleAction = async (action: ActionAttente, decision: 'valider' | 'refuser') => {
    setActing(action.demandeId)
    try {
      const isFrais = action.module === 'FRAIS'
      if (decision === 'valider') {
        if (isFrais) await fraisApi.valider(action.demandeId)
        else await congesApi.valider(action.demandeId)
        success(`${isFrais ? 'Note de frais' : 'Demande'} de ${action.name} validée`)
      } else {
        const motif = window.prompt(`Motif du refus pour ${action.name} (obligatoire) :`)
        if (!motif) { setActing(null); return }
        if (isFrais) await fraisApi.refuser(action.demandeId, motif)
        else await congesApi.refuser(action.demandeId, motif)
        success(`${isFrais ? 'Note de frais' : 'Demande'} de ${action.name} refusée`)
      }
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(null)
    }
  }

  const submitSondage = async () => {
    const options = sondageForm.options.map((o) => o.trim()).filter(Boolean)
    if (!sondageForm.question.trim()) { toastError('La question est obligatoire'); return }
    if (options.length < 2) { toastError('Au moins deux options sont requises'); return }
    setSondageSaving(true)
    try {
      const body = { question: sondageForm.question.trim(), options }
      if (editingSondage) {
        await sondageApi.modifier(editingSondage, body)
        success('Sondage modifié')
      } else {
        await sondageApi.creer(body)
        success('Sondage publié — visible par les collaborateurs')
      }
      setSondageForm({ question: '', options: ['', ''] })
      setEditingSondage(null)
      setSondages(await sondageApi.lister())
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSondageSaving(false)
    }
  }

  const editerSondage = (s: SondageDuJour) => {
    setEditingSondage(s.id)
    setSondageForm({ question: s.question, options: s.options.length >= 2 ? [...s.options] : ['', ''] })
  }

  const setOption = (i: number, v: string) =>
    setSondageForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? v : o)) }))

  const addOption = () => setSondageForm((f) => ({ ...f, options: [...f.options, ''] }))
  const removeOption = (i: number) =>
    setSondageForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))

  const sondageActif = sondages[0] ?? null

  if (loading) {
    return (
      <div className="p-6">
        <Spinner label="Chargement du dashboard RH..." />
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard RH</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{todayStr}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exporterDashboardPdf}
            disabled={exportingDashboard}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-60">
            {exportingDashboard ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exporter PDF
          </button>
          <button
            onClick={exporterRapportPdf}
            disabled={exportingRapport || rapportLoading}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
            style={{ background: '#000000' }}>
            {exportingRapport ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Rapport mensuel PDF
          </button>
        </div>
      </div>

      {/* Rapport mensuel — sélection de période */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarRange size={15} style={{ color: '#C9A227' }} /> Rapport mensuel RH
          </h3>
          <span className="text-xs text-gray-500">
            Période : <strong className="text-gray-800">{MOIS_LONGS[rapportMois - 1]} {rapportAnnee}</strong>
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={rapportMois} onChange={(e) => setRapportMois(Number(e.target.value))}
              className="text-sm rounded-lg border border-gray-200 px-3 py-2 outline-none">
              {MOIS_LONGS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={rapportAnnee} onChange={(e) => setRapportAnnee(Number(e.target.value))}
              className="text-sm rounded-lg border border-gray-200 px-3 py-2 outline-none">
              {annees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => { genererRapport().catch((e) => toastError(e.message)) }} disabled={rapportLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60">
              {rapportLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} style={{ color: '#000000' }} />}
              Générer le rapport
            </button>
            <button onClick={exporterRapportPdf} disabled={exportingRapport || rapportLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
              style={{ background: '#000000' }}>
              {exportingRapport ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Exporter PDF
            </button>
          </div>

          {rapport ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {([
                ['Employés', rapport.resume.totalEmployes],
                ['Nouveaux', rapport.resume.nouveauxEmployes],
                ['Départs', rapport.resume.departs],
                ['Congés approuvés', rapport.resume.congesApprouves],
                ['Absences', rapport.resume.absences],
                ['Présences / jour', rapport.resume.presencesMoyenne],
                ['Notes de frais', rapport.resume.notesFrais],
                ['Offres publiées', rapport.resume.offresPubliees],
                ['Candidatures', rapport.resume.candidatures],
                ['Embauches', rapport.resume.embauches],
              ] as [string, number | null][]).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-100 px-3 py-2.5" style={{ background: '#F7F8FA' }}>
                  <div className="text-[11px] text-gray-500">{label}</div>
                  <div className="text-lg font-bold text-gray-900">{value === null ? '—' : value.toLocaleString('fr-FR')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 py-4 text-center rounded-lg border border-dashed border-gray-200">
              Sélectionnez une période puis cliquez sur « Générer le rapport » pour afficher les données réelles du mois.
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const style = KPI_STYLES[kpi.key] ?? { icon: Users, color: '#000000' }
          const Icon = style.icon
          return (
            <div key={kpi.key} className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: style.color + '15' }}>
                  <Icon size={18} style={{ color: style.color }} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {kpi.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              {kpi.key === 'effectif' && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: enPoste > 0 ? '#D1FAE5' : '#F3F4F6', color: enPoste > 0 ? '#065F46' : '#6B7280' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: enPoste > 0 ? '#10B981' : '#9CA3AF' }} />
                  {enPoste} en poste maintenant
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sondage du jour — gestion RH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Sun size={15} style={{ color: '#C9A227' }} /> Sondage du jour</h3>
            {sondageActif && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                {sondageActif.totalReponses} réponse(s)
              </span>
            )}
          </div>
          <div className="p-5">
            {!sondageActif ? (
              <div className="text-sm text-gray-500 py-6 text-center">Aucun sondage publié — créez la question du jour.</div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-900">{sondageActif.question}</div>
                <div className="text-[11px] text-gray-400">Publié le {new Date(sondageActif.date + 'T00:00:00').toLocaleDateString('fr-FR')}</div>
                {sondageActif.options.map((opt) => {
                  const count = sondageActif.reponsesParOption[opt] ?? 0
                  const pct = sondageActif.totalReponses > 0 ? Math.round((count / sondageActif.totalReponses) * 100) : 0
                  return (
                    <div key={opt} className="relative overflow-hidden rounded-lg px-3 py-2 border border-gray-100" style={{ background: '#F7F8FA' }}>
                      <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: '#C9A22733' }} />
                      <div className="relative flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-800">{opt}</span>
                        <span className="font-semibold text-gray-600">{count} · {pct}%</span>
                      </div>
                    </div>
                  )
                })}
                <button onClick={() => editerSondage(sondageActif)}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:underline" style={{ color: '#C9A227' }}>
                  <Pencil size={11} /> Modifier le sondage
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Plus size={15} style={{ color: '#C9A227' }} /> {editingSondage ? 'Modifier le sondage' : 'Créer la question du jour'}
            </h3>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Question *</label>
              <input value={sondageForm.question}
                onChange={(e) => setSondageForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="Ex. Comment évaluez-vous votre journée ?"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
            </div>
            {sondageForm.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                {sondageForm.options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50"
                    style={{ color: '#EF4444' }}><Trash2 size={13} /></button>
                )}
              </div>
            ))}
            <button onClick={addOption} className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: '#C9A227' }}>
              <Plus size={12} /> Ajouter une option
            </button>
            <div className="flex gap-2 pt-1">
              {editingSondage && (
                <button onClick={() => { setEditingSondage(null); setSondageForm({ question: '', options: ['', ''] }) }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">
                  Annuler
                </button>
              )}
              <button onClick={submitSondage} disabled={sondageSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                style={{ background: '#000000' }}>
                {sondageSaving && <Loader2 size={13} className="animate-spin" />}
                {editingSondage ? 'Enregistrer les modifications' : 'Publier le sondage'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Jours d'absence par mois</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={absences} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Bar dataKey="jours" fill="#000000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Effectifs par département</h3>
          {depts.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: '#9CA3AF' }}>Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={depts} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {depts.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Actions en attente */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Actions en attente</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                {actions.length} en attente
              </span>
              {actions.length > 0 && (
                <button onClick={exporterAlertesPdf}
                  className="text-[11px] font-semibold flex items-center gap-1 hover:underline" style={{ color: '#000000' }}
                  title="Exporter les alertes RH en PDF">
                  <FileDown size={11} /> PDF
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {actions.length === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucune action en attente</div>
            )}
            {actions.map((action) => (
              <div key={action.demandeId} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: '#000000' }}>
                  {action.initiales}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{action.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {action.type} · {action.module === 'FRAIS'
                      ? `${action.detail} · ${action.montant.toLocaleString('fr-FR')} MAD`
                      : `${action.detail} · ${action.nombreJours} j`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAction(action, 'valider')}
                    disabled={acting === action.demandeId}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-emerald-50 disabled:opacity-50"
                    style={{ color: '#10B981', border: '1px solid #D1FAE5' }}>
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => handleAction(action, 'refuser')}
                    disabled={acting === action.demandeId}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50 disabled:opacity-50"
                    style={{ color: '#EF4444', border: '1px solid #FEE2E2' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Activité récente</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {activite.length === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucune activité</div>
            )}
            {activite.map((act, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: act.dot }} />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{act.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
