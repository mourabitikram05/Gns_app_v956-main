package com.gns.sirh.controller;

import com.gns.sirh.config.PermissionRequired;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.EvenementDetail;
import com.gns.sirh.dto.EvenementRequest;
import com.gns.sirh.dto.InscritDto;
import com.gns.sirh.service.EvenementService;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/evenements")

public class EvenementController {

    private final EvenementService evenementService;

    public EvenementController(EvenementService evenementService) {
        this.evenementService = evenementService;
    }

    @GetMapping
    public ApiResponse<List<EvenementDetail>> lister() {
        return ApiResponse.success(evenementService.liste(SecurityUtils.currentUser().employeId()));
    }

    @GetMapping("/mes-inscriptions")
    public ApiResponse<List<EvenementDetail>> mesInscriptions() {
        return ApiResponse.success(evenementService.mesInscriptions(SecurityUtils.currentUser().employeId()));
    }

    @GetMapping("/a-venir")
    public ApiResponse<List<EvenementDetail>> aVenir() {
        return ApiResponse.success(evenementService.aVenir(SecurityUtils.currentUser().employeId()));
    }

    @PostMapping("/{id}/inscription")
    public ApiResponse<EvenementDetail> inscrire(@PathVariable Long id) {
        return ApiResponse.created("Inscription enregistrée",
                evenementService.inscrire(id, SecurityUtils.currentUser()));
    }

    @DeleteMapping("/{id}/inscription")
    public ApiResponse<EvenementDetail> desinscrire(@PathVariable Long id) {
        return ApiResponse.success("Désinscription effectuée",
                evenementService.desinscrire(id, SecurityUtils.currentUser()));
    }

    @PermissionRequired("GESTION_EVENEMENTS")
    @PostMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<EvenementDetail> creer(@Valid @RequestBody EvenementRequest request) {
        return ApiResponse.created("Événement publié",
                evenementService.creer(request, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_EVENEMENTS")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<EvenementDetail> modifier(@PathVariable Long id,
                                                 @Valid @RequestBody EvenementRequest request) {
        return ApiResponse.success("Événement modifié",
                evenementService.modifier(id, request, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_EVENEMENTS")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<Void> supprimer(@PathVariable Long id) {
        evenementService.supprimer(id, SecurityUtils.currentUser().email());
        return ApiResponse.success("Événement supprimé", null);
    }

    @GetMapping("/{id}/inscrits")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<List<InscritDto>> inscrits(@PathVariable Long id) {
        return ApiResponse.success(evenementService.inscrits(id));
    }

    @PermissionRequired("EXPORT_DONNEES")
    @GetMapping("/{id}/inscrits/export")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ResponseEntity<byte[]> exportInscrits(@PathVariable Long id) throws IOException {
        byte[] xlsx = evenementService.exportInscritsXlsx(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + evenementService.nomFichierInscrits(id) + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(xlsx);
    }
}
