package com.gns.sirh.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Profil complet du collaborateur connecté (GET /api/employes/me).
 */
public record EmployeProfile(
        Long id,
        String matricule,
        String cin,
        String nom,
        String prenom,
        String nomComplet,
        String initiales,
        LocalDate dateNaissance,
        String sexe,
        String nationalite,
        String email,
        String telephone,
        String adresse,
        String photo,
        LocalDate dateEmbauche,
        String statut,
        String bureau,
        String poste,
        String departement,
        String equipe,
        String responsable,
        String role,
        List<String> missions
) {
}
