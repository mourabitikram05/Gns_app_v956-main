package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.NoteFraisRequest;
import com.gns.sirh.dto.NoteFraisResponse;
import com.gns.sirh.dto.SyntheseFrais;
import com.gns.sirh.entity.*;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.repository.NoteFraisRepository;
import com.gns.sirh.repository.RemboursementRepository;
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
import java.util.ArrayList;
import java.util.List;

@Service
public class FraisService {

    private final NoteFraisRepository noteRepository;
    private final RemboursementRepository remboursementRepository;
    private final EmployeRepository employeRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final Path uploadDir;

    public FraisService(NoteFraisRepository noteRepository,
                        RemboursementRepository remboursementRepository,
                        EmployeRepository employeRepository,
                        NotificationService notificationService,
                        AuditService auditService,
                        @Value("${app.upload-dir}") String uploadDir) {
        this.noteRepository = noteRepository;
        this.remboursementRepository = remboursementRepository;
        this.employeRepository = employeRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.uploadDir = Paths.get(uploadDir).resolve("frais");
    }

    // ---------------- Collaborateur ----------------

    @Transactional(readOnly = true)
    public SyntheseFrais synthese(Long employeId) {
        List<NoteFrais> notes = noteRepository.findByEmployeIdOrderByDateCreationDesc(employeId);
        return new SyntheseFrais(
                synthese(notes, "EN_ATTENTE"),
                synthese(notes, "EN_COURS"),
                synthese(notes, "REMBOURSEE"),
                synthese(notes, "REFUSEE"));
    }

    private SyntheseFrais.Carte synthese(List<NoteFrais> notes, String statut) {
        int count = 0;
        double montant = 0;
        for (NoteFrais n : notes) {
            if (statut.equals(n.getStatut())) {
                count++;
                montant += n.getMontantTotal();
            }
        }
        return new SyntheseFrais.Carte(count, Math.round(montant * 100.0) / 100.0);
    }

    @Transactional(readOnly = true)
    public List<NoteFraisResponse> mesNotes(Long employeId) {
        return noteRepository.findByEmployeIdOrderByDateCreationDesc(employeId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public NoteFraisResponse creer(AuthUser user, NoteFraisRequest req, List<MultipartFile> fichiers) {
        Long employeId = user.employeId();
        if (employeId == null) {
            throw new BusinessException("Aucun employé lié à votre compte");
        }
        Employe employe = employeRepository.findById(employeId)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));

        NoteFrais n = new NoteFrais();
        n.setEmploye(employe);
        n.setTitre(req.titre());
        n.setDevise(req.devise() == null || req.devise().isBlank() ? "MAD" : req.devise());
        n.setDate(req.date());
        n.setPriorite(req.priorite() == null || req.priorite().isBlank() ? "Normale" : req.priorite());
        n.setRemarque(req.remarque());
        n.setMontantTotal(req.montantTotal() != null ? req.montantTotal() : 0);
        n.setStatut("EN_ATTENTE");
        n.setDateCreation(LocalDateTime.now());
        n.setReference("NF-" + LocalDate.now().getYear() + "-" + String.format("%05d", noteRepository.count() + 1));

        if (req.depenses() != null) {
            for (NoteFraisRequest.DepenseRequest dr : req.depenses()) {
                if (dr.libelle() == null || dr.libelle().isBlank()) {
                    continue;
                }
                Depense d = new Depense();
                d.setNoteFrais(n);
                d.setLibelle(dr.libelle());
                d.setMontant(dr.montant() != null ? dr.montant() : 0);
                n.getDepenses().add(d);
            }
        }
        if (fichiers != null) {
            for (MultipartFile f : fichiers) {
                if (f != null && !f.isEmpty()) {
                    Justificatif j = new Justificatif();
                    j.setNoteFrais(n);
                    j.setFichierUrl(sauvegarderFichier(f));
                    j.setNomOriginal(f.getOriginalFilename());
                    n.getJustificatifs().add(j);
                }
            }
        }

        NoteFrais saved = noteRepository.save(n);
        notificationService.notifierParRole(RoleType.RESPONSABLE_RH,
                "Nouvelle note de frais : " + n.getTitre() + " (" + employe.getNomComplet() + ", "
                        + Math.round(n.getMontantTotal()) + " " + n.getDevise() + ")",
                "FRAIS_SOUMIS");
        auditService.log(user.email(), "NOTE_FRAIS", "Note " + saved.getReference() + " créée");
        return toResponse(saved);
    }

