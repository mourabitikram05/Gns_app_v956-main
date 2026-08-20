package com.gns.sirh.repository;

import com.gns.sirh.entity.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentTypeRepository extends JpaRepository<DocumentType, Long> {

    List<DocumentType> findAllByOrderByNomAsc();
}
