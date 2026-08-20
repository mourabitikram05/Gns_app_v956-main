package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.ReponseSondageRequest;
import com.gns.sirh.dto.SondageDto;
import com.gns.sirh.dto.SondageRequest;
import com.gns.sirh.service.SecurityUtils;
import com.gns.sirh.service.SondageService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sondage")
public class SondageController {

    private final SondageService sondageService;

    public SondageController(SondageService sondageService) {
        this.sondageService = sondageService;
    }

    /** Sondage du jour pour le collaborateur connecté. */
    @GetMapping("/aujourdhui")
    public ApiResponse<SondageDto> aujourdhui() {
        return ApiResponse.success(sondageService.aujourdhui(SecurityUtils.currentUser()));
    }

    /** L'employé connecté répond au sondage. */
    @PostMapping("/{id}/repondre")
    public ApiResponse<SondageDto> repondre(@PathVariable Long id,
                                            @Valid @RequestBody ReponseSondageRequest req) {
        return ApiResponse.success("Réponse enregistrée",
                sondageService.repondre(id, req.option(), SecurityUtils.currentUser()));
    }

    /** Liste des sondages avec résultats (RH). */
    @GetMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<List<SondageDto>> lister() {
        return ApiResponse.success(sondageService.lister());
    }

    /** Création d'un sondage (RH). */
    @PostMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<SondageDto> creer(@Valid @RequestBody SondageRequest req) {
        return ApiResponse.created("Sondage publié",
                sondageService.creer(req, SecurityUtils.currentUser().email()));
    }

    /** Modification d'un sondage (RH). */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<SondageDto> modifier(@PathVariable Long id, @Valid @RequestBody SondageRequest req) {
        return ApiResponse.success("Sondage modifié",
                sondageService.modifier(id, req, SecurityUtils.currentUser().email()));
    }
}
