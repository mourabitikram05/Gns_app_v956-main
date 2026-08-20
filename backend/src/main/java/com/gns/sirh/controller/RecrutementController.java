package com.gns.sirh.controller;

import com.gns.sirh.config.PermissionRequired;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.*;
import com.gns.sirh.entity.Candidature;
import com.gns.sirh.repository.CandidatureRepository;
import com.gns.sirh.service.ExcelExporter;
import com.gns.sirh.service.RecrutementService;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/recrutement")
@PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")

public class RecrutementController {

    private final RecrutementService recrutementService;
    private final ObjectMapper objectMapper;
    private final CandidatureRepository candidatureRepository;

    public RecrutementController(RecrutementService recrutementService, ObjectMapper objectMapper,
                                 CandidatureRepository candidatureRepository) {
        this.recrutementService = recrutementService;
        this.objectMapper = objectMapper;
        this.candidatureRepository = candidatureRepository;
    }

    /** Export Excel de toutes les candidatures — document RH professionnel. */
    @GetMapping("/candidatures/export")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<byte[]> exporterCandidatures() throws java.io.IOException {
        String nomFichier = "candidatures_" + LocalDate.now() + ".xlsx";
        String[] enTetes = {"Candidat", "Email", "Offre", "Étape", "Date de candidature"};
        List<String[]> lignes = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        for (Candidature c : candidatureRepository.findAllByOrderByDateCreationDesc()) {
            lignes.add(new String[]{
                    c.getCandidat() != null ? c.getCandidat().getNomComplet() : "",
                    c.getCandidat() != null && c.getCandidat().getEmail() != null ? c.getCandidat().getEmail() : "",
                    c.getOffre() != null ? c.getOffre().getTitre() : "",
                    c.getEtape() != null ? c.getEtape() : "",
                    c.getDateCreation() != null ? c.getDateCreation().format(fmt) : ""});
        }
        byte[] contenu = ExcelExporter.generer("GNS TECHNOLOGIES — Candidatures au recrutement",
                "Export généré le " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                SecurityUtils.currentUser().email(), null,
                enTetes, lignes, "Candidatures",
                new Integer[]{26, 30, 30, 20, 18}, null);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + nomFichier + "\"; filename*=UTF-8''" + nomFichier)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(contenu);
    }

    private CandidatRequest parseCandidat(String json) {
        try {
            CandidatRequest req = objectMapper.readValue(json, CandidatRequest.class);
            if (req.offreId() == null || req.nom() == null || req.prenom() == null || req.email() == null) {
                throw new BusinessException("L'offre, le nom et l'email sont obligatoires");
            }
            return req;
        } catch (JsonProcessingException e) {
            throw new BusinessException("Format de candidat invalide");
        }
    }

    @GetMapping("/offres")
    public ApiResponse<List<OffreEmploiDto>> offres() {
        return ApiResponse.success(recrutementService.offres());
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PostMapping("/offres")
    public ApiResponse<OffreEmploiDto> publier(@Valid @RequestBody OffreEmploiRequest request) {
        return ApiResponse.created("Offre publiée",
                recrutementService.publier(request, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PutMapping("/offres/{id}")
    public ApiResponse<OffreEmploiDto> modifierOffre(@PathVariable Long id,
                                                     @Valid @RequestBody OffreEmploiRequest request) {
        return ApiResponse.success("Offre modifiée",
                recrutementService.modifierOffre(id, request, SecurityUtils.currentUser().email()));
    }

    @GetMapping("/offres/{id}")
    public ApiResponse<OffreEmploiDto> detailOffre(@PathVariable Long id) {
        return ApiResponse.success(recrutementService.detailOffre(id));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PutMapping("/offres/{id}/statut")
    public ApiResponse<OffreEmploiDto> changerStatutOffre(@PathVariable Long id,
                                                          @Valid @RequestBody StatutRequest request) {
        return ApiResponse.success("Statut de l'offre mis à jour",
                recrutementService.changerStatutOffre(id, request.statut(), SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @DeleteMapping("/offres/{id}")
    public ApiResponse<Void> supprimerOffre(@PathVariable Long id) {
        recrutementService.supprimerOffre(id, SecurityUtils.currentUser().email());
        return ApiResponse.success("Offre supprimée", null);
    }

    @GetMapping("/offres/{id}/candidatures")
    public ApiResponse<List<CandidatureResponse>> candidatures(@PathVariable Long id) {
        return ApiResponse.success(recrutementService.candidaturesParOffre(id));
    }

    @GetMapping("/candidatures/{id}")
    public ApiResponse<CandidatureResponse> detail(@PathVariable Long id) {
        return ApiResponse.success(recrutementService.detailCandidature(id));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PostMapping("/candidats")
    public ApiResponse<CandidatureResponse> ajouterCandidat(
            @RequestParam("candidat") String candidatJson,
            @RequestPart(value = "cv", required = false) MultipartFile cv,
            @RequestPart(value = "lettre", required = false) MultipartFile lettre) {
        CandidatRequest req = parseCandidat(candidatJson);
        return ApiResponse.created("Candidature enregistrée",
                recrutementService.ajouterCandidat(req, cv, lettre, SecurityUtils.currentUser().email()));
    }

    @GetMapping("/candidats")
    public ApiResponse<List<CandidatResponse>> candidats() {
        return ApiResponse.success(recrutementService.candidats());
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PutMapping("/candidats/{id}")
    public ApiResponse<CandidatResponse> modifierCandidat(@PathVariable Long id,
                                                          @Valid @RequestBody CandidatUpdateRequest request) {
        return ApiResponse.success("Candidat modifié",
                recrutementService.modifierCandidat(id, request, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @DeleteMapping("/candidats/{id}")
    public ApiResponse<Void> supprimerCandidat(@PathVariable Long id) {
        recrutementService.supprimerCandidat(id, SecurityUtils.currentUser().email());
        return ApiResponse.success("Candidat supprimé", null);
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @DeleteMapping("/candidatures/{id}")
    public ApiResponse<Void> supprimerCandidature(@PathVariable Long id) {
        recrutementService.supprimerCandidature(id, SecurityUtils.currentUser().email());
        return ApiResponse.success("Candidature supprimée", null);
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PutMapping("/candidatures/{id}/etape")
    public ApiResponse<CandidatureResponse> changerEtape(@PathVariable Long id,
                                                         @Valid @RequestBody EtapeRequest request) {
        return ApiResponse.success("Étape mise à jour",
                recrutementService.changerEtape(id, request.etape(), SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PutMapping("/candidatures/{id}/entretien")
    public ApiResponse<CandidatureResponse> planifierEntretien(@PathVariable Long id,
                                                               @Valid @RequestBody EntretienRequest request) {
        return ApiResponse.success("Entretien planifié",
                recrutementService.planifierEntretien(id, request.dateEntretien(), SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_RECRUTEMENT")
    @PostMapping("/candidatures/{id}/embaucher")
    public ApiResponse<CandidatureResponse> embaucher(@PathVariable Long id) {
        return ApiResponse.success("Candidat embauché — fiche employé créée",
                recrutementService.embaucher(id, SecurityUtils.currentUser().email()));
    }

    @GetMapping("/fichiers/{dossier}/{fileName}")
    public ResponseEntity<byte[]> telechargerFichier(@PathVariable String dossier, @PathVariable String fileName) {
        byte[] contenu = recrutementService.lireFichier(dossier, fileName);
        String nomPropre = fileName.replaceFirst("^\\d{13}_", "");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomPropre + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(contenu);
    }
}
