package com.gns.sirh.service;

import com.gns.sirh.entity.AuditLog;
import com.gns.sirh.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String acteur, String action, String detail) {
        auditLogRepository.save(new AuditLog(acteur, action, detail));
    }
}
