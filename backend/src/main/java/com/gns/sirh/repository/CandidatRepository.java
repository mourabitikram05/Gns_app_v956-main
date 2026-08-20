package com.gns.sirh.repository;

import com.gns.sirh.entity.Candidat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidatRepository extends JpaRepository<Candidat, Long> {

    Optional<Candidat> findByEmailIgnoreCase(String email);

    List<Candidat> findAllByOrderByNomAscPrenomAsc();
}
