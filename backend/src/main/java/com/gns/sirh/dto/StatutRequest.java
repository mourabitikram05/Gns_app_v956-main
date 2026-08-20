package com.gns.sirh.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Changement de statut (offre : OUVERTE / CLOTUREE…).
 */
public record StatutRequest(
        @NotBlank(message = "Le statut est obligatoire") String statut
) {
}
