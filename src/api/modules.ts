/**
 * Fonctions API du frontend — tous les modules.
 */
import {
  get, post, put, del, postForm, downloadFile, openFile, request,
} from './http'
import type {
  AuthResponse, EmployeProfile, ApiPage, EmployeListItem, EmployeDetail, IdLabel,
  TypeConge, DemandeConge, SoldeResponse, CalendrierEquipe,
  KpiCard, AbsenceMensuelle, DeptCount, ActionAttente, ActiviteItem,
  EvenementItem, MonEquipeMember, NotificationPayload,
  DemandeDocument, StatsDocuments, NoteFrais, SyntheseFrais, Pointage,
  OffreEmploi, Candidature, CandidatItem, KpiReport, UtilisateurCompte, Permission, AuditEntry, SondageDuJour,
} from './types'

// ---------------- Auth ----------------
export const authApi = {
  login: (email: string, password: string) =>
    post<AuthResponse>('/auth/login', { email, password }),
  inscription: (email: string, prenom: string, nom: string, password: string) =>
    post<AuthResponse>('/auth/register', { email, prenom, nom, password }),
  me: () => get<EmployeProfile>('/auth/me'),
  changePassword: (ancienMotDePasse: string, nouveauMotDePasse: string) =>
    post<void>('/auth/change-password', { ancienMotDePasse, nouveauMotDePasse }),
}

// ---------------- Employé / référentiel ----------------
export const employeApi = {
  me: () => get<EmployeProfile>('/employes/me'),
  departements: () => get<IdLabel[]>('/departements'),
  postes: () => get<IdLabel[]>('/postes'),
  equipes: () => get<IdLabel[]>('/equipes'),
  competences: () => get<IdLabel[]>('/competences'),
}

// ---------------- Annuaire ----------------
export interface AnnuaireParams {
  q?: string
  departement?: string
  page?: number
  size?: number
  inactifs?: boolean
}

export const annuaireApi = {
  rechercher: (params: AnnuaireParams = {}) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.departement) query.set('departement', params.departement)
    if (params.inactifs) query.set('inactifs', 'true')
    query.set('page', String(params.page ?? 0))
    query.set('size', String(params.size ?? 12))
    return get<ApiPage<EmployeListItem>>(`/annuaire/employes?${query.toString()}`)
  },
  detail: (id: number) => get<EmployeDetail>(`/annuaire/employes/${id}`),
  creer: (body: Record<string, unknown>) => post<EmployeDetail>('/annuaire/employes', body),
  modifier: (id: number, body: Record<string, unknown>) => put<EmployeDetail>(`/annuaire/employes/${id}`, body),
  desactiver: (id: number) => del<void>(`/annuaire/employes/${id}`),
  activer: (id: number) => put<void>(`/annuaire/employes/${id}/activer`),
  ajouterCompetences: (id: number, competenceIds: number[]) =>
    post<EmployeDetail>(`/annuaire/employes/${id}/competences`, competenceIds),
  retirerCompetence: (id: number, competenceId: number) =>
    del<EmployeDetail>(`/annuaire/employes/${id}/competences/${competenceId}`),
  exportExcel: () => downloadFile('/annuaire/employes/export', 'annuaire_employes.xlsx'),
}

// ---------------- Congés & Absences ----------------
export interface DemandePayload {
  typeCongeId: number
  dateDebut: string
  dateFin: string
  motif?: string
  employeId?: number
}

