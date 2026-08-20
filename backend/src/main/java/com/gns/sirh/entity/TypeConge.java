package com.gns.sirh.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "type_conge")
public class TypeConge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String nom;

    @Column(length = 10)
    private String code;

    /** Couleur d'affichage (hex) pour le calendrier. */
    @Column(length = 10)
    private String couleur;

    /** Nombre maximum de jours par an (0 = illimité). */
    private int joursMaxParAn;

    /** true si ce type consomme le solde de congés. */
    @Column(nullable = false)
    private boolean consommeSolde = true;

    /** true si un justificatif est obligatoire. */
    @Column(nullable = false)
    private boolean besoinJustificatif = false;

    @Column(length = 255)
    private String regleAcquisition;

    public TypeConge() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getCouleur() {
        return couleur;
    }

    public void setCouleur(String couleur) {
        this.couleur = couleur;
    }

    public int getJoursMaxParAn() {
        return joursMaxParAn;
    }

    public void setJoursMaxParAn(int joursMaxParAn) {
        this.joursMaxParAn = joursMaxParAn;
    }

    public boolean isConsommeSolde() {
        return consommeSolde;
    }

    public void setConsommeSolde(boolean consommeSolde) {
        this.consommeSolde = consommeSolde;
    }

    public boolean isBesoinJustificatif() {
        return besoinJustificatif;
    }

    public void setBesoinJustificatif(boolean besoinJustificatif) {
        this.besoinJustificatif = besoinJustificatif;
    }

    public String getRegleAcquisition() {
        return regleAcquisition;
    }

    public void setRegleAcquisition(String regleAcquisition) {
        this.regleAcquisition = regleAcquisition;
    }
}
