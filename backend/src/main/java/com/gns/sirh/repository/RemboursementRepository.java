package com.gns.sirh.repository;

import com.gns.sirh.entity.Remboursement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RemboursementRepository extends JpaRepository<Remboursement, Long> {

    Optional<Remboursement> findByNoteFraisId(Long noteFraisId);
}
