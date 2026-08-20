package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.UtilisateurDto;
import com.gns.sirh.dto.UtilisateurRequest;
import com.gns.sirh.dto.UtilisateurUpdateRequest;
import com.gns.sirh.entity.Employe;
import com.gns.sirh.entity.RoleType;
import com.gns.sirh.entity.Utilisateur;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.repository.UtilisateurRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SecuriteService {

    private final UtilisateurRepository utilisateurRepository;
    private final EmployeRepository employeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public SecuriteService(UtilisateurRepository utilisateurRepository,
                           EmployeRepository employeRepository,
                           PasswordEncoder passwordEncoder,
                           AuditService auditService,
                           NotificationService notificationService) {
        this.utilisateurRepository = utilisateurRepository;
        this.employeRepository = employeRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<UtilisateurDto> lister() {
        return utilisateurRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public UtilisateurDto creer(UtilisateurRequest req, String acteur) {
        if (utilisateurRepository.existsByEmail(req.email())) {
            throw new BusinessException("Un compte existe déjà avec cet email");
        }
        Utilisateur u = new Utilisateur();
        u.setEmail(req.email().trim().toLowerCase());
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u.setRole(RoleType.valueOf(req.role()));
        u.setStatut("ACTIF");
        u.setDateCreation(LocalDateTime.now());
        if (req.employeId() != null) {
            Employe e = employeRepository.findById(req.employeId())
                    .orElseThrow(() -> new BusinessException("Employé introuvable"));
            if (utilisateurRepository.existsByEmployeId(e.getId())) {
                throw new BusinessException("Cet employé a déjà un compte");
            }
            u.setEmploye(e);
        } else {
            // Aucun employé lié : création automatique de la fiche employé pour que les
            // statistiques d'effectif et de membres actifs reflètent le nouveau compte.
            Employe e = new Employe();
            e.setMatricule(matriculeSuivant());
            String[] parts = nomPrenomDepuisEmail(req.email());
            e.setPrenom(parts[0]);
            e.setNom(parts[1]);
            e.setEmail(req.email().trim().toLowerCase());
            e.setDateEmbauche(java.time.LocalDate.now());
            e.setStatut(com.gns.sirh.entity.StatutEmploye.ACTIF);
            Employe savedEmploye = employeRepository.save(e);
            u.setEmploye(savedEmploye);
        }
        Utilisateur saved = utilisateurRepository.save(u);
        auditService.log(acteur, "CREATION_COMPTE", "Compte " + saved.getEmail() + " créé ("
                + saved.getRole() + ")");
        return toDto(saved);
    }

    @Transactional
    public UtilisateurDto modifier(Long id, UtilisateurUpdateRequest req, String acteur) {
        Utilisateur u = utilisateurRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Utilisateur introuvable"));
        if (req.role() != null && !req.role().isBlank()) {
            u.setRole(RoleType.valueOf(req.role()));
        }
        if (req.statut() != null && !req.statut().isBlank()) {
            u.setStatut(normaliserStatut(req.statut()));
        }
        if (req.password() != null && !req.password().isBlank()) {
            u.setPasswordHash(passwordEncoder.encode(req.password()));
        }
        Utilisateur saved = utilisateurRepository.save(u);
        auditService.log(acteur, "MODIFICATION_COMPTE", "Compte " + saved.getEmail() + " modifié (statut="
                + saved.getStatut() + ", role=" + saved.getRole() + ")");
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<UtilisateurDto> enAttente() {
        return utilisateurRepository.findAll().stream()
                .filter(u -> "EN_ATTENTE".equalsIgnoreCase(u.getStatut()))
                .map(this::toDto)
                .toList();
    }

    /** Valide une demande de compte : le compte passe ACTIF et l'utilisateur peut se connecter. */
    @Transactional
    public UtilisateurDto valider(Long id, String acteur) {
        Utilisateur u = utilisateurRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Utilisateur introuvable"));
        if (!"EN_ATTENTE".equalsIgnoreCase(u.getStatut())) {
            throw new BusinessException("Ce compte n'est pas en attente de validation");
        }
        u.setStatut("ACTIF");
        Utilisateur saved = utilisateurRepository.save(u);
        if (saved.getEmploye() != null) {
            notificationService.notifier(saved.getEmploye(),
                    "Votre compte " + saved.getEmail() + " a été validé. Vous pouvez maintenant vous connecter.",
                    "COMPTE_VALIDE");
        }
        auditService.log(acteur, "VALIDATION_COMPTE",
                "Compte " + saved.getEmail() + " validé (EN_ATTENTE → ACTIF)");
        return toDto(saved);
    }

    /** Refuse une demande de compte : le compte reste bloqué (statut REFUSE). */
    @Transactional
    public UtilisateurDto refuser(Long id, String acteur) {
        Utilisateur u = utilisateurRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Utilisateur introuvable"));
        if (!"EN_ATTENTE".equalsIgnoreCase(u.getStatut())) {
            throw new BusinessException("Ce compte n'est pas en attente de validation");
        }
        u.setStatut("REFUSE");
        Utilisateur saved = utilisateurRepository.save(u);
        if (saved.getEmploye() != null) {
            notificationService.notifier(saved.getEmploye(),
                    "Votre demande de compte " + saved.getEmail()
                            + " a été refusée. Contactez le service RH pour plus d'informations.",
                    "COMPTE_REFUSE");
        }
        auditService.log(acteur, "REFUS_COMPTE",
                "Compte " + saved.getEmail() + " refusé (EN_ATTENTE → REFUSE)");
        return toDto(saved);
    }

    /** Normalise le statut d'un compte : ACTIF, INACTIF, EN_ATTENTE ou REFUSE. */
    private static String normaliserStatut(String statut) {
        return switch (statut == null ? "" : statut.trim().toUpperCase()) {
            case "ACTIF" -> "ACTIF";
            case "INACTIF" -> "INACTIF";
            case "EN_ATTENTE" -> "EN_ATTENTE";
            case "REFUSE" -> "REFUSE";
            default -> "INACTIF";
        };
    }

    private UtilisateurDto toDto(Utilisateur u) {
        Employe e = u.getEmploye();
        return new UtilisateurDto(
                u.getId(), u.getEmail(), u.getRole().name(), u.getStatut(),
                e != null ? e.getId() : null,
                e != null ? e.getNomComplet() : null,
                u.getDateCreation(), u.getDerniereConnexion());
    }

    private String matriculeSuivant() {
        long count = employeRepository.count();
        return "GNS-" + String.format("%03d", count + 1);
    }

    /** Déduit prénom / nom à partir de la partie locale de l'email (ex. j.doe@gns.ma → John / Doe). */
    private String[] nomPrenomDepuisEmail(String email) {
        String local = email.split("@")[0].trim().replaceAll("[._-]+", " ");
        String[] mots = local.split("\\s+");
        if (mots.length == 0 || mots[0].isBlank()) {
            return new String[]{"Nouveau", "Collaborateur"};
        }
        String prenom = capitaliser(mots[0]);
        String nom = mots.length > 1 ? capitaliser(mots[mots.length - 1]) : "Collaborateur";
        return new String[]{prenom, nom};
    }

    private String capitaliser(String s) {
        if (s == null || s.isBlank()) {
            return s == null ? "" : s;
        }
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }
}
