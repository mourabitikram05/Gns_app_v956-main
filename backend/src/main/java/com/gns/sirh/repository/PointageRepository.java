package com.gns.sirh.repository;

import com.gns.sirh.entity.Pointage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface PointageRepository extends JpaRepository<Pointage, Long> {

    Optional<Pointage> findByEmployeIdAndDate(Long employeId, LocalDate date);

    @Query("SELECT COUNT(DISTINCT p.employe.id) FROM Pointage p WHERE p.date = :date AND p.heureDepart IS NULL")
    long countEnPoste(@Param("date") LocalDate date);
}
