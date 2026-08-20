package com.gns.sirh.dto;

import jakarta.validation.constraints.NotBlank;

public record EtapeRequest(
        @NotBlank(message = "L'étape est obligatoire") String etape
) {
}
