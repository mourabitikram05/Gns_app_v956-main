package com.gns.sirh.dto;

public record UtilisateurUpdateRequest(
        String role,
        String statut,
        String password
) {
}
