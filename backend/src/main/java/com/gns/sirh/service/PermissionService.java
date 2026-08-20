package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.entity.Permission;
import com.gns.sirh.entity.RolePermission;
import com.gns.sirh.entity.RoleType;
import com.gns.sirh.repository.PermissionRepository;
import com.gns.sirh.repository.RolePermissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public PermissionService(PermissionRepository permissionRepository,
                             RolePermissionRepository rolePermissionRepository) {
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    @Transactional(readOnly = true)
    public List<Permission> toutesLesPermissions() {
        return permissionRepository.findAllByOrderByModuleAscNomAsc();
    }

    @Transactional(readOnly = true)
    public Map<String, List<String>> rolesAvecPermissions() {
        Map<String, List<String>> resultat = new LinkedHashMap<>();
        for (RoleType role : RoleType.values()) {
            resultat.put(role.name(), rolePermissionRepository.findByRole(role)
                    .stream().map(rp -> rp.getPermission().getCode()).sorted().toList());
        }
        return resultat;
    }

    @Transactional
    public Map<String, List<String>> majPermissions(String roleName, List<String> codes) {
        RoleType role = RoleType.valueOf(roleName);
        rolePermissionRepository.findByRole(role).forEach(rolePermissionRepository::delete);
        rolePermissionRepository.flush();
        for (String code : codes) {
            Permission p = permissionRepository.findByCode(code)
                    .orElseThrow(() -> new BusinessException("Permission inconnue : " + code));
            RolePermission rp = new RolePermission();
            rp.setRole(role);
            rp.setPermission(p);
            rolePermissionRepository.save(rp);
        }
        return rolesAvecPermissions();
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(RoleType role, String code) {
        return rolePermissionRepository.existsByRoleAndPermissionCode(role, code);
    }
}
