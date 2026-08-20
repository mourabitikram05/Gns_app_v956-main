package com.gns.sirh.dto;

/**
 * Réponse d'authentification.
 * Le champ {@code token} est null lorsque le compte n'est pas encore actif
 * (inscription en attente de validation par le RH) : aucun accès n'est alors possible.
 */
public record AuthResponse(
        String token,
        String email,
        String role,
        String statut,
        Long employeId,
        String prenom,
        String nom,
        String nomComplet,
        String matricule
) {
}
