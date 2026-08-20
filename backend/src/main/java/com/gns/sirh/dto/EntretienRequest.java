package com.gns.sirh.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record EntretienRequest(
        @NotNull(message = "La date d'entretien est obligatoire") LocalDateTime dateEntretien
) {
}
