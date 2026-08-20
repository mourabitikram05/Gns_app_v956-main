package com.gns.sirh.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/**
 * Création / modification d'un employé (RH uniquement).
 */
public record EmployeRequest(
        @NotBlank(message = "Le matricule est obligatoire") String matricule,
        String cin,
        @NotBlank(message = "Le nom est obligatoire") String nom,
        @NotBlank(message = "Le prénom est obligatoire") String prenom,
        LocalDate dateNaissance,
        String sexe,
        String nationalite,
        @NotBlank(message = "L'email est obligatoire") @Email(message = "Email invalide") String email,
        String telephone,
        String adresse,
        LocalDate dateEmbauche,
        String statut,
        String bureau,
        @NotNull(message = "Le département est obligatoire") Long departementId,
        Long posteId,
        Long equipeId,
        Long responsableId,
        List<Long> competenceIds,
        List<String> missions
) {
}
