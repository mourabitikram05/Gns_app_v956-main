package com.gns.sirh.repository;

import com.gns.sirh.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {

    List<Permission> findAllByOrderByModuleAscNomAsc();

    Optional<Permission> findByCode(String code);
}
