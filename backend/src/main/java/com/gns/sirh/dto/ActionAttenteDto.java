package com.gns.sirh.dto;

import java.time.LocalDate;

/**
 * Action en attente affichée sur le dashboard RH (congés, notes de frais, ...).
 * module : CONGE ou FRAIS (détermine l'endpoint de validation côté frontend).
 */
public record ActionAttenteDto(
        Long demandeId,
        String name,
        String initiales,
        String type,
        String detail,
        LocalDate dateDebut,
        LocalDate dateFin,
        int nombreJours,
        String module,
        double montant
) {
}
