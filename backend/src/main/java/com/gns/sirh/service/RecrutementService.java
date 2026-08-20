package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.*;
import com.gns.sirh.entity.*;
import com.gns.sirh.repository.*;
import com.gns.sirh.security.AuthUser;
import org.springframework.beans.factory.annotation.Value;
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
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class RecrutementService {

    public static final Set<String> ETAPES = Set.of(
            "BOITE_RECEPTION", "BROUILLON", "ENTRETIEN_TEL", "ENTRETIEN_PHYSIQUE", "EMBAUCHE");

    private final OffreEmploiRepository offreRepository;
    private final CandidatureRepository candidatureRepository;
    private final CandidatRepository candidatRepository;
    private final EmployeRepository employeRepository;
    private final DepartementRepository departementRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final Path uploadDir;

    public RecrutementService(OffreEmploiRepository offreRepository,
                              CandidatureRepository candidatureRepository,
                              CandidatRepository candidatRepository,
                              EmployeRepository employeRepository,
                              DepartementRepository departementRepository,
                              NotificationService notificationService,
                              AuditService auditService,
                              @Value("${app.upload-dir}") String uploadDir) {
        this.offreRepository = offreRepository;
        this.candidatureRepository = candidatureRepository;
        this.candidatRepository = candidatRepository;
        this.employeRepository = employeRepository;
        this.departementRepository = departementRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.uploadDir = Paths.get(uploadDir).resolve("recrutement");
    }

    // ---------------- Offres ----------------

    @Transactional(readOnly = true)
    public List<OffreEmploiDto> offres() {
        return offreRepository.findAllByOrderByDatePublicationDesc()
                .stream().map(this::toOffreDto).toList();
    }

    @Transactional
    public OffreEmploiDto publier(OffreEmploiRequest req, String acteur) {
        OffreEmploi o = new OffreEmploi();
        appliquerOffre(o, req);
        o.setDatePublication(LocalDateTime.now());
        OffreEmploi saved = offreRepository.save(o);
        auditService.log(acteur, "PUBLICATION_OFFRE", "Offre « " + saved.getTitre() + " » publiée");
        return toOffreDto(saved);
    }

    @Transactional
    public OffreEmploiDto modifierOffre(Long id, OffreEmploiRequest req, String acteur) {
        OffreEmploi o = offreRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Offre introuvable"));
        appliquerOffre(o, req);
        OffreEmploi saved = offreRepository.save(o);
        auditService.log(acteur, "MODIFICATION_OFFRE", "Offre « " + saved.getTitre() + " » modifiée");
        return toOffreDto(saved);
    }

    private void appliquerOffre(OffreEmploi o, OffreEmploiRequest req) {
        o.setTitre(req.titre());
        o.setDepartement(req.departement());
        o.setTypeContrat(req.typeContrat());
        o.setNiveau(req.niveau());
        o.setMode(req.mode());
        o.setStatut(req.statut() == null || req.statut().isBlank() ? "OUVERTE" : req.statut());
    }

    @Transactional(readOnly = true)
    public OffreEmploiDto detailOffre(Long id) {
        return toOffreDto(offreRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Offre introuvable")));
    }

    @Transactional
    public OffreEmploiDto changerStatutOffre(Long id, String statut, String acteur) {
        if (statut == null || statut.isBlank()) {
            throw new BusinessException("Le statut de l'offre est obligatoire");
        }
        OffreEmploi o = offreRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Offre introuvable"));
        o.setStatut(statut);
        OffreEmploi saved = offreRepository.save(o);
        auditService.log(acteur, "STATUT_OFFRE",
                "Offre « " + saved.getTitre() + " » → " + statut);
        return toOffreDto(saved);
    }

    @Transactional
    public void supprimerOffre(Long id, String acteur) {
        OffreEmploi o = offreRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Offre introuvable"));
        candidatureRepository.deleteByOffreId(id);
        offreRepository.delete(o);
        auditService.log(acteur, "SUPPRESSION_OFFRE", "Offre « " + o.getTitre() + " » supprimée");
    }

    private OffreEmploiDto toOffreDto(OffreEmploi o) {
        List<Candidature> cands = candidatureRepository.findByOffreIdOrderByDateCreationDesc(o.getId());
        Map<String, Long> parEtape = new LinkedHashMap<>();
        for (String etape : ETAPES) {
            parEtape.put(etape, cands.stream().filter(c -> etape.equals(c.getEtape())).count());
        }
        return new OffreEmploiDto(o.getId(), o.getTitre(), o.getDepartement(), o.getTypeContrat(),
                o.getNiveau(), o.getMode(), o.getStatut(), o.getDatePublication(),
                cands.size(), parEtape);
    }

    // ---------------- Candidatures ----------------

    @Transactional(readOnly = true)
    public List<CandidatureResponse> candidaturesParOffre(Long offreId) {
        return candidatureRepository.findByOffreIdOrderByDateCreationDesc(offreId)
                .stream().map(this::toCandidatureResponse).toList();
    }

    @Transactional(readOnly = true)
    public CandidatureResponse detailCandidature(Long id) {
        return toCandidatureResponse(candidatureRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Candidature introuvable")));
    }

    @Transactional
    public CandidatureResponse ajouterCandidat(CandidatRequest req, MultipartFile cv, MultipartFile lettre, String acteur) {
        OffreEmploi offre = offreRepository.findById(req.offreId())
                .orElseThrow(() -> new BusinessException("Offre introuvable"));
        Candidat candidat = candidatRepository.findByEmailIgnoreCase(req.email())
                .orElseGet(() -> {
                    Candidat c = new Candidat();
                    c.setNom(req.nom());
                    c.setPrenom(req.prenom());
                    c.setEmail(req.email());
                    c.setTelephone(req.telephone());
                    c.setLinkedin(req.linkedin());
                    return candidatRepository.save(c);
                });

        Candidature c = new Candidature();
        c.setOffre(offre);
        c.setCandidat(candidat);
        c.setEtape("BOITE_RECEPTION");
        c.setDateCreation(LocalDateTime.now());
        c.getHistorique().add(horodatage() + " - Candidature reçue pour « " + offre.getTitre() + " »");
        if (cv != null && !cv.isEmpty()) {
            candidat.setCvUrl(sauvegarderFichier(cv, "cv"));
        }
        if (lettre != null && !lettre.isEmpty()) {
            candidat.setLettreMotivationUrl(sauvegarderFichier(lettre, "lettre"));
        }
        candidatRepository.save(candidat);
        Candidature saved = candidatureRepository.save(c);

        notificationService.notifierParRole(RoleType.RESPONSABLE_RH,
                "Nouvelle candidature : " + candidat.getNomComplet() + " pour « " + offre.getTitre() + " »",
                "CANDIDATURE_RECUE");
        auditService.log(acteur, "CANDIDATURE", "Candidature de " + candidat.getNomComplet() + " (" + offre.getTitre() + ")");
        return toCandidatureResponse(saved);
    }

    // ---------------- Candidats ----------------

    @Transactional(readOnly = true)
    public List<CandidatResponse> candidats() {
        return candidatRepository.findAllByOrderByNomAscPrenomAsc()
                .stream().map(this::toCandidatResponse).toList();
    }

    @Transactional
    public CandidatResponse modifierCandidat(Long id, CandidatUpdateRequest req, String acteur) {
        Candidat candidat = candidatRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Candidat introuvable"));
        candidatRepository.findByEmailIgnoreCase(req.email())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new BusinessException("Un candidat existe déjà avec l'email " + req.email());
                });
        candidat.setNom(req.nom());
        candidat.setPrenom(req.prenom());
        candidat.setEmail(req.email());
        candidat.setTelephone(req.telephone());
        candidat.setLinkedin(req.linkedin());
        Candidat saved = candidatRepository.save(candidat);
        auditService.log(acteur, "CANDIDAT", "Candidat « " + saved.getNomComplet() + " » modifié");
        return toCandidatResponse(saved);
    }

    @Transactional
    public void supprimerCandidat(Long id, String acteur) {
        Candidat candidat = candidatRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Candidat introuvable"));
        candidatureRepository.deleteByCandidatId(id);
        candidatRepository.delete(candidat);
        auditService.log(acteur, "CANDIDAT", "Candidat « " + candidat.getNomComplet() + " » supprimé");
    }

    @Transactional
    public void supprimerCandidature(Long id, String acteur) {
        Candidature c = candidatureRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Candidature introuvable"));
        candidatureRepository.delete(c);
        auditService.log(acteur, "CANDIDATURE", "Candidature #" + id + " supprimée");
    }

    @Transactional
    public CandidatureResponse changerEtape(Long id, String etape, String acteur) {
        if (!ETAPES.contains(etape)) {
            throw new BusinessException("Étape kanban invalide");
        }
        Candidature c = candidatureRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Candidature introuvable"));
        if (!c.getEtape().equals(etape)) {
            c.setEtape(etape);
            c.getHistorique().add(horodatage() + " - Passage en « " + libelleEtape(etape) + " » par " + acteur);
            if ("EMBAUCHE".equals(etape)) {
                c.getHistorique().add(horodatage() + " - Candidat embauché");
            }
            candidatureRepository.save(c);
            auditService.log(acteur, "CANDIDATURE", "Candidature #" + id + " → " + libelleEtape(etape));
        }
        return toCandidatureResponse(c);
    }

    @Transactional
    public CandidatureResponse planifierEntretien(Long id, LocalDateTime date, String acteur) {
        Candidature c = candidatureRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Candidature introuvable"));
        c.setDateEntretien(date);
        if ("BOITE_RECEPTION".equals(c.getEtape())) {
            c.setEtape("ENTRETIEN_TEL");
        }
        c.getHistorique().add(horodatage() + " - Entretien planifié le "
                + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        candidatureRepository.save(c);
        notificationService.notifierParRole(RoleType.RESPONSABLE_RH,
                "Entretien planifié : " + c.getCandidat().getNomComplet()
                        + " (« " + c.getOffre().getTitre() + " ») le " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")),
                "ENTRETIEN_PLANIFIE");
        auditService.log(acteur, "ENTRETIEN", "Entretien planifié pour " + c.getCandidat().getNomComplet());
        return toCandidatureResponse(c);
    }

    @Transactional
    public CandidatureResponse embaucher(Long id, String acteur) {
        Candidature c = candidatureRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Candidature introuvable"));
        Candidat candidat = c.getCandidat();

        if (employeRepository.existsByEmail(candidat.getEmail())) {
            throw new BusinessException("Un employé existe déjà avec l'email " + candidat.getEmail());
        }

        Employe e = new Employe();
        e.setMatricule("GNS-R" + String.format("%03d", 100 + employeRepository.count()));
        e.setNom(candidat.getNom());
        e.setPrenom(candidat.getPrenom());
        e.setEmail(candidat.getEmail());
        e.setTelephone(candidat.getTelephone());
        e.setDateEmbauche(LocalDate.now());
        e.setStatut(StatutEmploye.ACTIF);
        e.setNationalite("Marocaine");
        e.setAdresse("Casablanca, Maroc");
        if (c.getOffre().getDepartement() != null) {
            departementRepository.findByNomIgnoreCase(c.getOffre().getDepartement())
                    .ifPresent(e::setDepartement);
        }
        employeRepository.save(e);

        c.setEtape("EMBAUCHE");
        c.getHistorique().add(horodatage() + " - Fiche employé créée (matricule " + e.getMatricule() + ")");
        candidatureRepository.save(c);
        auditService.log(acteur, "EMBAUCHE", candidat.getNomComplet() + " embauché (" + e.getMatricule() + ")");
        return toCandidatureResponse(c);
    }

    // ---------------- Fichiers ----------------

    public byte[] lireFichier(String dossier, String nomFichier) {
        try {
            return Files.readAllBytes(uploadDir.resolve(dossier).resolve(nomFichier));
        } catch (IOException ex) {
            throw new BusinessException("Fichier introuvable");
        }
    }

    private String sauvegarderFichier(MultipartFile fichier, String dossier) {
        try {
            Files.createDirectories(uploadDir.resolve(dossier));
            String nomNettoye = fichier.getOriginalFilename() == null ? "fichier"
                    : fichier.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
            String nomStocke = System.currentTimeMillis() + "_" + nomNettoye;
            Files.copy(fichier.getInputStream(), uploadDir.resolve(dossier).resolve(nomStocke),
                    StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/recrutement/" + dossier + "/" + nomStocke;
        } catch (IOException ex) {
            throw new BusinessException("Impossible d'enregistrer le fichier");
        }
    }

    public String nomFichierFichier(String url) {
        return url != null ? url.substring(url.lastIndexOf('/') + 1) : null;
    }

    private String horodatage() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    private String libelleEtape(String etape) {
        return switch (etape) {
            case "BOITE_RECEPTION" -> "Boîte réception";
            case "BROUILLON" -> "Brouillon";
            case "ENTRETIEN_TEL" -> "Entretien téléphonique";
            case "ENTRETIEN_PHYSIQUE" -> "Entretien physique";
            case "EMBAUCHE" -> "Embauché";
            default -> etape;
        };
    }

    private CandidatureResponse toCandidatureResponse(Candidature c) {
        Candidat k = c.getCandidat();
        // Matérialisation de l'historique DANS la transaction (open-in-view désactivé)
        List<String> historique = new ArrayList<>(c.getHistorique());
        return new CandidatureResponse(
                c.getId(), c.getOffre().getId(), c.getOffre().getTitre(),
                k.getId(), k.getNom(), k.getPrenom(), k.getNomComplet(), k.getInitiales(),
                k.getEmail(), k.getTelephone(), k.getLinkedin(),
                c.getEtape(), c.getDateEntretien(), c.getDateCreation(),
                k.getCvUrl() != null, k.getCvUrl() != null ? nomFichierFichier(k.getCvUrl()) : null,
                k.getLettreMotivationUrl() != null, historique);
    }

    private CandidatResponse toCandidatResponse(Candidat k) {
        List<Candidature> cands = candidatureRepository.findByCandidatIdOrderByDateCreationDesc(k.getId());
        String offres = cands.stream()
                .map(c -> c.getOffre().getTitre())
                .distinct()
                .reduce((a, b) -> a + ", " + b)
                .orElse("");
        return new CandidatResponse(
                k.getId(), k.getNom(), k.getPrenom(), k.getNomComplet(), k.getInitiales(),
                k.getEmail(), k.getTelephone(), k.getLinkedin(),
                k.getCvUrl() != null, k.getCvUrl() != null ? nomFichierFichier(k.getCvUrl()) : null,
                k.getLettreMotivationUrl() != null, cands.size(), offres);
    }
}
