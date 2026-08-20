package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "absence")
public class Absence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employe_id", nullable = false)
    private Employe employe;

    @Column(nullable = false)
    private LocalDate dateAbsence;

    private LocalTime heureDebut;

    private LocalTime heureFin;

    /** Code du type (CA, M, AJ...) — référence le TypeConge correspondant. */
    @Column(length = 10)
    private String typeAbsence;

    @Column(length = 150)
    private String libelle;

    @Column(length = 255)
    private String pieceJustificative;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "demande_id")
    private DemandeConge demandeConge;

    public Absence() {
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

    public LocalDate getDateAbsence() {
        return dateAbsence;
    }

    public void setDateAbsence(LocalDate dateAbsence) {
        this.dateAbsence = dateAbsence;
    }

    public LocalTime getHeureDebut() {
        return heureDebut;
    }

    public void setHeureDebut(LocalTime heureDebut) {
        this.heureDebut = heureDebut;
    }

    public LocalTime getHeureFin() {
        return heureFin;
    }

    public void setHeureFin(LocalTime heureFin) {
        this.heureFin = heureFin;
    }

    public String getTypeAbsence() {
        return typeAbsence;
    }

    public void setTypeAbsence(String typeAbsence) {
        this.typeAbsence = typeAbsence;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getPieceJustificative() {
        return pieceJustificative;
    }

    public void setPieceJustificative(String pieceJustificative) {
        this.pieceJustificative = pieceJustificative;
    }

    public DemandeConge getDemandeConge() {
        return demandeConge;
    }

    public void setDemandeConge(DemandeConge demandeConge) {
        this.demandeConge = demandeConge;
    }
}
