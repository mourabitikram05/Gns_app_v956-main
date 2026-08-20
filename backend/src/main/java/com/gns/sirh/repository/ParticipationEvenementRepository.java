package com.gns.sirh.repository;

import com.gns.sirh.entity.ParticipationEvenement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParticipationEvenementRepository extends JpaRepository<ParticipationEvenement, Long> {

    long countByEvenementIdAndStatut(Long evenementId, String statut);

    boolean existsByEvenementIdAndEmployeId(Long evenementId, Long employeId);

    Optional<ParticipationEvenement> findByEvenementIdAndEmployeId(Long evenementId, Long employeId);

    List<ParticipationEvenement> findByEvenementIdOrderByDateInscriptionAsc(Long evenementId);

    List<ParticipationEvenement> findByEmployeIdOrderByDateInscriptionDesc(Long employeId);
}
