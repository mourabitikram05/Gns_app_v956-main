package com.gns.sirh.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Création d'une demande de congé/absence.
 * employeId est optionnel : renseigné uniquement quand le RH réserve pour un collaborateur.
 */
public record DemandeCongeRequest(
        @NotNull(message = "Le type de congé est obligatoire") Long typeCongeId,
        @NotNull(message = "La date de début est obligatoire") LocalDate dateDebut,
        @NotNull(message = "La date de fin est obligatoire") LocalDate dateFin,
        String motif,
        Long employeId
) {
}
