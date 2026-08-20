package com.gns.sirh.repository;

import com.gns.sirh.entity.Evenement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface EvenementRepository extends JpaRepository<Evenement, Long> {

    List<Evenement> findByDateFinGreaterThanEqualOrderByDateDebutAsc(LocalDate date);

    List<Evenement> findByTypeIgnoreCaseAndDateDebutBetweenOrderByDateDebutAsc(String type, LocalDate start, LocalDate end);
}
