package com.gns.sirh.repository;

import com.gns.sirh.entity.OffreEmploi;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OffreEmploiRepository extends JpaRepository<OffreEmploi, Long> {

    List<OffreEmploi> findAllByOrderByDatePublicationDesc();
}
