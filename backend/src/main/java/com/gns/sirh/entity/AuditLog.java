package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 150)
    private String acteur;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(length = 500)
    private String detail;

    @Column(nullable = false)
    private LocalDateTime dateAction;

    public AuditLog() {
    }

    public AuditLog(String acteur, String action, String detail) {
        this.acteur = acteur;
        this.action = action;
        this.detail = detail;
        this.dateAction = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getActeur() {
        return acteur;
    }

    public void setActeur(String acteur) {
        this.acteur = acteur;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public LocalDateTime getDateAction() {
        return dateAction;
    }

    public void setDateAction(LocalDateTime dateAction) {
        this.dateAction = dateAction;
    }
}
