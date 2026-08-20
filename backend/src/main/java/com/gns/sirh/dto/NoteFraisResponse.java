package com.gns.sirh.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record NoteFraisResponse(
        Long id,
        String reference,
        Long employeId,
        String employeNom,
        String employeInitiales,
        String departement,
        String titre,
        String devise,
        LocalDate date,
        String priorite,
        String remarque,
        double montantTotal,
        String statut,
        String motifRefus,
        LocalDateTime dateCreation,
        int nbDepenses,
        List<String> depenses,
        List<String> justificatifs
) {
}
