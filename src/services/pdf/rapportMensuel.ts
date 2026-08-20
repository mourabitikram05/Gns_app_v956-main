/**
 * Générateur PDF — Rapport mensuel RH.
 *
 * Structure 100 % tableau : Résumé (Indicateur | Valeur), Statistiques
 * (graphique des absences + tableau des effectifs), Détails (tableaux),
 * puis zone de signature avec cachet.
 */
import type { AbsenceMensuelle, Candidature, DemandeConge, DeptCount, NoteFrais } from '../../api/types'
import {
  createDocument, dataTable, drawBarChart, emptyState, finalizeDocument, fmtMontant, fmtNum,
  frDate, frMonthName, paragraph, percentTable, sectionTitle, signatureBlock, summaryTable, type PdfContext,
} from './common'
import { STATUT_CONGE_LABEL } from './conges'
import { STATUT_FRAIS_LABEL } from './notesFrais'
import { ETAPE_CANDIDATURE_LABEL } from './recrutement'

export interface RapportMensuelResume {
  totalEmployes: number | null
  nouveauxEmployes: number | null
  departs: number | null
  congesApprouves: number | null
  congesEnAttente: number | null
  absences: number | null
  presencesMoyenne: number | null
  notesFrais: number | null
  montantFrais: number | null
  offresPubliees: number | null
  candidatures: number | null
  embauches: number | null
}

export interface RapportMensuelData {
  mois: number
  annee: number
  resume: RapportMensuelResume
  stats?: {
    absencesMensuelles?: AbsenceMensuelle[]
    effectifsDepartement?: DeptCount[]
  }
  details?: {
    conges?: DemandeConge[]
    notesFrais?: NoteFrais[]
    candidatures?: Candidature[]
  }
}

