/**
 * Générateur PDF — KPI & Reporting.
 * Présentation : synthèse "Indicateur | Valeur", valeurs en tableau,
 * graphique à barres (seule visualisation autorisée).
 */
import type { KpiReport, RapportRH } from '../../api/types'
import {
  createDocument, dataTable, drawBarChart, emptyState, finalizeDocument, fmtNum,
  frDateTime, sectionTitle, summaryTable, type PdfContext, defaultReference,
} from './common'

const CATEGORIE_LABEL: Record<string, string> = {
  Effectifs: 'Effectifs',
  Congés: 'Congés & absences',
  Recrutement: 'Recrutement',
  Formation: 'Formation',
  Finance: 'Finance',
}

/** PDF des indicateurs KPI (avec graphique à barres natif). */
export function kpiPdf(kpis: KpiReport[], filters: { categorie?: string; departement?: string } = {}): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('KPI & Reporting',
    `Filtres : ${filters.categorie || 'toutes catégories'} · ${filters.departement || 'tous départements'}`,
    { reference: `GNS-KPI-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  const parCategorie = new Map<string, number>()
  kpis.forEach((k) => parCategorie.set(k.categorie, (parCategorie.get(k.categorie) ?? 0) + 1))

  sectionTitle(ctx, 'Synthèse')
  summaryTable(ctx, [
    ['Indicateurs affichés', fmtNum(kpis.length)],
    ['Catégories', [...parCategorie.keys()].map((c) => CATEGORIE_LABEL[c] ?? c).join(', ') || '—'],
    ['Dernier calcul', kpis.length > 0 ? frDateTime(kpis[0].dateCalcul) : '—'],
  ])

  if (kpis.length > 0) {
    sectionTitle(ctx, 'Valeurs des indicateurs')
    dataTable(ctx, {
      head: [['Catégorie', 'Indicateur', 'Valeur', 'Unité']],
      body: kpis.map((k) => [
        CATEGORIE_LABEL[k.categorie] ?? k.categorie,
        k.nom,
        k.valeur,
        k.unite ?? '—',
      ]),
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 86 },
        2: { cellWidth: 24 },
        3: { cellWidth: 24 },
      },
    })

    // Graphique (seule visualisation du document)
    sectionTitle(ctx, 'Graphique des indicateurs')
    const chart = kpis.slice(0, 14).map((k) => ({
      label: k.nom,
      value: parseFloat(k.valeur.replace(',', '.')) || 0,
    }))
    drawBarChart(ctx, chart)
  } else {
    emptyState(ctx, 'Aucun indicateur pour ces filtres')
  }

  return finalizeDocument(ctx)
}

/** PDF de l'historique des rapports générés. */
export function rapportHistoryPdf(rapports: RapportRH[]): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Historique des rapports', `${rapports.length} rapport(s) généré(s)`)
  const doc = ctx.doc

  if (rapports.length === 0) {
    emptyState(ctx, 'Aucun rapport généré')
  } else {
    dataTable(ctx, {
      head: [['Titre', 'Type', 'Format', 'Généré le']],
      body: rapports.map((r) => [r.titre, r.typeRapport, r.format, frDateTime(r.dateGeneration)]),
      columnStyles: {
        0: { cellWidth: 66 },
        1: { cellWidth: 38 },
        2: { cellWidth: 24 },
        3: { cellWidth: 44 },
      },
    })
  }
  return finalizeDocument(ctx)
}
