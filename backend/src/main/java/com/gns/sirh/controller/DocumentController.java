package com.gns.sirh.controller;

import com.gns.sirh.config.PermissionRequired;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.*;
import com.gns.sirh.entity.DemandeDocument;
import com.gns.sirh.service.DocumentService;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.gns.sirh.entity.Employe;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.security.AuthUser;

import java.util.List;

@RestController
@RequestMapping("/api/documents")


public class DocumentController {

    private final DocumentService documentService;
    private final EmployeRepository employeRepository;


    public DocumentController(DocumentService documentService, EmployeRepository employeRepository) {
        this.documentService = documentService;
        this.employeRepository = employeRepository;
    }

    @GetMapping("/types")
    public ApiResponse<List<IdLabelDto>> types() {
        return ApiResponse.success(documentService.types());
    }

    @PostMapping("/demandes")
    public ApiResponse<DemandeDocumentResponse> creer(@Valid @RequestBody DemandeDocumentRequest request) {
        return ApiResponse.created("Demande enregistrée",
                documentService.creerDemande(SecurityUtils.currentUser(), request));
    }

    @GetMapping("/mes-demandes")
    public ApiResponse<List<DemandeDocumentResponse>> mesDemandes() {
        return ApiResponse.success(documentService.mesDemandes(SecurityUtils.currentUser().employeId()));
    }

    @GetMapping("/demandes")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<List<DemandeDocumentResponse>> listeRH() {
        return ApiResponse.success(documentService.listeRH());
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<StatsDocuments> stats() {
        return ApiResponse.success(documentService.stats());
    }


    private String nomSignataire(AuthUser user) {
    return employeRepository.findById(user.employeId())
            .map(Employe::getNomComplet)
            .orElse(user.email());
    }


    @PermissionRequired("DOCUMENTS_RH")
    @PostMapping("/demandes/{id}/traiter")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<DemandeDocumentResponse> traiter(@PathVariable Long id) {
        return ApiResponse.success("Document généré",
                documentService.traiter(id, nomSignataire(SecurityUtils.currentUser())));
    }

    @PermissionRequired("DOCUMENTS_RH")
    @PostMapping("/demandes/{id}/refuser")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<DemandeDocumentResponse> refuser(@PathVariable Long id,
                                                        @Valid @RequestBody RefusRequest refus) {
        return ApiResponse.success("Demande refusée",
                documentService.refuser(id, refus.motif(), SecurityUtils.currentUser().email()));
    }

    @GetMapping("/{id}/telecharger")
    public ResponseEntity<byte[]> telecharger(@PathVariable Long id) {
        DemandeDocument d = documentService.verifierAcces(id, SecurityUtils.currentUser());
        byte[] contenu = documentService.lireFichier(d);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + documentService.nomFichier(d) + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(contenu);
    }

    /** Export Excel (.xlsx) des demandes de documents — toutes (RH) ou les siennes (collaborateur). */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exporterExcel() throws java.io.IOException {
        String nomFichier = "demandes_documents_" + java.time.LocalDate.now() + ".xlsx";
        byte[] contenu = documentService.exporterExcel(SecurityUtils.currentUser());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + nomFichier + "\"; filename*=UTF-8''" + nomFichier)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(contenu);
    }

    /** Export PDF administratif des demandes de documents — toutes (RH) ou les siennes (collaborateur). */
    @GetMapping("/export-pdf")
    public ResponseEntity<byte[]> exporterPdf() {
        String nomFichier = "demandes_documents_" + java.time.LocalDate.now() + ".pdf";
        byte[] contenu = documentService.exporterPdf(SecurityUtils.currentUser());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + nomFichier + "\"; filename*=UTF-8''" + nomFichier)
                .contentType(MediaType.APPLICATION_PDF)
                .body(contenu);
    }
}
