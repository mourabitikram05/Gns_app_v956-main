package com.gns.sirh.repository;

import com.gns.sirh.entity.RolePermission;
import com.gns.sirh.entity.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    List<RolePermission> findByRole(RoleType role);

    boolean existsByRoleAndPermissionCode(RoleType role, String code);
}
