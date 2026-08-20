package com.gns.sirh.repository;

import com.gns.sirh.entity.Sondage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SondageRepository extends JpaRepository<Sondage, Long> {

    Optional<Sondage> findFirstByActifTrueOrderByDateDesc();

    Optional<Sondage> findFirstByDateOrderByIdDesc(LocalDate date);

    List<Sondage> findAllByOrderByDateDesc();
}
