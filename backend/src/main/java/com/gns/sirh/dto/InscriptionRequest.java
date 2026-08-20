package com.gns.sirh.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record InscriptionRequest(
        @NotBlank(message = "L'email est obligatoire")
        @Email(message = "Email invalide")
        String email,

        @NotBlank(message = "Le prénom est obligatoire")
        @Size(max = 60, message = "Prénom trop long")
        String prenom,

        @NotBlank(message = "Le nom est obligatoire")
        @Size(max = 60, message = "Nom trop long")
        String nom,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(min = 6, message = "Le mot de passe doit contenir au moins 6 caractères")
        @Pattern(regexp = "^[A-Za-z0-9@#$%^&+=!._-]+$", message = "Mot de passe invalide")
        String password
) {
}
