/**
 * Client HTTP centralisé : attache le token JWT, gère les erreurs,
 * et déconnecte l'utilisateur en cas de 401.
 */
export const API_BASE = '/api'

export const TOKEN_KEY = 'gns_token'
export const USER_KEY = 'gns_user'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function buildHeaders(options: RequestInit): HeadersInit {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const body = options.body
  if (body && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json'
  }
  return { ...headers, ...((options.headers as Record<string, string>) ?? {}) }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE + path, { ...options, headers: buildHeaders(options) })

  if (res.status === 401) {
    clearSession()
    window.dispatchEvent(new Event('gns:unauthorized'))
  }

  let payload: { data?: T; message?: string } | null = null
  try {
    payload = (await res.json()) as { data?: T; message?: string }
  } catch {
    payload = null
  }

  if (!res.ok) {
    const message = payload?.message || `Erreur ${res.status}`
    throw new ApiError(res.status, message)
  }
  // Renvoie payload.data même s'il est null (null = résultat valide, ex. pointage du jour)
  return (payload !== null && 'data' in payload ? payload.data : payload) as T
}

export const get = <T>(path: string) => request<T>(path)
export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
export const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) })
export const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

export async function postForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: form })
}

export async function putForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'PUT', body: form })
}

/**
 * Extrait le nom de fichier d'un en-tête Content-Disposition.
 * Gère les deux formes : `filename="x.pdf"` et `filename*=UTF-8''x.pdf` (RFC 5987).
 */
function parseDispositionFilename(disposition: string): string | null {
  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition)
  if (encoded) {
    try {
      const name = decodeURIComponent(encoded[1].replace(/^"|"$/g, '').trim())
      if (name) return name
    } catch {
      /* nom illisible → repli sur la forme simple */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  if (plain) {
    const name = plain[1].replace(/^"|"$/g, '').trim()
    if (name) return name
  }
  return null
}



export async function openFile(path: string, fallbackName: string, init: RequestInit = {}) {
  const res = await fetch(API_BASE + path, { ...init, headers: buildHeaders(init) })
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const payload = (await res.json()) as { message?: string }
      message = payload?.message || message
    } catch {
      /* réponse non JSON */
    }
    throw new ApiError(res.status, message)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const filename = parseDispositionFilename(disposition) || fallbackName

  const url = URL.createObjectURL(blob)
  const win = window.open('', '_blank')
  if (!win) {
    // Popup bloquée : repli sur le téléchargement direct
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      a.remove()
      URL.revokeObjectURL(url)
    }, 1000)
    return
  }
  const safe = filename.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  win.document.write(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + safe + '</title>' +
    '<style>body{margin:0;font-family:Arial,sans-serif}.bar{display:flex;align-items:center;gap:12px;padding:10px 16px;background:#0a0a0a;color:#fff;font-size:13px}.bar b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw}.bar a{margin-left:auto;color:#C9A227;text-decoration:none;font-weight:700;border:1px solid #C9A227;padding:7px 16px;border-radius:6px;white-space:nowrap}.bar a:hover{background:#C9A227;color:#0a0a0a}embed{display:block;width:100vw;height:calc(100vh - 45px);border:0}</style></head>' +
    '<body><div class="bar"><b>' + safe + '</b><a href="' + url + '" download="' + safe + '">Télécharger</a></div>' +
    '<embed src="' + url + '#toolbar=0" type="application/pdf" /></body></html>',
  )
  win.document.close()
  // Laisse l'aperçu actif : l'URL est libérée après 5 minutes
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000)
}



/**
 * Téléchargement fiable d'un fichier (PDF, Excel, CSV…) avec le token JWT.
 *
 * Récupère le contenu complet en blob, puis déclenche le téléchargement
 * natif du navigateur via un lien anonyme — le fichier est enregistré
 * sur l'ordinateur de l'utilisateur avec son vrai nom et sa bonne extension.
 * (Pas d'URL `blob:` exposée, pas d'onglet supplémentaire.)
 */
export async function downloadFile(path: string, fallbackName: string, init: RequestInit = {}) {
  const res = await fetch(API_BASE + path, { ...init, headers: buildHeaders(init) })
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const payload = (await res.json()) as { message?: string }
      message = payload?.message || message
    } catch {
      /* réponse non JSON */
    }
    throw new ApiError(res.status, message)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const filename = parseDispositionFilename(disposition) || fallbackName

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Nettoyage différé : laisse le temps au navigateur de démarrer le téléchargement
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 1000)
}
