package com.gns.sirh.dto;

import jakarta.validation.constraints.NotBlank;

public record RefusRequest(
        @NotBlank(message = "Le motif de refus est obligatoire") String motif
) {
}
