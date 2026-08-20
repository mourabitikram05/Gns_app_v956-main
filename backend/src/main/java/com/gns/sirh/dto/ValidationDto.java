package com.gns.sirh.dto;

import java.time.LocalDateTime;

public record ValidationDto(
        Long id,
        String decision,
        String validateur,
        LocalDateTime dateValidation,
        String motif
) {
}
