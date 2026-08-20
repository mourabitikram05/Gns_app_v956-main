package com.gns.sirh.repository;

import com.gns.sirh.entity.DemandeConge;
import com.gns.sirh.entity.StatutDemande;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface DemandeCongeRepository extends JpaRepository<DemandeConge, Long> {

    List<DemandeConge> findByEmployeIdOrderByDateDemandeDesc(Long employeId);

    long countByStatut(StatutDemande statut);

    @Query("""
            SELECT d FROM DemandeConge d
            WHERE d.employe.id = :employeId
              AND ((YEAR(d.dateDebut) = :annee AND MONTH(d.dateDebut) = :mois)
                   OR (YEAR(d.dateFin) = :annee AND MONTH(d.dateFin) = :mois)
                   OR (d.dateDebut < :fin AND d.dateFin > :debut))
            ORDER BY d.dateDebut ASC
            """)
    List<DemandeConge> findByEmployeIdAndPeriode(@Param("employeId") Long employeId,
                                                 @Param("debut") LocalDate debut,
                                                 @Param("fin") LocalDate fin,
                                                 @Param("mois") int mois,
                                                 @Param("annee") int annee);

    @Query("""
            SELECT d FROM DemandeConge d
            WHERE d.statut IN :statuts
              AND d.employe.id = :employeId
              AND d.dateDebut <= :fin
              AND d.dateFin >= :debut
            """)
    List<DemandeConge> findOverlap(@Param("employeId") Long employeId,
                                   @Param("debut") LocalDate debut,
                                   @Param("fin") LocalDate fin,
                                   @Param("statuts") List<StatutDemande> statuts);

    /** Demandes couvrant une période donnée (tous employés) — pour le calendrier équipe. */
    @Query("""
            SELECT d FROM DemandeConge d
            WHERE d.statut IN :statuts
              AND d.dateDebut <= :fin
              AND d.dateFin >= :debut
            ORDER BY d.employe.nom ASC, d.dateDebut ASC
            """)
    List<DemandeConge> findByPeriode(@Param("debut") LocalDate debut,
                                     @Param("fin") LocalDate fin,
                                     @Param("statuts") List<StatutDemande> statuts);

    List<DemandeConge> findByStatutOrderByDateDemandeDesc(StatutDemande statut);

    @Query("""
            SELECT d FROM DemandeConge d
            WHERE d.dateDebut <= :fin AND d.dateFin >= :debut
            ORDER BY d.dateDemande DESC
            """)
    List<DemandeConge> findAllByPeriode(@Param("debut") LocalDate debut, @Param("fin") LocalDate fin);

    long countByStatutAndEmployeId(StatutDemande statut, Long employeId);
}
