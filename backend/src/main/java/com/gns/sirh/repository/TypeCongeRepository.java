package com.gns.sirh.repository;

import com.gns.sirh.entity.TypeConge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TypeCongeRepository extends JpaRepository<TypeConge, Long> {

    Optional<TypeConge> findByNomIgnoreCase(String nom);

    List<TypeConge> findAllByOrderByNomAsc();
}
