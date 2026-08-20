package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.*;
import com.gns.sirh.service.DashboardService;
import com.gns.sirh.service.SecurityUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    // ---------------- Dashboard RH ----------------

    @GetMapping("/dashboard/rh/kpis")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<List<KpiCardDto>> kpis() {
        return ApiResponse.success(dashboardService.kpis());
    }

    @GetMapping("/dashboard/rh/absences-mensuelles")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<List<AbsenceMensuelleDto>> absencesMensuelles() {
        return ApiResponse.success(dashboardService.absencesMensuelles());
    }

    @GetMapping("/dashboard/rh/effectifs-departement")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<List<DeptCountDto>> effectifsDepartement() {
        return ApiResponse.success(dashboardService.effectifsDepartement());
    }

    @GetMapping("/dashboard/rh/actions-attente")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<List<ActionAttenteDto>> actionsAttente() {
        return ApiResponse.success(dashboardService.actionsAttente());
    }

    @GetMapping("/dashboard/rh/activite-recente")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<List<ActiviteItemDto>> activiteRecent() {
        return ApiResponse.success(dashboardService.activiteRecent());
    }
}
