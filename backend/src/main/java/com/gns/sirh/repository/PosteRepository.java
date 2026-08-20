package com.gns.sirh.repository;

import com.gns.sirh.entity.Poste;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PosteRepository extends JpaRepository<Poste, Long> {

    List<Poste> findAllByOrderByNomAsc();
}
