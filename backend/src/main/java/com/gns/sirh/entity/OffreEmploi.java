package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "offre_emploi")
public class OffreEmploi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titre;

    @Column(length = 100)
    private String departement;

    @Column(length = 50)
    private String typeContrat;

    @Column(length = 50)
    private String niveau;

    /** HYBRIDE / REMOTE / SUR_PLACE */
    @Column(length = 20)
    private String mode;

    @Column(nullable = false, length = 10)
    private String statut = "OUVERTE";

    @Column(nullable = false)
    private LocalDateTime datePublication;

    public OffreEmploi() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitre() {
        return titre;
    }

    public void setTitre(String titre) {
        this.titre = titre;
    }

    public String getDepartement() {
        return departement;
    }

    public void setDepartement(String departement) {
        this.departement = departement;
    }

    public String getTypeContrat() {
        return typeContrat;
    }

    public void setTypeContrat(String typeContrat) {
        this.typeContrat = typeContrat;
    }

    public String getNiveau() {
        return niveau;
    }

    public void setNiveau(String niveau) {
        this.niveau = niveau;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public LocalDateTime getDatePublication() {
        return datePublication;
    }

    public void setDatePublication(LocalDateTime datePublication) {
        this.datePublication = datePublication;
    }
}