    @Transactional
    public NoteFraisResponse modifier(Long id, AuthUser user, NoteFraisRequest req, List<MultipartFile> fichiers) {
        NoteFrais n = verifierAttenteProprietaire(id, user);
        n.setTitre(req.titre());
        n.setDevise(req.devise() == null || req.devise().isBlank() ? "MAD" : req.devise());
        n.setDate(req.date());
        n.setPriorite(req.priorite() == null || req.priorite().isBlank() ? "Normale" : req.priorite());
        n.setRemarque(req.remarque());
        n.setMontantTotal(req.montantTotal() != null ? req.montantTotal() : 0);
        n.getDepenses().clear();
        if (req.depenses() != null) {
            for (NoteFraisRequest.DepenseRequest dr : req.depenses()) {
                if (dr.libelle() == null || dr.libelle().isBlank()) {
                    continue;
                }
                Depense d = new Depense();
                d.setNoteFrais(n);
                d.setLibelle(dr.libelle());
                d.setMontant(dr.montant() != null ? dr.montant() : 0);
                n.getDepenses().add(d);
            }
        }
        if (fichiers != null) {
            for (MultipartFile f : fichiers) {
                if (f != null && !f.isEmpty()) {
                    Justificatif j = new Justificatif();
                    j.setNoteFrais(n);
                    j.setFichierUrl(sauvegarderFichier(f));
                    j.setNomOriginal(f.getOriginalFilename());
                    n.getJustificatifs().add(j);
                }
            }
        }
        NoteFrais saved = noteRepository.save(n);
        auditService.log(user.email(), "NOTE_FRAIS", "Note " + saved.getReference() + " modifiée");
        return toResponse(saved);
    }

