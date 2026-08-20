package com.gns.sirh.repository;

import com.gns.sirh.entity.NoteFrais;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface NoteFraisRepository extends JpaRepository<NoteFrais, Long> {

    List<NoteFrais> findByEmployeIdOrderByDateCreationDesc(Long employeId);

    List<NoteFrais> findAllByOrderByDateCreationDesc();

    @Query("""
            SELECT n FROM NoteFrais n
            WHERE (:q IS NULL OR :q = '' OR LOWER(CONCAT(n.employe.prenom, ' ', n.employe.nom)) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(n.titre) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:statut IS NULL OR :statut = '' OR n.statut = :statut)
              AND (:debut IS NULL OR n.date >= :debut)
              AND (:fin IS NULL OR n.date <= :fin)
            ORDER BY n.dateCreation DESC
            """)
    List<NoteFrais> rechercher(@Param("q") String q,
                               @Param("statut") String statut,
                               @Param("debut") LocalDate debut,
                               @Param("fin") LocalDate fin);

    @Query("""
            SELECT n FROM NoteFrais n
            WHERE (:employeId IS NULL OR n.employe.id = :employeId)
              AND (:statut IS NULL OR :statut = '' OR n.statut = :statut)
            """)
    List<NoteFrais> findByEmployeEtStatut(@Param("employeId") Long employeId,
                                          @Param("statut") String statut);
}
