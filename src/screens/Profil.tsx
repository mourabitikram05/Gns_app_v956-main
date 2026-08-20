import { useEffect, useState } from 'react'
import {
  Mail, Phone, MapPin, Building2, Briefcase, Users, CalendarDays, CreditCard,
  BadgeCheck, Cake, Globe, DoorOpen, User as UserIcon, Target,
} from 'lucide-react'
import { employeApi } from '../api/modules'
import type { EmployeProfile } from '../api/types'
import { avatarColor, ErrorBlock, Spinner, fmtDate } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS: Record<string, string> = {
  COLLABORATEUR: 'Collaborateur',
  RESPONSABLE_RH: 'Responsable RH',
  ADMIN: 'Administrateur',
}

export default function Profil() {
  const { user } = useAuth()
  const [profil, setProfil] = useState<EmployeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    employeApi.me()
      .then(setProfil)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6"><Spinner label="Chargement du profil..." /></div>
  if (error) return <div className="p-6"><ErrorBlock message={error} onRetry={() => window.location.reload()} /></div>
  if (!profil) return null

  const initials = profil.initiales || profil.nomComplet.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  const infos = [
    { icon: Mail, label: 'Email', value: profil.email },
    { icon: Phone, label: 'Téléphone', value: profil.telephone ?? '—' },
    { icon: MapPin, label: 'Adresse', value: profil.adresse ?? '—' },
    { icon: DoorOpen, label: 'Bureau', value: profil.bureau ?? '—' },
    { icon: Building2, label: 'Département', value: profil.departement ?? '—' },
    { icon: Briefcase, label: 'Poste', value: profil.poste ?? '—' },
    { icon: Users, label: 'Équipe', value: profil.equipe ?? '—' },
    { icon: UserIcon, label: 'Responsable', value: profil.responsable ?? '—' },
    { icon: Cake, label: 'Date de naissance', value: profil.dateNaissance ? fmtDate(profil.dateNaissance) : '—' },
    { icon: CalendarDays, label: "Date d'embauche", value: profil.dateEmbauche ? fmtDate(profil.dateEmbauche) : '—' },
    { icon: CreditCard, label: 'Matricule', value: profil.matricule },
    { icon: Globe, label: 'Nationalité', value: profil.nationalite ?? '—' },
  ]

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vos informations personnelles et professionnelles</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Carte identité */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
            style={{ background: avatarColor(profil.id) }}>
            {initials}
          </div>
          <div className="text-lg font-bold text-gray-900">{profil.nomComplet}</div>
          <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{profil.poste ?? '—'}</div>
          <div className="flex items-center gap-1 text-xs mt-1.5" style={{ color: '#9CA3AF' }}>
            <MapPin size={11} /> {profil.adresse?.split(',')[0] ?? 'Casablanca, Maroc'}
          </div>
          {profil.dateNaissance && (
            <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              <Cake size={11} /> {fmtDate(profil.dateNaissance)}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#C9A22722', color: '#8A6D1A' }}>
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: profil.statut === 'ACTIF' ? '#D1FAE5' : '#FEE2E2', color: profil.statut === 'ACTIF' ? '#065F46' : '#991B1B' }}>
              {profil.statut === 'ACTIF' ? '● Actif' : '● Inactif'}
            </span>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-gray-100">
            <button onClick={() => window.dispatchEvent(new CustomEvent('gns:navigate', { detail: 'parametres' }))}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50">
              <Target size={12} /> Paramètres
            </button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('gns:navigate', { detail: 'docs-collab' }))}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50">
              <CreditCard size={12} /> Documents
            </button>
          </div>
        </div>

        {/* Détails */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Informations</h3>
            <span className="text-xs text-gray-400">Matricule {profil.matricule}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {infos.map((r) => (
              <div key={r.label} className="flex items-center gap-4 px-6 py-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6' }}>
                  <r.icon size={14} style={{ color: '#0F1E3D' }} />
                </div>
                <span className="text-xs font-semibold text-gray-500 w-44">{r.label}</span>
                <span className="text-sm font-medium text-gray-900">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Missions */}
      {profil.missions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><BadgeCheck size={15} style={{ color: '#C9A227' }} /> Mes missions</h3>
          </div>
          <div className="p-5 flex flex-wrap gap-2">
            {profil.missions.map((m, i) => (
              <span key={i} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: '#F3F4F6', color: '#374151' }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
