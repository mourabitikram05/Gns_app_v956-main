package com.gns.sirh.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UtilisateurRequest(
        @NotBlank(message = "L'email est obligatoire") @Email(message = "Email invalide") String email,
        @NotBlank(message = "Le mot de passe est obligatoire") String password,
        @NotNull(message = "Le rôle est obligatoire") String role,
        Long employeId
) {
}
