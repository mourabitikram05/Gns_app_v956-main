package com.gns.sirh.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Réponse d'une demande de congé avec son historique de validation.
 */
public record DemandeCongeResponse(
        Long id,
        String reference,
        Long employeId,
        String employeNom,
        String employeInitiales,
        String departement,
        Long typeCongeId,
        String typeNom,
        String typeCode,
        String couleur,
        LocalDate dateDebut,
        LocalDate dateFin,
        int nombreJours,
        String motif,
        String statut,
        String motifRefus,
        String justificatifUrl,
        LocalDateTime dateDemande,
        LocalDateTime dateValidation,
        String validePar,
        List<ValidationDto> historique
) {
}
