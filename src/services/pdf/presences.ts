/**
 * Générateur PDF — Présences & pointage.
 * Présentation 100 % tableau : résumé "Indicateur | Valeur" + détail des pointages.
 */
import type { Pointage } from '../../api/types'
import {
  createDocument, dataTable, emptyState, finalizeDocument, frDate, frDateTime,
  paragraph, sectionTitle, summaryTable, type PdfContext, defaultReference,
} from './common'

/**
 * PDF des présences / pointages.
 * @param pointages   liste des pointages (un par jour)
 * @param employeNom  nom de l'employé concerné (optionnel)
 */
export function presencePdf(pointages: Pointage[], employeNom?: string | null): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Présences & pointage', employeNom ? `Collaborateur : ${employeNom}` : undefined, { reference: `GNS-PRE-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  if (pointages.length > 0) {
    const totalDuree = pointages.reduce((sum, p) => sum + parseDuree(p.duree), 0)
    sectionTitle(ctx, 'Synthèse')
    summaryTable(ctx, [
      ['Jours pointés', pointages.length],
      ['Durée totale', formatDuree(totalDuree)],
      ['Dernier pointage', frDateTime(pointages[pointages.length - 1].date)],
    ])
  }

  sectionTitle(ctx, 'Détail des pointages')
  if (pointages.length === 0) {
    emptyState(ctx, 'Aucun pointage enregistré')
  } else {
    dataTable(ctx, {
      head: [['Date', 'Heure d\'arrivée', 'Heure de départ', 'Durée']],
      body: pointages.map((p) => [
        frDate(p.date),
        p.heureArrivee ?? '—',
        p.heureDepart ?? '—',
        p.duree ?? '—',
      ]),
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 35 },
      },
    })
  }

  paragraph(ctx, 'Les pointages sont enregistrés automatiquement par l\'application lors des arrivées et départs des collaborateurs.', { size: 7.5, italic: true, color: [107, 114, 128] })
  return finalizeDocument(ctx)
}

/** Convertit "08:30" ou "8h30" en minutes. */
function parseDuree(duree?: string | null): number {
  if (!duree) return 0
  const m = /^(\d+)[h:.](\d+)/.exec(duree.trim())
  if (m) return Number(m[1]) * 60 + Number(m[2])
  return 0
}

function formatDuree(minutes: number): string {
  if (minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h} h ${m.toString().padStart(2, '0')}`
}
