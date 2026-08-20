package com.gns.sirh.repository;

import com.gns.sirh.entity.Competence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompetenceRepository extends JpaRepository<Competence, Long> {

    List<Competence> findAllByOrderByNomAsc();

    Optional<Competence> findByNom(String nom);
}
