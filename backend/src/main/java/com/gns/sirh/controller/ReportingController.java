package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.config.PermissionRequired;
import com.gns.sirh.dto.KpiReport;
import com.gns.sirh.dto.RapportRequest;
import com.gns.sirh.entity.RapportRH;
import com.gns.sirh.service.DashboardService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reporting")
@PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
public class ReportingController {

    private final DashboardService dashboardService;

    public ReportingController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/kpis")
    public ApiResponse<List<KpiReport>> kpis(@RequestParam(required = false) String categorie,
                                             @RequestParam(required = false) String departement) {
        return ApiResponse.success(dashboardService.kpisReporting(categorie, departement));
    }

    @GetMapping("/rapports")
    public ApiResponse<List<RapportRH>> historique() {
        return ApiResponse.success(dashboardService.historiqueRapports());
    }

    @GetMapping("/rapports/{id}/telecharger")
    public ResponseEntity<byte[]> telecharger(@PathVariable Long id) {
        RapportRH r = dashboardService.historiqueRapports().stream()
                .filter(x -> x.getId().equals(id)).findFirst()
                .orElseThrow(() -> new com.gns.sirh.common.BusinessException("Rapport introuvable"));
        byte[] contenu = dashboardService.lireRapport(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + r.getFichier() + "\"")
                .contentType(typeFichier(r.getFichier()))
                .body(contenu);
    }

    /** Type MIME selon l'extension (les rapports historiques CSV restent téléchargeables). */
    private static MediaType typeFichier(String fichier) {
        if (fichier != null && fichier.toLowerCase().endsWith(".csv")) {
            return MediaType.parseMediaType("text/csv;charset=UTF-8");
        }
        return MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @PostMapping("/rapports")
    @PermissionRequired("EXPORT_DONNEES")
    public ResponseEntity<byte[]> generer(@RequestBody(required = false) RapportRequest request) {
        DashboardService.RapportResultat rapport = dashboardService.genererRapport(
                request != null ? request.titre() : null,
                request != null ? request.typeRapport() : null);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + rapport.nomFichier() + "\"")
                .contentType(typeFichier(rapport.nomFichier()))
                .body(rapport.contenu());
    }

    @GetMapping("/export-xlsx")
    @PermissionRequired("EXPORT_DONNEES")
    public ResponseEntity<byte[]> exportXlsx(@RequestParam(required = false) String categorie,
                                             @RequestParam(required = false) String departement) {
        byte[] xlsx = dashboardService.exportXlsx(categorie, departement);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"kpi_reporting_" + System.currentTimeMillis() + ".xlsx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(xlsx);
    }
}
