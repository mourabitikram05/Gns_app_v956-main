package com.gns.sirh.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CandidatRequest(
        @NotNull(message = "L'offre est obligatoire") Long offreId,
        @NotBlank(message = "Le nom est obligatoire") String nom,
        @NotBlank(message = "Le prénom est obligatoire") String prenom,
        @NotBlank(message = "L'email est obligatoire") @Email(message = "Email invalide") String email,
        String telephone,
        String linkedin
) {
}
