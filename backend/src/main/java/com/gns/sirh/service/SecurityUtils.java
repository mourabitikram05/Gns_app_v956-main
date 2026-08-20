package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.security.AuthUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static AuthUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser au) {
            return au;
        }
        throw new BusinessException("Utilisateur non authentifié");
    }
}
