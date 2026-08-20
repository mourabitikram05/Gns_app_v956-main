/**
 * Générateur PDF — Dashboard RH & Alertes RH.
 *
 * Conforme au modèle officiel GNS TECHNOLOGIES : AUCUN graphique —
 * toutes les données sont présentées sous forme de tableaux professionnels
 * (indicateurs, effectifs avec part, absences mensuelles, actions, activité).
 */
import type { AbsenceMensuelle, ActionAttente, ActiviteItem, DeptCount, KpiCard } from '../../api/types'
import {
  COMPANY_NAME, createDocument, dataTable, defaultReference, emptyState, finalizeDocument,
  fmtMontant, fmtNum, frDate, paragraph, percentTable, sectionTitle, summaryTable, type PdfContext,
} from './common'

export interface DashboardPdfData {
  kpis: KpiCard[]
  absences: AbsenceMensuelle[]
  depts: DeptCount[]
  actions: ActionAttente[]
  activite: ActiviteItem[]
  enPoste?: number
}

/** Exporte uniquement les alertes / actions en attente. */
export function alertesPdf(actions: ActionAttente[]): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Alertes RH', 'Actions en attente de validation', { reference: `GNS-ALR-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  paragraph(ctx, `Objet : le présent document recense les alertes et actions administratives en attente de traitement par le service des ressources humaines de ${COMPANY_NAME}.`,
    { size: 8.5, color: [75, 85, 99] })
  ctx.y += 3

  sectionTitle(ctx, 'Alertes en attente de traitement', 'Liste des demandes soumises et en attente de validation administrative.')
  if (actions.length === 0) {
    emptyState(ctx, 'Aucune alerte en attente')
  } else {
    dataTable(ctx, {
      head: [['Collaborateur', 'Type', 'Module', 'Détail', 'Début', 'Fin', 'Jours / Montant']],
      body: actions.map((a) => [
        a.name,
        a.type,
        a.module === 'FRAIS' ? 'Notes de frais' : 'Congés',
        a.detail,
        frDate(a.dateDebut),
        frDate(a.dateFin),
        a.module === 'FRAIS' ? fmtMontant(a.montant) : `${fmtNum(a.nombreJours)} j`,
      ]),
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 20 },
        2: { cellWidth: 24 },
        3: { cellWidth: 40 },
        4: { cellWidth: 17 },
        5: { cellWidth: 17 },
        6: { cellWidth: 20 },
      },
    })
  }
  return finalizeDocument(ctx)
}

/** PDF complet du dashboard RH — 100 % tableaux, aucun graphique. */
export function dashboardPdf(data: DashboardPdfData): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Dashboard Ressources Humaines', 'Synthèse officielle des indicateurs de gestion', {
    reference: `GNS-DRH-${defaultReference().slice(8)}`,
  })
  const doc = ctx.doc

  // Objet (paragraphe d'introduction, conforme au modèle)
  paragraph(ctx, `Objet : le présent document constitue la synthèse officielle des indicateurs de gestion des ressources humaines de ${COMPANY_NAME}, établie à des fins de suivi administratif et de reporting à la direction. Chaque section présente les données correspondantes sous forme de tableau récapitulatif.`,
    { size: 8.5, color: [75, 85, 99] })
  ctx.y += 3

  // 1. Indicateurs clés — tableau Indicateur | Valeur | Variation
  sectionTitle(ctx, 'Indicateurs clés', 'Valeurs actuelles des principaux indicateurs de gestion.')
  if (data.kpis.length === 0) {
    emptyState(ctx, 'Aucun indicateur')
  } else {
    const rows: Array<[string, string, string]> = data.kpis.map((k) => [
      k.label,
      k.value,
      k.change ? k.change : '0',
    ])
    if (typeof data.enPoste === 'number') {
      rows.push(['Collaborateurs en poste actuellement', fmtNum(data.enPoste), '—'])
    }
    dataTable(ctx, {
      head: [['Indicateur', 'Valeur', 'Variation']],
      body: rows,
      columnStyles: {
        0: { cellWidth: PAGE_CONTENT - 2 * 40 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 40, halign: 'right' },
      },
      styles: { fontSize: 8.2 },
    })
  }

  // 2. Effectifs par département — Département | Effectif | Part (%) + Total
  if (data.depts.length > 0) {
    sectionTitle(ctx, 'Effectifs par département', 'Répartition des effectifs actuels par département, présentée sous forme de tableau récapitulatif.')
    percentTable(ctx, data.depts.map((d) => [d.name, d.value] as [string, number]))
  }

  // 3. Jours d'absence par mois — Mois | Jours d'absence + Total
  if (data.absences.length > 0) {
    sectionTitle(ctx, 'Jours d\'absence par mois', 'Évolution mensuelle du nombre de jours d\'absence constatés, présentée sous forme de tableau récapitulatif.')
    const totalAbsences = data.absences.reduce((s, a) => s + (a.jours || 0), 0)
    dataTable(ctx, {
      head: [['Mois', 'Jours d\'absence']],
      body: data.absences.map((a) => [a.mois, fmtNum(a.jours || 0)]),
      foot: [['Total', fmtNum(totalAbsences)]],
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 60, halign: 'right' },
      },
      styles: { fontSize: 8.2 },
    })
  }

  // 4. Actions en attente — tableau
  sectionTitle(ctx, 'Actions en attente', 'Liste des demandes actuellement soumises et en attente de validation administrative.')
  if (data.actions.length === 0) {
    emptyState(ctx, 'Aucune action en attente')
  } else {
    dataTable(ctx, {
      head: [['Collaborateur', 'Type', 'Module', 'Détail', 'Jours / Montant']],
      body: data.actions.map((a) => [
        a.name,
        a.type,
        a.module === 'FRAIS' ? 'Notes de frais' : 'Congés',
        a.detail,
        a.module === 'FRAIS' ? fmtMontant(a.montant) : `${fmtNum(a.nombreJours)} j`,
      ]),
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 22 },
        2: { cellWidth: 26 },
        3: { cellWidth: 68 },
        4: { cellWidth: 24 },
      },
    })
  }

  // 5. Activité récente — tableau Activité | Délai
  sectionTitle(ctx, 'Activité récente', 'Journal des dernières actions enregistrées dans le système d\'information RH.')
  if (data.activite.length === 0) {
    emptyState(ctx, 'Aucune activité récente')
  } else {
    dataTable(ctx, {
      head: [['Activité', 'Délai']],
      body: data.activite.map((a) => [a.text, a.time]),
      columnStyles: {
        0: { cellWidth: 136 },
        1: { cellWidth: 38 },
      },
    })
  }

  return finalizeDocument(ctx)
}

const PAGE_CONTENT = 178 // 210 - 2 × 16 (marges)