/** Génère le PDF du rapport mensuel pour la période donnée. */
export function rapportMensuelPdf(data: RapportMensuelData): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Rapport mensuel RH', `Période : ${frMonthName(data.mois)} ${data.annee}`, {
    reference: `GNS-RPM-${data.annee}-${String(data.mois).padStart(2, '0')}`,
  })
  const doc = ctx.doc

  // ------------------------------------------------------------------ Résumé
  // Tableau "Indicateur | Valeur" avec valeurs alignées à droite
  sectionTitle(ctx, 'Résumé')
  const r = data.resume
  summaryTable(ctx, [
    ['Nombre total d\'employés', r.totalEmployes === null ? '—' : fmtNum(r.totalEmployes)],
    ['Nouveaux employés', r.nouveauxEmployes === null ? '—' : fmtNum(r.nouveauxEmployes)],
    ['Départs', r.departs === null ? '—' : fmtNum(r.departs)],
    ['Congés approuvés', r.congesApprouves === null ? '—' : fmtNum(r.congesApprouves)],
    ['Congés en attente', r.congesEnAttente === null ? '—' : fmtNum(r.congesEnAttente)],
    ['Absences', r.absences === null ? '—' : fmtNum(r.absences)],
    ['Présences (moyenne / jour)', r.presencesMoyenne === null ? '—' : fmtNum(r.presencesMoyenne)],
    ['Notes de frais', r.notesFrais === null ? '—' : fmtNum(r.notesFrais)],
    ['Montant des frais', r.montantFrais === null ? '—' : fmtMontant(r.montantFrais)],
    ['Offres publiées', r.offresPubliees === null ? '—' : fmtNum(r.offresPubliees)],
    ['Candidatures reçues', r.candidatures === null ? '—' : fmtNum(r.candidatures)],
    ['Embauches', r.embauches === null ? '—' : fmtNum(r.embauches)],
  ])

  // ------------------------------------------------------------- Statistiques
  const stats = data.stats
  if (stats && (stats.absencesMensuelles?.length || stats.effectifsDepartement?.length)) {
    sectionTitle(ctx, 'Statistiques')
    if (stats.absencesMensuelles && stats.absencesMensuelles.length > 0) {
      paragraph(ctx, 'Jours d\'absence par mois (8 derniers mois)', { size: 9, bold: true })
      drawBarChart(ctx, stats.absencesMensuelles.map((a) => ({ label: a.mois, value: a.jours })), { color: [201, 162, 39] })
      ctx.y += 2
    }
    if (stats.effectifsDepartement && stats.effectifsDepartement.length > 0) {
      paragraph(ctx, 'Effectifs par département', { size: 9, bold: true })
      percentTable(ctx, stats.effectifsDepartement.map((d) => [d.name, d.value] as [string, number]))
    }
  }

  // ---------------------------------------------------------------- Détails
  const details = data.details
  if (details && (details.conges?.length || details.notesFrais?.length || details.candidatures?.length)) {
    sectionTitle(ctx, 'Détails')

    if (details.conges && details.conges.length > 0) {
      paragraph(ctx, 'Congés de la période', { size: 9, bold: true })
      dataTable(ctx, {
        head: [['Référence', 'Employé', 'Type', 'Début', 'Fin', 'Durée', 'Statut']],
        body: details.conges.map((d) => [
          d.reference, d.employeNom, d.typeNom,
          frDate(d.dateDebut), frDate(d.dateFin), `${fmtNum(d.nombreJours)} j`,
          STATUT_CONGE_LABEL[d.statut] ?? d.statut,
        ]),
        columnStyles: {
          0: { cellWidth: 24 }, 1: { cellWidth: 30 }, 2: { cellWidth: 22 },
          3: { cellWidth: 17 }, 4: { cellWidth: 17 }, 5: { cellWidth: 12 }, 6: { cellWidth: 20 },
        },
      })
      ctx.y += 2
    }

    if (details.notesFrais && details.notesFrais.length > 0) {
      paragraph(ctx, 'Notes de frais de la période', { size: 9, bold: true })
      dataTable(ctx, {
        head: [['Référence', 'Employé', 'Objet', 'Date', 'Montant', 'Statut']],
        body: details.notesFrais.map((n) => [
          n.reference, n.employeNom, n.titre, frDate(n.date),
          fmtMontant(n.montantTotal, n.devise),
          STATUT_FRAIS_LABEL[n.statut] ?? n.statut,
        ]),
        columnStyles: {
          0: { cellWidth: 24 }, 1: { cellWidth: 28 }, 2: { cellWidth: 32 },
          3: { cellWidth: 17 }, 4: { cellWidth: 23 }, 5: { cellWidth: 20 },
        },
      })
      ctx.y += 2
    }

    if (details.candidatures && details.candidatures.length > 0) {
      paragraph(ctx, 'Candidatures de la période', { size: 9, bold: true })
      dataTable(ctx, {
        head: [['Candidat', 'Offre', 'Étape', 'Date de création']],
        body: details.candidatures.map((c) => [
          c.nomComplet, c.offreTitre,
          ETAPE_CANDIDATURE_LABEL[c.etape] ?? c.etape,
          frDate(c.dateCreation),
        ]),
        columnStyles: {
          0: { cellWidth: 40 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 },
        },
      })
    }
  }

  // ------------------------------------------------------------- Signature
  sectionTitle(ctx, 'Validation du rapport')
  signatureBlock(ctx, [
    ['Nom et prénom du responsable RH', ''],
    ['Signature et cachet du service RH', ''],
    ['Date de validation', ''],
  ])

  paragraph(ctx, `Rapport mensuel des ressources humaines — ${frMonthName(data.mois)} ${data.annee}. Document généré automatiquement par GNS SIRH.`,
    { size: 7.5, italic: true, color: [107, 114, 128] })

  return finalizeDocument(ctx)
}

/** Version "données vides" — rapport généré même sans données. */
export function rapportMensuelVidePdf(mois: number, annee: number): ReturnType<typeof finalizeDocument> {
  return rapportMensuelPdf({
    mois,
    annee,
    resume: {
      totalEmployes: null, nouveauxEmployes: null, departs: null,
      congesApprouves: null, congesEnAttente: null, absences: null,
      presencesMoyenne: null, notesFrais: null, montantFrais: null,
      offresPubliees: null, candidatures: null, embauches: null,
    },
  })
}