export const congesApi = {
  solde: () => get<SoldeResponse>('/conges/solde'),
  types: () => get<TypeConge[]>('/conges/types'),
  mesDemandes: (mois?: number, annee?: number) => {
    const query = new URLSearchParams()
    if (mois !== undefined) query.set('mois', String(mois))
    if (annee !== undefined) query.set('annee', String(annee))
    return get<DemandeConge[]>(`/conges/mes-demandes?${query.toString()}`)
  },
  detail: (id: number) => get<DemandeConge>(`/conges/demandes/${id}`),
  /** Liste RH de toutes les demandes de congé (nécessite le rôle RH/Admin). */
  demandes: (params: { q?: string; page?: number; size?: number } = {}) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    query.set('page', String(params.page ?? 0))
    query.set('size', String(params.size ?? 20))
    return get<ApiPage<DemandeConge>>(`/conges/demandes?${query.toString()}`)
  },
  creer: (payload: DemandePayload, justificatif?: File | null) => {
    const form = new FormData()
    form.append('demande', JSON.stringify(payload))
    if (justificatif) form.append('justificatif', justificatif)
    return postForm<DemandeConge>('/conges/demandes', form)
  },
  modifier: (id: number, payload: DemandePayload, justificatif?: File | null) => {
    const form = new FormData()
    form.append('demande', JSON.stringify(payload))
    if (justificatif) form.append('justificatif', justificatif)
    return request<DemandeConge>(`/conges/demandes/${id}`, { method: 'PUT', body: form })
  },
  annuler: (id: number) => put<DemandeConge>(`/conges/demandes/${id}/annuler`),
  valider: (id: number) => put<DemandeConge>(`/conges/demandes/${id}/valider`),
  refuser: (id: number, motif: string) =>
    put<DemandeConge>(`/conges/demandes/${id}/refuser`, { motif }),
  justificatif: (fileName: string) =>
    openFile(`/conges/justificatifs/${encodeURIComponent(fileName)}`, fileName),
  calendrierEquipe: (mois?: number, annee?: number) => {
    const query = new URLSearchParams()
    if (mois !== undefined) query.set('mois', String(mois))
    if (annee !== undefined) query.set('annee', String(annee))
    return get<CalendrierEquipe>(`/conges/calendrier-equipe?${query.toString()}`)
  },
  exportXlsx: (mois: number, annee: number) =>
    downloadFile(`/conges/export?mois=${mois}&annee=${annee}`, 'planning_conges.xlsx'),
}

// ---------------- Événements ----------------
export const evenementsApi = {
  lister: () => get<EvenementItem[]>('/evenements'),
  mesInscriptions: () => get<EvenementItem[]>('/evenements/mes-inscriptions'),
  aVenir: () => get<EvenementItem[]>('/evenements/a-venir'),
  inscrire: (id: number) => post<EvenementItem>(`/evenements/${id}/inscription`),
  desinscrire: (id: number) => del<EvenementItem>(`/evenements/${id}/inscription`),
  creer: (body: Record<string, unknown>) => post<EvenementItem>('/evenements', body),
  modifier: (id: number, body: Record<string, unknown>) => put<EvenementItem>(`/evenements/${id}`, body),
  supprimer: (id: number) => del<void>(`/evenements/${id}`),
  inscrits: (id: number) => get<{ employeId: number; nomComplet: string; email: string; departement: string | null; dateInscription: string }[]>(`/evenements/${id}/inscrits`),
  exportInscrits: (id: number) => downloadFile(`/evenements/${id}/inscrits/export`, 'inscrits.xlsx'),
}

// ---------------- Documents ----------------
export const documentsApi = {
  types: () => get<IdLabel[]>('/documents/types'),
  creerDemande: (body: { typeDocumentId: number; format: string; remarque?: string }) =>
    post<DemandeDocument>('/documents/demandes', body),
  mesDemandes: () => get<DemandeDocument[]>('/documents/mes-demandes'),
  demandesRH: () => get<DemandeDocument[]>('/documents/demandes'),
  stats: () => get<StatsDocuments>('/documents/stats'),
  traiter: (id: number) => post<DemandeDocument>(`/documents/demandes/${id}/traiter`),
  refuser: (id: number, motif: string) =>
    post<DemandeDocument>(`/documents/demandes/${id}/refuser`, { motif }),
  telecharger: (id: number) => openFile(`/documents/${id}/telecharger`, 'document.pdf'),
  exporterExcel: () => downloadFile('/documents/export', 'demandes_documents.xlsx'),
}

/* ---------------- Structures RH (départements & équipes) ---------------- */

export interface DepartementItem {
  id: number
  nom: string
  description: string | null
  nbEmployes: number
  nbEquipes: number
}

export interface EquipeItem {
  id: number
  nom: string
  description: string | null
  departementId: number | null
  departementNom: string | null
  nbEmployes: number
}

export const structuresApi = {
  departements: () => get<DepartementItem[]>('/structures/departements'),
  creerDepartement: (nom: string, description: string) =>
    post<DepartementItem>('/structures/departements', { nom, description }),
  modifierDepartement: (id: number, nom: string, description: string) =>
    put<DepartementItem>(`/structures/departements/${id}`, { nom, description }),
  supprimerDepartement: (id: number) => del(`/structures/departements/${id}`),
  equipes: () => get<EquipeItem[]>('/structures/equipes'),
  creerEquipe: (nom: string, description: string, departementId: number | null) =>
    post<EquipeItem>('/structures/equipes', { nom, description, departementId }),
  modifierEquipe: (id: number, nom: string, description: string, departementId: number | null) =>
    put<EquipeItem>(`/structures/equipes/${id}`, { nom, description, departementId }),
  supprimerEquipe: (id: number) => del(`/structures/equipes/${id}`),
}

