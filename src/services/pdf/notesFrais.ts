/**
 * Générateur PDF — Notes de frais, dépenses, justificatifs et remboursements.
 * Présentation 100 % tableau : synthèse financière, notes, dépenses & justificatifs.
 */
import type { NoteFrais } from '../../api/types'
import {
  createDocument, dataTable, emptyState, finalizeDocument, fmtMontant, frDate,
  paragraph, sectionTitle, summaryTable, type PdfContext, defaultReference,
} from './common'

export const STATUT_FRAIS_LABEL: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  REMBOURSEE: 'Remboursée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
}

/** PDF des notes de frais (avec synthèse financière, dépenses et justificatifs). */
export function notesFraisPdf(notes: NoteFrais[], titre = 'Notes de frais'): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument(titre, `${notes.length} note(s) de frais`, { reference: `GNS-FRA-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  // Synthèse financière — tableau "Indicateur | Valeur"
  const parStatut = new Map<string, { count: number; montant: number }>()
  notes.forEach((n) => {
    const cur = parStatut.get(n.statut) ?? { count: 0, montant: 0 }
    cur.count += 1
    cur.montant += n.montantTotal || 0
    parStatut.set(n.statut, cur)
  })
  const total = notes.reduce((s, n) => s + (n.montantTotal || 0), 0)
  const aRembourser = (parStatut.get('EN_ATTENTE')?.montant ?? 0) + (parStatut.get('EN_COURS')?.montant ?? 0)

  sectionTitle(ctx, 'Synthèse financière')
  summaryTable(ctx, [
    ['Nombre de notes', notes.length],
    ['Montant total', fmtMontant(total)],
    ['En attente', `${parStatut.get('EN_ATTENTE')?.count ?? 0} note(s) — ${fmtMontant(parStatut.get('EN_ATTENTE')?.montant)}`],
    ['En cours', `${parStatut.get('EN_COURS')?.count ?? 0} note(s) — ${fmtMontant(parStatut.get('EN_COURS')?.montant)}`],
    ['Remboursées', `${parStatut.get('REMBOURSEE')?.count ?? 0} note(s) — ${fmtMontant(parStatut.get('REMBOURSEE')?.montant)}`],
    ['Montant à rembourser', fmtMontant(aRembourser)],
    ['Refusées', `${parStatut.get('REFUSEE')?.count ?? 0} note(s) — ${fmtMontant(parStatut.get('REFUSEE')?.montant)}`],
    ['Annulées', `${parStatut.get('ANNULEE')?.count ?? 0} note(s) — ${fmtMontant(parStatut.get('ANNULEE')?.montant)}`],
  ])

  // Tableau principal
  sectionTitle(ctx, 'Détail des notes de frais')
  if (notes.length === 0) {
    emptyState(ctx, 'Aucune note de frais')
  } else {
    dataTable(ctx, {
      head: [['Référence', 'Employé', 'Objet', 'Date', 'Priorité', 'Montant', 'Statut']],
      body: notes.map((n) => [
        n.reference,
        n.employeNom,
        n.titre,
        frDate(n.date),
        n.priorite ?? '—',
        fmtMontant(n.montantTotal, n.devise),
        STATUT_FRAIS_LABEL[n.statut] ?? n.statut,
      ]),
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 26 },
        2: { cellWidth: 34 },
        3: { cellWidth: 16 },
        4: { cellWidth: 14 },
        5: { cellWidth: 22 },
        6: { cellWidth: 18 },
      },
    })
  }

  // Dépenses & justificatifs par note — tableau
  const notesAvecDepenses = notes.filter((n) => (n.depenses?.length ?? 0) > 0)
  const notesAvecJustifs = notes.filter((n) => (n.justificatifs?.length ?? 0) > 0)
  if (notesAvecDepenses.length > 0 || notesAvecJustifs.length > 0) {
    sectionTitle(ctx, 'Dépenses et justificatifs')
    const body: (string | number)[][] = []
    notes.forEach((n) => {
      const depenses = n.depenses ?? []
      const justifs = n.justificatifs ?? []
      const lignes = Math.max(depenses.length, justifs.length, 1)
      for (let i = 0; i < lignes; i++) {
        body.push([
          n.reference,
          i === 0 ? n.titre : '',
          depenses[i] ?? '',
          justifs[i] ?? '',
          i === 0 ? fmtMontant(n.montantTotal, n.devise) : '',
        ])
      }
    })
    dataTable(ctx, {
      head: [['Référence', 'Objet', 'Dépenses', 'Justificatifs', 'Montant']],
      body,
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 42 },
        3: { cellWidth: 42 },
        4: { cellWidth: 20 },
      },
    })
  }

  paragraph(ctx, 'Les justificatifs sont archivés par le service RH. Les remboursements sont effectués après validation de la note.', { size: 7.5, italic: true, color: [107, 114, 128] })
  return finalizeDocument(ctx)
}
