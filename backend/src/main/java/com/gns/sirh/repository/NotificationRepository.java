package com.gns.sirh.repository;

import com.gns.sirh.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    long countByEmployeIdAndLuFalse(Long employeId);

    List<Notification> findTop10ByEmployeIdOrderByDateEnvoiDesc(Long employeId);

    List<Notification> findByEmployeIdOrderByDateEnvoiDesc(Long employeId);
}
