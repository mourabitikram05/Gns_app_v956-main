package com.gns.sirh.config;

import com.gns.sirh.entity.RoleType;
import com.gns.sirh.entity.Utilisateur;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(Utilisateur utilisateur) {
        Long employeId = utilisateur.getEmploye() != null ? utilisateur.getEmploye().getId() : null;
        Date now = new Date();
        return Jwts.builder()
                .setSubject(utilisateur.getEmail())
                .addClaims(Map.of(
                        "uid", utilisateur.getId(),
                        "eid", employeId == null ? -1L : employeId,
                        "role", utilisateur.getRole().name()
                ))
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + expirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String extractEmail(String token) {
        return parseToken(token).getSubject();
    }

    public Long extractUtilisateurId(String token) {
        return parseToken(token).get("uid", Long.class);
    }

    public Long extractEmployeId(String token) {
        Long eid = parseToken(token).get("eid", Long.class);
        return eid != null && eid > 0 ? eid : null;
    }

    public RoleType extractRole(String token) {
        return RoleType.valueOf(parseToken(token).get("role", String.class));
    }
}
