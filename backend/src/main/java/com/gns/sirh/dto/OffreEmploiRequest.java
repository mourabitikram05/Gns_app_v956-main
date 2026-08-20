package com.gns.sirh.dto;

import jakarta.validation.constraints.NotBlank;

public record OffreEmploiRequest(
        @NotBlank(message = "Le titre est obligatoire") String titre,
        String departement,
        String typeContrat,
        String niveau,
        String mode,
        String statut
) {
}
