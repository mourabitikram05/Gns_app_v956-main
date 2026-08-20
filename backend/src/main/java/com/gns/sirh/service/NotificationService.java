package com.gns.sirh.service;

import com.gns.sirh.dto.NotificationDto;
import com.gns.sirh.entity.Employe;
import com.gns.sirh.entity.Notification;
import com.gns.sirh.entity.StatutEmploye;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmployeRepository employeRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               EmployeRepository employeRepository) {
        this.notificationRepository = notificationRepository;
        this.employeRepository = employeRepository;
    }

    public void notifier(Employe employe, String message, String type) {
        Notification n = new Notification();
        n.setEmploye(employe);
        n.setMessage(message);
        n.setType(type);
        n.setLu(false);
        n.setDateEnvoi(LocalDateTime.now());
        notificationRepository.save(n);
    }

    /** Notifie TOUS les employés (publication d'événement, etc.). */
    public void notifierTous(String message, String type) {
        for (Employe e : employeRepository.findByStatutOrderByNomAsc(StatutEmploye.ACTIF)) {
            notifier(e, message, type);
        }
    }

    /** Notifie uniquement les employés liés à des comptes du rôle donné (ex. RESPONSABLE_RH). */
    public void notifierParRole(com.gns.sirh.entity.RoleType role, String message, String type) {
        List<Employe> rhEmployes = employeRepository.findByStatutOrderByNomAsc(StatutEmploye.ACTIF).stream()
                .filter(e -> e.getUtilisateur() != null && e.getUtilisateur().getRole() == role)
                .toList();
        for (Employe e : rhEmployes) {
            notifier(e, message, type);
        }
    }

    @Transactional
    public void marquerLue(Long notificationId, Long employeId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getEmploye().getId().equals(employeId)) {
                n.setLu(true);
            }
        });
    }

    public long countNonLues(Long employeId) {
        return notificationRepository.countByEmployeIdAndLuFalse(employeId);
    }

    public List<NotificationDto> top(Long employeId, int limit) {
        return notificationRepository.findTop10ByEmployeIdOrderByDateEnvoiDesc(employeId)
                .stream()
                .limit(limit)
                .map(n -> new NotificationDto(n.getId(), n.getMessage(), n.getType(), n.isLu(), n.getDateEnvoi()))
                .toList();
    }

    @Transactional
    public int marquerToutesLues(Long employeId) {
        List<Notification> list = notificationRepository.findTop10ByEmployeIdOrderByDateEnvoiDesc(employeId);
        int count = 0;
        for (Notification n : list) {
            if (!n.isLu()) {
                n.setLu(true);
                count++;
            }
        }
        return count;
    }
}