// ---------------- Notes de frais ----------------
export const fraisApi = {
  synthese: () => get<SyntheseFrais>('/frais/mes-notes/synthese'),
  mesNotes: () => get<NoteFrais[]>('/frais/mes-notes'),
  creer: (note: Record<string, unknown>, justificatifs?: File[]) => {
    const form = new FormData()
    form.append('note', JSON.stringify(note))
    justificatifs?.forEach((f) => form.append('justificatifs', f))
    return postForm<NoteFrais>('/frais/notes', form)
  },
  detail: (id: number) => get<NoteFrais>(`/frais/notes/${id}`),
  modifier: (id: number, note: Record<string, unknown>, justificatifs?: File[]) => {
    const form = new FormData()
    form.append('note', JSON.stringify(note))
    justificatifs?.forEach((f) => form.append('justificatifs', f))
    return request<NoteFrais>(`/frais/notes/${id}`, { method: 'PUT', body: form })
  },
  annuler: (id: number) => put<NoteFrais>(`/frais/notes/${id}/annuler`),
  notesRH: (params: { q?: string; statut?: string; debut?: string; fin?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.statut) query.set('statut', params.statut)
    if (params.debut) query.set('debut', params.debut)
    if (params.fin) query.set('fin', params.fin)
    return get<NoteFrais[]>(`/frais/notes?${query.toString()}`)
  },
  valider: (id: number) => put<NoteFrais>(`/frais/notes/${id}/valider`),
  rembourser: (id: number) => put<NoteFrais>(`/frais/notes/${id}/rembourser`),
  refuser: (id: number, motif: string) =>
    put<NoteFrais>(`/frais/notes/${id}/refuser`, { motif }),
  justificatif: (fileName: string) =>
    openFile(`/frais/justificatifs/${encodeURIComponent(fileName)}`, fileName),
  exporterNotes: () => downloadFile('/frais/export', 'notes_de_frais.xlsx'),
}

// ---------------- Pointage ----------------
export const pointageApi = {
  arrivee: () => post<Pointage>('/pointage/arrivee'),
  depart: () => post<Pointage>('/pointage/depart'),
  aujourdhui: () => get<Pointage | null>('/pointage/aujourdhui'),
  enPoste: () => get<number>('/pointage/en-poste'),
}

// ---------------- Recrutement ----------------
export const recrutementApi = {
  offres: () => get<OffreEmploi[]>('/recrutement/offres'),
  detailOffre: (id: number) => get<OffreEmploi>(`/recrutement/offres/${id}`),
  publierOffre: (body: Record<string, unknown>) => post<OffreEmploi>('/recrutement/offres', body),
  modifierOffre: (id: number, body: Record<string, unknown>) => put<OffreEmploi>(`/recrutement/offres/${id}`, body),
  changerStatutOffre: (id: number, statut: string) => put<OffreEmploi>(`/recrutement/offres/${id}/statut`, { statut }),
  supprimerOffre: (id: number) => del(`/recrutement/offres/${id}`),
  candidatures: (offreId: number) => get<Candidature[]>(`/recrutement/offres/${offreId}/candidatures`),
  candidats: () => get<CandidatItem[]>('/recrutement/candidats'),
  modifierCandidat: (id: number, body: Record<string, unknown>) => put<CandidatItem>(`/recrutement/candidats/${id}`, body),
  supprimerCandidat: (id: number) => del(`/recrutement/candidats/${id}`),
  supprimerCandidature: (id: number) => del(`/recrutement/candidatures/${id}`),
  detailCandidature: (id: number) => get<Candidature>(`/recrutement/candidatures/${id}`),
  ajouterCandidat: (candidat: Record<string, unknown>, cv?: File | null, lettre?: File | null) => {
    const form = new FormData()
    form.append('candidat', new Blob([JSON.stringify(candidat)], { type: 'application/json' }))
    if (cv) form.append('cv', cv)
    if (lettre) form.append('lettre', lettre)
    return postForm<Candidature>('/recrutement/candidats', form)
  },
  changerEtape: (id: number, etape: string) =>
    put<Candidature>(`/recrutement/candidatures/${id}/etape`, { etape }),
  planifierEntretien: (id: number, dateEntretien: string) =>
    put<Candidature>(`/recrutement/candidatures/${id}/entretien`, { dateEntretien }),
  embaucher: (id: number) => post<Candidature>(`/recrutement/candidatures/${id}/embaucher`),
  cv: (fileName: string) =>
    downloadFile(`/recrutement/fichiers/cv/${encodeURIComponent(fileName)}`, fileName),
  exporterCandidatures: () => downloadFile('/recrutement/candidatures/export', 'candidatures.xlsx'),
}

