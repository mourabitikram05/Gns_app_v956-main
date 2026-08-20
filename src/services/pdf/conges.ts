/**
 * Générateur PDF — Congés & absences.
 *  - congePdf        : liste des demandes de congé (collaborateur ou RH)
 *  - calendrierPdf   : planning mensuel de l'équipe (vue calendrier RH)
 * Présentation 100 % tableau : résumés "Indicateur | Valeur" + détails en tableaux.
 */
import type { CalendrierEquipe, DemandeConge, SoldeResponse } from '../../api/types'
import {
  createDocument, dataTable, emptyState, finalizeDocument, fmtNum, frDate, frMonthName,
  paragraph, sectionTitle, summaryTable, type PdfContext, defaultReference,
} from './common'

export const STATUT_CONGE_LABEL: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  APPROUVEE: 'Approuvée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
}

/** PDF des demandes de congé. */
export function congePdf(demandes: DemandeConge[], solde?: SoldeResponse | null, titre = 'Demandes de congé'): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument(titre, `${demandes.length} demande(s)`, { reference: `GNS-CON-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  if (solde) {
    sectionTitle(ctx, 'Solde de congés')
    summaryTable(ctx, [
      ['Année de référence', solde.annee],
      ['Solde au 31 décembre', `${fmtNum(solde.soldeAu31Decembre)} jour(s)`],
      ['Solde à ce jour', `${fmtNum(solde.soldeACeJour)} jour(s)`],
      ['Jours pris', `${fmtNum(solde.joursPris)} jour(s)`],
      ['Absences justifiées', fmtNum(solde.absencesJustifiees)],
      ['Demandes en attente', fmtNum(solde.enAttente)],
    ])
  }

  sectionTitle(ctx, 'Détail des demandes')
  if (demandes.length === 0) {
    emptyState(ctx, 'Aucune demande de congé')
  } else {
    dataTable(ctx, {
      head: [['Référence', 'Employé', 'Type de congé', 'Date début', 'Date fin', 'Durée', 'Statut', 'Demandé le']],
      body: demandes.map((d) => [
        d.reference,
        d.employeNom,
        d.typeNom,
        frDate(d.dateDebut),
        frDate(d.dateFin),
        `${fmtNum(d.nombreJours)} j`,
        STATUT_CONGE_LABEL[d.statut] ?? d.statut,
        frDate(d.dateDemande),
      ]),
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 22 },
        3: { cellWidth: 17 },
        4: { cellWidth: 17 },
        5: { cellWidth: 12 },
        6: { cellWidth: 18 },
        7: { cellWidth: 17 },
      },
    })
  }

  // Synthèse par statut — tableau "Indicateur | Valeur"
  const counts = new Map<string, number>()
  demandes.forEach((d) => counts.set(d.statut, (counts.get(d.statut) ?? 0) + 1))
  const totalJours = demandes.reduce((sum, d) => sum + (d.nombreJours || 0), 0)
  sectionTitle(ctx, 'Synthèse')
  summaryTable(ctx, [
    ['Total demandes', demandes.length],
    ['En attente', counts.get('EN_ATTENTE') ?? 0],
    ['Approuvées', counts.get('APPROUVEE') ?? 0],
    ['Refusées', counts.get('REFUSEE') ?? 0],
    ['Annulées', counts.get('ANNULEE') ?? 0],
    ['Total jours posés', `${fmtNum(totalJours)} jour(s)`],
  ])

  return finalizeDocument(ctx)
}

/** PDF du planning mensuel des congés (calendrier d'équipe). */
export function calendrierPdf(calendrier: CalendrierEquipe, titre = 'Planning des congés'): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument(titre, `${frMonthName(calendrier.mois)} ${calendrier.annee}`, { reference: `GNS-CAL-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  const nbJours = daysInMonth(calendrier.mois, calendrier.annee)

  // Résumé — tableau "Indicateur | Valeur"
  const totalPresents = Object.values(calendrier.presentParJour ?? {}).reduce((s, v) => s + (v ?? 0), 0)
  const nbJourOuvres = Math.max(1, nbJours)
  sectionTitle(ctx, 'Résumé du mois')
  summaryTable(ctx, [
    ['Mois concerné', `${frMonthName(calendrier.mois)} ${calendrier.annee}`],
    ['Collaborateurs', fmtNum(calendrier.employes?.length ?? 0)],
    ['Présences cumulées', fmtNum(totalPresents)],
    ['Moyenne de présents / jour', fmtNum(Math.round(totalPresents / nbJourOuvres))],
  ])

  // Tableau calendrier
  sectionTitle(ctx, 'Calendrier des congés')
  if (!calendrier.employes || calendrier.employes.length === 0) {
    emptyState(ctx, 'Aucun collaborateur pour cette période')
  } else {
    const entetes = ['Collaborateur', 'Département', ...joursHeader(calendrier.mois, calendrier.annee)]
    const body = calendrier.employes.map((l) => {
      const row: (string | number)[] = [l.nom, l.departement ?? '—']
      for (let d = 1; d <= nbJours; d++) {
        const cell = l.jours?.[d]
        row.push(cell?.code && cell.code !== 'P' ? cell.code : '')
      }
      return row
    })
    dataTable(ctx, {
      head: [entetes],
      body,
      styles: { fontSize: 6, cellPadding: 1.2 },
      headStyles: { fontSize: 6, cellPadding: 1.2 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 24 },
      },
    })
    paragraph(ctx, 'Légende : case vide = présent · code affiché = type d\'absence (C : congé, A : absence, M : maladie…).',
      { size: 7, italic: true, color: [107, 114, 128] })
  }

  return finalizeDocument(ctx)
}

function daysInMonth(mois: number, annee: number): number {
  return new Date(annee, mois, 0).getDate()
}

function joursHeader(mois: number, annee: number): string[] {
  return Array.from({ length: daysInMonth(mois, annee) }, (_, i) => String(i + 1))
}
