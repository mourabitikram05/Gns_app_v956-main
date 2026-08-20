package com.gns.sirh.dto;

import java.time.LocalDateTime;

/**
 * Indicateur de la vue KPI & Reporting (filtrable par catégorie / département).
 */
public record KpiReport(
        String nom,
        String categorie,
        String valeur,
        String unite,
        LocalDateTime dateCalcul
) {
}
