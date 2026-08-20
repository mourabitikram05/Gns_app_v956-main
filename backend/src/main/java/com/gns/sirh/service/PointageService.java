package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.PointageDto;
import com.gns.sirh.entity.Employe;
import com.gns.sirh.entity.Pointage;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.repository.PointageRepository;
import com.gns.sirh.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;

@Service
public class PointageService {

    private final PointageRepository pointageRepository;
    private final EmployeRepository employeRepository;
    private final AuditService auditService;

    public PointageService(PointageRepository pointageRepository,
                           EmployeRepository employeRepository,
                           AuditService auditService) {
        this.pointageRepository = pointageRepository;
        this.employeRepository = employeRepository;
        this.auditService = auditService;
    }

    @Transactional
    public PointageDto arrivee(AuthUser user) {
        Long employeId = user.employeId();
        if (employeId == null) {
            throw new BusinessException("Aucun employé lié à votre compte");
        }
        LocalDate aujourdhui = LocalDate.now();
        if (pointageRepository.findByEmployeIdAndDate(employeId, aujourdhui).isPresent()) {
            throw new BusinessException("Vous avez déjà pointé votre arrivée aujourd'hui");
        }
        Employe e = employeRepository.findById(employeId)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        Pointage p = new Pointage();
        p.setEmploye(e);
        p.setDate(aujourdhui);
        p.setHeureArrivee(LocalTime.now());
        Pointage saved = pointageRepository.save(p);
        auditService.log(user.email(), "POINTAGE", "Arrivée pointée à " + saved.getHeureArrivee());
        return toDto(saved);
    }

    @Transactional
    public PointageDto depart(AuthUser user) {
        Long employeId = user.employeId();
        if (employeId == null) {
            throw new BusinessException("Aucun employé lié à votre compte");
        }
        Pointage p = pointageRepository.findByEmployeIdAndDate(employeId, LocalDate.now())
                .orElseThrow(() -> new BusinessException("Vous n'avez pas pointé votre arrivée aujourd'hui"));
        if (p.getHeureDepart() != null) {
            throw new BusinessException("Vous avez déjà pointé votre départ");
        }
        p.setHeureDepart(LocalTime.now());
        Pointage saved = pointageRepository.save(p);
        auditService.log(user.email(), "POINTAGE", "Départ pointé à " + saved.getHeureDepart());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public PointageDto aujourdhui(AuthUser user) {
        if (user.employeId() == null) {
            return null;
        }
        return pointageRepository.findByEmployeIdAndDate(user.employeId(), LocalDate.now())
                .map(this::toDto).orElse(null);
    }

    @Transactional(readOnly = true)
    public long enPoste() {
        return pointageRepository.countEnPoste(LocalDate.now());
    }

    private PointageDto toDto(Pointage p) {
        String duree = null;
        if (p.getHeureDepart() != null) {
            Duration d = Duration.between(p.getHeureArrivee(), p.getHeureDepart());
            duree = String.format("%dh%02d", d.toHours(), d.toMinutesPart());
        }
        return new PointageDto(p.getId(), p.getEmploye().getNomComplet(), p.getDate(),
                p.getHeureArrivee(), p.getHeureDepart(), duree);
    }
}
