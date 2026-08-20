package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.AuthResponse;
import com.gns.sirh.dto.EmployeProfile;
import com.gns.sirh.dto.ChangePasswordRequest;
import com.gns.sirh.dto.InscriptionRequest;
import com.gns.sirh.dto.LoginRequest;
import com.gns.sirh.service.AuthService;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success("Connexion réussie", authService.login(request));
    }

    @PostMapping("/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody InscriptionRequest request) {
        return ApiResponse.created("Compte créé avec succès", authService.inscrire(request));
    }

    @GetMapping("/me")
    public ApiResponse<EmployeProfile> me() {
        return ApiResponse.success(authService.me(SecurityUtils.currentUser().utilisateurId()));
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changerMotDePasse(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changerMotDePasse(SecurityUtils.currentUser().utilisateurId(),
                request.ancienMotDePasse(), request.nouveauMotDePasse());
        return ApiResponse.success("Mot de passe modifié", null);
    }
}
