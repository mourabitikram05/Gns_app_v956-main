package com.gns.sirh.repository;

import com.gns.sirh.entity.Employe;
import com.gns.sirh.entity.StatutEmploye;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmployeRepository extends JpaRepository<Employe, Long> {

    Optional<Employe> findByEmail(String email);

    boolean existsByMatricule(String matricule);

    boolean existsByEmail(String email);

    long countByStatut(StatutEmploye statut);

    long countByStatutAndDateEmbaucheBetween(StatutEmploye statut, LocalDate start, LocalDate end);

    long countByDepartementId(Long departementId);

    long countByEquipeId(Long equipeId);

    List<Employe> findByStatutAndDepartementIdOrderByNomAsc(StatutEmploye statut, Long departementId);

    List<Employe> findByStatutOrderByNomAsc(StatutEmploye statut);

    @Query("""
            SELECT DISTINCT e FROM Employe e
            LEFT JOIN e.poste p
            LEFT JOIN e.departement d
            WHERE e.statut = :statut
              AND (:q IS NULL OR :q = '' OR LOWER(e.nom) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(e.prenom) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(p.nom) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR EXISTS (SELECT 1 FROM e.competences c WHERE LOWER(c.nom) LIKE LOWER(CONCAT('%', :q, '%'))))
              AND (:departement IS NULL OR :departement = '' OR LOWER(d.nom) = LOWER(:departement))
            """)
    Page<Employe> search(@Param("q") String q,
                         @Param("departement") String departement,
                         @Param("statut") StatutEmploye statut,
                         Pageable pageable);

    @Query("""
            SELECT DISTINCT e FROM Employe e
            LEFT JOIN e.poste p
            LEFT JOIN e.departement d
            WHERE (:q IS NULL OR :q = '' OR LOWER(e.nom) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(e.prenom) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(p.nom) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR EXISTS (SELECT 1 FROM e.competences c WHERE LOWER(c.nom) LIKE LOWER(CONCAT('%', :q, '%'))))
              AND (:departement IS NULL OR :departement = '' OR LOWER(d.nom) = LOWER(:departement))
            """)
    Page<Employe> searchAll(@Param("q") String q,
                            @Param("departement") String departement,
                            Pageable pageable);
}
