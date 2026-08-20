package com.gns.sirh.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Détail complet d'un collaborateur (GET /api/annuaire/employes/{id}).
 */
public record EmployeDetail(
        Long id,
        String matricule,
        String cin,
        String nom,
        String prenom,
        String nomComplet,
        String initiales,
        LocalDate dateNaissance,
        String sexe,
        String nationalite,
        String email,
        String telephone,
        String adresse,
        String photo,
        LocalDate dateEmbauche,
        String statut,
        String bureau,
        Long posteId,
        String poste,
        Long departementId,
        String departement,
        Long equipeId,
        String equipe,
        Long responsableId,
        String manager,
        List<String> competences,
        List<String> missions
) {
}
