package com.gns.sirh.repository;

import com.gns.sirh.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findTop10ByOrderByDateActionDesc();

    List<AuditLog> findAllByOrderByDateActionDesc();
}
