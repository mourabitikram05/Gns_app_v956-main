package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Réponse d'un collaborateur à un sondage (un seul vote par employé et par sondage).
 */
@Entity
@Table(name = "reponses_sondage",
        uniqueConstraints = @UniqueConstraint(name = "uk_sondage_employe", columnNames = {"sondage_id", "employe_id"}))
public class ReponseSondage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sondage_id")
    private Sondage sondage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employe_id")
    private Employe employe;

    @Column(nullable = false, length = 120)
    private String optionChoisie;

    @Column(nullable = false)
    private LocalDateTime dateReponse = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Sondage getSondage() {
        return sondage;
    }

    public void setSondage(Sondage sondage) {
        this.sondage = sondage;
    }

    public Employe getEmploye() {
        return employe;
    }

    public void setEmploye(Employe employe) {
        this.employe = employe;
    }

    public String getOptionChoisie() {
        return optionChoisie;
    }

    public void setOptionChoisie(String optionChoisie) {
        this.optionChoisie = optionChoisie;
    }

    public LocalDateTime getDateReponse() {
        return dateReponse;
    }

    public void setDateReponse(LocalDateTime dateReponse) {
        this.dateReponse = dateReponse;
    }
}
