package com.gns.sirh.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "solde_conge", uniqueConstraints = @UniqueConstraint(columnNames = {"employe_id", "annee"}))
public class SoldeConge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employe_id", nullable = false)
    private Employe employe;

    @Column(nullable = false)
    private int annee;

    @Column(nullable = false)
    private double soldeAnnuelAcquis;

    @Column(nullable = false)
    private double soldeConsomme;

    @Column(nullable = false)
    private double soldeRestant;

    public SoldeConge() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Employe getEmploye() {
        return employe;
    }

    public void setEmploye(Employe employe) {
        this.employe = employe;
    }

    public int getAnnee() {
        return annee;
    }

    public void setAnnee(int annee) {
        this.annee = annee;
    }

    public double getSoldeAnnuelAcquis() {
        return soldeAnnuelAcquis;
    }

    public void setSoldeAnnuelAcquis(double soldeAnnuelAcquis) {
        this.soldeAnnuelAcquis = soldeAnnuelAcquis;
    }

    public double getSoldeConsomme() {
        return soldeConsomme;
    }

    public void setSoldeConsomme(double soldeConsomme) {
        this.soldeConsomme = soldeConsomme;
    }

    public double getSoldeRestant() {
        return soldeRestant;
    }

    public void setSoldeRestant(double soldeRestant) {
        this.soldeRestant = soldeRestant;
    }
}
