package com.gns.sirh.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record NoteFraisRequest(
        @NotBlank(message = "Le titre est obligatoire") String titre,
        String devise,
        @NotNull(message = "La date est obligatoire") LocalDate date,
        String priorite,
        String remarque,
        @NotNull(message = "Le montant total est obligatoire") Double montantTotal,
        List<DepenseRequest> depenses
) {
    public record DepenseRequest(String libelle, Double montant) {
    }
}
