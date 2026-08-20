package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "rapport_rh")
public class RapportRH {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titre;

    @Column(length = 50)
    private String typeRapport;

    @Column(nullable = false)
    private LocalDateTime dateGeneration;

    @Column(length = 10)
    private String format;

    @Column(length = 255)
    private String fichier;

    public RapportRH() {
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

    public String getTypeRapport() {
        return typeRapport;
    }

    public void setTypeRapport(String typeRapport) {
        this.typeRapport = typeRapport;
    }

    public LocalDateTime getDateGeneration() {
        return dateGeneration;
    }

    public void setDateGeneration(LocalDateTime dateGeneration) {
        this.dateGeneration = dateGeneration;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public String getFichier() {
        return fichier;
    }

    public void setFichier(String fichier) {
        this.fichier = fichier;
    }
}
