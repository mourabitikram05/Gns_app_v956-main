package com.gns.sirh.dto;

import java.time.LocalDateTime;

public record InscritDto(
        Long employeId,
        String nomComplet,
        String initiales,
        String email,
        String departement,
        LocalDateTime dateInscription
) {
}
