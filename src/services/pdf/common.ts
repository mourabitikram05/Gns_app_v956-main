/**
 * Service PDF centralisé — utilitaires communs.
 *
 * Tous les générateurs PDF de l'application reposent sur ce module :
 *  - thème de l'application (bleu marine #000000, or #C9A227) ;
 *  - en-tête professionnel (logo, nom de l'entreprise, titre, date) ;
 *  - pied de page (application, date, numéro de page) ;
 *  - tableaux multi-pages avec sauts de page automatiques ;
 *  - formatage des dates / nombres / montants en français ;
 *  - gestion des caractères français (é è ê ë à â ç ù û î ï ô œ).
 */
import { jsPDF } from 'jspdf'
import { autoTable, type RowInput, type UserOptions } from 'jspdf-autotable'

// ---------------------------------------------------------------------------
// Identité
// ---------------------------------------------------------------------------

export const APP_NAME = 'GNS SIRH'
export const COMPANY_NAME = 'GNS TECHNOLOGIES'
export const COMPANY_TAGLINE = 'Gestion des Ressources Humaines'

// ---------------------------------------------------------------------------
// Thème (couleurs de l'application)
// ---------------------------------------------------------------------------

/** Couleurs au format [r, g, b] pour jsPDF. */
export const THEME = {
  primary: [15, 30, 61] as [number, number, number],   // #000000 — bleu marine
  secondary: [201, 162, 39] as [number, number, number], // #C9A227 — or
  lightBg: [247, 248, 250] as [number, number, number], // #F7F8FA
  border: [229, 231, 235] as [number, number, number],  // #E5E7EB
  text: [31, 41, 55] as [number, number, number],       // #1F2937
  muted: [107, 114, 128] as [number, number, number],   // #6B7280
  danger: [185, 28, 28] as [number, number, number],
  success: [4, 120, 87] as [number, number, number],
}

export const PAGE = {
  width: 210,   // mm — A4
  height: 297,
  marginX: 16,
  contentStart: 42,
  footerY: 287,
}

// ---------------------------------------------------------------------------
// Formatage français
// ---------------------------------------------------------------------------

/** Nettoie un texte : normalise les accents (NFC) et supprime les caractères de contrôle. */
export function normalizeFr(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return s
      .normalize('NFC')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
      .trim()
}

