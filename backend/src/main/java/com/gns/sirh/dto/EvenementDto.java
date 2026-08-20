package com.gns.sirh.dto;

import java.time.LocalDate;

public record EvenementDto(
        Long id,
        String titre,
        String description,
        LocalDate dateDebut,
        LocalDate dateFin,
        String lieu,
        String type,
        String imageUrl
) {
}
