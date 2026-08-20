package com.gns.sirh.repository;

import com.gns.sirh.entity.Departement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartementRepository extends JpaRepository<Departement, Long> {

    Optional<Departement> findByNomIgnoreCase(String nom);

    List<Departement> findAllByOrderByNomAsc();
}