    @Transactional
    public NoteFraisResponse annuler(Long id, AuthUser user) {
        NoteFrais n = verifierAttenteProprietaire(id, user);
        n.setStatut("ANNULEE");
        n.setDateTraitement(LocalDateTime.now());
        NoteFrais saved = noteRepository.save(n);
        notificationService.notifierParRole(RoleType.RESPONSABLE_RH,
                "Note de frais annulée par le collaborateur : " + n.getReference(), "FRAIS_ANNULE");
        auditService.log(user.email(), "NOTE_FRAIS", "Note " + saved.getReference() + " annulée");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public NoteFraisResponse detail(Long id, AuthUser user) {
        NoteFrais n = noteRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Note introuvable"));
        if (!user.isRh() && !n.getEmploye().getId().equals(user.employeId())) {
            throw new BusinessException("Vous n'avez pas accès à cette note");
        }
        return toResponse(n);
    }

    // ---------------- RH ----------------

    @Transactional(readOnly = true)
    public List<NoteFraisResponse> toutes(String q, String statut, String debut, String fin) {
        LocalDate d = debut != null && !debut.isBlank() ? LocalDate.parse(debut) : null;
        LocalDate f = fin != null && !fin.isBlank() ? LocalDate.parse(fin) : null;
        return noteRepository.rechercher(q, statut, d, f)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public NoteFraisResponse valider(Long id, String acteur) {
        NoteFrais n = noteRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Note introuvable"));
        if (!"EN_ATTENTE".equals(n.getStatut())) {
            throw new BusinessException("Seules les notes en attente peuvent être validées");
        }
        n.setStatut("EN_COURS");
        n.setDateTraitement(LocalDateTime.now());
        noteRepository.save(n);

        Remboursement r = new Remboursement();
        r.setNoteFrais(n);
        r.setMontant(n.getMontantTotal());
        r.setDateRemboursement(LocalDateTime.now());
        remboursementRepository.save(r);

        notificationService.notifier(n.getEmploye(),
                "Votre note de frais « " + n.getTitre() + " » (" + n.getReference() + ") est en cours de remboursement",
                "FRAIS_EN_COURS");
        auditService.log(acteur, "VALIDATION_FRAIS", "Note " + n.getReference() + " validée");
        return toResponse(n);
    }

    @Transactional
    public NoteFraisResponse rembourser(Long id, String acteur) {
        NoteFrais n = noteRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Note introuvable"));
        if (!"EN_COURS".equals(n.getStatut())) {
            throw new BusinessException("Seules les notes en cours peuvent être marquées remboursées");
        }
        n.setStatut("REMBOURSEE");
        n.setDateTraitement(LocalDateTime.now());
        noteRepository.save(n);
        notificationService.notifier(n.getEmploye(),
                "Votre note de frais « " + n.getTitre() + " » a été remboursée ("
                        + Math.round(n.getMontantTotal()) + " " + n.getDevise() + ")",
                "FRAIS_REMBOURSE");
        auditService.log(acteur, "REMBOURSEMENT_FRAIS", "Note " + n.getReference() + " remboursée");
        return toResponse(n);
    }

    @Transactional
    public NoteFraisResponse refuser(Long id, String motif, String acteur) {
        if (motif == null || motif.isBlank()) {
            throw new BusinessException("Le motif de refus est obligatoire");
        }
        NoteFrais n = noteRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Note introuvable"));
        if (!"EN_ATTENTE".equals(n.getStatut())) {
            throw new BusinessException("Seules les notes en attente peuvent être refusées");
        }
        n.setStatut("REFUSEE");
        n.setMotifRefus(motif);
        n.setDateTraitement(LocalDateTime.now());
        noteRepository.save(n);
        notificationService.notifier(n.getEmploye(),
                "Votre note de frais « " + n.getTitre() + " » a été refusée : " + motif, "FRAIS_REFUSE");
        auditService.log(acteur, "REFUS_FRAIS", "Note " + n.getReference() + " refusée");
        return toResponse(n);
    }

    // ---------------- Utilitaires ----------------

    private NoteFrais verifierAttenteProprietaire(Long id, AuthUser user) {
        NoteFrais n = noteRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Note introuvable"));
        if (!"EN_ATTENTE".equals(n.getStatut())) {
            throw new BusinessException("Seules les notes en attente peuvent être modifiées");
        }
        if (!n.getEmploye().getId().equals(user.employeId())) {
            throw new BusinessException("Vous ne pouvez pas modifier la note d'un autre collaborateur");
        }
        return n;
    }

    private String sauvegarderFichier(MultipartFile fichier) {
        try {
            Files.createDirectories(uploadDir);
            String nomNettoye = fichier.getOriginalFilename() == null ? "fichier"
                    : fichier.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
            String nomStocke = System.currentTimeMillis() + "_" + nomNettoye;
            Files.copy(fichier.getInputStream(), uploadDir.resolve(nomStocke), StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/frais/" + nomStocke;
        } catch (IOException ex) {
            throw new BusinessException("Impossible d'enregistrer le justificatif");
        }
    }



    public byte[] lireJustificatif(String nomFichier) {
        Path baseDir = uploadDir.toAbsolutePath().normalize();
        Path fichier = baseDir.resolve(nomFichier).normalize();
        if (!fichier.startsWith(baseDir)) {
            throw new BusinessException("Nom de fichier invalide");
        }
        if (!Files.exists(fichier)) {
            throw new BusinessException("Fichier introuvable");
        }
        try {
            return Files.readAllBytes(fichier);
        } catch (IOException ex) {
            throw new BusinessException("Fichier introuvable");
        }
    }

    // public byte[] lireJustificatif(String nomFichier) {
    //     try {
    //         return Files.readAllBytes(uploadDir.resolve(nomFichier));
    //     } catch (IOException ex) {
    //         throw new BusinessException("Fichier introuvable");
    //     }
    // }

    private NoteFraisResponse toResponse(NoteFrais n) {
        List<String> depenses = new ArrayList<>();
        for (Depense d : n.getDepenses()) {
            depenses.add(d.getLibelle() + " · " + Math.round(d.getMontant()));
        }
        List<String> justifs = n.getJustificatifs().stream()
                .map(Justificatif::getFichierUrl)
                .toList();
        return new NoteFraisResponse(
                n.getId(), n.getReference(),
                n.getEmploye().getId(), n.getEmploye().getNomComplet(), n.getEmploye().getInitiales(),
                n.getEmploye().getDepartement() != null ? n.getEmploye().getDepartement().getNom() : null,
                n.getTitre(), n.getDevise(), n.getDate(), n.getPriorite(), n.getRemarque(),
                n.getMontantTotal(), n.getStatut(), n.getMotifRefus(), n.getDateCreation(),
                n.getDepenses().size(), depenses, justifs);
    }
}
