package com.gns.sirh.dto;

import java.time.LocalDateTime;

public record UtilisateurDto(
        Long id,
        String email,
        String role,
        String statut,
        Long employeId,
        String employeNom,
        LocalDateTime dateCreation,
        LocalDateTime derniereConnexion
) {
}