function toDate(value?: string | Date | null): Date | null {
  if (value === null || value === undefined) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Formate une date (ISO ou Date) au format français "18/08/2026". */
export function frDate(value?: string | Date | null): string {
  const d = toDate(value)
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Formate une date + heure (ISO ou Date) au format français "18/08/2026 14:30". */
export function frDateTime(value?: string | Date | null): string {
  const d = toDate(value)
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' '
      + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Formate une date longue : "18 août 2026". */
export function frDateLong(iso?: string | Date | null): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Nom du mois en toutes lettres : 1 → "Janvier". */
export function frMonthName(mois: number): string {
  const names = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  return names[mois - 1] ?? String(mois)
}

/** Nombre entier formaté en français : 12345 → "12 345". */
export function fmtNum(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString('fr-FR')
}

/** Montant formaté en français avec devise : 1234.5 → "1 234,50 MAD". */
export function fmtMontant(value?: number | null, devise = 'MAD'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + devise
}

// ---------------------------------------------------------------------------
// Contexte de document
// ---------------------------------------------------------------------------

export interface PdfContext {
  doc: jsPDF
  y: number
  /** Compteur de sections (numérotation « 1. », « 2. »…) — conforme au modèle. */
  sectionCount?: number
}

/**
 * Crée un document A4 avec l'en-tête professionnel :
 * bandeau bleu, logo officiel GNS, nom de l'entreprise, titre du document,
 * date de génération et période éventuelle (sous-titre).
 */
export interface DocumentHeaderOptions {
  /** Data URL (base64) du logo officiel (fond transparent). À défaut, un logo vectoriel est dessiné. */
  logoDataUrl?: string | null
  /** Référence du document affichée dans l'en-tête. */
  reference?: string
}

let defaultLogo: string | null = null

/** Enregistre le logo officiel de l'application (data URL, fond transparent). Appelé au démarrage. */
export function setDefaultLogo(dataUrl: string | null): void {
  defaultLogo = dataUrl
}

/** Référence par défaut : GNS-DRH-AAAA-MMJJ. */
export function defaultReference(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `GNS-DRH-${y}-${m}${d}`
}

/**
 * En-tête conforme au modèle officiel GNS TECHNOLOGIES :
 * bandeau bleu marine, logo transparent (sans fond ni carré blanc), titre en
 * capitales, sous-titre or, date de génération + référence, mention
 * « Document RH confidentiel », liseré or en bas du bandeau.
 */
export function createDocument(title: string, subtitle?: string, opts?: DocumentHeaderOptions): PdfContext {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const ctx: PdfContext = { doc, y: PAGE.contentStart }

  const bandHeight = 32

  // Bandeau d'en-tête
  doc.setFillColor(...THEME.primary)
  doc.rect(0, 0, PAGE.width, bandHeight, 'F')

  // Logo officiel — fond transparent, posé directement sur le bandeau (aucun carré blanc)
  const logo = opts?.logoDataUrl ?? defaultLogo
  if (logo) {
    try {
      // Proportions conservées (288 × 85 → ratio 3,39:1), taille professionnelle
      doc.addImage(logo, 'PNG', PAGE.marginX, 4, 57, 20)
    } catch {
      drawVectorLogo(doc)
    }
  } else {
    drawVectorLogo(doc)
  }

  // Titre en capitales + sous-titre or, alignés à droite
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14.5)
  doc.setTextColor(255, 255, 255)
  doc.text(title.toUpperCase(), PAGE.width - PAGE.marginX, 11.5, { align: 'right' })
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...THEME.secondary)
    doc.text(subtitle, PAGE.width - PAGE.marginX, 16.5, { align: 'right' })
  }

  // Bas du bandeau : date + référence à gauche, mention confidentielle à droite
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(210, 216, 228)
  // doc.text(
  //   `Document généré le ${frDateLong(new Date())} | Référence : ${opts?.reference ?? defaultReference()}`,
  //   PAGE.marginX, 25,
  // )
  doc.setFont('helvetica', 'italic')
  doc.text('Document RH confidentiel', PAGE.width - PAGE.marginX, 25, { align: 'right' })

  // Liseré or en bas du bandeau
  doc.setFillColor(...THEME.secondary)
  doc.rect(0, bandHeight, PAGE.width, 1.2, 'F')

  return ctx
}

/** Logo vectoriel de repli conforme au modèle : carré or + "G" blanc + wordmark. */
function drawVectorLogo(doc: jsPDF): void {
  doc.setFillColor(...THEME.secondary)
  doc.roundedRect(PAGE.marginX, 8, 9, 9, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('G', PAGE.marginX + 4.5, 14.8, { align: 'center' })
  doc.setFontSize(13)
  doc.text('GNS', PAGE.marginX + 13, 12.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('TECHNOLOGIES', PAGE.marginX + 13, 17)
}

/**
 * Finalise le document : pied de page conforme au modèle —
 * « GNS TECHNOLOGIES » / « Système d'Information des Ressources Humaines (SIRH) »
 * à gauche, « Page X » / « Document RH confidentiel » à droite.
 */
export function finalizeDocument(ctx: PdfContext): jsPDF {
  const { doc } = ctx
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    // Trait de séparation
    doc.setDrawColor(224, 227, 233)
    doc.setLineWidth(0.3)
    doc.line(PAGE.marginX, PAGE.footerY - 10, PAGE.width - PAGE.marginX, PAGE.footerY - 10)
    // Pied de page — bloc gauche
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...THEME.primary)
    doc.text(COMPANY_NAME, PAGE.marginX, PAGE.footerY - 5.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(107, 114, 128)
    doc.text(`Système d'Information des Ressources Humaines (SIRH)`, PAGE.marginX, PAGE.footerY - 1.5)

    // Pied de page — bloc droit
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...THEME.primary)
    doc.text(`Page ${i}`, PAGE.width - PAGE.marginX, PAGE.footerY - 5.5, { align: 'right' })
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.5)
    doc.setTextColor(107, 114, 128)
    doc.text('Document RH confidentiel', PAGE.width - PAGE.marginX, PAGE.footerY - 1.5, { align: 'right' })
  }
  return doc
}

// ---------------------------------------------------------------------------
// Éléments de contenu
// ---------------------------------------------------------------------------

