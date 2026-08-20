package com.gns.sirh.dto;

/**
 * Réponse candidat (liste Candidats du module Recrutement).
 */
public record CandidatResponse(
        Long id,
        String nom,
        String prenom,
        String nomComplet,
        String initiales,
        String email,
        String telephone,
        String linkedin,
        boolean cvDisponible,
        String cvNom,
        boolean lettreDisponible,
        long nbCandidatures,
        String offres
) {
}
