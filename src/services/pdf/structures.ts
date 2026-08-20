/**
 * Générateur PDF — Structures RH (départements & équipes).
 * Présentation 100 % tableau : synthèse, départements, équipes.
 */
import type { DepartementItem, EquipeItem } from '../../api/modules'
import {
  createDocument, dataTable, emptyState, finalizeDocument, fmtNum,
  sectionTitle, summaryTable, type PdfContext, defaultReference,
} from './common'

/** PDF de l'organigramme RH : départements puis équipes. */
export function structurePdf(departements: DepartementItem[], equipes: EquipeItem[]): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Structures RH',
    `${departements.length} département(s) · ${equipes.length} équipe(s)`,
    { reference: `GNS-STR-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  sectionTitle(ctx, 'Synthèse')
  summaryTable(ctx, [
    ['Départements', departements.length],
    ['Équipes', equipes.length],
    ['Employés (départements)', departements.reduce((s, d) => s + (d.nbEmployes ?? 0), 0)],
    ['Employés (équipes)', equipes.reduce((s, e) => s + (e.nbEmployes ?? 0), 0)],
  ])

  sectionTitle(ctx, 'Départements')
  if (departements.length === 0) {
    emptyState(ctx, 'Aucun département')
  } else {
    dataTable(ctx, {
      head: [['Département', 'Description', 'Employés', 'Équipes']],
      body: departements.map((d) => [
        d.nom,
        d.description ?? '—',
        fmtNum(d.nbEmployes ?? 0),
        fmtNum(d.nbEquipes ?? 0),
      ]),
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 78 },
        2: { cellWidth: 24 },
        3: { cellWidth: 22 },
      },
    })
  }

  sectionTitle(ctx, 'Équipes')
  if (equipes.length === 0) {
    emptyState(ctx, 'Aucune équipe')
  } else {
    dataTable(ctx, {
      head: [['Équipe', 'Département', 'Description', 'Employés']],
      body: equipes.map((e) => [
        e.nom,
        e.departementNom ?? '—',
        e.description ?? '—',
        fmtNum(e.nbEmployes ?? 0),
      ]),
      columnStyles: {
        0: { cellWidth: 44 },
        1: { cellWidth: 38 },
        2: { cellWidth: 72 },
        3: { cellWidth: 18 },
      },
    })
  }

  return finalizeDocument(ctx)
}
