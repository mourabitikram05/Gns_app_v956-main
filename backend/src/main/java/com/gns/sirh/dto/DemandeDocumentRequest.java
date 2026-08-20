package com.gns.sirh.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DemandeDocumentRequest(
        @NotNull(message = "Le type de document est obligatoire") Long typeDocumentId,
        @NotBlank(message = "Le format est obligatoire (DIGITAL ou PAPIER)") String format,
        String remarque
) {
}
