package com.gns.sirh.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "employe")
public class Employe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String matricule;

    @Column(length = 20)
    private String cin;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(nullable = false, length = 100)
    private String prenom;

    private LocalDate dateNaissance;

    @Enumerated(EnumType.STRING)
    @Column(length = 1)
    private Sexe sexe;

    @Column(length = 60)
    private String nationalite;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(length = 30)
    private String telephone;

    @Column(length = 255)
    private String adresse;

    @Column(length = 255)
    private String photo;

    @Column(nullable = false)
    private LocalDate dateEmbauche;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatutEmploye statut = StatutEmploye.ACTIF;

    @Column(length = 80)
    private String bureau;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Employe responsable;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "departement_id")
    private Departement departement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poste_id")
    private Poste poste;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_id")
    private Equipe equipe;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "employe_competence",
            joinColumns = @JoinColumn(name = "employe_id"),
            inverseJoinColumns = @JoinColumn(name = "competence_id")
    )
    private List<Competence> competences = new ArrayList<>();

    /** Missions / responsabilités descriptives rattachées au profil. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "employe_mission", joinColumns = @JoinColumn(name = "employe_id"))
    @Column(name = "mission", length = 255)
    private List<String> missions = new ArrayList<>();

    @OneToOne(mappedBy = "employe", fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Utilisateur utilisateur;

    public Employe() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMatricule() {
        return matricule;
    }

    public void setMatricule(String matricule) {
        this.matricule = matricule;
    }

    public String getCin() {
        return cin;
    }

    public void setCin(String cin) {
        this.cin = cin;
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

    public LocalDate getDateNaissance() {
        return dateNaissance;
    }

    public void setDateNaissance(LocalDate dateNaissance) {
        this.dateNaissance = dateNaissance;
    }

    public Sexe getSexe() {
        return sexe;
    }

    public void setSexe(Sexe sexe) {
        this.sexe = sexe;
    }

    public String getNationalite() {
        return nationalite;
    }

    public void setNationalite(String nationalite) {
        this.nationalite = nationalite;
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

    public String getAdresse() {
        return adresse;
    }

    public void setAdresse(String adresse) {
        this.adresse = adresse;
    }

    public String getPhoto() {
        return photo;
    }

    public void setPhoto(String photo) {
        this.photo = photo;
    }

    public LocalDate getDateEmbauche() {
        return dateEmbauche;
    }

    public void setDateEmbauche(LocalDate dateEmbauche) {
        this.dateEmbauche = dateEmbauche;
    }

    public StatutEmploye getStatut() {
        return statut;
    }

    public void setStatut(StatutEmploye statut) {
        this.statut = statut;
    }

    public String getBureau() {
        return bureau;
    }

    public void setBureau(String bureau) {
        this.bureau = bureau;
    }

    public Employe getResponsable() {
        return responsable;
    }

    public void setResponsable(Employe responsable) {
        this.responsable = responsable;
    }

    public Departement getDepartement() {
        return departement;
    }

    public void setDepartement(Departement departement) {
        this.departement = departement;
    }

    public Poste getPoste() {
        return poste;
    }

    public void setPoste(Poste poste) {
        this.poste = poste;
    }

    public Equipe getEquipe() {
        return equipe;
    }

    public void setEquipe(Equipe equipe) {
        this.equipe = equipe;
    }

    public List<Competence> getCompetences() {
        return competences;
    }

    public void setCompetences(List<Competence> competences) {
        this.competences = competences;
    }

    public List<String> getMissions() {
        return missions;
    }

    public void setMissions(List<String> missions) {
        this.missions = missions;
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(Utilisateur utilisateur) {
        this.utilisateur = utilisateur;
    }

    public String getNomComplet() {
        return prenom + " " + nom;
    }

    public String getInitiales() {
        String p = prenom == null ? "" : prenom.trim();
        String n = nom == null ? "" : nom.trim();
        char a = p.isEmpty() ? (n.isEmpty() ? '?' : n.charAt(0)) : p.charAt(0);
        char b = n.isEmpty() ? ' ' : n.charAt(0);
        return ("" + a + b).toUpperCase();
    }
}
