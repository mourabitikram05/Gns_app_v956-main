package com.gns.sirh.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "competence")
public class Competence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(length = 255)
    private String description;

    @Column(length = 50)
    private String niveau;

    public Competence() {
    }

    public Competence(String nom, String description, String niveau) {
        this.nom = nom;
        this.description = description;
        this.niveau = niveau;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getNiveau() {
        return niveau;
    }

    public void setNiveau(String niveau) {
        this.niveau = niveau;
    }
}
