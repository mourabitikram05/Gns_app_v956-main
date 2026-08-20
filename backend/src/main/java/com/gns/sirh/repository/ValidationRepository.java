package com.gns.sirh.repository;

import com.gns.sirh.entity.Validation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ValidationRepository extends JpaRepository<Validation, Long> {

    List<Validation> findByDemandeCongeIdOrderByDateValidationAsc(Long demandeCongeId);
}
