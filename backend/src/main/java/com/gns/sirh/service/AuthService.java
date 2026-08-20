package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.config.JwtService;
import com.gns.sirh.dto.AuthResponse;
import com.gns.sirh.dto.EmployeProfile;
import com.gns.sirh.dto.InscriptionRequest;
import com.gns.sirh.dto.LoginRequest;
import com.gns.sirh.entity.Employe;
import com.gns.sirh.entity.RoleType;
import com.gns.sirh.entity.StatutEmploye;
import com.gns.sirh.entity.Utilisateur;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.repository.UtilisateurRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final EmployeRepository employeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public AuthService(UtilisateurRepository utilisateurRepository,
                       EmployeRepository employeRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuditService auditService,
                       NotificationService notificationService) {
        this.utilisateurRepository = utilisateurRepository;
        this.employeRepository = employeRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    /**
     * Inscription libre : crée un compte collaborateur + la fiche employé associée,
     * puis connecte directement le nouvel utilisateur.
     */
    @Transactional
    public AuthResponse inscrire(InscriptionRequest request) {
        String email = request.email().trim().toLowerCase();
        if (utilisateurRepository.existsByEmail(email)) {
            throw new BusinessException("Un compte existe déjà avec cet email");
        }
        if (employeRepository.existsByEmail(email)) {
            throw new BusinessException("Un employé existe déjà avec cet email");
        }

        Employe employe = new Employe();
        employe.setMatricule(matriculeSuivant());
        employe.setPrenom(request.prenom().trim());
        employe.setNom(request.nom().trim());
        employe.setEmail(email);
        employe.setDateEmbauche(LocalDate.now());
        employe.setStatut(StatutEmploye.ACTIF);
        Employe savedEmploye = employeRepository.save(employe);

        Utilisateur u = new Utilisateur();
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(request.password()));
        u.setRole(RoleType.COLLABORATEUR);
        // Sécurité : tout nouveau compte est bloqué par défaut et attend la validation du RH.
        u.setStatut("EN_ATTENTE");
        u.setDateCreation(LocalDateTime.now());
        u.setEmploye(savedEmploye);
        Utilisateur saved = utilisateurRepository.save(u);

        auditService.log(email, "INSCRIPTION",
                "Nouveau compte créé via la page d'inscription (en attente de validation)");
        notificationService.notifierParRole(RoleType.RESPONSABLE_RH,
                "Nouvelle demande de compte : " + email + " (" + savedEmploye.getNomComplet()
                        + ") — à valider dans « Contrôle d'accès »", "VALIDATION_COMPTE");
        notificationService.notifierParRole(RoleType.ADMIN,
                "Nouvelle demande de compte : " + email + " (" + savedEmploye.getNomComplet()
                        + ") — à valider dans « Contrôle d'accès »", "VALIDATION_COMPTE");

        // Aucun token émis : l'utilisateur ne peut pas se connecter tant que le RH n'a pas validé.
        return new AuthResponse(
                null,
                saved.getEmail(),
                saved.getRole().name(),
                saved.getStatut(),
                savedEmploye.getId(),
                savedEmploye.getPrenom(),
                savedEmploye.getNom(),
                savedEmploye.getNomComplet(),
                savedEmploye.getMatricule()
        );
    }

    private String matriculeSuivant() {
        return "GNS-" + String.format("%03d", employeRepository.count() + 1);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new BusinessException("Email ou mot de passe incorrect"));

        if (!"ACTIF".equalsIgnoreCase(utilisateur.getStatut())) {
            String statut = utilisateur.getStatut() == null ? "" : utilisateur.getStatut().toUpperCase();
            switch (statut) {
                case "EN_ATTENTE" -> throw new BusinessException(
                        "Votre compte est en attente de validation par le service RH. "
                                + "Vous pourrez vous connecter dès approbation de votre demande.");
                case "REFUSE" -> throw new BusinessException(
                        "Votre demande de compte a été refusée. Contactez le service RH pour plus d'informations.");
                default -> throw new BusinessException("Compte désactivé, contactez l'administrateur");
            }
        }
        if (!passwordEncoder.matches(request.password(), utilisateur.getPasswordHash())) {
            throw new BusinessException("Email ou mot de passe incorrect");
        }

        utilisateur.setDerniereConnexion(LocalDateTime.now());
        utilisateurRepository.save(utilisateur);

        Employe employe = utilisateur.getEmploye();
        auditService.log(utilisateur.getEmail(), "CONNEXION",
                "Connexion réussie (" + utilisateur.getRole() + ")");

        String token = jwtService.generateToken(utilisateur);
        return new AuthResponse(
                token,
                utilisateur.getEmail(),
                utilisateur.getRole().name(),
                utilisateur.getStatut(),
                employe != null ? employe.getId() : null,
                employe != null ? employe.getPrenom() : "",
                employe != null ? employe.getNom() : "",
                employe != null ? employe.getNomComplet() : utilisateur.getEmail(),
                employe != null ? employe.getMatricule() : null
        );
    }

    @org.springframework.transaction.annotation.Transactional
    public void changerMotDePasse(Long utilisateurId, String ancien, String nouveau) {
        Utilisateur u = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new BusinessException("Utilisateur introuvable"));
        if (!passwordEncoder.matches(ancien, u.getPasswordHash())) {
            throw new BusinessException("Mot de passe actuel incorrect");
        }
        if (nouveau == null || nouveau.length() < 6) {
            throw new BusinessException("Le nouveau mot de passe doit contenir au moins 6 caractères");
        }
        u.setPasswordHash(passwordEncoder.encode(nouveau));
        utilisateurRepository.save(u);
        auditService.log(u.getEmail(), "CHANGEMENT_MDP", "Mot de passe modifié");
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public EmployeProfile me(Long utilisateurId) {
        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new BusinessException("Utilisateur introuvable"));
        if (utilisateur.getEmploye() == null) {
            throw new BusinessException("Aucun employé lié à ce compte");
        }
        Employe e = utilisateur.getEmploye();
        return new EmployeProfile(
                e.getId(),
                e.getMatricule(),
                e.getCin(),
                e.getNom(),
                e.getPrenom(),
                e.getNomComplet(),
                e.getInitiales(),
                e.getDateNaissance(),
                e.getSexe() != null ? e.getSexe().name() : null,
                e.getNationalite(),
                e.getEmail(),
                e.getTelephone(),
                e.getAdresse(),
                e.getPhoto(),
                e.getDateEmbauche(),
                e.getStatut().name(),
                e.getBureau(),
                e.getPoste() != null ? e.getPoste().getNom() : null,
                e.getDepartement() != null ? e.getDepartement().getNom() : null,
                e.getEquipe() != null ? e.getEquipe().getNom() : null,
                e.getResponsable() != null ? e.getResponsable().getNomComplet() : null,
                utilisateur.getRole().name(),
                e.getMissions()
        );
    }
}
