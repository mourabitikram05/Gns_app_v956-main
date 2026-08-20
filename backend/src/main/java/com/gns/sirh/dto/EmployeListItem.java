package com.gns.sirh.dto;

import java.util.List;

/**
 * Élément de la liste de l'annuaire.
 */
public record EmployeListItem(
        Long id,
        String matricule,
        String nomComplet,
        String poste,
        String departement,
        String telephone,
        String email,
        String bureau,
        String manager,
        String initiales,
        List<String> competences,
        String statut
) {
}
