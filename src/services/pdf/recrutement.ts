/**
 * Générateur PDF — Recrutement (offres d'emploi, candidats, candidatures).
 * Présentation 100 % tableau : synthèse, offres, candidatures.
 */
import type { CandidatItem, Candidature, OffreEmploi } from '../../api/types'
import {
  createDocument, dataTable, emptyState, finalizeDocument, fmtNum, frDate,
  frDateTime, sectionTitle, summaryTable, type PdfContext, defaultReference,
} from './common'

export const ETAPE_CANDIDATURE_LABEL: Record<string, string> = {
  BOITE_RECEPTION: 'Boîte réception',
  BROUILLON: 'Brouillon',
  ENTRETIEN_TEL: 'Entretien téléphonique',
  ENTRETIEN_PHYSIQUE: 'Entretien physique',
  EMBAUCHE: 'Embauché',
}

export const STATUT_OFFRE_LABEL: Record<string, string> = {
  OUVERTE: 'Ouverte',
  CLOTUREE: 'Clôturée',
  EN_ATTENTE: 'En attente',
}

/**
 * PDF Recrutement : synthèse + offres d'emploi + candidatures.
 * @param offres        toutes les offres d'emploi
 * @param candidatures  candidatures (toutes offres confondues)
 * @param offreFiltre   nom d'une offre à mettre en avant (optionnel)
 */
export function recrutementPdf(offres: OffreEmploi[], candidatures: Candidature[], offreFiltre?: string): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Recrutement', offreFiltre ? `Offre : ${offreFiltre}` : 'Bilan des offres et candidatures', { reference: `GNS-REC-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  // Synthèse — tableau "Indicateur | Valeur"
  const offresOuvertes = offres.filter((o) => o.statut !== 'CLOTUREE').length
  const embauches = candidatures.filter((c) => c.etape === 'EMBAUCHE').length
  sectionTitle(ctx, 'Synthèse')
  summaryTable(ctx, [
    ['Offres d\'emploi', offres.length],
    ['Offres ouvertes', offresOuvertes],
    ['Candidatures reçues', candidatures.length],
    ['Candidats embauchés', embauches],
  ])

  // Offres
  sectionTitle(ctx, 'Offres d\'emploi')
  if (offres.length === 0) {
    emptyState(ctx, 'Aucune offre d\'emploi')
  } else {
    dataTable(ctx, {
      head: [['Offre', 'Département', 'Contrat', 'Niveau', 'Mode', 'Statut', 'Publiée le', 'Candidatures']],
      body: offres.map((o) => [
        o.titre,
        o.departement ?? '—',
        o.typeContrat ?? '—',
        o.niveau ?? '—',
        o.mode ?? '—',
        STATUT_OFFRE_LABEL[o.statut] ?? o.statut,
        frDate(o.datePublication),
        fmtNum(o.totalCandidatures ?? 0),
      ]),
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 20 },
        2: { cellWidth: 16 },
        3: { cellWidth: 18 },
        4: { cellWidth: 16 },
        5: { cellWidth: 16 },
        6: { cellWidth: 19 },
        7: { cellWidth: 15 },
      },
    })
  }

  // Candidatures
  sectionTitle(ctx, 'Candidatures & candidats')
  if (candidatures.length === 0) {
    emptyState(ctx, 'Aucune candidature enregistrée')
  } else {
    dataTable(ctx, {
      head: [['Candidat', 'Offre', 'Email', 'Téléphone', 'Étape', 'Entretien', 'Date de création']],
      body: candidatures.map((c) => [
        c.nomComplet,
        c.offreTitre,
        c.email,
        c.telephone ?? '—',
        ETAPE_CANDIDATURE_LABEL[c.etape] ?? c.etape,
        c.dateEntretien ? frDateTime(c.dateEntretien) : '—',
        frDate(c.dateCreation),
      ]),
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 28 },
        2: { cellWidth: 30 },
        3: { cellWidth: 18 },
        4: { cellWidth: 24 },
        5: { cellWidth: 22 },
        6: { cellWidth: 18 },
      },
    })
  }

  return finalizeDocument(ctx)
}

/** PDF dédié aux offres d'emploi. */
export function offresPdf(offres: OffreEmploi[]): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Offres d\'emploi', `${offres.length} offre(s)`, { reference: `GNS-OFF-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  const ouvertes = offres.filter((o) => o.statut !== 'CLOTUREE').length
  sectionTitle(ctx, 'Synthèse')
  summaryTable(ctx, [
    ['Offres d\'emploi', offres.length],
    ['Offres ouvertes', ouvertes],
    ['Offres clôturées', offres.length - ouvertes],
    ['Candidatures reçues (toutes offres)', offres.reduce((s, o) => s + (o.totalCandidatures ?? 0), 0)],
  ])

  sectionTitle(ctx, 'Liste des offres')
  if (offres.length === 0) {
    emptyState(ctx, 'Aucune offre d\'emploi')
  } else {
    dataTable(ctx, {
      head: [['Offre', 'Département', 'Contrat', 'Niveau', 'Mode', 'Statut', 'Publiée le', 'Candidatures']],
      body: offres.map((o) => [
        o.titre,
        o.departement ?? '—',
        o.typeContrat ?? '—',
        o.niveau ?? '—',
        o.mode ?? '—',
        STATUT_OFFRE_LABEL[o.statut] ?? o.statut,
        frDate(o.datePublication),
        fmtNum(o.totalCandidatures ?? 0),
      ]),
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 20 },
        2: { cellWidth: 16 },
        3: { cellWidth: 18 },
        4: { cellWidth: 16 },
        5: { cellWidth: 16 },
        6: { cellWidth: 19 },
        7: { cellWidth: 15 },
      },
    })
  }
  return finalizeDocument(ctx)
}

/** PDF dédié aux candidats. */
export function candidatsPdf(candidats: CandidatItem[]): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Candidats au recrutement', `${candidats.length} candidat(s)`, { reference: `GNS-CAN-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  const avecCv = candidats.filter((c) => c.cvDisponible).length
  sectionTitle(ctx, 'Synthèse')
  summaryTable(ctx, [
    ['Candidats enregistrés', candidats.length],
    ['Candidatures actives', candidats.reduce((s, c) => s + c.nbCandidatures, 0)],
    ['CV reçus', avecCv],
  ])

  sectionTitle(ctx, 'Liste des candidats')
  if (candidats.length === 0) {
    emptyState(ctx, 'Aucun candidat enregistré')
  } else {
    dataTable(ctx, {
      head: [['Candidat', 'Email', 'Téléphone', 'LinkedIn', 'Offres postulées', 'Candidatures', 'CV']],
      body: candidats.map((c) => [
        c.nomComplet,
        c.email,
        c.telephone ?? '—',
        c.linkedin ?? '—',
        c.offres || '—',
        fmtNum(c.nbCandidatures),
        c.cvDisponible ? 'Oui' : 'Non',
      ]),
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 34 },
        2: { cellWidth: 20 },
        3: { cellWidth: 26 },
        4: { cellWidth: 40 },
        5: { cellWidth: 16 },
        6: { cellWidth: 10 },
      },
    })
  }
  return finalizeDocument(ctx)
}
