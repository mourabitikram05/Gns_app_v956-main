package com.gns.sirh.config;

import com.gns.sirh.service.PermissionService;
import com.gns.sirh.service.SecurityUtils;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Applique la matrice de permissions : lève une AccessDeniedException (→ 403)
 * si le rôle de l'utilisateur connecté n'a pas la permission requise.
 */
@Aspect
@Component
public class PermissionAspect {

    private final PermissionService permissionService;

    public PermissionAspect(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @Before("@annotation(permissionRequired)")
    public void verifier(JoinPoint joinPoint, PermissionRequired permissionRequired) {
        var user = SecurityUtils.currentUser();
        if (!permissionService.hasPermission(user.role(), permissionRequired.value())) {
            throw new AccessDeniedException("Permission requise : " + permissionRequired.value());
        }
    }
}
