import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const success = useCallback((message: string) => push(message, 'success'), [push])
  const error = useCallback((message: string) => push(message, 'error'), [push])

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 pl-3 pr-4 py-3 rounded-xl shadow-xl border text-sm font-medium animate-[toastIn_0.25s_ease-out]"
            style={{
              background: t.type === 'success' ? '#ffffff' : '#ffffff',
              borderColor: t.type === 'success' ? '#D1FAE5' : '#FECACA',
              minWidth: 280, maxWidth: 400,
              boxShadow: '0 12px 32px -8px rgba(15,30,61,0.18)',
            }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: t.type === 'success' ? '#ECFDF5' : '#FEF2F2' }}
            >
              {t.type === 'success'
                ? <CheckCircle2 size={17} style={{ color: '#059669' }} />
                : <AlertCircle size={17} style={{ color: '#DC2626' }} />}
            </span>
            <span className="text-gray-800">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToasts() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToasts doit être utilisé dans <ToastProvider>')
  return ctx
}

/* ------------------------------------------------------------------ */
/* Spinner / skeleton                                                  */
/* ------------------------------------------------------------------ */

export function Spinner({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-2">
      <Loader2 size={22} className="animate-spin" style={{ color: '#000000' }} />
      <span className="text-xs" style={{ color: '#9CA3AF' }}>{label}</span>
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border p-6 text-center" style={{ borderColor: '#FECACA', background: '#FEF2F2' }}>
      <AlertCircle size={20} className="mx-auto mb-2" style={{ color: '#B91C1C' }} />
      <p className="text-sm font-medium mb-2" style={{ color: '#991B1B' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: '#FECACA', color: '#991B1B', background: '#fff' }}
        >
          Réessayer
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const AVATAR_COLORS = ['#000000', '#C9A227', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#3B82F6', '#14B8A6']

/** Couleur d'avatar déterministe à partir d'un id (stable entre rendus). */
export function avatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length]
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export const MONTHS_FR_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

/** Jours ouvrés (lun-ven) entre deux dates incluses. */
export function workingDays(debut: string, fin: string): number {
  const start = new Date(debut + 'T00:00:00')
  const end = new Date(fin + 'T00:00:00')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0
  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export const STATUS_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  EN_ATTENTE: { bg: '#FEF3C7', color: '#92400E', label: 'En attente' },
  APPROUVEE: { bg: '#D1FAE5', color: '#065F46', label: 'Approuvée' },
  REFUSEE: { bg: '#FEE2E2', color: '#991B1B', label: 'Refusée' },
  ANNULEE: { bg: '#F3F4F6', color: '#4B5563', label: 'Annulée' },
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  /** Nombre total d'éléments (affiché à gauche, optionnel). */
  totalItems?: number
  /** Intervalle visible des éléments (ex. "1–8 sur 23"). */
  itemLabel?: (from: number, to: number) => string
}

/**
 * Pagination sobre et moderne, adaptée aux tableaux d'administration.
 * Les numéros de page sont tronqués avec des ellipses sur les longues listes.
 */
export function Pagination({ page, totalPages, onChange, totalItems, itemLabel }: PaginationProps) {
  if (totalPages <= 1) return null

  const go = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) onChange(p)
  }

  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  const size = totalItems != null && totalPages > 0 ? Math.max(1, Math.round(totalItems / totalPages)) : 0
  const from = totalItems != null && totalItems > 0 ? (page - 1) * size + 1 : 0
  const to = totalItems != null ? Math.min(page * size, totalItems) : 0

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-t border-gray-100">
      {totalItems != null && (
        <span className="text-xs text-gray-500 mr-auto">
          {itemLabel ? itemLabel(from, to) : `${from}–${to} sur ${totalItems}`}
        </span>
      )}
      <nav className="flex items-center gap-1 ml-auto" aria-label="Pagination">
        <button
          onClick={() => go(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Page précédente"
        >
          <ChevronLeft size={15} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-xs text-gray-400 select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => go(p)}
              className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-colors ${
                p === page
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={p === page ? { background: '#000000' } : undefined}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => go(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Page suivante"
        >
          <ChevronRight size={15} />
        </button>
      </nav>
    </div>
  )
}
