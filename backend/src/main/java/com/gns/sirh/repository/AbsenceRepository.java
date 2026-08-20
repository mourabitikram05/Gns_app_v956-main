package com.gns.sirh.repository;

import com.gns.sirh.entity.Absence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface AbsenceRepository extends JpaRepository<Absence, Long> {

    List<Absence> findByDateAbsence(LocalDate date);

    long countByDateAbsence(LocalDate date);

    long countByDateAbsenceBetween(LocalDate start, LocalDate end);

    List<Absence> findByDateAbsenceBetweenOrderByDateAbsenceAsc(LocalDate start, LocalDate end);

    @Query("SELECT a FROM Absence a WHERE a.employe.id = :employeId AND a.dateAbsence BETWEEN :debut AND :fin")
    List<Absence> findByEmployeAndPeriode(@Param("employeId") Long employeId,
                                          @Param("debut") LocalDate debut,
                                          @Param("fin") LocalDate fin);
}
