package com.gns.sirh.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Mise à jour d'un candidat existant (sans pièce jointe).
 */
public record CandidatUpdateRequest(
        @NotBlank(message = "Le nom est obligatoire") String nom,
        @NotBlank(message = "Le prénom est obligatoire") String prenom,
        @NotBlank(message = "L'email est obligatoire") @Email(message = "Email invalide") String email,
        String telephone,
        String linkedin
) {
}
