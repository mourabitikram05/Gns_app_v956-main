package com.gns.sirh.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Sondage visible côté collaborateur : question, options, et état du vote de l'employé.
 */
public record SondageDto(
        Long id,
        String question,
        List<String> options,
        LocalDate date,
        boolean actif,
        long totalReponses,
        Map<String, Long> reponsesParOption,
        boolean aVote,
        String optionChoisie) {

    public SondageDto(Long id, String question, List<String> options, LocalDate date, boolean actif) {
        this(id, question, options, date, actif, 0, Map.of(), false, null);
    }
}
