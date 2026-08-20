package com.gns.sirh.service;

import com.gns.sirh.common.ApiPage;
import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.*;
import com.gns.sirh.entity.*;
import com.gns.sirh.repository.*;
import com.gns.sirh.security.AuthUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CongeService {

    private final DemandeCongeRepository demandeRepository;
    private final TypeCongeRepository typeCongeRepository;
    private final SoldeCongeRepository soldeRepository;
    private final AbsenceRepository absenceRepository;
    private final ValidationRepository validationRepository;
    private final EmployeRepository employeRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    private final Path uploadDir;

    public CongeService(DemandeCongeRepository demandeRepository,
                        TypeCongeRepository typeCongeRepository,
                        SoldeCongeRepository soldeRepository,
                        AbsenceRepository absenceRepository,
                        ValidationRepository validationRepository,
                        EmployeRepository employeRepository,
                        NotificationService notificationService,
                        AuditService auditService,
                        @Value("${app.upload-dir}") String uploadDir) {
        this.demandeRepository = demandeRepository;
        this.typeCongeRepository = typeCongeRepository;
        this.soldeRepository = soldeRepository;
        this.absenceRepository = absenceRepository;
        this.validationRepository = validationRepository;
        this.employeRepository = employeRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.uploadDir = Paths.get(uploadDir);
    }

    // ------------------------------------------------------------------
    // Lecture
    // ------------------------------------------------------------------

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<DemandeCongeResponse> mesDemandes(Long employeId, Integer mois, Integer annee) {
        List<DemandeConge> demandes;
        if (mois != null && annee != null) {
            YearMonth ym = YearMonth.of(annee, mois);
            demandes = demandeRepository.findByEmployeIdAndPeriode(
                    employeId, ym.atDay(1), ym.atEndOfMonth(), mois, annee);
        } else {
            demandes = demandeRepository.findByEmployeIdOrderByDateDemandeDesc(employeId);
        }
        return demandes.stream().map(this::toResponse).toList();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public DemandeCongeResponse getDemande(Long id, AuthUser user) {
        DemandeConge d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (!user.isRh() && !d.getEmploye().getId().equals(user.employeId())) {
            throw new BusinessException("Vous n'avez pas accès à cette demande");
        }
        return toResponse(d);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ApiPage<DemandeCongeResponse> listeDemandes(String q, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)),
                Sort.by("dateDemande").descending());
        Page<DemandeConge> result = demandeRepository.findAll(pageable);
        List<DemandeCongeResponse> items = result.getContent().stream()
                .filter(d -> q == null || q.isBlank()
                        || d.getEmploye().getNomComplet().toLowerCase().contains(q.toLowerCase())
                        || d.getEmploye().getDepartement() != null
                        && d.getEmploye().getDepartement().getNom().toLowerCase().contains(q.toLowerCase()))
                .map(this::toResponse)
                .toList();
        return new ApiPage<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public SoldeResponse solde(Long employeId) {
        int annee = LocalDate.now().getYear();
        double joursPris = 0;
        double absencesJustifiees = 0;
        double enAttente = 0;

        List<DemandeConge> anneeDemandes = demandeRepository.findByEmployeIdAndPeriode(
                employeId, LocalDate.of(annee, 1, 1), LocalDate.of(annee, 12, 31), 1, annee);

        for (DemandeConge d : anneeDemandes) {
            if (d.getStatut() == StatutDemande.APPROUVEE) {
                if (d.getTypeConge().isConsommeSolde()) {
                    joursPris += d.getNombreJours();
                } else {
                    absencesJustifiees += d.getNombreJours();
                }
            } else if (d.getStatut() == StatutDemande.EN_ATTENTE) {
                enAttente += d.getNombreJours();
            }
        }

        SoldeConge solde = soldeRepository.findByEmployeIdAndAnnee(employeId, annee)
                .orElseGet(() -> {
                    SoldeConge s = new SoldeConge();
                    s.setEmploye(employeRepository.findById(employeId)
                            .orElseThrow(() -> new BusinessException("Collaborateur introuvable")));
                    s.setAnnee(annee);
                    s.setSoldeAnnuelAcquis(0);
                    s.setSoldeConsomme(0);
                    s.setSoldeRestant(0);
                    return s;
                });

        return new SoldeResponse(
                annee,
                solde.getSoldeAnnuelAcquis(),
                Math.max(0, solde.getSoldeRestant()),
                joursPris,
                absencesJustifiees,
                enAttente
        );
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public CalendrierEquipeResponse calendrierEquipe(Integer mois, Integer annee) {
        int m = mois == null ? LocalDate.now().getMonthValue() : mois;
        int y = annee == null ? LocalDate.now().getYear() : annee;
        YearMonth ym = YearMonth.of(y, m);
        LocalDate debut = ym.atDay(1);
        LocalDate fin = ym.atEndOfMonth();

        CalendrierEquipeResponse response = new CalendrierEquipeResponse();
        response.setMois(m);
        response.setAnnee(y);

        List<Employe> employes = employeRepository.findByStatutOrderByNomAsc(StatutEmploye.ACTIF);
        List<DemandeConge> demandes = demandeRepository.findByPeriode(debut, fin,
                List.of(StatutDemande.APPROUVEE, StatutDemande.EN_ATTENTE));

        Map<Long, CalendrierEquipeResponse.LigneCollaborateur> lignes = new LinkedHashMap<>();
        for (Employe e : employes) {
            CalendrierEquipeResponse.LigneCollaborateur ligne = new CalendrierEquipeResponse.LigneCollaborateur();
            ligne.setEmployeId(e.getId());
            ligne.setNom(e.getNomComplet());
            ligne.setInitiales(e.getInitiales());
            ligne.setDepartement(e.getDepartement() != null ? e.getDepartement().getNom() : null);
            lignes.put(e.getId(), ligne);
        }

        for (DemandeConge d : demandes) {
            CalendrierEquipeResponse.LigneCollaborateur ligne = lignes.get(d.getEmploye().getId());
            if (ligne == null) {
                continue;
            }
            LocalDate cursor = d.getDateDebut().isBefore(debut) ? debut : d.getDateDebut();
            LocalDate end = d.getDateFin().isAfter(fin) ? fin : d.getDateFin();
            while (!cursor.isAfter(end)) {
                if (cursor.getDayOfWeek().getValue() <= 5) { // jours ouvrés
                    ligne.getJours().put(cursor.getDayOfMonth(),
                            new CalendrierEquipeResponse.Cellule(
                                    d.getTypeConge().getCode() != null ? d.getTypeConge().getCode() : "C",
                                    d.getTypeConge().getNom(),
                                    d.getTypeConge().getCouleur(),
                                    d.getId()));
                }
                cursor = cursor.plusDays(1);
            }
        }

        // Effectif présent par jour
        int joursDansMois = ym.lengthOfMonth();
        int total = lignes.size();
        for (int day = 1; day <= joursDansMois; day++) {
            LocalDate d = LocalDate.of(y, m, day);
            if (d.getDayOfWeek().getValue() > 5) {
                continue;
            }
            int absents = 0;
            for (CalendrierEquipeResponse.LigneCollaborateur ligne : lignes.values()) {
                if (ligne.getJours().containsKey(day)) {
                    absents++;
                }
            }
            response.getPresentParJour().put(day, total - absents);
        }

        response.setEmployes(new ArrayList<>(lignes.values()));
        return response;
    }

    public List<TypeConge> types() {
        return typeCongeRepository.findAllByOrderByNomAsc();
    }

    // ------------------------------------------------------------------
    // Écriture
    // ------------------------------------------------------------------

    @Transactional
    public DemandeCongeResponse createDemande(AuthUser user, DemandeCongeRequest req, MultipartFile justificatif) {
        Employe employe = resolveEmploye(user, req.employeId());
        TypeConge type = typeCongeRepository.findById(req.typeCongeId())
                .orElseThrow(() -> new BusinessException("Type de congé introuvable"));
        validerRegles(employe, type, req.dateDebut(), req.dateFin(), null, justificatif != null);

        DemandeConge d = new DemandeConge();
        d.setEmploye(employe);
        d.setTypeConge(type);
        d.setDateDebut(req.dateDebut());
        d.setDateFin(req.dateFin());
        d.setNombreJours(calculJoursOuvres(req.dateDebut(), req.dateFin()));
        d.setMotif(req.motif());
        d.setStatut(StatutDemande.EN_ATTENTE);
        d.setDateDemande(LocalDateTime.now());
        d.setReference(genererReference());
        if (justificatif != null && !justificatif.isEmpty()) {
            d.setJustificatifUrl(sauvegarderFichier(justificatif));
        } else if (type.isBesoinJustificatif()) {
            throw new BusinessException("Un justificatif est obligatoire pour ce type de demande");
        }

        DemandeConge saved = demandeRepository.save(d);
        notificationService.notifier(employe, "Demande de " + type.getNom()
                        + " soumise (" + d.getNombreJours() + " j) — en attente de validation",
                "CONGE_SOUMISE");
        notificationService.notifierParRole(com.gns.sirh.entity.RoleType.RESPONSABLE_RH,
                "Nouvelle demande de congé : " + employe.getNomComplet() + " ("
                        + type.getNom() + ", " + d.getNombreJours() + " j, du " + d.getDateDebut() + " au " + d.getDateFin() + ")",
                "CONGE_RH");
        auditService.log(user.email(), "DEMANDE_CONGE", "Demande " + saved.getReference()
                + " créée pour " + employe.getNomComplet());
        return toResponse(saved);
    }

    @Transactional
    public DemandeCongeResponse updateDemande(Long id, AuthUser user, DemandeCongeRequest req, MultipartFile justificatif) {
        DemandeConge d = verifierProprieteEtAttente(id, user);
        TypeConge type = typeCongeRepository.findById(req.typeCongeId())
                .orElseThrow(() -> new BusinessException("Type de congé introuvable"));
        validerRegles(d.getEmploye(), type, req.dateDebut(), req.dateFin(), id, justificatif != null || d.getJustificatifUrl() != null);

        d.setTypeConge(type);
        d.setDateDebut(req.dateDebut());
        d.setDateFin(req.dateFin());
        d.setNombreJours(calculJoursOuvres(req.dateDebut(), req.dateFin()));
        d.setMotif(req.motif());
        if (justificatif != null && !justificatif.isEmpty()) {
            d.setJustificatifUrl(sauvegarderFichier(justificatif));
        }
        DemandeConge saved = demandeRepository.save(d);
        auditService.log(user.email(), "MODIFICATION_DEMANDE", "Demande " + saved.getReference() + " modifiée");
        return toResponse(saved);
    }

    @Transactional
    public DemandeCongeResponse annuler(Long id, AuthUser user) {
        DemandeConge d = verifierProprieteEtAttente(id, user);
        d.setStatut(StatutDemande.ANNULEE);
        demandeRepository.save(d);

        Validation v = new Validation();
        v.setDemandeConge(d);
        v.setDecision("ANNULEE");
        v.setValidateur(user.isRh() ? "RH: " + user.email() : d.getEmploye().getNomComplet());
        v.setDateValidation(LocalDateTime.now());
        validationRepository.save(v);

        notificationService.notifier(d.getEmploye(),
                "Votre demande " + d.getReference() + " a été annulée", "CONGE_ANNULEE");
        notificationService.notifierParRole(com.gns.sirh.entity.RoleType.RESPONSABLE_RH,
                "Demande annulée par le collaborateur : " + d.getReference() + " (" + d.getEmploye().getNomComplet() + ")",
                "CONGE_ANNULE_RH");
        auditService.log(user.email(), "ANNULATION_DEMANDE", "Demande " + d.getReference() + " annulée");
        return toResponse(d);
    }

    @Transactional
    public DemandeCongeResponse valider(Long id, AuthUser user) {
        DemandeConge d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (d.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new BusinessException("Seules les demandes en attente peuvent être validées");
        }

        d.setStatut(StatutDemande.APPROUVEE);
        d.setDateValidation(LocalDateTime.now());
        d.setValidePar(user.email());
        demandeRepository.save(d);

        if (d.getTypeConge().isConsommeSolde()) {
            SoldeConge solde = getOrCreateSolde(d.getEmploye(), d.getDateDebut().getYear());
            solde.setSoldeConsomme(solde.getSoldeConsomme() + d.getNombreJours());
            solde.setSoldeRestant(Math.max(0, solde.getSoldeRestant() - d.getNombreJours()));
            soldeRepository.save(solde);
        }

        // Création des absences (jours ouvrés uniquement)
        LocalDate cursor = d.getDateDebut();
        while (!cursor.isAfter(d.getDateFin())) {
            if (cursor.getDayOfWeek().getValue() <= 5) {
                Absence a = new Absence();
                a.setEmploye(d.getEmploye());
                a.setDateAbsence(cursor);
                a.setTypeAbsence(d.getTypeConge().getCode());
                a.setLibelle(d.getTypeConge().getNom());
                a.setPieceJustificative(d.getJustificatifUrl());
                a.setDemandeConge(d);
                absenceRepository.save(a);
            }
            cursor = cursor.plusDays(1);
        }

        Validation v = new Validation();
        v.setDemandeConge(d);
        v.setDecision("APPROUVEE");
        v.setValidateur(user.email());
        v.setDateValidation(LocalDateTime.now());
        validationRepository.save(v);

        notificationService.notifier(d.getEmploye(),
                "Votre demande " + d.getReference() + " (" + d.getTypeConge().getNom()
                        + ", " + d.getNombreJours() + " j) a été approuvée",
                "CONGE_APPROUVE");
        auditService.log(user.email(), "VALIDATION_DEMANDE", "Demande " + d.getReference() + " approuvée");
        return toResponse(d);
    }

    @Transactional
    public DemandeCongeResponse refuser(Long id, String motif, AuthUser user) {
        DemandeConge d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (d.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new BusinessException("Seules les demandes en attente peuvent être refusées");
        }
        if (motif == null || motif.isBlank()) {
            throw new BusinessException("Le motif de refus est obligatoire");
        }

        d.setStatut(StatutDemande.REFUSEE);
        d.setMotifRefus(motif);
        d.setDateValidation(LocalDateTime.now());
        d.setValidePar(user.email());
        demandeRepository.save(d);

        Validation v = new Validation();
        v.setDemandeConge(d);
        v.setDecision("REFUSEE");
        v.setValidateur(user.email());
        v.setMotif(motif);
        v.setDateValidation(LocalDateTime.now());
        validationRepository.save(v);

        notificationService.notifier(d.getEmploye(),
                "Votre demande " + d.getReference() + " a été refusée : " + motif, "CONGE_REFUSE");
        auditService.log(user.email(), "REFUS_DEMANDE", "Demande " + d.getReference() + " refusée");
        return toResponse(d);
    }

    // ------------------------------------------------------------------
    // Export Excel du planning mensuel des congés
    // ------------------------------------------------------------------

    private static final String[] MOIS_FR = {
            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    };

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public byte[] exportXlsx(Integer mois, Integer annee) throws IOException {
        int m = mois == null ? LocalDate.now().getMonthValue() : mois;
        int y = annee == null ? LocalDate.now().getYear() : annee;
        YearMonth ym = YearMonth.of(y, m);
        int jours = ym.lengthOfMonth();
        CalendrierEquipeResponse data = calendrierEquipe(m, y);

        String[] enTetes = new String[jours + 3];
        enTetes[0] = "Collaborateur";
        enTetes[1] = "Département";
        for (int day = 1; day <= jours; day++) {
            enTetes[day + 1] = String.valueOf(day);
        }
        enTetes[jours + 2] = "Total jours";

        List<String[]> lignes = new ArrayList<>();
        for (CalendrierEquipeResponse.LigneCollaborateur ligne : data.getEmployes()) {
            String[] row = new String[jours + 3];
            row[0] = ligne.getNom();
            row[1] = ligne.getDepartement() == null ? "" : ligne.getDepartement();
            for (int day = 1; day <= jours; day++) {
                CalendrierEquipeResponse.Cellule cell = ligne.getJours().get(day);
                row[day + 1] = cell == null ? "" : cell.getCode();
            }
            row[jours + 2] = String.valueOf(ligne.getJours().size());
            lignes.add(row);
        }

        // Ligne de synthèse « Effectif présent » par jour
        String[] totaux = new String[jours + 3];
        totaux[0] = "Effectif présent";
        for (int day = 1; day <= jours; day++) {
            Integer present = data.getPresentParJour().get(day);
            totaux[day + 1] = present == null ? "" : String.valueOf(present);
        }

        Integer[] largeurs = new Integer[jours + 3];
        largeurs[0] = 26;
        largeurs[1] = 18;
        for (int day = 1; day <= jours; day++) {
            largeurs[day + 1] = 6;
        }
        largeurs[jours + 2] = 12;

        String moisAnnee = MOIS_FR[m - 1] + " " + y;
        return ExcelExporter.generer("GNS TECHNOLOGIES — Planning des congés",
                "Export généré le " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm")),
                null, moisAnnee, enTetes, lignes, "Planning " + moisAnnee,
                largeurs, totaux);
    }

    public String nomFichierExport(Integer mois, Integer annee) {
        int m = mois == null ? LocalDate.now().getMonthValue() : mois;
        int y = annee == null ? LocalDate.now().getYear() : annee;
        return "planning_conges_" + y + "_" + String.format("%02d", m) + ".xlsx";
    }


    // ------------------------------------------------------------------
    // Utilitaires
    // ------------------------------------------------------------------

    private Employe resolveEmploye(AuthUser user, Long employeId) {
        if (employeId != null) {
            if (!user.isRh()) {
                throw new BusinessException("Vous ne pouvez pas réserver pour un autre collaborateur");
            }
            return employeRepository.findById(employeId)
                    .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        }
        if (user.employeId() == null) {
            throw new BusinessException("Aucun employé lié à votre compte");
        }
        return employeRepository.findById(user.employeId())
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
    }

    private void validerRegles(Employe employe, TypeConge type, LocalDate debut, LocalDate fin,
                               Long demandeIdExclue, boolean aJustificatif) {
        if (fin.isBefore(debut)) {
            throw new BusinessException("La date de fin doit être après la date de début");
        }
        if (debut.isBefore(LocalDate.now().minusDays(1))) {
            throw new BusinessException("La demande doit commencer aujourd'hui ou plus tard");
        }
        int jours = calculJoursOuvres(debut, fin);
        if (jours <= 0) {
            throw new BusinessException("La période ne contient aucun jour ouvré");
        }
        if (type.isBesoinJustificatif() && !aJustificatif) {
            throw new BusinessException("Un justificatif est obligatoire pour ce type de demande");
        }
        if (type.getJoursMaxParAn() > 0) {
            List<DemandeConge> anneeDemandes = demandeRepository.findByEmployeIdAndPeriode(
                    employe.getId(), LocalDate.of(debut.getYear(), 1, 1),
                    LocalDate.of(debut.getYear(), 12, 31), 1, debut.getYear());
            int total = jours;
            for (DemandeConge d : anneeDemandes) {
                if (d.getId().equals(demandeIdExclue)) {
                    continue;
                }
                // Seules les demandes du même type comptent pour le quota de ce type
                if (!d.getTypeConge().getId().equals(type.getId())) {
                    continue;
                }
                if (d.getStatut() == StatutDemande.APPROUVEE || d.getStatut() == StatutDemande.EN_ATTENTE) {
                    total += d.getNombreJours();
                }
            }
            if (total > type.getJoursMaxParAn()) {
                throw new BusinessException("Le quota annuel pour « " + type.getNom()
                        + " » est dépassé (" + total + "/" + type.getJoursMaxParAn() + " jours)");
            }
        }
        if (type.isConsommeSolde()) {
            SoldeConge solde = soldeRepository.findByEmployeIdAndAnnee(employe.getId(), debut.getYear())
                    .orElse(null);
            if (solde != null && jours > solde.getSoldeRestant()) {
                throw new BusinessException("Solde insuffisant : il reste "
                        + (int) solde.getSoldeRestant() + " jour(s), vous demandez " + jours + " jour(s)");
            }
        }
        List<DemandeConge> overlap = demandeRepository.findOverlap(employe.getId(), debut, fin,
                List.of(StatutDemande.EN_ATTENTE, StatutDemande.APPROUVEE));
        if (demandeIdExclue != null) {
            overlap.removeIf(d -> d.getId().equals(demandeIdExclue));
        }
        if (!overlap.isEmpty()) {
            DemandeConge premier = overlap.get(0);
            throw new BusinessException("Chevauchement avec une demande existante ("
                    + premier.getTypeConge().getNom() + " du " + premier.getDateDebut()
                    + " au " + premier.getDateFin() + ")");
        }
    }

    private DemandeConge verifierProprieteEtAttente(Long id, AuthUser user) {
        DemandeConge d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (d.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new BusinessException("Seules les demandes en attente peuvent être modifiées");
        }
        if (!user.isRh() && !d.getEmploye().getId().equals(user.employeId())) {
            throw new BusinessException("Vous ne pouvez pas modifier la demande d'un autre collaborateur");
        }
        return d;
    }

    public int calculJoursOuvres(LocalDate debut, LocalDate fin) {
        int jours = 0;
        LocalDate cursor = debut;
        while (!cursor.isAfter(fin)) {
            if (cursor.getDayOfWeek().getValue() <= 5) {
                jours++;
            }
            cursor = cursor.plusDays(1);
        }
        return jours;
    }

    private SoldeConge getOrCreateSolde(Employe employe, int annee) {
        return soldeRepository.findByEmployeIdAndAnnee(employe.getId(), annee)
                .orElseGet(() -> {
                    SoldeConge s = new SoldeConge();
                    s.setEmploye(employe);
                    s.setAnnee(annee);
                    s.setSoldeAnnuelAcquis(26);
                    s.setSoldeConsomme(0);
                    s.setSoldeRestant(26);
                    return s;
                });
    }

    private String genererReference() {
        long seq = demandeRepository.count() + 1;
        return "DC-" + LocalDate.now().getYear() + "-" + String.format("%05d", seq % 100000);
    }

    private String sauvegarderFichier(MultipartFile fichier) {
        try {
            Files.createDirectories(uploadDir);
            String nomNettoye = fichier.getOriginalFilename() == null ? "fichier"
                    : fichier.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
            String nomStocke = System.currentTimeMillis() + "_" + nomNettoye;
            Path target = uploadDir.resolve(nomStocke);
            Files.copy(fichier.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/justificatifs/" + nomStocke;
        } catch (IOException ex) {
            throw new BusinessException("Impossible d'enregistrer le justificatif");
        }
    }

    public DemandeCongeResponse toResponse(DemandeConge d) {
        List<ValidationDto> historique = validationRepository
                .findByDemandeCongeIdOrderByDateValidationAsc(d.getId())
                .stream()
                .map(v -> new ValidationDto(v.getId(), v.getDecision(), v.getValidateur(),
                        v.getDateValidation(), v.getMotif()))
                .toList();
        return new DemandeCongeResponse(
                d.getId(),
                d.getReference(),
                d.getEmploye().getId(),
                d.getEmploye().getNomComplet(),
                d.getEmploye().getInitiales(),
                d.getEmploye().getDepartement() != null ? d.getEmploye().getDepartement().getNom() : null,
                d.getTypeConge().getId(),
                d.getTypeConge().getNom(),
                d.getTypeConge().getCode(),
                d.getTypeConge().getCouleur(),
                d.getDateDebut(),
                d.getDateFin(),
                d.getNombreJours(),
                d.getMotif(),
                d.getStatut().name(),
                d.getMotifRefus(),
                d.getJustificatifUrl(),
                d.getDateDemande(),
                d.getDateValidation(),
                d.getValidePar(),
                historique
        );
    }
}
