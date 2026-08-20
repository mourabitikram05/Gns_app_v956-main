package com.gns.sirh;

import com.gns.sirh.entity.*;
import com.gns.sirh.service.PdfGenerator;
import com.gns.sirh.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Initialise les données de démonstration au premier démarrage (base vide).
 * Idempotent : ne fait rien si des utilisateurs existent déjà.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UtilisateurRepository utilisateurRepository;
    private final EmployeRepository employeRepository;
    private final DepartementRepository departementRepository;
    private final PosteRepository posteRepository;
    private final EquipeRepository equipeRepository;
    private final CompetenceRepository competenceRepository;
    private final TypeCongeRepository typeCongeRepository;
    private final DemandeCongeRepository demandeRepository;
    private final SoldeCongeRepository soldeRepository;
    private final AbsenceRepository absenceRepository;
    private final ValidationRepository validationRepository;
    private final EvenementRepository evenementRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final DemandeDocumentRepository demandeDocumentRepository;
    private final ParticipationEvenementRepository participationRepository;
    private final NoteFraisRepository noteFraisRepository;
    private final RemboursementRepository remboursementRepository;
    private final OffreEmploiRepository offreRepository;
    private final CandidatureRepository candidatureRepository;
    private final CandidatRepository candidatRepository;

    public DataSeeder(UtilisateurRepository utilisateurRepository,
                      EmployeRepository employeRepository,
                      DepartementRepository departementRepository,
                      PosteRepository posteRepository,
                      EquipeRepository equipeRepository,
                      CompetenceRepository competenceRepository,
                      TypeCongeRepository typeCongeRepository,
                      DemandeCongeRepository demandeRepository,
                      SoldeCongeRepository soldeRepository,
                      AbsenceRepository absenceRepository,
                      ValidationRepository validationRepository,
                      EvenementRepository evenementRepository,
                      AuditLogRepository auditLogRepository,
                      NotificationRepository notificationRepository,
                      PasswordEncoder passwordEncoder,
                      PermissionRepository permissionRepository,
                      RolePermissionRepository rolePermissionRepository,
                      DocumentTypeRepository documentTypeRepository,
                      DemandeDocumentRepository demandeDocumentRepository,
                      ParticipationEvenementRepository participationRepository,
                      NoteFraisRepository noteFraisRepository,
                      RemboursementRepository remboursementRepository,
                      OffreEmploiRepository offreRepository,
                      CandidatureRepository candidatureRepository,
                      CandidatRepository candidatRepository) {
        this.utilisateurRepository = utilisateurRepository;
        this.employeRepository = employeRepository;
        this.departementRepository = departementRepository;
        this.posteRepository = posteRepository;
        this.equipeRepository = equipeRepository;
        this.competenceRepository = competenceRepository;
        this.typeCongeRepository = typeCongeRepository;
        this.demandeRepository = demandeRepository;
        this.soldeRepository = soldeRepository;
        this.absenceRepository = absenceRepository;
        this.validationRepository = validationRepository;
        this.evenementRepository = evenementRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.demandeDocumentRepository = demandeDocumentRepository;
        this.participationRepository = participationRepository;
        this.noteFraisRepository = noteFraisRepository;
        this.remboursementRepository = remboursementRepository;
        this.offreRepository = offreRepository;
        this.candidatureRepository = candidatureRepository;
        this.candidatRepository = candidatRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (utilisateurRepository.count() > 0) {
            log.info("DataSeeder : données déjà présentes — vérification/réparation des permissions...");
            reparerPermissions();
            reparerDonneesReference();
            return;
        }
        log.info("DataSeeder : initialisation des données de démonstration...");

        // ---------------------------------------------------------------
        // Départements & postes
        // ---------------------------------------------------------------
        Departement tech = departementRepository.save(new Departement("Tech", "Technologies et développement"));
        Departement rh = departementRepository.save(new Departement("RH", "Ressources humaines"));
        Departement finance = departementRepository.save(new Departement("Finance", "Finance et comptabilité"));
        Departement marketing = departementRepository.save(new Departement("Marketing", "Marketing et communication"));
        Departement operations = departementRepository.save(new Departement("Opérations", "Opérations et logistique"));
        Departement direction = departementRepository.save(new Departement("Direction", "Direction générale"));

        posteRepository.save(new Poste("DG", "Cadre dirigeant"));
        posteRepository.save(new Poste("Directeur Tech", "Cadre"));
        posteRepository.save(new Poste("Admin RH", "Cadre"));
        posteRepository.save(new Poste("Développeur Full-Stack", "Cadre"));
        posteRepository.save(new Poste("Développeur Backend", "Cadre"));
        posteRepository.save(new Poste("Développeuse Frontend", "Cadre"));
        posteRepository.save(new Poste("Ingénieur DevOps", "Cadre"));
        posteRepository.save(new Poste("Designer", "Cadre"));
        posteRepository.save(new Poste("Responsable Finance", "Cadre"));
        posteRepository.save(new Poste("Chargée Marketing", "Cadre"));
        posteRepository.save(new Poste("Responsable Opérations", "Cadre"));
        posteRepository.save(new Poste("Chef de projet", "Cadre"));

        // ---------------------------------------------------------------
        // Compétences
        // ---------------------------------------------------------------
        Map<String, Competence> comp = new java.util.HashMap<>();
        for (String nom : List.of("React", "Node.js", "Management", "Recrutement", "Paie", "Formation",
                "TypeScript", "PostgreSQL", "Comptabilité", "Audit", "Excel", "Vue.js", "Figma", "CSS",
                "Docker", "Kubernetes", "AWS", "SEO", "Réseaux sociaux", "Analytics", "Logistique",
                "Supply Chain", "ERP", "Java", "Spring Boot", "MySQL", "Angular", "Design",
                "Copywriting", "Gestion de projet")) {
            comp.put(nom, competenceRepository.save(new Competence(nom, null, "Confirmé")));
        }

        // ---------------------------------------------------------------
        // Équipes
        // ---------------------------------------------------------------
        Equipe equipeTech = new Equipe("Équipe Tech", "Développement et infrastructure");
        equipeTech.setDepartement(tech);
        equipeTech = equipeRepository.save(equipeTech);
        Equipe equipeRH = new Equipe("Équipe RH", "Administration RH");
        equipeRH.setDepartement(rh);
        equipeRH = equipeRepository.save(equipeRH);
        Equipe equipeFinance = new Equipe("Équipe Finance", "Gestion financière");
        equipeFinance.setDepartement(finance);
        equipeFinance = equipeRepository.save(equipeFinance);
        Equipe equipeMarketing = new Equipe("Équipe Marketing", "Marketing et communication");
        equipeMarketing.setDepartement(marketing);
        equipeMarketing = equipeRepository.save(equipeMarketing);
        Equipe equipeOps = new Equipe("Équipe Opérations", "Opérations et logistique");
        equipeOps.setDepartement(operations);
        equipeOps = equipeRepository.save(equipeOps);
        Equipe equipeDirection = new Equipe("Direction", "Direction générale");
        equipeDirection.setDepartement(direction);
        equipeDirection = equipeRepository.save(equipeDirection);

        // ---------------------------------------------------------------
        // Employés
        // ---------------------------------------------------------------
        Employe gnaoui = employe("GNA-001", "AB123456", "Gnaoui", "Mohammed", "M", "m.gnaoui@gns.ma",
                "+212 6 00 00 00 01", "Bureau 001", "1998-01-01", "2019-03-01", direction, "DG", equipeDirection, null, List.of("Management", "Gestion de projet"));
        Employe elAmri = employe("GNS-002", "AB123457", "El Amri", "Rachid", "M", "r.elamri@gns.ma",
                "+212 6 12 34 56 78", "Bureau 301", "1988-06-15", "2020-01-10", tech, "Directeur Tech", equipeTech, gnaoui, List.of("React", "Node.js", "Management"));
        Employe alami = employe("GNS-003", "AB123458", "Alami", "Sarah", "F", "s.alami@gns.ma",
                "+212 6 23 45 67 89", "Bureau 105", "1992-04-22", "2021-02-01", rh, "Admin RH", equipeRH, gnaoui, List.of("Recrutement", "Paie", "Formation"));
        Employe benali = employe("GNS-004", "AB123459", "Benali", "Youssef", "M", "y.benali@gns.ma",
                "+212 6 34 56 78 90", "Open space Tech", "1995-03-15", "2022-06-01", tech, "Développeur Full-Stack", equipeTech, elAmri, List.of("React", "TypeScript", "PostgreSQL", "Java", "Spring Boot"));
        Employe ouali = employe("GNS-005", "AB123460", "Ouali", "Fatima", "F", "f.ouali@gns.ma",
                "+212 6 45 67 89 01", "Bureau 202", "1990-09-08", "2019-09-15", finance, "Responsable Finance", equipeFinance, gnaoui, List.of("Comptabilité", "Audit", "Excel"));
        Employe bensouda = employe("GNS-006", "AB123461", "Bensouda", "Nadia", "F", "n.bensouda@gns.ma",
                "+212 6 56 78 90 12", "Open space Tech", "1997-11-30", "2022-09-01", tech, "Développeuse Frontend", equipeTech, elAmri, List.of("Vue.js", "Figma", "CSS", "React"));
        Employe idrissi = employe("GNS-007", "AB123462", "Idrissi", "Amine", "M", "a.idrissi@gns.ma",
                "+212 6 67 89 01 23", "Bureau 305", "1993-02-25", "2021-11-01", tech, "Ingénieur DevOps", equipeTech, elAmri, List.of("Docker", "Kubernetes", "AWS"));
        Employe chraibi = employe("GNS-008", "AB123463", "Chraibi", "Leila", "F", "l.chraibi@gns.ma",
                "+212 6 78 90 12 34", "Bureau 110", "1996-07-19", "2022-01-15", marketing, "Chargée Marketing", equipeMarketing, gnaoui, List.of("SEO", "Réseaux sociaux", "Analytics", "Copywriting"));
        Employe tazi = employe("GNS-009", "AB123464", "Tazi", "Hassan", "M", "h.tazi@gns.ma",
                "+212 6 89 01 23 45", "Bureau 401", "1987-12-05", "2018-05-01", operations, "Responsable Opérations", equipeOps, gnaoui, List.of("Logistique", "Supply Chain", "ERP"));
        Employe moussaoui = employe("GNS-010", "AB123465", "Moussaoui", "Youssef", "M", "y.moussaoui@gns.ma",
                "+212 6 90 12 34 56", "Bureau 402", "1994-08-11", "2023-03-01", operations, "Chef de projet", equipeOps, tazi, List.of("Gestion de projet", "ERP"));
        Employe karimBenali = employe("GNS-011", "AB123466", "Benali", "Karim", "M", "k.benali@gns.ma",
                "+212 6 01 23 45 67", "Open space Tech", "1996-01-20", "2023-09-01", tech, "Développeur Backend", equipeTech, elAmri, List.of("Java", "Spring Boot", "MySQL"));
        Employe harti = employe("GNS-012", "AB123467", "Harti", "Salma", "F", "s.harti@gns.ma",
                "+212 6 12 34 56 70", "Bureau 111", "1998-05-03", "2024-01-01", marketing, "Designer", equipeMarketing, chraibi, List.of("Design", "Figma"));

        // ---------------------------------------------------------------
        // Comptes utilisateurs
        // ---------------------------------------------------------------
        utilisateur("rh@gns.ma", "rh1234", RoleType.RESPONSABLE_RH, alami);
        utilisateur("y.benali@gns.ma", "collab1234", RoleType.COLLABORATEUR, benali);
        utilisateur("admin@gns.ma", "admin1234", RoleType.ADMIN, gnaoui);

        // ---------------------------------------------------------------
        // Types de congé
        // ---------------------------------------------------------------
        TypeConge ca = typeConge("Congé annuel", "CA", "#1D4ED8", 30, true, false, "2,17 jours/mois");
        TypeConge maladie = typeConge("Congé maladie", "M", "#B91C1C", 30, false, true, "Sur justificatif médical");
        TypeConge aj = typeConge("Absence justifiée", "AJ", "#92400E", 15, false, true, "Sur justificatif");
        TypeConge an = typeConge("Absence non justifiée", "AN", "#9D174D", 5, false, false, "Aucune");
        TypeConge maternite = typeConge("Congé maternité", "MAT", "#0EA5E9", 98, false, true, "98 jours");
        TypeConge paternite = typeConge("Congé paternité", "PAT", "#0EA5E9", 15, false, true, "15 jours");
        typeConge("Congé sans solde", "SS", "#6B7280", 0, false, false, "Sans solde");
        typeConge("RTT", "RTT", "#7C3AED", 10, true, false, "10 jours/an");

        // ---------------------------------------------------------------
        // Demandes de congé (Youssef Benali — parcours collaborateur)
        // ---------------------------------------------------------------
        // 1) Congé annuel approuvé (janvier) — 5 jours ouvrés
        DemandeConge dc1 = demande(benali, ca, "2026-01-05", "2026-01-09", 5, StatutDemande.APPROUVEE,
                "Vacances d'hiver", "2026-01-02T09:15", "2026-01-04T14:30", "rh@gns.ma");
        // 2) Congé annuel approuvé (mai) — 7 jours ouvrés
        DemandeConge dc2 = demande(benali, ca, "2026-05-04", "2026-05-12", 7, StatutDemande.APPROUVEE,
                "Vacances de printemps", "2026-04-20T10:00", "2026-04-22T16:00", "rh@gns.ma");
        // 3) Absence justifiée approuvée (juin) — 3 jours
        DemandeConge dc3 = demande(benali, aj, "2026-06-08", "2026-06-10", 3, StatutDemande.APPROUVEE,
                "Rendez-vous médicaux", "2026-06-01T08:30", "2026-06-02T11:00", "rh@gns.ma");
        // 4) Congé annuel en attente (juillet-aout)
        DemandeConge dc4 = demande(benali, ca, "2026-07-27", "2026-07-31", 5, StatutDemande.EN_ATTENTE,
                "Vacances d'été", "2026-07-15T09:00", null, null);
        // 5) Congé maladie refusé (juin) — avec motif
        DemandeConge dc5 = demande(benali, maladie, "2026-06-02", "2026-06-03", 2, StatutDemande.REFUSEE,
                "Arrêt maladie", "2026-05-28T09:00", "2026-05-29T10:00", "rh@gns.ma");
        dc5.setMotifRefus("Justificatif médical manquant, merci de le transmettre.");

        // Demandes RH (visible dans le calendrier équipe)
        DemandeConge dc6 = demande(ouali, maladie, "2026-07-08", "2026-07-09", 2, StatutDemande.APPROUVEE,
                "Maladie", "2026-07-06T09:00", "2026-07-07T10:00", "rh@gns.ma");
        DemandeConge dc7 = demande(moussaoui, ca, "2026-07-14", "2026-07-17", 4, StatutDemande.APPROUVEE,
                "Congé annuel planifié", "2026-07-01T09:00", "2026-07-02T10:00", "rh@gns.ma");
        DemandeConge dc8 = demande(chraibi, aj, "2026-07-22", "2026-07-22", 1, StatutDemande.APPROUVEE,
                "Rendez-vous", "2026-07-20T09:00", "2026-07-21T10:00", "rh@gns.ma");
        DemandeConge dc9 = demande(bensouda, ca, "2026-07-28", "2026-07-30", 3, StatutDemande.APPROUVEE,
                "Vacances", "2026-07-10T09:00", "2026-07-11T10:00", "rh@gns.ma");
        DemandeConge dc10 = demande(karimBenali, ca, "2026-07-28", "2026-07-31", 4, StatutDemande.EN_ATTENTE,
                "Vacances d'été", "2026-07-20T09:00", null, null);

        // Absences générées pour les demandes approuvées
        for (DemandeConge d : List.of(dc1, dc2, dc3, dc6, dc7, dc8, dc9)) {
            creerAbsences(d);
        }

        // Historique de validation
        validation(dc1, "APPROUVEE", "rh@gns.ma", "2026-01-04T14:30", null);
        validation(dc2, "APPROUVEE", "rh@gns.ma", "2026-04-22T16:00", null);
        validation(dc3, "APPROUVEE", "rh@gns.ma", "2026-06-02T11:00", null);
        validation(dc5, "REFUSEE", "rh@gns.ma", "2026-05-29T10:00", "Justificatif médical manquant");
        validation(dc6, "APPROUVEE", "rh@gns.ma", "2026-07-07T10:00", null);
        validation(dc7, "APPROUVEE", "rh@gns.ma", "2026-07-02T10:00", null);
        validation(dc8, "APPROUVEE", "rh@gns.ma", "2026-07-21T10:00", null);
        validation(dc9, "APPROUVEE", "rh@gns.ma", "2026-07-11T10:00", null);

        // Soldes 2026
        solde(benali, 26, 12, 14);
        solde(ouali, 26, 2, 24);
        solde(moussaoui, 26, 4, 22);
        solde(chraibi, 26, 1, 25);
        solde(bensouda, 26, 3, 23);
        for (Employe e : List.of(gnaoui, elAmri, alami, idrissi, tazi, karimBenali, harti)) {
            solde(e, 26, 0, 26);
        }

        // ---------------------------------------------------------------
        // Événements
        // ---------------------------------------------------------------
        evenement("Formation Sécurité données", "Sensibilisation à la sécurité des données", "2026-07-28", "2026-07-28", "Salle 2", "Formation");
        evenement("Séminaire annuel GNS", "Séminaire annuel de l'entreprise", "2026-08-05", "2026-08-06", "Espace Casablanca", "Séminaire");
        evenement("Réunion équipe Tech", "Point hebdomadaire équipe Tech", "2026-07-25", "2026-07-25", "Salle 1", "Réunion");
        evenement("Formation Angular", "Introduction à Angular pour les développeurs", "2026-08-12", "2026-08-13", "Salle 3", "Formation");
        evenement("Atelier bien-être", "Atelier gestion du stress", "2026-08-20", "2026-08-20", "Salle 2", "Formation");

        // ---------------------------------------------------------------
        // Notifications (exemple pour le collaborateur de test)
        // ---------------------------------------------------------------
        notification(benali, "Votre demande de congé du 5 au 9 janvier a été acceptée", "CONGE_APPROUVE", false, "2026-01-04T14:31");
        notification(benali, "Votre demande DC-2026-0004 est en attente de validation", "CONGE_SOUMISE", false, "2026-07-15T09:01");
        notification(benali, "Votre demande du 2-3 juin a été refusée : justificatif manquant", "CONGE_REFUSE", true, "2026-05-29T10:01");

        // ---------------------------------------------------------------
        // Journal d'audit
        // ---------------------------------------------------------------
        audit("y.benali@gns.ma", "DEMANDE_CONGE", "Demande DC-2026-0004 créée pour Youssef Benali", "2026-07-15T09:00");
        audit("rh@gns.ma", "VALIDATION_DEMANDE", "Demande DC-2026-0001 approuvée", "2026-01-04T14:30");
        audit("rh@gns.ma", "VALIDATION_DEMANDE", "Demande DC-2026-0002 approuvée", "2026-04-22T16:00");
        audit("rh@gns.ma", "REFUS_DEMANDE", "Demande DC-2026-0005 refusée", "2026-05-29T10:00");
        audit("rh@gns.ma", "CONNEXION", "Connexion réussie (RESPONSABLE_RH)", "2026-08-06T08:00");
        audit("y.benali@gns.ma", "CONNEXION", "Connexion réussie (COLLABORATEUR)", "2026-08-06T08:30");

        seedPermissions();
        seedDocuments(benali, chraibi);
        seedParticipations(benali, idrissi, harti, chraibi, moussaoui);
        seedFrais(benali);
        seedRecrutement();

        log.info("DataSeeder : initialisation terminée ({} employés, {} demandes, {} types de congé).",
                employeRepository.count(), demandeRepository.count(), typeCongeRepository.count());
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private Employe employe(String matricule, String cin, String nom, String prenom, String sexe,
                            String email, String telephone, String bureau, String naissance, String embauche,
                            Departement dept, String posteNom, Equipe equipe, Employe responsable,
                            List<String> competences) {
        Employe e = new Employe();
        e.setMatricule(matricule);
        e.setCin(cin);
        e.setNom(nom);
        e.setPrenom(prenom);
        e.setSexe(Sexe.valueOf(sexe));
        e.setNationalite("Marocaine");
        e.setEmail(email);
        e.setTelephone(telephone);
        e.setAdresse("Casablanca, Maroc");
        e.setDateNaissance(LocalDate.parse(naissance));
        e.setDateEmbauche(LocalDate.parse(embauche));
        e.setStatut(StatutEmploye.ACTIF);
        e.setBureau(bureau);
        e.setDepartement(dept);
        e.setPoste(posteRepository.findAll().stream()
                .filter(p -> p.getNom().equals(posteNom)).findFirst().orElse(null));
        e.setEquipe(equipe);
        e.setResponsable(responsable);
        e.setCompetences(competences.stream()
                .map(n -> competenceRepository.findByNom(n).orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList());
        return employeRepository.save(e);
    }

    private void utilisateur(String email, String password, RoleType role, Employe employe) {
        Utilisateur u = new Utilisateur();
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(password));
        u.setRole(role);
        u.setStatut("ACTIF");
        u.setDateCreation(LocalDateTime.now());
        u.setEmploye(employe);
        utilisateurRepository.save(u);
    }

    private TypeConge typeConge(String nom, String code, String couleur, int maxParAn,
                                boolean consommeSolde, boolean justificatif, String regle) {
        TypeConge t = new TypeConge();
        t.setNom(nom);
        t.setCode(code);
        t.setCouleur(couleur);
        t.setJoursMaxParAn(maxParAn);
        t.setConsommeSolde(consommeSolde);
        t.setBesoinJustificatif(justificatif);
        t.setRegleAcquisition(regle);
        return typeCongeRepository.save(t);
    }

    private DemandeConge demande(Employe employe, TypeConge type, String debut, String fin, int jours,
                                 StatutDemande statut, String motif, String dateDemande,
                                 String dateValidation, String validePar) {
        DemandeConge d = new DemandeConge();
        d.setEmploye(employe);
        d.setTypeConge(type);
        d.setDateDebut(LocalDate.parse(debut));
        d.setDateFin(LocalDate.parse(fin));
        d.setNombreJours(jours);
        d.setMotif(motif);
        d.setStatut(statut);
        d.setDateDemande(LocalDateTime.parse(dateDemande.replace(" ", "T")));
        d.setReference("DC-" + LocalDate.now().getYear() + "-" + String.format("%05d", demandeRepository.count() + 1));
        if (dateValidation != null) {
            d.setDateValidation(LocalDateTime.parse(dateValidation.replace(" ", "T")));
            d.setValidePar(validePar);
        }
        return demandeRepository.save(d);
    }

    private void creerAbsences(DemandeConge d) {
        LocalDate cursor = d.getDateDebut();
        while (!cursor.isAfter(d.getDateFin())) {
            if (cursor.getDayOfWeek().getValue() <= 5) {
                Absence a = new Absence();
                a.setEmploye(d.getEmploye());
                a.setDateAbsence(cursor);
                a.setTypeAbsence(d.getTypeConge().getCode());
                a.setLibelle(d.getTypeConge().getNom());
                a.setDemandeConge(d);
                absenceRepository.save(a);
            }
            cursor = cursor.plusDays(1);
        }
    }

    private void validation(DemandeConge d, String decision, String validateur, String date, String motif) {
        Validation v = new Validation();
        v.setDemandeConge(d);
        v.setDecision(decision);
        v.setValidateur(validateur);
        v.setDateValidation(LocalDateTime.parse(date.replace(" ", "T")));
        v.setMotif(motif);
        validationRepository.save(v);
    }

    private void solde(Employe employe, double acquis, double consomme, double restant) {
        SoldeConge s = new SoldeConge();
        s.setEmploye(employe);
        s.setAnnee(LocalDate.now().getYear());
        s.setSoldeAnnuelAcquis(acquis);
        s.setSoldeConsomme(consomme);
        s.setSoldeRestant(restant);
        soldeRepository.save(s);
    }

    private void evenement(String titre, String description, String debut, String fin, String lieu, String type) {
        Evenement e = new Evenement();
        e.setTitre(titre);
        e.setDescription(description);
        e.setDateDebut(LocalDate.parse(debut));
        e.setDateFin(LocalDate.parse(fin));
        e.setLieu(lieu);
        e.setType(type);
        e.setParticipantsMax(0);
        evenementRepository.save(e);
    }

    private void notification(Employe employe, String message, String type, boolean lu, String date) {
        Notification n = new Notification();
        n.setEmploye(employe);
        n.setMessage(message);
        n.setType(type);
        n.setLu(lu);
        n.setDateEnvoi(LocalDateTime.parse(date.replace(" ", "T")));
        notificationRepository.save(n);
    }

    private void audit(String acteur, String action, String detail, String date) {
        AuditLog l = new AuditLog();
        l.setActeur(acteur);
        l.setAction(action);
        l.setDetail(detail);
        l.setDateAction(LocalDateTime.parse(date.replace(" ", "T")));
        auditLogRepository.save(l);
    }

    // ------------------------------------------------------------------
    // Module Sécurité : permissions par rôle
    // ------------------------------------------------------------------
    private List<Permission> listePermissions() {
        return List.of(
                new Permission("GESTION_EMPLOYES", "Gestion des employés", "Annuaire & Compétences"),
                new Permission("VALIDATION_CONGE", "Validation des congés", "Congés & Absences"),
                new Permission("DOCUMENTS_RH", "Traitement des documents", "Documents"),
                new Permission("VALIDATION_FRAIS", "Validation des notes de frais", "Notes de frais"),
                new Permission("GESTION_RECRUTEMENT", "Gestion du recrutement", "Recrutement"),
                new Permission("GESTION_EVENEMENTS", "Gestion des événements", "Événements"),
                new Permission("EXPORT_DONNEES", "Export des données", "KPI & Reporting"));
    }

    private void seedPermissions() {
        List<Permission> permissions = listePermissions();
        for (Permission p : permissions) {
            permissionRepository.save(p);
        }
        for (RoleType role : List.of(RoleType.RESPONSABLE_RH, RoleType.ADMIN)) {
            for (Permission p : permissions) {
                RolePermission rp = new RolePermission();
                rp.setRole(role);
                rp.setPermission(p);
                rolePermissionRepository.save(rp);
            }
        }
    }

    /** Répare les bases existantes : recrée les permissions manquantes et rétablit la matrice RH/ADMIN. */
    private void reparerPermissions() {
        List<Permission> existantes = permissionRepository.findAll();
        if (existantes.isEmpty()) {
            for (Permission p : listePermissions()) {
                if (permissionRepository.findByCode(p.getCode()).isEmpty()) {
                    permissionRepository.save(p);
                }
            }
            existantes = permissionRepository.findAll();
        }
        for (RoleType role : List.of(RoleType.RESPONSABLE_RH, RoleType.ADMIN)) {
            for (Permission p : existantes) {
                if (!rolePermissionRepository.existsByRoleAndPermissionCode(role, p.getCode())) {
                    RolePermission rp = new RolePermission();
                    rp.setRole(role);
                    rp.setPermission(p);
                    rolePermissionRepository.save(rp);
                }
            }
        }
        log.info("DataSeeder : permissions vérifiées pour {}/{} rôles ({} permissions).",
                rolePermissionRepository.findByRole(RoleType.RESPONSABLE_RH).size(),
                RoleType.values().length, existantes.size());
    }

    /**
     * Répare les données de référence manquantes sur une base existante (créée par une
     * ancienne version) : types de documents, offres d'emploi, événements à venir, sondage.
     * Idempotent : ne fait rien si la table est déjà remplie.
     */
    private void reparerDonneesReference() {
        // 1) Types de documents
        if (documentTypeRepository.count() == 0) {
            documentTypeRepository.save(new DocumentType("Attestation de travail", "AT", "délivrée à la demande de l'intéressé(e)"));
            documentTypeRepository.save(new DocumentType("Bulletin de paie", "BP", "certifie le bulletin de paie du mois concerné"));
            documentTypeRepository.save(new DocumentType("Attestation IR", "IR", "atteste le montant de l'impôt retenu à la source"));
            documentTypeRepository.save(new DocumentType("Attestation de travail + salaire", "ATS", "délivrée à la demande de l'intéressé(e)"));
            documentTypeRepository.save(new DocumentType("Contrat de travail", "CT", "copie du contrat en vigueur"));
            log.info("DataSeeder : {} types de documents créés (réparation).", documentTypeRepository.count());
        }

        // 2) Offres d'emploi (module Recrutement)
        if (offreRepository.count() == 0) {
            OffreEmploi o1 = new OffreEmploi();
            o1.setTitre("Développeur Full-Stack (React / Spring Boot)");
            o1.setDepartement("Tech");
            o1.setTypeContrat("CDI");
            o1.setNiveau("Confirmé");
            o1.setMode("Hybride");
            o1.setStatut("OUVERTE");
            o1.setDatePublication(LocalDateTime.now().minusDays(5));
            offreRepository.save(o1);

            OffreEmploi o2 = new OffreEmploi();
            o2.setTitre("Chargé(e) de recrutement");
            o2.setDepartement("RH");
            o2.setTypeContrat("CDI");
            o2.setNiveau("Junior / Confirmé");
            o2.setMode("Présentiel");
            o2.setStatut("OUVERTE");
            o2.setDatePublication(LocalDateTime.now().minusDays(3));
            offreRepository.save(o2);

            OffreEmploi o3 = new OffreEmploi();
            o3.setTitre("Chef de projet digital");
            o3.setDepartement("Opérations");
            o3.setTypeContrat("CDD 12 mois");
            o3.setNiveau("Confirmé");
            o3.setMode("Hybride");
            o3.setStatut("OUVERTE");
            o3.setDatePublication(LocalDateTime.now().minusDays(1));
            offreRepository.save(o3);
            log.info("DataSeeder : {} offres d'emploi créées (réparation).", offreRepository.count());
        }

        // 3) Événements à venir (module Événements / Mes inscriptions)
        if (evenementRepository.count() == 0) {
            LocalDate today = LocalDate.now();
            evenement("Séminaire annuel GNS", "Séminaire annuel de l'entreprise",
                    today.plusDays(3).toString(), today.plusDays(4).toString(),
                    "Espace Casablanca", "Séminaire");
            evenement("Formation Angular", "Introduction à Angular pour les développeurs",
                    today.plusDays(10).toString(), today.plusDays(11).toString(),
                    "Salle 3", "Formation");
            evenement("Atelier bien-être", "Atelier gestion du stress",
                    today.plusDays(14).toString(), today.plusDays(14).toString(),
                    "Salle 2", "Formation");
            evenement("Célébration Anniversaire Entreprise", "Célébration annuelle",
                    today.plusDays(21).toString(), today.plusDays(21).toString(),
                    "Rooftop Casablanca", "Célébration");
            log.info("DataSeeder : {} événements créés (réparation).", evenementRepository.count());
        }
    }

    // ------------------------------------------------------------------
    // Module Documents
    // ------------------------------------------------------------------
    private void seedDocuments(Employe benali, Employe chraibi) {
        DocumentType attestation = documentTypeRepository.save(new DocumentType("Attestation de travail", "AT", "délivrée à la demande de l'intéressé(e)"));
        documentTypeRepository.save(new DocumentType("Bulletin de paie", "BP", "certifie le bulletin de paie du mois concerné"));
        documentTypeRepository.save(new DocumentType("Attestation IR", "IR", "atteste le montant de l'impôt retenu à la source"));
        documentTypeRepository.save(new DocumentType("Attestation de travail + salaire", "ATS", "délivrée à la demande de l'intéressé(e)"));
        documentTypeRepository.save(new DocumentType("Contrat de travail", "CT", "copie du contrat en vigueur"));

        // 1) Demande en traitement (collaborateur test)
        DemandeDocument d1 = new DemandeDocument();
        d1.setEmploye(benali);
        d1.setTypeDocument(attestation);
        d1.setFormat("DIGITAL");
        d1.setRemarque("Pour dossier bancaire");
        d1.setDateDemande(LocalDateTime.now().minusDays(2));
        d1.setStatut("EN_TRAITEMENT");
        d1.setReference("DOC-2026-00001");
        demandeDocumentRepository.save(d1);

        // 2) Demande traitée avec PDF généré réellement (collaborateur test)
        DemandeDocument d2 = new DemandeDocument();
        d2.setEmploye(benali);
        d2.setTypeDocument(attestation);
        d2.setFormat("DIGITAL");
        d2.setDateDemande(LocalDateTime.now().minusDays(10));
        d2.setStatut("DISPONIBLE");
        d2.setReference("DOC-2026-00002");
        java.time.format.DateTimeFormatter fmtDoc = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        byte[] pdf = PdfGenerator.generate(new PdfGenerator.DonneesDocument(
                "GNS TECHNOLOGIES",
                "Direction des Ressources Humaines",
                "Siège : Casablanca, Maroc · contact@gns.ma · +212 5 22 00 00 00",
                "Attestation de travail", d2.getReference(),
                LocalDate.now().format(fmtDoc),
                List.of(new String[]{"Délivré à", "Youssef Benali"},
                        new String[]{"Matricule", "GNS-004"},
                        new String[]{"Date d'embauche", "01/06/2022"}),
                List.of("Nous soussignés, GNS Technologies, attestons que :", "",
                        "Youssef Benali, matricule GNS-004,",
                        "employé(e) depuis le 01/06/2022,",
                        "La présente attestation est délivrée à la demande de l'intéressé(e)."),
                null,
                "Fait à Casablanca, le " + LocalDate.now().format(fmtDoc) + " · GNS TECHNOLOGIES",
                "rh@gns.ma",
                LocalDate.now().format(fmtDoc),
                "Youssef Benali"));
        try {
            java.nio.file.Files.createDirectories(java.nio.file.Paths.get("uploads", "justificatifs", "documents"));
            java.nio.file.Files.write(java.nio.file.Paths.get("uploads", "justificatifs", "documents", "DOC-2026-00002.pdf"), pdf);
        } catch (java.io.IOException ignored) {
        }
        d2.setFichierUrl("/uploads/justificatifs/documents/DOC-2026-00002.pdf");
        d2.setDateTraitement(LocalDateTime.now().minusDays(9));
        demandeDocumentRepository.save(d2);

        // 3) Demande refusée (autre collaborateur)
        DemandeDocument d3 = new DemandeDocument();
        d3.setEmploye(chraibi);
        d3.setTypeDocument(documentTypeRepository.findAll().stream()
                .filter(t -> t.getCode().equals("BP")).findFirst().orElse(attestation));
        d3.setFormat("PAPIER");
        d3.setDateDemande(LocalDateTime.now().minusDays(5));
        d3.setStatut("REFUSE");
        d3.setMotifRefus("Bulletin déjà disponible dans votre espace personnel");
        d3.setReference("DOC-2026-00003");
        d3.setDateTraitement(LocalDateTime.now().minusDays(4));
        demandeDocumentRepository.save(d3);
    }

    // ------------------------------------------------------------------
    // Module Événements : participations
    // ------------------------------------------------------------------
    private void seedParticipations(Employe benali, Employe idrissi, Employe harti, Employe chraibi, Employe moussaoui) {
        Evenement teamBuilding = new Evenement();
        teamBuilding.setTitre("Team Building plage");
        teamBuilding.setDescription("Journée détente et cohésion d'équipe");
        teamBuilding.setDateDebut(LocalDate.now().plusDays(20));
        teamBuilding.setDateFin(LocalDate.now().plusDays(20));
        teamBuilding.setHeureDebut(java.time.LocalTime.of(9, 0));
        teamBuilding.setLieu("Plage de Dar Bouazza");
        teamBuilding.setType("Célébration");
        teamBuilding.setParticipantsMax(20);
        teamBuilding = evenementRepository.save(teamBuilding);

        Evenement conference = new Evenement();
        conference.setTitre("Conférence Innovation 2026");
        conference.setDescription("Conférence sur les tendances technologiques");
        conference.setDateDebut(LocalDate.now().plusDays(35));
        conference.setDateFin(LocalDate.now().plusDays(36));
        conference.setHeureDebut(java.time.LocalTime.of(14, 0));
        conference.setLieu("Centre de conférences Casablanca");
        conference.setType("Conférence");
        conference.setParticipantsMax(5);
        conference = evenementRepository.save(conference);

        participation(teamBuilding, benali);
        participation(teamBuilding, idrissi);
        participation(teamBuilding, harti);
        participation(teamBuilding, chraibi);
        participation(teamBuilding, moussaoui);
        participation(conference, benali);
        participation(conference, idrissi);
        participation(conference, harti);
        participation(conference, chraibi);
        participation(conference, moussaoui);
    }

    private void participation(Evenement ev, Employe employe) {
        ParticipationEvenement p = new ParticipationEvenement();
        p.setEvenement(ev);
        p.setEmploye(employe);
        p.setStatut("INSCRIT");
        p.setDateInscription(LocalDateTime.now().minusDays(2));
        participationRepository.save(p);
    }

    // ------------------------------------------------------------------
    // Module Notes de frais
    // ------------------------------------------------------------------
    private void seedFrais(Employe benali) {
        // Note en attente
        NoteFrais n1 = new NoteFrais();
        n1.setEmploye(benali);
        n1.setReference("NF-2026-00001");
        n1.setTitre("Mission client Casablanca");
        n1.setDevise("MAD");
        n1.setDate(LocalDate.now().minusDays(3));
        n1.setPriorite("Haute");
        n1.setRemarque("Déplacements et repas lors de la mission");
        n1.setMontantTotal(860);
        n1.setStatut("EN_ATTENTE");
        n1.setDateCreation(LocalDateTime.now().minusDays(3));
        Depense d1a = new Depense(); d1a.setNoteFrais(n1); d1a.setLibelle("Taxi aéroport"); d1a.setMontant(180);
        Depense d1b = new Depense(); d1b.setNoteFrais(n1); d1b.setLibelle("Déjeuner client"); d1b.setMontant(380);
        Depense d1c = new Depense(); d1c.setNoteFrais(n1); d1c.setLibelle("Repas du soir"); d1c.setMontant(300);
        n1.getDepenses().add(d1a); n1.getDepenses().add(d1b); n1.getDepenses().add(d1c);
        noteFraisRepository.save(n1);

        // Note remboursée
        NoteFrais n2 = new NoteFrais();
        n2.setEmploye(benali);
        n2.setReference("NF-2026-00002");
        n2.setTitre("Formation Spring Boot");
        n2.setDevise("MAD");
        n2.setDate(LocalDate.now().minusMonths(1));
        n2.setPriorite("Normale");
        n2.setMontantTotal(2500);
        n2.setStatut("REMBOURSEE");
        n2.setDateCreation(LocalDateTime.now().minusMonths(1).withDayOfMonth(5));
        n2.setDateTraitement(LocalDateTime.now().minusMonths(1).withDayOfMonth(8));
        Depense d2a = new Depense(); d2a.setNoteFrais(n2); d2a.setLibelle("Inscription formation"); d2a.setMontant(2500);
        n2.getDepenses().add(d2a);
        noteFraisRepository.save(n2);
        Remboursement r2 = new Remboursement();
        r2.setNoteFrais(n2);
        r2.setMontant(2500);
        r2.setDateRemboursement(LocalDateTime.now().minusMonths(1).withDayOfMonth(10));
        remboursementRepository.save(r2);

        // Note refusée
        NoteFrais n3 = new NoteFrais();
        n3.setEmploye(benali);
        n3.setReference("NF-2026-00003");
        n3.setTitre("Frais divers non justifiés");
        n3.setDevise("EUR");
        n3.setDate(LocalDate.now().minusMonths(2));
        n3.setPriorite("Basse");
        n3.setMontantTotal(120);
        n3.setStatut("REFUSEE");
        n3.setMotifRefus("Justificatif manquant pour ce type de dépense");
        n3.setDateCreation(LocalDateTime.now().minusMonths(2).withDayOfMonth(15));
        n3.setDateTraitement(LocalDateTime.now().minusMonths(2).withDayOfMonth(17));
        Depense d3a = new Depense(); d3a.setNoteFrais(n3); d3a.setLibelle("Achat matériel"); d3a.setMontant(120);
        n3.getDepenses().add(d3a);
        noteFraisRepository.save(n3);
    }

    // ------------------------------------------------------------------
    // Module Recrutement
    // ------------------------------------------------------------------
    private void seedRecrutement() {
        OffreEmploi o1 = new OffreEmploi();
        o1.setTitre("Développeur Full-Stack");
        o1.setDepartement("Tech");
        o1.setTypeContrat("CDI");
        o1.setNiveau("Confirmé");
        o1.setMode("HYBRIDE");
        o1.setStatut("OUVERTE");
        o1.setDatePublication(LocalDateTime.now().minusDays(15));
        o1 = offreRepository.save(o1);

        OffreEmploi o2 = new OffreEmploi();
        o2.setTitre("Chargé de communication");
        o2.setDepartement("Marketing");
        o2.setTypeContrat("CDD");
        o2.setNiveau("Débutant");
        o2.setMode("SUR_PLACE");
        o2.setStatut("OUVERTE");
        o2.setDatePublication(LocalDateTime.now().minusDays(5));
        o2 = offreRepository.save(o2);

        candidat(o1, "Karimi", "Sara", "s.karimi@mail.com", "0620123456",
                "BOITE_RECEPTION", null);
        candidat(o1, "El Fassi", "Mehdi", "m.elfassi@mail.com", "0633987654",
                "ENTRETIEN_TEL", LocalDateTime.now().plusDays(2).withHour(10).withMinute(0));
        candidat(o1, "Bouazzaoui", "Imane", "i.bouazzaoui@mail.com", "0644556677",
                "ENTRETIEN_PHYSIQUE", LocalDateTime.now().plusDays(5).withHour(14).withMinute(30));
        candidat(o2, "Amrani", "Khalid", "k.amrani@mail.com", "0655443322",
                "BROUILLON", null);
    }

    private void candidat(OffreEmploi offre, String nom, String prenom, String email, String tel,
                          String etape, LocalDateTime dateEntretien) {
        Candidat c = new Candidat();
        c.setNom(nom);
        c.setPrenom(prenom);
        c.setEmail(email);
        c.setTelephone(tel);
        c.setLinkedin("linkedin.com/in/" + email.split("@")[0]);
        candidatRepository.save(c);

        Candidature ca = new Candidature();
        ca.setOffre(offre);
        ca.setCandidat(c);
        ca.setEtape(etape);
        ca.setDateCreation(LocalDateTime.now().minusDays(8));
        ca.setDateEntretien(dateEntretien);
        ca.getHistorique().add(LocalDateTime.now().minusDays(8)
                .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                + " - Candidature reçue pour « " + offre.getTitre() + " »");
        if (dateEntretien != null) {
            ca.getHistorique().add(LocalDateTime.now().minusDays(1)
                    .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    + " - Entretien planifié le "
                    + dateEntretien.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        }
        candidatureRepository.save(ca);
    }
}
