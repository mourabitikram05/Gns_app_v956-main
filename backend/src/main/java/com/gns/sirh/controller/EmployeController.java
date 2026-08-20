package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.EmployeProfile;
import com.gns.sirh.dto.IdLabelDto;
import com.gns.sirh.repository.DepartementRepository;
import com.gns.sirh.repository.PosteRepository;
import com.gns.sirh.service.AuthService;
import com.gns.sirh.service.SecurityUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class EmployeController {

    private final AuthService authService;
    private final DepartementRepository departementRepository;
    private final PosteRepository posteRepository;

    public EmployeController(AuthService authService,
                             DepartementRepository departementRepository,
                             PosteRepository posteRepository) {
        this.authService = authService;
        this.departementRepository = departementRepository;
        this.posteRepository = posteRepository;
    }

    @GetMapping("/employes/me")
    public ApiResponse<EmployeProfile> me() {
        return ApiResponse.success(authService.me(SecurityUtils.currentUser().utilisateurId()));
    }

    @GetMapping("/departements")
    public ApiResponse<List<IdLabelDto>> departements() {
        List<IdLabelDto> list = departementRepository.findAllByOrderByNomAsc()
                .stream().map(d -> new IdLabelDto(d.getId(), d.getNom())).toList();
        return ApiResponse.success(list);
    }

    @GetMapping("/postes")
    public ApiResponse<List<IdLabelDto>> postes() {
        List<IdLabelDto> list = posteRepository.findAllByOrderByNomAsc()
                .stream().map(p -> new IdLabelDto(p.getId(), p.getNom())).toList();
        return ApiResponse.success(list);
    }
}
