import { useState, type FormEvent } from 'react'
import { Lock, Mail, User, Loader2, UserPlus, ArrowLeft, Clock, ShieldCheck } from 'lucide-react'
import { authApi } from '../api/modules'
import gnsLogo from '@/imports/image.png'
import { ImageWithFallback } from '../components/ImageWithFallback'

export default function Inscription() {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', password: '', confirmation: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdEmail, setCreatedEmail] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (form.password !== form.confirmation) {
      setError('La confirmation ne correspond pas au mot de passe')
      return
    }
    setLoading(true)
    try {
      const data = await authApi.inscription(form.email.trim(), form.prenom.trim(), form.nom.trim(), form.password)
      // Aucun token n'est émis : le compte doit d'abord être validé par le service RH.
      setCreatedEmail(data.email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  const goLogin = () => window.dispatchEvent(new CustomEvent('gns:navigate-auth', { detail: 'login' }))

  /* ---------- Écran de confirmation : compte en attente de validation ---------- */
  if (createdEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#000000' }}>
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 shadow-lg">
              <ImageWithFallback src={gnsLogo} alt="GNS Technologies" className="w-full h-full object-cover" />
            </div>
            <div className="text-white font-bold text-2xl tracking-wide">GNS</div>
            <div className="text-sm font-semibold tracking-[0.3em]" style={{ color: '#C9A227' }}>TECHNOLOGIES</div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-7 text-center">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: '#FEF3C7' }}>
              <Clock size={26} style={{ color: '#B45309' }} />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Compte créé avec succès</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Votre demande de compte pour <span className="font-semibold text-gray-700">{createdEmail}</span> a bien
              été enregistrée et est désormais <span className="font-semibold">en attente de validation</span> par le
              service RH.
            </p>

            <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3.5 text-left space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Clock size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#B45309' }} />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Vous ne pouvez pas encore vous connecter : votre accès sera activé dès que le responsable RH aura
                  validé votre demande.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#B45309' }} />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Vous serez notifié dans l'application dès la décision du service RH (validation ou refus).
                </p>
              </div>
            </div>

            <button onClick={goLogin}
              className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: '#000000' }}>
              <ArrowLeft size={15} /> Retour à la connexion
            </button>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
            GNS SIRH © 2026 — Tous droits réservés
          </p>
        </div>
      </div>
    )
  }

  /* ---------- Formulaire d'inscription ---------- */
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#000000' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 shadow-lg">
            <ImageWithFallback src={gnsLogo} alt="GNS Technologies" className="w-full h-full object-cover" />
          </div>
          <div className="text-white font-bold text-2xl tracking-wide">GNS</div>
          <div className="text-sm font-semibold tracking-[0.3em]" style={{ color: '#C9A227' }}>TECHNOLOGIES</div>
          <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Portail SIRH — Création de compte collaborateur
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Créer un compte</h1>
          <p className="text-sm text-gray-500 mb-6">Votre accès sera actif après validation par le service RH</p>

          {error && (
            <div className="mb-4 rounded-lg px-3 py-2.5 text-sm font-medium"
              style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Prénom *</label>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                  <User size={14} style={{ color: '#9CA3AF' }} />
                  <input required value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    placeholder="Salma"
                    className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom *</label>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                  <User size={14} style={{ color: '#9CA3AF' }} />
                  <input required value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="Benali"
                    className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email professionnel *</label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <Mail size={14} style={{ color: '#9CA3AF' }} />
                <input type="email" required value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="vous@gns.ma"
                  className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mot de passe *</label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <Lock size={14} style={{ color: '#9CA3AF' }} />
                <input type="password" required value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="6 caractères minimum"
                  className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmer le mot de passe *</label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <Lock size={14} style={{ color: '#9CA3AF' }} />
                <input type="password" required value={form.confirmation}
                  onChange={(e) => setForm((f) => ({ ...f, confirmation: e.target.value }))}
                  placeholder="Répétez le mot de passe"
                  className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: '#C9A227' }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-center gap-1.5">
            <ArrowLeft size={13} style={{ color: '#6B7280' }} />
            <span className="text-xs text-gray-500">Déjà un compte ?</span>
            <button onClick={goLogin}
              className="text-xs font-semibold hover:underline" style={{ color: '#C9A227' }}>
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
