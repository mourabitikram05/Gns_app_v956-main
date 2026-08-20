/**
 * Types TypeScript miroir des DTO du backend Spring Boot.
 */

// ---------------- Recrutement ----------------
export interface CandidatItem {
  id: number
  nom: string
  prenom: string
  nomComplet: string
  initiales: string
  email: string
  telephone: string | null
  linkedin: string | null
  cvDisponible: boolean
  cvNom: string | null
  lettreDisponible: boolean
  nbCandidatures: number
  offres: string
}

// ---------------- Auth / Profil ----------------
export interface AuthResponse {
  token: string | null
  email: string
  role: 'COLLABORATEUR' | 'RESPONSABLE_RH' | 'ADMIN'
  /** Statut du compte : ACTIF, EN_ATTENTE, REFUSE ou INACTIF. */
  statut?: string
  employeId: number | null
  prenom: string
  nom: string
  nomComplet: string
  matricule: string | null
}

export interface EmployeProfile {
  id: number
  matricule: string
  cin: string | null
  nom: string
  prenom: string
  nomComplet: string
  initiales: string
  dateNaissance: string | null
  sexe: string | null
  nationalite: string | null
  email: string
  telephone: string | null
  adresse: string | null
  photo: string | null
  dateEmbauche: string | null
  statut: string
  bureau: string | null
  poste: string | null
  departement: string | null
  equipe: string | null
  responsable: string | null
  role: string
  missions: string[]
}

// ---------------- Annuaire ----------------
export interface EmployeListItem {
  id: number
  matricule: string
  nomComplet: string
  poste: string | null
  departement: string | null
  telephone: string | null
  email: string
  bureau: string | null
  manager: string | null
  initiales: string
  competences: string[]
  statut: string
}

export interface EmployeDetail {
  id: number
  matricule: string
  cin: string | null
  nom: string
  prenom: string
  nomComplet: string
  initiales: string
  dateNaissance: string | null
  sexe: string | null
  nationalite: string | null
  email: string
  telephone: string | null
  adresse: string | null
  photo: string | null
  dateEmbauche: string | null
  statut: string
  bureau: string | null
  posteId: number | null
  poste: string | null
  departementId: number | null
  departement: string | null
  equipeId: number | null
  equipe: string | null
  responsableId: number | null
  manager: string | null
  competences: string[]
  missions: string[]
}

export interface IdLabel {
  id: number
  nom: string
}

export interface ApiPage<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// ---------------- Congés ----------------
export interface TypeConge {
  id: number
  nom: string
  code: string | null
  couleur: string | null
  joursMaxParAn: number
  consommeSolde: boolean
  besoinJustificatif: boolean
  regleAcquisition: string | null
}

export interface ValidationItem {
  id: number
  decision: string
  validateur: string
  dateValidation: string
  motif: string | null
}

export interface DemandeConge {
  id: number
  reference: string
  employeId: number
  employeNom: string
  employeInitiales: string
  departement: string | null
  typeCongeId: number
  typeNom: string
  typeCode: string | null
  couleur: string | null
  dateDebut: string
  dateFin: string
  nombreJours: number
  motif: string | null
  statut: 'EN_ATTENTE' | 'APPROUVEE' | 'REFUSEE' | 'ANNULEE'
  motifRefus: string | null
  justificatifUrl: string | null
  dateDemande: string
  dateValidation: string | null
  validePar: string | null
  historique: ValidationItem[]
}

export interface SoldeResponse {
  annee: number
  soldeAu31Decembre: number
  soldeACeJour: number
  joursPris: number
  absencesJustifiees: number
  enAttente: number
}

export interface CalendrierCellule {
  code: string
  libelle: string
  couleur: string
  demandeId: number
}

export interface LigneCollaborateur {
  employeId: number
  nom: string
  initiales: string
  departement: string | null
  jours: Record<number, CalendrierCellule>
}

export interface CalendrierEquipe {
  mois: number
  annee: number
  employes: LigneCollaborateur[]
  presentParJour: Record<number, number>
}

// ---------------- Dashboard RH ----------------
export interface KpiCard {
  key: string
  label: string
  value: string
  change: string
  up: boolean
}

export interface AbsenceMensuelle {
  mois: string
  jours: number
}

export interface DeptCount {
  name: string
  value: number
}

