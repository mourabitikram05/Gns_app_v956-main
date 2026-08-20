package com.gns.sirh.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "candidat")
public class Candidat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(nullable = false, length = 100)
    private String prenom;

    @Column(nullable = false, length = 120)
    private String email;

    @Column(length = 30)
    private String telephone;

    @Column(length = 255)
    private String linkedin;

    @Column(length = 255)
    private String cvUrl;

    @Column(length = 255)
    private String lettreMotivationUrl;

    public Candidat() {
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

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public String getLinkedin() {
        return linkedin;
    }

    public void setLinkedin(String linkedin) {
        this.linkedin = linkedin;
    }

    public String getCvUrl() {
        return cvUrl;
    }

    public void setCvUrl(String cvUrl) {
        this.cvUrl = cvUrl;
    }

    public String getLettreMotivationUrl() {
        return lettreMotivationUrl;
    }

    public void setLettreMotivationUrl(String lettreMotivationUrl) {
        this.lettreMotivationUrl = lettreMotivationUrl;
    }

    public String getNomComplet() {
        return prenom + " " + nom;
    }

    public String getInitiales() {
        char a = prenom == null || prenom.isBlank() ? '?' : prenom.charAt(0);
        char b = nom == null || nom.isBlank() ? ' ' : nom.charAt(0);
        return ("" + a + b).toUpperCase();
    }
}
