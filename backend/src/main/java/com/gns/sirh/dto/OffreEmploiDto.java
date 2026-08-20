package com.gns.sirh.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record OffreEmploiDto(
        Long id,
        String titre,
        String departement,
        String typeContrat,
        String niveau,
        String mode,
        String statut,
        LocalDateTime datePublication,
        long totalCandidatures,
        Map<String, Long> candidaturesParEtape
) {
}
