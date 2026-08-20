package com.gns.sirh.security;

import com.gns.sirh.entity.RoleType;

/**
 * Principal Spring Security : utilisateur authentifié.
 * Porte les identifiants nécessaires (utilisateur + employé lié + rôle).
 */
public record AuthUser(Long utilisateurId, Long employeId, String email, RoleType role) {

    public boolean isRh() {
        return role == RoleType.RESPONSABLE_RH || role == RoleType.ADMIN;
    }
}
