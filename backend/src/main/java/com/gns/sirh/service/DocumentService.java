package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.DemandeDocumentRequest;
import com.gns.sirh.dto.DemandeDocumentResponse;
import com.gns.sirh.dto.IdLabelDto;
import com.gns.sirh.dto.StatsDocuments;
import com.gns.sirh.entity.*;
import com.gns.sirh.repository.DemandeDocumentRepository;
import com.gns.sirh.repository.DocumentTypeRepository;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.security.AuthUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentService {

    private final DemandeDocumentRepository demandeRepository;
    private final DocumentTypeRepository typeRepository;
    private final EmployeRepository employeRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final Path uploadDir;

    public DocumentService(DemandeDocumentRepository demandeRepository,
                           DocumentTypeRepository typeRepository,
                           EmployeRepository employeRepository,
                           NotificationService notificationService,
                           AuditService auditService,
                           @Value("${app.upload-dir}") String uploadDir) {
        this.demandeRepository = demandeRepository;
        this.typeRepository = typeRepository;
        this.employeRepository = employeRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.uploadDir = Paths.get(uploadDir).resolve("documents");
    }

    @Transactional(readOnly = true)
    public List<IdLabelDto> types() {
        return typeRepository.findAllByOrderByNomAsc()
                .stream().map(t -> new IdLabelDto(t.getId(), t.getNom())).toList();
    }

    @Transactional
    public DemandeDocumentResponse creerDemande(AuthUser user, DemandeDocumentRequest req) {
        Long employeId = user.employeId();
        if (employeId == null) {
            throw new BusinessException("Aucun employé lié à votre compte");
        }
        Employe employe = employeRepository.findById(employeId)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        DocumentType type = typeRepository.findById(req.typeDocumentId())
                .orElseThrow(() -> new BusinessException("Type de document introuvable"));
        String format = "DIGITAL".equalsIgnoreCase(req.format()) ? "DIGITAL" : "PAPIER";

        DemandeDocument d = new DemandeDocument();
        d.setEmploye(employe);
        d.setTypeDocument(type);
        d.setFormat(format);
        d.setRemarque(req.remarque());
        d.setDateDemande(LocalDateTime.now());
        d.setStatut("EN_TRAITEMENT");
        d.setReference("DOC-" + LocalDate.now().getYear() + "-" + String.format("%05d", demandeRepository.count() + 1));
        DemandeDocument saved = demandeRepository.save(d);

        notificationService.notifierParRole(RoleType.RESPONSABLE_RH,
                "Nouvelle demande de document : " + type.getNom() + " (" + employe.getNomComplet() + ")",
                "DOCUMENT_DEMANDE");
        auditService.log(user.email(), "DEMANDE_DOCUMENT", "Demande " + saved.getReference() + " créée");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DemandeDocumentResponse> mesDemandes(Long employeId) {
        return demandeRepository.findByEmployeIdOrderByDateDemandeDesc(employeId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<DemandeDocumentResponse> listeRH() {
        return demandeRepository.findAllByOrderByDateDemandeDesc()
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public StatsDocuments stats() {
        return new StatsDocuments(demandeRepository.count(),
                demandeRepository.countByStatut("EN_TRAITEMENT"));
    }

    @Transactional
    public DemandeDocumentResponse traiter(Long id, String acteur) {
        DemandeDocument d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (!"EN_TRAITEMENT".equals(d.getStatut())) {
            throw new BusinessException("Seules les demandes en traitement peuvent être traitées");
        }
        Employe e = d.getEmploye();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        // Informations d'identification (bloc administratif du PDF)
        List<String[]> infos = new ArrayList<>();
        infos.add(new String[]{"Délivré à", e.getNomComplet()});
        infos.add(new String[]{"Matricule", e.getMatricule() != null ? e.getMatricule() : "—"});
        infos.add(new String[]{"Poste", e.getPoste() != null ? e.getPoste().getNom() : "—"});
        if (e.getDepartement() != null) {
            infos.add(new String[]{"Département", e.getDepartement().getNom()});
        }
        infos.add(new String[]{"Date d'embauche", e.getDateEmbauche() != null
                ? e.getDateEmbauche().format(fmt) : "—"});
        infos.add(new String[]{"Format demandé", "DIGITAL".equals(d.getFormat()) ? "Numérique" : "Papier"});

        List<String> lignes = List.of(
                "Nous soussignés, GNS Technologies, attestons que :",
                "",
                e.getNomComplet() + ", matricule " + e.getMatricule() + ",",
                "titulaire du poste de " + (e.getPoste() != null ? e.getPoste().getNom() : "—")
                        + " au sein du département " + (e.getDepartement() != null ? e.getDepartement().getNom() : "—") + ",",
                "est employé(e) par la société depuis le "
                        + (e.getDateEmbauche() != null ? e.getDateEmbauche().format(fmt) : "—") + ".",
                "",
                "La présente attestation " + (d.getTypeDocument().getDescription() != null
                        ? d.getTypeDocument().getDescription() : "est délivrée à la demande de l'intéressé(e)")
                        + " et ne vaut que pour l'usage auquel elle est destinée."
        );
        String titre = d.getTypeDocument().getNom();
        String pied = "Fait à Casablanca, le " + LocalDate.now().format(fmt) + " · GNS TECHNOLOGIES";
        String dateSignature = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm"));
        if (d.getRemarque() != null && !d.getRemarque().isBlank()) {
            lignes = new ArrayList<>(lignes);
            lignes.add("");
            lignes.add("Remarque du demandeur : « " + d.getRemarque() + " »");
        }

        byte[] pdf = PdfGenerator.generate(new PdfGenerator.DonneesDocument(
                "GNS TECHNOLOGIES",
                "Direction des Ressources Humaines",
                "Siège : Casablanca, Maroc · contact@gns.ma · +212 5 22 00 00 00",
                titre, d.getReference(),
                LocalDate.now().format(fmt),
                infos, lignes, null, pied, acteur, dateSignature, e.getNomComplet()));
        String nomFichier = d.getReference() + ".pdf";
        try {
            Files.createDirectories(uploadDir);
            Files.write(uploadDir.resolve(nomFichier), pdf);
        } catch (IOException ex) {
            throw new BusinessException("Impossible de générer le document");
        }

        d.setStatut("DISPONIBLE");
        d.setFichierUrl("/uploads/documents/" + nomFichier);
        d.setDateTraitement(LocalDateTime.now());
        d.setSignataire(acteur);
        d.setDateSignature(LocalDateTime.now());
        DemandeDocument saved = demandeRepository.save(d);

        notificationService.notifier(e,
                "Votre document « " + d.getTypeDocument().getNom() + " » (" + saved.getReference() + ") est disponible",
                "DOCUMENT_DISPONIBLE");
        auditService.log(acteur, "TRAITEMENT_DOCUMENT", "Document " + saved.getReference() + " généré");
        return toResponse(saved);
    }

    @Transactional
    public DemandeDocumentResponse refuser(Long id, String motif, String acteur) {
        if (motif == null || motif.isBlank()) {
            throw new BusinessException("Le motif de refus est obligatoire");
        }
        DemandeDocument d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (!"EN_TRAITEMENT".equals(d.getStatut())) {
            throw new BusinessException("Seules les demandes en traitement peuvent être refusées");
        }
        d.setStatut("REFUSE");
        d.setMotifRefus(motif);
        d.setDateTraitement(LocalDateTime.now());
        DemandeDocument saved = demandeRepository.save(d);

        notificationService.notifier(d.getEmploye(),
                "Votre demande de document « " + d.getTypeDocument().getNom() + " » a été refusée : " + motif,
                "DOCUMENT_REFUSE");
        auditService.log(acteur, "REFUS_DOCUMENT", "Demande " + saved.getReference() + " refusée");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public DemandeDocument verifierAcces(Long id, AuthUser user) {
        DemandeDocument d = demandeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Demande introuvable"));
        if (!user.isRh() && !d.getEmploye().getId().equals(user.employeId())) {
            throw new BusinessException("Vous n'avez pas accès à cette demande");
        }
        return d;
    }

    @Transactional(readOnly = true)
    public byte[] lireFichier(DemandeDocument d) {
        if (d.getFichierUrl() == null) {
            throw new BusinessException("Document pas encore disponible");
        }
        String nomFichier = d.getReference() + ".pdf";
        // Chemins candidats : emplacement canonique puis anciens emplacements (compatibilité données existantes)
        List<Path> candidats = List.of(
                uploadDir.resolve(nomFichier),                    // ./uploads/justificatifs/documents/
                Paths.get("uploads", "justificatifs", "documents").resolve(nomFichier),
                Paths.get("uploads", "documents").resolve(nomFichier),
                Paths.get("uploads").resolve(nomFichier));
        for (Path p : candidats) {
            try {
                if (Files.exists(p)) {
                    return Files.readAllBytes(p);
                }
            } catch (IOException ignored) {
                // essai du chemin suivant
            }
        }
        throw new BusinessException("Fichier introuvable sur le serveur");
    }

    public String nomFichier(DemandeDocument d) {
        return d.getReference() + ".pdf";
    }

    /* ---------------------------------------------------------------- */
    /* Export Excel (XLSX) des demandes de documents                     */
    /* ---------------------------------------------------------------- */

    private static final DateTimeFormatter FORMAT_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String[] COLONNES_EXPORT = {
            "Référence", "Collaborateur", "Département", "Type de document", "Format",
            "Date de demande", "Statut", "Motif de refus", "Remarque", "Signataire", "Date de signature"
    };

    private static String statutLibelle(String statut) {
        return switch (statut == null ? "" : statut) {
            case "DISPONIBLE" -> "Traité";
            case "REFUSE" -> "Refusé";
            case "EN_TRAITEMENT" -> "À traiter";
            default -> statut;
        };
    }

    /**
     * Construit un classeur XLSX professionnel listant les demandes de documents
     * (toutes pour la RH, les siennes pour un collaborateur).
     */
    @Transactional(readOnly = true)
    public byte[] exporterExcel(AuthUser user) throws IOException {
        List<DemandeDocument> demandes = user.isRh()
                ? demandeRepository.findAllByOrderByDateDemandeDesc()
                : demandeRepository.findByEmployeIdOrderByDateDemandeDesc(user.employeId());

        String[] enTetes = COLONNES_EXPORT;
        List<String[]> lignes = new ArrayList<>();
        for (DemandeDocument d : demandes) {
            lignes.add(new String[]{
                    d.getReference(),
                    d.getEmploye().getNomComplet(),
                    d.getEmploye().getDepartement() != null ? d.getEmploye().getDepartement().getNom() : "",
                    d.getTypeDocument().getNom(),
                    "DIGITAL".equals(d.getFormat()) ? "Digital" : "Papier",
                    d.getDateDemande() != null ? d.getDateDemande().format(FORMAT_DATE) : "",
                    statutLibelle(d.getStatut()),
                    d.getMotifRefus() != null ? d.getMotifRefus() : "",
                    d.getRemarque() != null ? d.getRemarque() : "",
                    d.getSignataire() != null ? d.getSignataire() : "",
                    d.getDateSignature() != null ? d.getDateSignature().format(FORMAT_DATE) : ""
            });
        }
        // Largeurs en caractères : lisibilité des colonnes longues
        Integer[] largeurs = {15, 24, 16, 22, 10, 14, 12, 22, 26, 20, 14};
        String vue = user.isRh() ? "vue RH" : "espace collaborateur";
        return ExcelExporter.generer("GNS TECHNOLOGIES — Demandes de documents",
                "Export généré le " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm")),
                user.email(), vue, enTetes, lignes, "Demandes de documents", largeurs, null);
    }

    /* ---------------------------------------------------------------- */
    /* Export PDF (rapport administratif des demandes)                   */
    /* ---------------------------------------------------------------- */

    /**
     * Génère un PDF administratif professionnel listant les demandes de documents
     * (toutes pour la RH, les siennes pour un collaborateur) : en-tête société,
     * titre officiel, bloc d'informations, tableau à en-têtes répétés,
     * zone de signature et cachet, pagination.
     */
    @Transactional(readOnly = true)
    public byte[] exporterPdf(AuthUser user) {
        List<DemandeDocument> demandes = user.isRh()
                ? demandeRepository.findAllByOrderByDateDemandeDesc()
                : demandeRepository.findByEmployeIdOrderByDateDemandeDesc(user.employeId());

        // Tableau de données : [0] = en-têtes, puis lignes
        String[][] tableau = new String[demandes.size() + 1][];
        tableau[0] = new String[]{"Référence", "Collaborateur", "Département", "Type de document",
                "Format", "Date de demande", "Statut"};
        int idx = 1;
        for (DemandeDocument d : demandes) {
            tableau[idx++] = new String[]{
                    d.getReference(),
                    d.getEmploye().getNomComplet(),
                    d.getEmploye().getDepartement() != null ? d.getEmploye().getDepartement().getNom() : "—",
                    d.getTypeDocument().getNom(),
                    "DIGITAL".equals(d.getFormat()) ? "Digital" : "Papier",
                    d.getDateDemande() != null ? d.getDateDemande().format(FORMAT_DATE) : "",
                    statutLibelle(d.getStatut())
            };
        }

        List<String[]> infos = List.of(
                new String[]{"Service émetteur", "Direction des Ressources Humaines"},
                new String[]{"Période", "Toutes les demandes enregistrées"},
                new String[]{"Généré par", user.email()},
                new String[]{"Nombre de demandes", String.valueOf(demandes.size())});

        String reference = "RPT-DOC-" + LocalDate.now() + "-" + String.format("%03d", demandeRepository.count() % 1000);
        String dateEmission = LocalDate.now().format(FORMAT_DATE);
        List<String> corps = List.of(
                "Le présent rapport récapitule l'ensemble des demandes de documents enregistrées dans le "
                        + "système d'information des ressources humaines de GNS Technologies.",
                "Les statuts sont définis comme suit : « À traiter » (demande en cours de traitement par la DRH), "
                        + "« Traité » (document généré et disponible) et « Refusé » (demande rejetée avec motif).");

        String pied = "Fait à Casablanca, le " + dateEmission + " · GNS TECHNOLOGIES";

        return PdfGenerator.generate(new PdfGenerator.DonneesDocument(
                "GNS TECHNOLOGIES",
                "Direction des Ressources Humaines",
                "Siège : Casablanca, Maroc · contact@gns.ma · +212 5 22 00 00 00",
                "RAPPORT DES DEMANDES DE DOCUMENTS",
                reference, dateEmission,
                infos, corps, tableau, pied, user.email(), dateEmission, null));
    }


    private DemandeDocumentResponse toResponse(DemandeDocument d) {
        return new DemandeDocumentResponse(
                d.getId(),
                d.getReference(),
                d.getEmploye().getId(),
                d.getEmploye().getNomComplet(),
                d.getEmploye().getInitiales(),
                d.getEmploye().getDepartement() != null ? d.getEmploye().getDepartement().getNom() : null,
                d.getTypeDocument().getId(),
                d.getTypeDocument().getNom(),
                d.getFormat(),
                d.getDateDemande(),
                d.getStatut(),
                d.getMotifRefus(),
                d.getRemarque(),
                d.getFichierUrl() != null,
                d.getFichierUrl() != null ? d.getReference() + ".pdf" : null,
                d.getSignataire(),
                d.getDateSignature()
        );
    }
}
