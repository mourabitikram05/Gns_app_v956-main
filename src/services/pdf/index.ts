/**
 * Service PDF centralisé — point d'entrée unique.
 *
 * Chaque module de l'application dispose d'un générateur dédié qui produit
 * un véritable fichier .pdf (Blob PDF valide) à partir des vraies données.
 */
import type {
  ActionAttente, AbsenceMensuelle, CalendrierEquipe, CandidatItem, Candidature, DemandeConge,
  DemandeDocument, DeptCount, EmployeListItem,
  KpiCard, KpiReport, NoteFrais, OffreEmploi, Pointage, RapportRH, SoldeResponse,
  StatsDocuments,
} from '../../api/types'
import type { DepartementItem, EquipeItem } from '../../api/modules'
import type { RapportMensuelData } from './rapportMensuel'
import { openPdf, safeFileName } from './common'
import { employeePdf } from './employees'
import { congePdf, calendrierPdf } from './conges'
import { presencePdf } from './presences'
import { candidatsPdf, offresPdf, recrutementPdf } from './recrutement'
import { notesFraisPdf } from './notesFrais'
import { kpiPdf, rapportHistoryPdf } from './kpi'
import { documentPdf } from './documents'
import { documentOfficielPdf } from './documentOfficiel'
import { structurePdf } from './structures'
import { alertesPdf, dashboardPdf } from './dashboard'
import { rapportMensuelPdf } from './rapportMensuel'

export * from './common'

export { employeePdf, STATUT_EMPLOYE_LABEL } from './employees'
export { congePdf, calendrierPdf, STATUT_CONGE_LABEL } from './conges'
export { presencePdf } from './presences'
export { recrutementPdf, offresPdf, candidatsPdf, ETAPE_CANDIDATURE_LABEL, STATUT_OFFRE_LABEL } from './recrutement'
export { notesFraisPdf, STATUT_FRAIS_LABEL } from './notesFrais'
export { kpiPdf, rapportHistoryPdf } from './kpi'
export { documentPdf, STATUT_DOCUMENT_LABEL, FORMAT_DOCUMENT_LABEL } from './documents'
export { documentOfficielPdf } from './documentOfficiel'
export { structurePdf } from './structures'
export { alertesPdf, dashboardPdf, type DashboardPdfData } from './dashboard'
export {
  rapportMensuelPdf, rapportMensuelVidePdf,
  type RapportMensuelData, type RapportMensuelResume,
} from './rapportMensuel'

// ---------------------------------------------------------------------------
// Raccourcis de téléchargement (un appel = un vrai fichier .pdf téléchargé)
// ---------------------------------------------------------------------------

export function downloadEmployeePdf(employes: EmployeListItem[]): void {
  openPdf(employeePdf(employes), `annuaire_employes_${safeFileName(new Date().toISOString().slice(0, 10))}.pdf`)
}

export function downloadCongePdf(demandes: DemandeConge[], solde?: SoldeResponse | null, titre?: string): void {
  openPdf(congePdf(demandes, solde, titre), 'demandes_conges.pdf')
}

export function downloadCalendrierPdf(calendrier: CalendrierEquipe): void {
  openPdf(calendrierPdf(calendrier), `planning_conges_${calendrier.mois}_${calendrier.annee}.pdf`)
}

export function downloadPresencePdf(pointages: Pointage[], employeNom?: string | null): void {
  openPdf(presencePdf(pointages, employeNom), 'presences_pointage.pdf')
}

export function downloadRecrutementPdf(offres: OffreEmploi[], candidatures: Candidature[], offreFiltre?: string): void {
  openPdf(recrutementPdf(offres, candidatures, offreFiltre), 'recrutement.pdf')
}

export function downloadOffresPdf(offres: OffreEmploi[]): void {
  openPdf(offresPdf(offres), 'offres_emploi.pdf')
}

export function downloadCandidatsPdf(candidats: CandidatItem[]): void {
  openPdf(candidatsPdf(candidats), 'candidats.pdf')
}

export function downloadNotesFraisPdf(notes: NoteFrais[]): void {
  openPdf(notesFraisPdf(notes), 'notes_de_frais.pdf')
}

export function downloadKpiPdf(kpis: KpiReport[], filters?: { categorie?: string; departement?: string }): void {
  openPdf(kpiPdf(kpis, filters), 'kpi_reporting.pdf')
}

export function downloadRapportHistoryPdf(rapports: RapportRH[]): void {
  openPdf(rapportHistoryPdf(rapports), 'historique_rapports.pdf')
}

export function downloadDocumentPdf(demandes: DemandeDocument[], stats?: StatsDocuments | null, titre?: string): void {
  openPdf(documentPdf(demandes, stats, titre), 'demandes_documents.pdf')
}

/** Télécharge un document administratif officiel (attestation, certificat…). */
// export function downloadDocumentOfficielPdf(demande: DemandeDocument): void {
//   openPdf(documentOfficielPdf(demande), `${safeFileName(demande.reference)}.pdf`)
// }
export function downloadDocumentOfficielPdf(demande: DemandeDocument): void {
  const type = safeFileName(demande.typeDocument || 'document')
  openPdf(documentOfficielPdf(demande), `${type}_${demande.reference}.pdf`)
}

export function downloadStructurePdf(departements: DepartementItem[], equipes: EquipeItem[]): void {
  openPdf(structurePdf(departements, equipes), 'structures_rh.pdf')
}

export function downloadAlertesPdf(actions: ActionAttente[]): void {
  openPdf(alertesPdf(actions), 'alertes_rh.pdf')
}

export function downloadDashboardPdf(data: {
  kpis: KpiCard[]
  absences: AbsenceMensuelle[]
  depts: DeptCount[]
  actions: ActionAttente[]
  activite: { text: string; time: string; dot: string }[]
  enPoste?: number
}): void {
  openPdf(dashboardPdf(data), 'dashboard_rh.pdf')
}

export function downloadRapportMensuelPdf(data: RapportMensuelData): void {
  openPdf(rapportMensuelPdf(data), `rapport_mensuel_rh_${data.mois}_${data.annee}.pdf`)
}

/** Nom de fichier standardisé pour un rapport mensuel. */
export function rapportMensuelFileName(mois: number, annee: number): string {
  return `rapport_mensuel_rh_${mois}_${annee}.pdf`
}
