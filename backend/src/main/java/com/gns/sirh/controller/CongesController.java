package com.gns.sirh.controller;

import com.gns.sirh.config.PermissionRequired;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gns.sirh.common.ApiPage;
import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.*;
import com.gns.sirh.entity.TypeConge;
import com.gns.sirh.service.CongeService;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/conges")

public class CongesController {

    private final CongeService congeService;
    private final ObjectMapper objectMapper;

    public CongesController(CongeService congeService, ObjectMapper objectMapper) {
        this.congeService = congeService;
        this.objectMapper = objectMapper;
    }

    /**
     * Parse le champ multipart "demande" (JSON) quelle que soit son en-tête Content-Type.
     */
    private DemandeCongeRequest parseDemande(String json) {
        try {
            DemandeCongeRequest req = objectMapper.readValue(json, DemandeCongeRequest.class);
            if (req.typeCongeId() == null || req.dateDebut() == null || req.dateFin() == null) {
                throw new BusinessException("Le type de congé et les dates sont obligatoires");
            }
            return req;
        } catch (JsonProcessingException e) {
            throw new BusinessException("Format de demande invalide");
        }
    }

    // ---------------- Collaborateur ----------------

    @GetMapping("/solde")
    public ApiResponse<SoldeResponse> solde() {
        return ApiResponse.success(congeService.solde(employeIdConnecte()));
    }

    @GetMapping("/types")
    public ApiResponse<List<TypeConge>> types() {
        return ApiResponse.success(congeService.types());
    }

    @GetMapping("/mes-demandes")
    public ApiResponse<List<DemandeCongeResponse>> mesDemandes(
            @RequestParam(required = false) Integer mois,
            @RequestParam(required = false) Integer annee) {
        return ApiResponse.success(congeService.mesDemandes(employeIdConnecte(), mois, annee));
    }

    @PostMapping("/demandes")
    public ApiResponse<DemandeCongeResponse> creer(
            @RequestParam("demande") String demandeJson,
            @RequestPart(value = "justificatif", required = false) MultipartFile justificatif) {
        DemandeCongeRequest demande = parseDemande(demandeJson);
        return ApiResponse.created("Demande enregistrée",
                congeService.createDemande(SecurityUtils.currentUser(), demande, justificatif));
    }

    @GetMapping("/demandes/{id}")
    public ApiResponse<DemandeCongeResponse> detail(@PathVariable Long id) {
        return ApiResponse.success(congeService.getDemande(id, SecurityUtils.currentUser()));
    }

    @PutMapping("/demandes/{id}")
    public ApiResponse<DemandeCongeResponse> modifier(
            @PathVariable Long id,
            @RequestParam("demande") String demandeJson,
            @RequestPart(value = "justificatif", required = false) MultipartFile justificatif) {
        DemandeCongeRequest demande = parseDemande(demandeJson);
        return ApiResponse.success("Demande modifiée",
                congeService.updateDemande(id, SecurityUtils.currentUser(), demande, justificatif));
    }

    @PutMapping("/demandes/{id}/annuler")
    public ApiResponse<DemandeCongeResponse> annuler(@PathVariable Long id) {
        return ApiResponse.success("Demande annulée",
                congeService.annuler(id, SecurityUtils.currentUser()));
    }

    // ---------------- RH ----------------

    @GetMapping("/demandes")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<ApiPage<DemandeCongeResponse>> listeDemandes(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(congeService.listeDemandes(q, page, size));
    }

    @PermissionRequired("VALIDATION_CONGE")
    @PutMapping("/demandes/{id}/valider")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<DemandeCongeResponse> valider(@PathVariable Long id) {
        return ApiResponse.success("Demande validée",
                congeService.valider(id, SecurityUtils.currentUser()));
    }

    @PermissionRequired("VALIDATION_CONGE")
    @PutMapping("/demandes/{id}/refuser")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<DemandeCongeResponse> refuser(@PathVariable Long id,
                                                     @Valid @RequestBody RefusRequest refus) {
        return ApiResponse.success("Demande refusée",
                congeService.refuser(id, refus.motif(), SecurityUtils.currentUser()));
    }

    @GetMapping("/calendrier-equipe")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<CalendrierEquipeResponse> calendrier(
            @RequestParam(required = false) Integer mois,
            @RequestParam(required = false) Integer annee) {
        return ApiResponse.success(congeService.calendrierEquipe(mois, annee));
    }

    @PermissionRequired("EXPORT_DONNEES")
    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) Integer mois,
            @RequestParam(required = false) Integer annee) throws IOException {
        byte[] xlsx = congeService.exportXlsx(mois, annee);
        String nomFichier = congeService.nomFichierExport(mois, annee);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomFichier + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(xlsx);
    }


    @GetMapping("/justificatifs/{fileName}")
    public ResponseEntity<byte[]> telechargerJustificatif(@PathVariable String fileName) {
        try {
            String nomPropre = fileName.replaceFirst("^\\d{13}_", "");
            Path baseDir = Paths.get("uploads", "justificatifs").toAbsolutePath().normalize();
            Path path = baseDir.resolve(fileName).normalize();
            if (!path.startsWith(baseDir)) {
                return ResponseEntity.badRequest().build();
            }
            if (!Files.exists(path)) {
                return ResponseEntity.notFound().build();
            }

            byte[] contenu = Files.readAllBytes(path);

            String contentType = Files.probeContentType(path);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomPropre + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(contenu);
        } catch (IOException ex) {
            return ResponseEntity.notFound().build();
        }
    }
    // @GetMapping("/justificatifs/{fileName}")
    // public ResponseEntity<byte[]> telechargerJustificatif(@PathVariable String fileName) {
    //     try {
    //         Path path = Paths.get("uploads", "justificatifs").resolve(fileName).normalize();
    //         if (!path.toAbsolutePath().startsWith(Paths.get("uploads", "justificatifs").toAbsolutePath())) {
    //             return ResponseEntity.badRequest().build();
    //         }
    //         byte[] contenu = Files.readAllBytes(path);
    //         return ResponseEntity.ok()
    //                 .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
    //                 .contentType(MediaType.APPLICATION_OCTET_STREAM)
    //                 .body(contenu);
    //     } catch (IOException ex) {
    //         return ResponseEntity.notFound().build();
    //     }
    // }

    private Long employeIdConnecte() {
        Long id = SecurityUtils.currentUser().employeId();
        if (id == null) {
            throw new com.gns.sirh.common.BusinessException("Aucun employé lié à votre compte");
        }
        return id;
    }
}
