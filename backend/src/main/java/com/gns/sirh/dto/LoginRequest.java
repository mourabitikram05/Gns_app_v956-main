package com.gns.sirh.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "L'email est obligatoire") @Email(message = "Email invalide") String email,
        @NotBlank(message = "Le mot de passe est obligatoire") String password
) {
}
