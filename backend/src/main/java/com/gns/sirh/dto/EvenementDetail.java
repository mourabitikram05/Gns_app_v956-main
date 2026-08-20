package com.gns.sirh.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Événement avec compteur d'inscrits réel, taux de remplissage et statut d'inscription
 * du collaborateur connecté.
 */
public record EvenementDetail(
        Long id,
        String titre,
        String description,
        String type,
        LocalDate dateDebut,
        LocalDate dateFin,
        LocalTime heureDebut,
        String lieu,
        int participantsMax,
        long inscrits,
        boolean complet,
        boolean inscrit,
        double tauxRemplissage
) {
}