// ---------------- Sécurité ----------------
export const securiteApi = {
  permissions: () => get<Permission[]>('/securite/permissions'),
  roles: () => get<Record<string, string[]>>('/securite/roles'),
  majPermissions: (role: string, codes: string[]) =>
    put<Record<string, string[]>>(`/securite/roles/${role}/permissions`, codes),
  utilisateurs: () => get<UtilisateurCompte[]>('/securite/utilisateurs'),
  enAttente: () => get<UtilisateurCompte[]>('/securite/utilisateurs/en-attente'),
  validerCompte: (id: number) => post<UtilisateurCompte>(`/securite/utilisateurs/${id}/valider`),
  refuserCompte: (id: number) => post<UtilisateurCompte>(`/securite/utilisateurs/${id}/refuser`),
  creerUtilisateur: (body: Record<string, unknown>) => post<UtilisateurCompte>('/securite/utilisateurs', body),
  modifierUtilisateur: (id: number, body: Record<string, unknown>) =>
    put<UtilisateurCompte>(`/securite/utilisateurs/${id}`, body),
  audit: () => get<AuditEntry[]>('/securite/audit'),
  exportAudit: () => downloadFile('/securite/audit/export', 'journal_audit.xlsx'),
}

// ---------------- Dashboard ----------------
export const dashboardApi = {
  kpis: () => get<KpiCard[]>('/dashboard/rh/kpis'),
  absencesMensuelles: () => get<AbsenceMensuelle[]>('/dashboard/rh/absences-mensuelles'),
  effectifsDepartement: () => get<DeptCount[]>('/dashboard/rh/effectifs-departement'),
  actionsAttente: () => get<ActionAttente[]>('/dashboard/rh/actions-attente'),
  activiteRecent: () => get<ActiviteItem[]>('/dashboard/rh/activite-recente'),
  evenementsAVenir: () => get<EvenementItem[]>('/evenements/a-venir'),
  monEquipe: () => get<MonEquipeMember[]>('/equipes/mon-equipe'),
}

// ---------------- KPI & Reporting ----------------
export const reportingApi = {
  kpis: (params: { categorie?: string; departement?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.categorie) query.set('categorie', params.categorie)
    if (params.departement) query.set('departement', params.departement)
    return get<KpiReport[]>(`/reporting/kpis?${query.toString()}`)
  },
  rapports: () => get<{ id: number; titre: string; typeRapport: string; dateGeneration: string; format: string; fichier: string }[]>('/reporting/rapports'),
  rapportDownload: (id: number) => downloadFile(`/reporting/rapports/${id}/telecharger`, 'rapport.xlsx'),
  rapportMensuel: () => downloadFile('/reporting/rapports', 'rapport_rh.xlsx', { method: 'POST' }),
  rapportExcel: (titre: string) =>
    downloadFile('/reporting/rapports', 'rapport_rh.xlsx', {
      method: 'POST',
      body: JSON.stringify({ titre }),
      headers: { 'Content-Type': 'application/json' },
    }),
  exportXlsx: (params: { categorie?: string; departement?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.categorie) query.set('categorie', params.categorie)
    if (params.departement) query.set('departement', params.departement)
    return downloadFile(`/reporting/export-xlsx?${query.toString()}`, 'kpi_reporting.xlsx')
  },
}

// ---------------- Notifications ----------------
export const notificationsApi = {
  lister: () => get<NotificationPayload>('/notifications'),
  toutLire: () => put<number>('/notifications/lire'),
  lireUne: (id: number) => put<void>(`/notifications/${id}/lue`),
  exporter: () => downloadFile('/notifications/export', 'notifications.xlsx'),
}

// ---------------- Sondage du jour ----------------
export const sondageApi = {
  aujourdhui: () => get<SondageDuJour>('/sondage/aujourdhui'),
  repondre: (id: number, option: string) =>
    post<SondageDuJour>(`/sondage/${id}/repondre`, { option }),
  lister: () => get<SondageDuJour[]>('/sondage'),
  creer: (body: { question: string; options: string[]; date?: string }) =>
    post<SondageDuJour>('/sondage', body),
  modifier: (id: number, body: { question: string; options: string[]; date?: string }) =>
    put<SondageDuJour>(`/sondage/${id}`, body),
}
