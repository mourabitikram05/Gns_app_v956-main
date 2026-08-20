package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.service.StructureService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Gestion des structures RH : départements et équipes (CRUD réservé à la RH).
 */
@RestController
@RequestMapping("/api/structures")
public class StructureController {

    private final StructureService structureService;

    public StructureController(StructureService structureService) {
        this.structureService = structureService;
    }

    /* ---------------- Départements ---------------- */

    @GetMapping("/departements")
    public ApiResponse<List<StructureService.DepartementDto>> listeDepartements() {
        return ApiResponse.success(structureService.listeDepartements());
    }

    @PostMapping("/departements")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<StructureService.DepartementDto> creerDepartement(@RequestBody Map<String, String> corps) {
        return ApiResponse.created("Département créé",
                structureService.creerDepartement(corps.get("nom"), corps.get("description")));
    }

    @PutMapping("/departements/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<StructureService.DepartementDto> modifierDepartement(
            @PathVariable Long id, @RequestBody Map<String, String> corps) {
        return ApiResponse.success("Département modifié",
                structureService.modifierDepartement(id, corps.get("nom"), corps.get("description")));
    }

    @DeleteMapping("/departements/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<Void> supprimerDepartement(@PathVariable Long id) {
        structureService.supprimerDepartement(id);
        return ApiResponse.success("Département supprimé", null);
    }

    /* ---------------- Équipes ---------------- */

    @GetMapping("/equipes")
    public ApiResponse<List<StructureService.EquipeDto>> listeEquipes() {
        return ApiResponse.success(structureService.listeEquipes());
    }

    @PostMapping("/equipes")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<StructureService.EquipeDto> creerEquipe(@RequestBody Map<String, Object> corps) {
        Long departementId = corps.get("departementId") != null
                ? Long.valueOf(String.valueOf(corps.get("departementId"))) : null;
        return ApiResponse.created("Équipe créée",
                structureService.creerEquipe((String) corps.get("nom"), (String) corps.get("description"), departementId));
    }

    @PutMapping("/equipes/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<StructureService.EquipeDto> modifierEquipe(
            @PathVariable Long id, @RequestBody Map<String, Object> corps) {
        Long departementId = corps.get("departementId") != null
                ? Long.valueOf(String.valueOf(corps.get("departementId"))) : null;
        return ApiResponse.success("Équipe modifiée",
                structureService.modifierEquipe(id, (String) corps.get("nom"), (String) corps.get("description"), departementId));
    }

    @DeleteMapping("/equipes/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<Void> supprimerEquipe(@PathVariable Long id) {
        structureService.supprimerEquipe(id);
        return ApiResponse.success("Équipe supprimée", null);
    }
}
