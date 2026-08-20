package com.gns.sirh.dto;

import java.time.LocalDateTime;

public record DemandeDocumentResponse(
        Long id,
        String reference,
        Long employeId,
        String employeNom,
        String employeInitiales,
        String departement,
        Long typeDocumentId,
        String typeDocument,
        String format,
        LocalDateTime dateDemande,
        String statut,
        String motifRefus,
        String remarque,
        boolean fichierDisponible,
        String fichierNom,
        String signataire,
        LocalDateTime dateSignature
) {
}
