package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "remboursement")
public class Remboursement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "note_frais_id", nullable = false)
    private NoteFrais noteFrais;

    @Column(nullable = false)
    private double montant;

    @Column(length = 20)
    private String mode = "VIREMENT";

    @Column(nullable = false)
    private LocalDateTime dateRemboursement;

    public Remboursement() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public NoteFrais getNoteFrais() {
        return noteFrais;
    }

    public void setNoteFrais(NoteFrais noteFrais) {
        this.noteFrais = noteFrais;
    }

    public double getMontant() {
        return montant;
    }

    public void setMontant(double montant) {
        this.montant = montant;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public LocalDateTime getDateRemboursement() {
        return dateRemboursement;
    }

    public void setDateRemboursement(LocalDateTime dateRemboursement) {
        this.dateRemboursement = dateRemboursement;
    }
}
