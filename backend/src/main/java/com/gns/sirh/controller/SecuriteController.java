package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.UtilisateurDto;
import com.gns.sirh.dto.UtilisateurRequest;
import com.gns.sirh.dto.UtilisateurUpdateRequest;
import com.gns.sirh.entity.AuditLog;
import com.gns.sirh.entity.Permission;
import com.gns.sirh.repository.AuditLogRepository;
import com.gns.sirh.service.ExcelExporter;
import com.gns.sirh.service.PermissionService;
import com.gns.sirh.service.SecuriteService;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/securite")
@PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
public class SecuriteController {

    private final PermissionService permissionService;
    private final SecuriteService securiteService;
    private final AuditLogRepository auditLogRepository;

    public SecuriteController(PermissionService permissionService,
                              SecuriteService securiteService,
                              AuditLogRepository auditLogRepository) {
        this.permissionService = permissionService;
        this.securiteService = securiteService;
        this.auditLogRepository = auditLogRepository;
    }

    // ---------------- Matrice de permissions ----------------

    @GetMapping("/permissions")
    public ApiResponse<List<Permission>> permissions() {
        return ApiResponse.success(permissionService.toutesLesPermissions());
    }

    @GetMapping("/roles")
    public ApiResponse<Map<String, List<String>>> roles() {
        return ApiResponse.success(permissionService.rolesAvecPermissions());
    }

    @PutMapping("/roles/{role}/permissions")
    public ApiResponse<Map<String, List<String>>> majPermissions(@PathVariable String role,
                                                                 @RequestBody List<String> codes) {
        return ApiResponse.success("Permissions mises à jour",
                permissionService.majPermissions(role.toUpperCase(), codes));
    }

    // ---------------- Utilisateurs ----------------

    @GetMapping("/utilisateurs")
    public ApiResponse<List<UtilisateurDto>> utilisateurs() {
        return ApiResponse.success(securiteService.lister());
    }

    @PostMapping("/utilisateurs")
    public ApiResponse<UtilisateurDto> creerUtilisateur(@Valid @RequestBody UtilisateurRequest request) {
        return ApiResponse.created("Compte créé",
                securiteService.creer(request, SecurityUtils.currentUser().email()));
    }

    @PutMapping("/utilisateurs/{id}")
    public ApiResponse<UtilisateurDto> modifierUtilisateur(@PathVariable Long id,
                                                           @RequestBody UtilisateurUpdateRequest request) {
        return ApiResponse.success("Compte modifié",
                securiteService.modifier(id, request, SecurityUtils.currentUser().email()));
    }

    /** Demandes de création de compte en attente de validation (statut EN_ATTENTE). */
    @GetMapping("/utilisateurs/en-attente")
    public ApiResponse<List<UtilisateurDto>> enAttente() {
        return ApiResponse.success(securiteService.enAttente());
    }

    /** Le RH accepte la demande : le compte devient ACTIF et l'utilisateur peut se connecter. */
    @PostMapping("/utilisateurs/{id}/valider")
    public ApiResponse<UtilisateurDto> validerCompte(@PathVariable Long id) {
        return ApiResponse.success("Compte validé — l'utilisateur peut désormais se connecter",
                securiteService.valider(id, SecurityUtils.currentUser().email()));
    }

    /** Le RH refuse la demande : le compte reste bloqué (statut REFUSE). */
    @PostMapping("/utilisateurs/{id}/refuser")
    public ApiResponse<UtilisateurDto> refuserCompte(@PathVariable Long id) {
        return ApiResponse.success("Demande de compte refusée",
                securiteService.refuser(id, SecurityUtils.currentUser().email()));
    }

    // ---------------- Journal d'audit ----------------

    @GetMapping("/audit")
    public ApiResponse<List<AuditLog>> audit() {
        return ApiResponse.success(auditLogRepository.findAllByOrderByDateActionDesc());
    }

    @GetMapping("/audit/export")
    public ResponseEntity<byte[]> exportAudit() throws java.io.IOException {
        java.util.List<String[]> lignes = new java.util.ArrayList<>();
        java.time.format.DateTimeFormatter fmt =
                java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        for (AuditLog l : auditLogRepository.findAllByOrderByDateActionDesc()) {
            lignes.add(new String[]{
                    l.getActeur() != null ? l.getActeur() : "",
                    l.getAction() != null ? l.getAction() : "",
                    l.getDetail() != null ? l.getDetail() : "",
                    l.getDateAction() != null ? l.getDateAction().format(fmt) : ""
            });
        }
        String nomFichier = "journal_audit_" + java.time.LocalDate.now() + ".xlsx";
        byte[] contenu = ExcelExporter.generer("GNS TECHNOLOGIES — Journal d'audit",
                "Export généré le " + java.time.LocalDate.now()
                        .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                null, null,
                new String[]{"Acteur", "Action", "Détail", "Date"},
                lignes, "Journal d'audit",
                new Integer[]{26, 22, 55, 20}, null);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomFichier + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(contenu);
    }
}