export interface ActionAttente {
  demandeId: number
  name: string
  initiales: string
  type: string
  detail: string
  dateDebut: string
  dateFin: string
  nombreJours: number
  module: 'CONGE' | 'FRAIS'
  montant: number
}

export interface ActiviteItem {
  text: string
  time: string
  dot: string
}

export interface EvenementItem {
  id: number
  titre: string
  description: string | null
  type: string | null
  dateDebut: string
  dateFin: string
  heureDebut: string | null
  lieu: string | null
  participantsMax: number
  inscrits: number
  complet: boolean
  inscrit: boolean
  tauxRemplissage: number
  imageUrl?: string | null
}

export interface MonEquipeMember {
  id: number
  nomComplet: string
  initiales: string
  poste: string | null
  departement: string | null
}

export interface NotificationItem {
  id: number
  message: string
  type: string | null
  lu: boolean
  dateEnvoi: string
}

export interface NotificationPayload {
  count: number
  items: NotificationItem[]
}


// ---------------- Documents ----------------
export interface DemandeDocument {
  id: number
  reference: string
  employeId: number
  employeNom: string
  employeInitiales: string
  departement: string | null
  typeDocumentId: number
  typeDocument: string
  format: string
  dateDemande: string
  statut: 'EN_TRAITEMENT' | 'DISPONIBLE' | 'REFUSE'
  motifRefus: string | null
  remarque: string | null
  fichierDisponible: boolean
  fichierNom: string | null
  signataire: string | null
  dateSignature: string | null
}

export interface StatsDocuments {
  total: number
  aTraiter: number
}

// ---------------- Notes de frais ----------------
export type StatutFrais = 'EN_ATTENTE' | 'EN_COURS' | 'REMBOURSEE' | 'REFUSEE' | 'ANNULEE'

export interface NoteFrais {
  id: number
  reference: string
  employeId: number
  employeNom: string
  employeInitiales: string
  departement: string | null
  titre: string
  devise: string
  date: string
  priorite: string
  remarque: string | null
  montantTotal: number
  statut: StatutFrais
  motifRefus: string | null
  dateCreation: string
  nbDepenses: number
  depenses: string[]
  justificatifs: string[]
}

export interface SyntheseFrais {
  enAttente: { count: number; montant: number }
  enCours: { count: number; montant: number }
  remboursee: { count: number; montant: number }
  refusee: { count: number; montant: number }
}

// ---------------- Pointage ----------------
export interface Pointage {
  id: number
  employeNom: string
  date: string
  heureArrivee: string
  heureDepart: string | null
  duree: string | null
}

// ---------------- Recrutement ----------------
export interface OffreEmploi {
  id: number
  titre: string
  departement: string | null
  typeContrat: string | null
  niveau: string | null
  mode: string | null
  statut: string
  datePublication: string
  totalCandidatures: number
  candidaturesParEtape: Record<string, number>
}

export interface Candidature {
  id: number
  offreId: number
  offreTitre: string
  candidatId: number
  candidatNom: string
  candidatPrenom: string
  nomComplet: string
  initiales: string
  email: string
  telephone: string | null
  linkedin: string | null
  etape: 'BOITE_RECEPTION' | 'BROUILLON' | 'ENTRETIEN_TEL' | 'ENTRETIEN_PHYSIQUE' | 'EMBAUCHE'
  dateEntretien: string | null
  dateCreation: string
  cvDisponible: boolean
  cvNom: string | null
  lettreDisponible: boolean
  historique: string[]
}

// ---------------- KPI & Reporting ----------------
export interface KpiReport {
  nom: string
  categorie: string
  valeur: string
  unite: string
  dateCalcul: string
}

export interface RapportRH {
  id: number
  titre: string
  typeRapport: string
  dateGeneration: string
  format: string
  fichier: string
}

// ---------------- Sécurité ----------------
export interface Permission {
  id: number
  code: string
  nom: string
  module: string
}

export interface UtilisateurCompte {
  id: number
  email: string
  role: string
  statut: string
  employeId: number | null
  employeNom: string | null
  dateCreation: string
  derniereConnexion: string | null
}

export interface AuditEntry {
  id: number
  acteur: string | null
  action: string
  detail: string | null
  dateAction: string
}

// ---------------- Sondage du jour ----------------
export interface SondageDuJour {
  id: number
  question: string
  options: string[]
  date: string
  actif: boolean
  totalReponses: number
  reponsesParOption: Record<string, number>
  aVote: boolean
  optionChoisie: string | null
}
