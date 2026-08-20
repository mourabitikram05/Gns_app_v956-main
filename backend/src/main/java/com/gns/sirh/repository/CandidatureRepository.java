package com.gns.sirh.repository;

import com.gns.sirh.entity.Candidature;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CandidatureRepository extends JpaRepository<Candidature, Long> {

    List<Candidature> findByOffreIdOrderByDateCreationDesc(Long offreId);

    List<Candidature> findByCandidatIdOrderByDateCreationDesc(Long candidatId);

    List<Candidature> findAllByOrderByDateCreationDesc();

    long countByOffreId(Long offreId);

    long countByCandidatId(Long candidatId);

    void deleteByOffreId(Long offreId);

    void deleteByCandidatId(Long candidatId);
}
