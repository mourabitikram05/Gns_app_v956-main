package com.gns.sirh.repository;

import com.gns.sirh.entity.DemandeDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DemandeDocumentRepository extends JpaRepository<DemandeDocument, Long> {

    List<DemandeDocument> findByEmployeIdOrderByDateDemandeDesc(Long employeId);

    List<DemandeDocument> findAllByOrderByDateDemandeDesc();

    List<DemandeDocument> findByStatutOrderByDateDemandeDesc(String statut);

    long countByStatut(String statut);
}
