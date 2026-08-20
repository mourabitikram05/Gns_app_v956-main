package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.PointageDto;
import com.gns.sirh.service.PointageService;
import com.gns.sirh.service.SecurityUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pointage")
public class PointageController {

    private final PointageService pointageService;

    public PointageController(PointageService pointageService) {
        this.pointageService = pointageService;
    }

    @PostMapping("/arrivee")
    public ApiResponse<PointageDto> arrivee() {
        return ApiResponse.success("Arrivée pointée", pointageService.arrivee(SecurityUtils.currentUser()));
    }

    @PostMapping("/depart")
    public ApiResponse<PointageDto> depart() {
        return ApiResponse.success("Départ pointé", pointageService.depart(SecurityUtils.currentUser()));
    }

    @GetMapping("/aujourdhui")
    public ApiResponse<PointageDto> aujourdhui() {
        return ApiResponse.success(pointageService.aujourdhui(SecurityUtils.currentUser()));
    }

    @GetMapping("/en-poste")
    public ApiResponse<Long> enPoste() {
        return ApiResponse.success(pointageService.enPoste());
    }
}
