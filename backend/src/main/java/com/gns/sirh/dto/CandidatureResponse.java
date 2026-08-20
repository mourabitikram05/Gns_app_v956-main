package com.gns.sirh.dto;

import java.time.LocalDateTime;
import java.util.List;

public record CandidatureResponse(
        Long id,
        Long offreId,
        String offreTitre,
        Long candidatId,
        String candidatNom,
        String candidatPrenom,
        String nomComplet,
        String initiales,
        String email,
        String telephone,
        String linkedin,
        String etape,
        LocalDateTime dateEntretien,
        LocalDateTime dateCreation,
        boolean cvDisponible,
        String cvNom,
        boolean lettreDisponible,
        List<String> historique
) {
}
