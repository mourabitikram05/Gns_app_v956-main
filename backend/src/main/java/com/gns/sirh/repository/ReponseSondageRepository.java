package com.gns.sirh.repository;

import com.gns.sirh.entity.ReponseSondage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReponseSondageRepository extends JpaRepository<ReponseSondage, Long> {

    long countBySondageId(Long sondageId);

    long countBySondageIdAndOptionChoisie(Long sondageId, String optionChoisie);

    Optional<ReponseSondage> findBySondageIdAndEmployeId(Long sondageId, Long employeId);

    List<ReponseSondage> findBySondageId(Long sondageId);
}
