package com.gns.sirh.controller;

import com.gns.sirh.config.PermissionRequired;

import com.gns.sirh.common.ApiPage;
import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.*;
import com.gns.sirh.entity.Competence;
import com.gns.sirh.entity.Equipe;
import com.gns.sirh.entity.StatutEmploye;
import com.gns.sirh.repository.CompetenceRepository;
import com.gns.sirh.repository.EquipeRepository;
import com.gns.sirh.service.DashboardService;
import com.gns.sirh.service.EmployeService;
import com.gns.sirh.service.ExcelExporter;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")

public class AnnuaireController {

    private final EmployeService employeService;
    private final DashboardService dashboardService;
    private final EquipeRepository equipeRepository;
    private final CompetenceRepository competenceRepository;

    public AnnuaireController(EmployeService employeService,
                              DashboardService dashboardService,
                              EquipeRepository equipeRepository,
                              CompetenceRepository competenceRepository) {
        this.employeService = employeService;
        this.dashboardService = dashboardService;
        this.equipeRepository = equipeRepository;
        this.competenceRepository = competenceRepository;
    }

    // ---------------- Annuaire ----------------

    @GetMapping("/annuaire/employes")
    public ApiResponse<ApiPage<EmployeListItem>> rechercher(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String departement,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "false") boolean inactifs) {
        return ApiResponse.success(employeService.search(q, departement, page, size, inactifs));
    }

    @GetMapping("/annuaire/employes/{id}")
    public ApiResponse<EmployeDetail> detail(@PathVariable Long id) {
        return ApiResponse.success(employeService.getDetail(id));
    }

    /** Export Excel de l'annuaire (employés actifs) — document RH professionnel. */
    @GetMapping("/annuaire/employes/export")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<byte[]> exporterEmployes() throws java.io.IOException {
        String nomFichier = "annuaire_employes_" + LocalDate.now() + ".xlsx";
        String[] enTetes = {"Matricule", "Nom complet", "Poste", "Département", "Équipe",
                "Email", "Téléphone", "Date d'embauche", "Statut"};
        List<String[]> lignes = new ArrayList<>();
        for (com.gns.sirh.entity.Employe e : employeService.getActifs()) {
            lignes.add(new String[]{
                    e.getMatricule() != null ? e.getMatricule() : "",
                    e.getNomComplet(),
                    e.getPoste() != null ? e.getPoste().getNom() : "",
                    e.getDepartement() != null ? e.getDepartement().getNom() : "",
                    e.getEquipe() != null ? e.getEquipe().getNom() : "",
                    e.getEmail() != null ? e.getEmail() : "",
                    e.getTelephone() != null ? e.getTelephone() : "",
                    e.getDateEmbauche() != null
                            ? e.getDateEmbauche().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "",
                    e.getStatut() != null ? e.getStatut().name() : ""});
        }
        byte[] contenu = ExcelExporter.generer("GNS TECHNOLOGIES — Annuaire des employés",
                "Effectif actif · export généré le "
                        + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                SecurityUtils.currentUser().email(), null,
                enTetes, lignes, "Annuaire",
                new Integer[]{12, 28, 24, 20, 18, 30, 16, 14, 12}, null);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + nomFichier + "\"; filename*=UTF-8''" + nomFichier)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(contenu);
    }

    @PermissionRequired("GESTION_EMPLOYES")
    @PostMapping("/annuaire/employes")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<EmployeDetail> creer(@Valid @RequestBody EmployeRequest request) {
        return ApiResponse.created("Collaborateur créé",
                employeService.create(request, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_EMPLOYES")
    @PutMapping("/annuaire/employes/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<EmployeDetail> modifier(@PathVariable Long id,
                                               @Valid @RequestBody EmployeRequest request) {
        return ApiResponse.success("Collaborateur modifié",
                employeService.update(id, request, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_EMPLOYES")
    @DeleteMapping("/annuaire/employes/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<Void> desactiver(@PathVariable Long id) {
        employeService.setStatut(id, StatutEmploye.INACTIF, SecurityUtils.currentUser().email());
        return ApiResponse.success("Collaborateur désactivé", null);
    }

    @PermissionRequired("GESTION_EMPLOYES")
    @PutMapping("/annuaire/employes/{id}/activer")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<Void> activer(@PathVariable Long id) {
        employeService.setStatut(id, StatutEmploye.ACTIF, SecurityUtils.currentUser().email());
        return ApiResponse.success("Collaborateur activé", null);
    }

    @PermissionRequired("GESTION_EMPLOYES")
    @PostMapping("/annuaire/employes/{id}/competences")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<EmployeDetail> ajouterCompetences(@PathVariable Long id,
                                                         @RequestBody List<Long> competenceIds) {
        return ApiResponse.success("Compétences mises à jour",
                employeService.addCompetences(id, competenceIds, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("GESTION_EMPLOYES")
    @DeleteMapping("/annuaire/employes/{id}/competences/{competenceId}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<EmployeDetail> retirerCompetence(@PathVariable Long id,
                                                        @PathVariable Long competenceId) {
        employeService.removeCompetence(id, competenceId, SecurityUtils.currentUser().email());
        return ApiResponse.success("Compétence retirée", employeService.getDetail(id));
    }

    // ---------------- Équipes ----------------

    @GetMapping("/equipes")
    public ApiResponse<List<Equipe>> equipes() {
        return ApiResponse.success(equipeRepository.findAllByOrderByNomAsc());
    }

    @GetMapping("/equipes/mon-equipe")
    public ApiResponse<List<MonEquipeDto>> monEquipe() {
        return ApiResponse.success(dashboardService.monEquipe(SecurityUtils.currentUser().employeId()));
    }

    @PostMapping("/equipes")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<Equipe> creerEquipe(@RequestBody Equipe equipe) {
        return ApiResponse.created("Équipe créée", equipeRepository.save(equipe));
    }

    @PutMapping("/equipes/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<Equipe> modifierEquipe(@PathVariable Long id, @RequestBody Equipe equipe) {
        Equipe existante = equipeRepository.findById(id)
                .orElseThrow(() -> new com.gns.sirh.common.BusinessException("Équipe introuvable"));
        existante.setNom(equipe.getNom());
        existante.setDescription(equipe.getDescription());
        return ApiResponse.success("Équipe modifiée", equipeRepository.save(existante));
    }

    // ---------------- Compétences ----------------

    @GetMapping("/competences")
    public ApiResponse<List<Competence>> competences() {
        return ApiResponse.success(competenceRepository.findAllByOrderByNomAsc());
    }

    @PostMapping("/competences")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<Competence> creerCompetence(@RequestBody Competence competence) {
        return ApiResponse.created("Compétence créée", competenceRepository.save(competence));
    }
}
