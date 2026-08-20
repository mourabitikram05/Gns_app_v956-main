package com.gns.sirh.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "depense")
public class Depense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "note_frais_id", nullable = false)
    private NoteFrais noteFrais;

    @Column(nullable = false, length = 150)
    private String libelle;

    @Column(nullable = false)
    private double montant;

    public Depense() {
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

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public double getMontant() {
        return montant;
    }

    public void setMontant(double montant) {
        this.montant = montant;
    }
}
