package com.gns.sirh.config;

import com.gns.sirh.entity.RoleType;
import com.gns.sirh.repository.UtilisateurRepository;
import com.gns.sirh.security.AuthUser;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtService jwtService;
    private final UtilisateurRepository utilisateurRepository;

    public JwtAuthFilter(JwtService jwtService, UtilisateurRepository utilisateurRepository) {
        this.jwtService = jwtService;
        this.utilisateurRepository = utilisateurRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        try {
            Claims claims = jwtService.parseToken(token);
            String email = claims.getSubject();
            Long uid = claims.get("uid", Long.class);
            Long eid = claims.get("eid", Long.class);
            if (eid != null && eid <= 0) {
                eid = null;
            }
            String roleName = claims.get("role", String.class);

            // Révocation : le compte doit toujours être ACTIF, sinon le token est rejeté
            boolean compteActif = uid != null
                    && utilisateurRepository.findById(uid)
                    .map(u -> "ACTIF".equalsIgnoreCase(u.getStatut()))
                    .orElse(false);

            if (email != null && compteActif
                    && SecurityContextHolder.getContext().getAuthentication() == null) {
                AuthUser principal = new AuthUser(uid, eid, email, RoleType.valueOf(roleName));
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + roleName)));
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } else if (uid != null && !compteActif) {
                log.debug("Token rejeté : compte {} inactif ou supprimé", email);
            }
        } catch (Exception ex) {
            log.debug("Token JWT invalide ou expiré: {}", ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
