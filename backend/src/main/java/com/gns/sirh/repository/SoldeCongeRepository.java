package com.gns.sirh.repository;

import com.gns.sirh.entity.SoldeConge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SoldeCongeRepository extends JpaRepository<SoldeConge, Long> {

    Optional<SoldeConge> findByEmployeIdAndAnnee(Long employeId, int annee);
}