function ensureRoom(ctx: PdfContext, needed: number) {
  if (ctx.y + needed > PAGE.footerY - 16) {
    ctx.doc.addPage()
    ctx.y = PAGE.contentStart
  }
}

/**
 * Titre de section conforme au modèle : « N. Titre » en gras bleu marine,
 * sous-titre gris italique optionnel, puis liseré or de séparation.
 * Les sections sont numérotées automatiquement (1., 2., 3.…).
 */
export function sectionTitle(ctx: PdfContext, text: string, subtitle?: string): void {
  ensureRoom(ctx, 18)
  const doc = ctx.doc
  ctx.sectionCount = (ctx.sectionCount ?? 0) + 1
  const label = `${ctx.sectionCount}. ${text}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...THEME.primary)
  doc.text(label, PAGE.marginX, ctx.y)
  if (subtitle) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.8)
    doc.setTextColor(107, 114, 128)
    doc.text(subtitle, PAGE.marginX, ctx.y + 4)
  }
  // Liseré or de séparation sous le titre
  doc.setDrawColor(...THEME.secondary)
  doc.setLineWidth(0.5)
  doc.line(PAGE.marginX, ctx.y + 6.2, PAGE.width - PAGE.marginX, ctx.y + 6.2)
  ctx.y += 10
}

/** Paragraphe de texte libre (gère les retours à la ligne). */
export function paragraph(ctx: PdfContext, text: string, opts: { size?: number; color?: [number, number, number]; bold?: boolean; italic?: boolean } = {}): void {
  const size = opts.size ?? 9
  const doc = ctx.doc
  ensureRoom(ctx, size / 2 + 4)
  doc.setFont('helvetica', opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...(opts.color ?? THEME.text))
  const lines = doc.splitTextToSize(normalizeFr(text), PAGE.width - PAGE.marginX * 2)
  ensureRoom(ctx, lines.length * (size * 0.3528 + 1.5))
  doc.text(lines, PAGE.marginX, ctx.y)
  ctx.y += lines.length * (size * 0.3528 + 1.5)
}

/** Paire clé / valeur sur une ligne (pour les zones "informations"). */
export function kvLine(ctx: PdfContext, label: string, value: unknown): void {
  const doc = ctx.doc
  ensureRoom(ctx, 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text(normalizeFr(label), PAGE.marginX, ctx.y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...THEME.text)
  const v = normalizeFr(value)
  doc.text(v, PAGE.marginX + 42, ctx.y)
  ctx.y += 5.2
}

/** Tableau clé / valeur sur deux colonnes (résumé, synthèses). */
export function kvTable(ctx: PdfContext, rows: Array<[string, unknown]>, cols = 2): void {
  const doc = ctx.doc
  const colW = (PAGE.width - PAGE.marginX * 2) / cols
  const rowH = 6.2
  for (let i = 0; i < rows.length; i += cols) {
    const chunk = rows.slice(i, i + cols)
    ensureRoom(ctx, rowH)
    doc.setFillColor(247, 248, 250)
    doc.rect(PAGE.marginX, ctx.y - 4.6, PAGE.width - PAGE.marginX * 2, rowH, 'F')
    chunk.forEach(([label, value], j) => {
      const x = PAGE.marginX + j * colW
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.2)
      doc.setTextColor(107, 114, 128)
      doc.text(normalizeFr(label), x + 3, ctx.y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.2)
      doc.setTextColor(...THEME.text)
      doc.text(normalizeFr(value), x + 3, ctx.y + 4)
    })
    ctx.y += rowH + 1.4
  }
}

/** Message "aucune donnée" lorsque le tableau est vide. */
export function emptyState(ctx: PdfContext, message = 'Aucune donnée disponible'): void {
  const doc = ctx.doc
  ensureRoom(ctx, 14)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(normalizeFr(message), PAGE.width / 2, ctx.y, { align: 'center' })
  ctx.y += 8
}

/**
 * Tableau de données professionnel avec sauts de page automatiques,
 * en-tête répété sur chaque page et lignes zébrées.
 */
export function dataTable(ctx: PdfContext, opts: {
  head?: string[][]
  body: RowInput[]
  startY?: number
  columnStyles?: UserOptions['columnStyles']
  styles?: UserOptions['styles']
  headStyles?: UserOptions['headStyles']
  foot?: string[][]
  footStyles?: UserOptions['styles']
  /** Marge gauche/droite personnalisée (par défaut PAGE.marginX) — permet une colonne centrée compacte. */
  marginX?: number
}): void {
  const doc = ctx.doc
  const finalOpts = freeLastColumn(opts)
  const marginX = opts.marginX ?? PAGE.marginX
  autoTable(doc, {
    startY: finalOpts.startY ?? ctx.y,
    head: finalOpts.head,
    body: finalOpts.body,
    foot: finalOpts.foot,
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: THEME.primary,
      fontStyle: 'bold',
      fontSize: 7.8,
      cellPadding: 2.2,
      ...(finalOpts.footStyles ?? {}),
    },
    margin: { left: marginX, right: marginX, top: 36, bottom: 22 },
    theme: 'grid',
    tableLineColor: [213, 218, 227],
    tableLineWidth: 0.15,
    headStyles: {
      fillColor: THEME.primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.6,
      halign: 'left',
      cellPadding: 2.4,
      ...(finalOpts.headStyles ?? {}),
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.6,
      cellPadding: 2.2,
      textColor: THEME.text,
      lineColor: [213, 218, 227],
      lineWidth: 0.1,
      overflow: 'linebreak',
      ...(finalOpts.styles ?? {}),
    },
    alternateRowStyles: { fillColor: [247, 248, 250] },
    columnStyles: finalOpts.columnStyles,
    didDrawPage: () => {
      // Rien ici : le pied de page est dessiné dans finalizeDocument()
    },
  })
  const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  ctx.y = (last?.finalY ?? ctx.y) + 8
}

/**
 * Si toutes les colonnes ont une largeur fixe, libère la dernière pour qu'elle
 * absorbe l'espace restant (largeur de page pleinement utilisée, aucune colonne
 * ne déborde, pas d'avertissement de largeur d'autotable).
 */
function freeLastColumn(opts: {
  head?: string[][]
  body: RowInput[]
  startY?: number
  columnStyles?: UserOptions['columnStyles']
  styles?: UserOptions['styles']
  headStyles?: UserOptions['headStyles']
  foot?: string[][]
  footStyles?: UserOptions['styles']
  marginX?: number
}): typeof opts {
  const cs = opts.columnStyles
  if (!cs) return opts
  const keys = Object.keys(cs)
  const widths = keys
      .map((k) => cs[k] as { cellWidth?: number } | undefined)
      .filter((v): v is { cellWidth: number } => typeof v?.cellWidth === 'number')
  if (widths.length === 0 || widths.length !== keys.length) return opts
  const marginX = opts.marginX ?? PAGE.marginX
  const available = PAGE.width - marginX * 2
  const total = widths.reduce((sum, w) => sum + w.cellWidth, 0)
  if (Math.abs(total - available) < 0.05) return opts // déjà au plus près
  const lastKey = keys[keys.length - 1]
  const lastCol = { ...(cs[lastKey] as object) } as Record<string, unknown>
  delete lastCol.cellWidth
  return { ...opts, columnStyles: { ...cs, [lastKey]: lastCol } }
}

/**
 * Tableau de synthèse standardisé "Indicateur | Valeur" avec valeurs alignées
 * à droite — utilisé pour les résumés et statistiques de tous les modules.
 */
export function summaryTable(ctx: PdfContext, rows: Array<[string, unknown]>, opts: { widthValue?: number } = {}): void {
  const wValue = opts.widthValue ?? 62
  dataTable(ctx, {
    head: [['Indicateur', 'Valeur']],
    body: rows.map(([label, value]) => [label, normalizeFr(value)]),
    columnStyles: {
      0: { cellWidth: PAGE.width - PAGE.marginX * 2 - wValue - 6 },
      1: { cellWidth: wValue, halign: 'right' },
    },
    styles: { fontSize: 8.4 },
  })
}

/**
 * Tableau de répartition avec colonnes « Libellé | Valeur | Part (%) »
 * et ligne TOTAL en pied de tableau (gris, gras) — conforme au modèle.
 */
export function percentTable(
    ctx: PdfContext,
    rows: Array<[string, number]>,
    headers: [string, string, string] = ['Département', 'Effectif', 'Part (%)'],
    labelTotal = 'Total',
): void {
  const total = rows.reduce((s, [, v]) => s + v, 0)
  dataTable(ctx, {
    head: [headers],
    body: rows.map(([label, value]) => [
      label,
      fmtNum(value),
      total > 0 ? (value / total * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %' : '—',
    ]),
    foot: [[labelTotal, fmtNum(total), total > 0 ? '100,0 %' : '—']],
    columnStyles: {
      0: { cellWidth: PAGE.width - PAGE.marginX * 2 - 2 * 48 },
      1: { cellWidth: 48, halign: 'right' },
      2: { cellWidth: 48, halign: 'right' },
    },
    styles: { fontSize: 8.2 },
  })
}

/** Saut de page explicite. */
export function pageBreak(ctx: PdfContext): void {
  ctx.doc.addPage()
  ctx.y = PAGE.contentStart
}

/**
 * Petit graphique à barres horizontales dessiné en natif (fiabilité maximale,
 * aucun rendu HTML requis). Utilisé pour les statistiques des rapports.
 */
export function drawBarChart(ctx: PdfContext, items: Array<{ label: string; value: number }>, opts: { color?: [number, number, number]; barWidth?: number } = {}): void {
  const doc = ctx.doc
  const color = opts.color ?? THEME.secondary
  const total = items.reduce((sum, it) => sum + Math.max(0, it.value), 0)
  if (items.length === 0 || total === 0) {
    emptyState(ctx, 'Aucune donnée statistique')
    return
  }
  const max = Math.max(...items.map((it) => it.value), 1)
  const labelW = 34
  const chartW = PAGE.width - PAGE.marginX * 2 - labelW - 18
  const rowH = 7.5
  ensureRoom(ctx, items.length * rowH + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.4)
  items.forEach((it, i) => {
    const y = ctx.y + i * rowH
    doc.setTextColor(107, 114, 128)
    doc.text(it.label.length > 22 ? it.label.slice(0, 21) + '…' : it.label, PAGE.marginX, y)
    const w = Math.max(1.2, (Math.max(0, it.value) / max) * chartW)
    doc.setFillColor(...color)
    doc.roundedRect(PAGE.marginX + labelW, y - 2.6, w, 3.2, 0.8, 0.8, 'F')
    doc.setTextColor(...THEME.text)
    doc.setFont('helvetica', 'normal')
    doc.text(fmtNum(it.value), PAGE.marginX + labelW + w + 2, y)
    doc.setFont('helvetica', 'bold')
  })
  ctx.y += items.length * rowH + 5
}

/** Zone de signature professionnelle. */
export function signatureBlock(ctx: PdfContext, lines: Array<[string, string]> = []): void {
  ensureRoom(ctx, 30)
  const doc = ctx.doc
  ctx.y += 4
  doc.setDrawColor(200, 205, 214)
  doc.setLineWidth(0.3)
  const y1 = ctx.y + 18
  // Cachet (cercle or) à droite
  const sealX = PAGE.width - 46
  doc.setDrawColor(...THEME.secondary)
  doc.setLineWidth(0.6)
  doc.circle(sealX + 8, y1 + 2, 8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...THEME.secondary)
  doc.text('GNS', sealX + 8, y1, { align: 'center' })
  doc.text('RESSOURCES', sealX + 8, y1 + 3, { align: 'center' })
  doc.text('HUMAINES', sealX + 8, y1 + 6, { align: 'center' })
  // Lignes de signature
  const signLines = lines.length > 0 ? lines : [
    ['Nom et prénom du responsable RH', ''],
    ['Signature', ''],
  ]
  signLines.forEach(([label], i) => {
    doc.setDrawColor(160, 167, 179)
    doc.setLineWidth(0.25)
    doc.line(PAGE.marginX, y1 + i * 9, PAGE.marginX + 55, y1 + i * 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(107, 114, 128)
    doc.text(normalizeFr(label), PAGE.marginX, y1 + i * 9 + 4)
  })
  ctx.y = y1 + signLines.length * 9 + 6
}

// ---------------------------------------------------------------------------
// Téléchargement
// ---------------------------------------------------------------------------

/**
 * Télécharge un vrai fichier PDF : crée un Blob PDF valide, une URL objet
 * temporaire, puis déclenche le téléchargement natif du navigateur.
 * L'URL Blob est révoquée après le téléchargement.
 */
export function downloadPdf(doc: jsPDF, filename: string): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
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
}

/** Nom de fichier sûr : minuscules, sans accents, sans caractères spéciaux. */
export function safeFileName(name: string): string {
  return normalizeFr(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60)
}
