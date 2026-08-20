import { useState, type FormEvent } from 'react'
import { Lock, Mail, LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import gnsLogo from '@/imports/GNS_logo.png'

const TEST_ACCOUNTS = [
  { label: 'Responsable RH', email: 'rh@gns.ma', password: 'rh1234', color: '#C9A227' },
  { label: 'Collaborateur', email: 'y.benali@gns.ma', password: 'collab1234', color: '#10B981' },
]

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const quickFill = (acc: { email: string; password: string }) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#000000' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={gnsLogo} alt="GNS Technologies" className="h-24 w-auto mb-3" />
          <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Portail SIRH — Congés, Annuaire &amp; Dashboards
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Connexion</h1>
          <p className="text-sm text-gray-500 mb-6">Accédez à votre espace de travail</p>

          {error && (
            <div className="mb-4 rounded-lg px-3 py-2.5 text-sm font-medium"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adresse email</label>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-colors"
                style={{ borderColor: '#E5E7EB', background: '#F7F8FA' }}>
                <Mail size={15} style={{ color: '#9CA3AF' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@gns.ma"
                  className="bg-transparent text-sm outline-none flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe</label>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-colors"
                style={{ borderColor: '#E5E7EB', background: '#F7F8FA' }}>
                <Lock size={15} style={{ color: '#9CA3AF' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent text-sm outline-none flex-1"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: '#000000' }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Comptes de test */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: '#F3F4F6' }}>
            <div className="text-xs font-semibold text-gray-500 mb-2.5">Comptes de démonstration</div>
            <div className="space-y-2">
              {TEST_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => quickFill(acc)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                  style={{ border: '1px solid #F3F4F6', background: '#FAFAFA' }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: acc.color }} />
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{acc.label}</div>
                      <div className="text-[11px]" style={{ color: '#9CA3AF' }}>{acc.email} / {acc.password}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: '#C9A227' }}>Remplir</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Pas encore de compte ?</span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('gns:navigate-auth', { detail: 'inscription' }))}
            className="text-xs font-semibold hover:underline" style={{ color: '#C9A227' }}>
            Créer un compte
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
          GNS SIRH © 2026 — Tous droits réservés
        </p>
      </div>
    </div>
  )
}
