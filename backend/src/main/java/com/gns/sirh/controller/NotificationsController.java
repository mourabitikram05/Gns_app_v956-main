package com.gns.sirh.controller;

import com.gns.sirh.common.ApiResponse;
import com.gns.sirh.dto.NotificationDto;
import com.gns.sirh.entity.Notification;
import com.gns.sirh.repository.NotificationRepository;
import com.gns.sirh.service.ExcelExporter;
import com.gns.sirh.service.NotificationService;
import com.gns.sirh.service.SecurityUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationsController {

    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    public NotificationsController(NotificationService notificationService,
                                   NotificationRepository notificationRepository) {
        this.notificationService = notificationService;
        this.notificationRepository = notificationRepository;
    }

    /** Export Excel de l'historique des notifications de l'utilisateur. */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exporter() throws java.io.IOException {
        Long employeId = SecurityUtils.currentUser().employeId();
        String nomFichier = "notifications_" + LocalDate.now() + ".xlsx";
        String[] enTetes = {"Date", "Type", "Message", "Statut"};
        List<String[]> lignes = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        List<Notification> items = employeId != null
                ? notificationRepository.findByEmployeIdOrderByDateEnvoiDesc(employeId)
                : List.of();
        for (Notification n : items) {
            lignes.add(new String[]{
                    n.getDateEnvoi() != null ? n.getDateEnvoi().format(fmt) : "",
                    n.getType() != null ? n.getType() : "",
                    n.getMessage() != null ? n.getMessage() : "",
                    n.isLu() ? "Lue" : "Non lue"});
        }
        byte[] contenu = ExcelExporter.generer("GNS TECHNOLOGIES — Notifications",
                "Export généré le " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                SecurityUtils.currentUser().email(), null,
                enTetes, lignes, "Notifications",
                new Integer[]{18, 16, 55, 10}, null);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + nomFichier + "\"; filename*=UTF-8''" + nomFichier)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(contenu);
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> lister() {
        Long employeId = SecurityUtils.currentUser().employeId();
        List<NotificationDto> items = employeId != null
                ? notificationService.top(employeId, 10) : List.of();
        long nonLues = employeId != null ? notificationService.countNonLues(employeId) : 0;
        return ApiResponse.success(Map.of("count", nonLues, "items", items));
    }

    @PutMapping("/lire")
    public ApiResponse<Integer> marquerToutesLues() {
        Long employeId = SecurityUtils.currentUser().employeId();
        int lues = employeId != null ? notificationService.marquerToutesLues(employeId) : 0;
        return ApiResponse.success("Notifications marquées comme lues", lues);
    }

    @PutMapping("/{id}/lue")
    public ApiResponse<Void> marquerLue(@PathVariable Long id) {
        Long employeId = SecurityUtils.currentUser().employeId();
        if (employeId != null) {
            notificationService.marquerLue(id, employeId);
        }
        return ApiResponse.success("Notification lue", null);
    }
}
