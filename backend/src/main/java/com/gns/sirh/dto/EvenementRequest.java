package com.gns.sirh.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record EvenementRequest(
        @NotBlank(message = "Le titre est obligatoire") String titre,
        String description,
        @NotBlank(message = "Le type est obligatoire") String type,
        @NotNull(message = "La date est obligatoire") LocalDate date,
        LocalTime heure,
        String lieu,
        int participantsMax
) {
}
