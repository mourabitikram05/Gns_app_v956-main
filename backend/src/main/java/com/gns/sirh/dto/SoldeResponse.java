package com.gns.sirh.dto;

/**
 * Soldes de congés du collaborateur.
 * - soldeAu31Decembre : droit annuel total (jours acquis dans l'année).
 * - soldeACeJour      : droit restant à ce jour.
 * - joursPris         : jours déjà consommés/validés.
 * - absencesJustifiees: jours d'absences justifiées (maladie etc.).
 * - enAttente         : jours en attente de validation.
 */
public record SoldeResponse(
        int annee,
        double soldeAu31Decembre,
        double soldeACeJour,
        double joursPris,
        double absencesJustifiees,
        double enAttente
) {
}
