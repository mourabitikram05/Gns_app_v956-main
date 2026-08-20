package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "validation")
public class Validation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "demande_id", nullable = false)
    private DemandeConge demandeConge;

    @Column(length = 150)
    private String validateur;

    private Long validateurId;

    @Column(nullable = false, length = 15)
    private String decision;

    @Column(nullable = false)
    private LocalDateTime dateValidation;

    @Column(length = 500)
    private String motif;

    public Validation() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public DemandeConge getDemandeConge() {
        return demandeConge;
    }

    public void setDemandeConge(DemandeConge demandeConge) {
        this.demandeConge = demandeConge;
    }

    public String getValidateur() {
        return validateur;
    }

    public void setValidateur(String validateur) {
        this.validateur = validateur;
    }

    public Long getValidateurId() {
        return validateurId;
    }

    public void setValidateurId(Long validateurId) {
        this.validateurId = validateurId;
    }

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public LocalDateTime getDateValidation() {
        return dateValidation;
    }

    public void setDateValidation(LocalDateTime dateValidation) {
        this.dateValidation = dateValidation;
    }

    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }
}
