package com.gns.sirh.controller;

import com.gns.sirh.config.PermissionRequired;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.*;
import com.gns.sirh.service.ExcelExporter;
import com.gns.sirh.service.FraisService;
import com.gns.sirh.service.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/frais")

public class FraisController {

    private final FraisService fraisService;
    private final ObjectMapper objectMapper;

    public FraisController(FraisService fraisService, ObjectMapper objectMapper) {
        this.fraisService = fraisService;
        this.objectMapper = objectMapper;
    }

    /** Export Excel des notes de frais (RH : toutes ; collaborateur : les siennes). */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exporterNotes(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) String statut,
                                                @RequestParam(required = false) String debut,
                                                @RequestParam(required = false) String fin) throws java.io.IOException {
        com.gns.sirh.security.AuthUser user = SecurityUtils.currentUser();
        List<NoteFraisResponse> notes = user.isRh()
                ? fraisService.toutes(q, statut, debut, fin)
                : fraisService.mesNotes(user.employeId());
        String nomFichier = "notes_de_frais_" + LocalDate.now() + ".xlsx";
        String[] enTetes = {"Référence", "Employé", "Titre", "Date", "Montant (MAD)", "Statut"};
        List<String[]> lignes = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        for (NoteFraisResponse n : notes) {
            lignes.add(new String[]{
                    n.reference() != null ? n.reference() : "",
                    n.employeNom() != null ? n.employeNom() : "",
                    n.titre() != null ? n.titre() : "",
                    n.date() != null ? n.date().format(fmt) : "",
                    String.format(java.util.Locale.FRANCE, "%.2f", n.montantTotal()),
                    n.statut() != null ? n.statut() : ""});
        }
        byte[] contenu = ExcelExporter.generer("GNS TECHNOLOGIES — Notes de frais",
                "Export généré le " + LocalDate.now().format(fmt),
                user.email(), user.isRh() ? "vue RH" : "espace collaborateur",
                enTetes, lignes, "Notes de frais",
                new Integer[]{18, 24, 32, 12, 14, 14}, null);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + nomFichier + "\"; filename*=UTF-8''" + nomFichier)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(contenu);
    }

    private NoteFraisRequest parseNote(String json) {
        try {
            NoteFraisRequest req = objectMapper.readValue(json, NoteFraisRequest.class);
            if (req.titre() == null || req.titre().isBlank() || req.date() == null || req.montantTotal() == null) {
                throw new BusinessException("Le titre, la date et le montant sont obligatoires");
            }
            return req;
        } catch (JsonProcessingException e) {
            throw new BusinessException("Format de note invalide");
        }
    }

    // ---------------- Collaborateur ----------------

    @GetMapping("/mes-notes/synthese")
    public ApiResponse<SyntheseFrais> synthese() {
        return ApiResponse.success(fraisService.synthese(SecurityUtils.currentUser().employeId()));
    }

    @GetMapping("/mes-notes")
    public ApiResponse<List<NoteFraisResponse>> mesNotes() {
        return ApiResponse.success(fraisService.mesNotes(SecurityUtils.currentUser().employeId()));
    }

    @PostMapping("/notes")
    public ApiResponse<NoteFraisResponse> creer(
            @RequestParam("note") String noteJson,
            @RequestPart(value = "justificatifs", required = false) List<MultipartFile> justificatifs) {
        NoteFraisRequest note = parseNote(noteJson);
        return ApiResponse.created("Note enregistrée",
                fraisService.creer(SecurityUtils.currentUser(), note, justificatifs));
    }

    @GetMapping("/notes/{id}")
    public ApiResponse<NoteFraisResponse> detail(@PathVariable Long id) {
        return ApiResponse.success(fraisService.detail(id, SecurityUtils.currentUser()));
    }

    @PutMapping("/notes/{id}")
    public ApiResponse<NoteFraisResponse> modifier(
            @PathVariable Long id,
            @RequestParam("note") String noteJson,
            @RequestPart(value = "justificatifs", required = false) List<MultipartFile> justificatifs) {
        NoteFraisRequest note = parseNote(noteJson);
        return ApiResponse.success("Note modifiée",
                fraisService.modifier(id, SecurityUtils.currentUser(), note, justificatifs));
    }

    @PutMapping("/notes/{id}/annuler")
    public ApiResponse<NoteFraisResponse> annuler(@PathVariable Long id) {
        return ApiResponse.success("Note annulée",
                fraisService.annuler(id, SecurityUtils.currentUser()));
    }

    // ---------------- RH ----------------

    @GetMapping("/notes")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<List<NoteFraisResponse>> toutes(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin) {
        return ApiResponse.success(fraisService.toutes(q, statut, debut, fin));
    }

    @PermissionRequired("VALIDATION_FRAIS")
    @PutMapping("/notes/{id}/valider")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<NoteFraisResponse> valider(@PathVariable Long id) {
        return ApiResponse.success("Note validée, remboursement programmé",
                fraisService.valider(id, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("VALIDATION_FRAIS")
    @PutMapping("/notes/{id}/rembourser")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<NoteFraisResponse> rembourser(@PathVariable Long id) {
        return ApiResponse.success("Note remboursée",
                fraisService.rembourser(id, SecurityUtils.currentUser().email()));
    }

    @PermissionRequired("VALIDATION_FRAIS")
    @PutMapping("/notes/{id}/refuser")
    @PreAuthorize("hasAnyRole('RESPONSABLE_RH', 'ADMIN')")
    public ApiResponse<NoteFraisResponse> refuser(@PathVariable Long id,
                                                  @Valid @RequestBody RefusRequest refus) {
        return ApiResponse.success("Note refusée",
                fraisService.refuser(id, refus.motif(), SecurityUtils.currentUser().email()));
    }

    // @GetMapping("/justificatifs/{fileName}")
    // public ResponseEntity<byte[]> telechargerJustificatif(@PathVariable String fileName) {
    //     byte[] contenu = fraisService.lireJustificatif(fileName);
    //     return ResponseEntity.ok()
    //             .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
    //             .contentType(MediaType.APPLICATION_OCTET_STREAM)
    //             .body(contenu);
    // }

    @GetMapping("/justificatifs/{fileName}")
    public ResponseEntity<byte[]> telechargerJustificatif(@PathVariable String fileName) {
        byte[] contenu = fraisService.lireJustificatif(fileName);

        String contentType = java.net.URLConnection.guessContentTypeFromName(fileName);
        if (contentType == null) {
            contentType = "application/octet-stream";
        }
        String nomPropre = fileName.replaceFirst("^\\d{13}_", "");


        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomPropre + "\"")                .contentType(MediaType.parseMediaType(contentType))
                .body(contenu);
    }
}
