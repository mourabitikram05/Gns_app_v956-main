package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "candidature")
public class Candidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "offre_id", nullable = false)
    private OffreEmploi offre;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidat_id", nullable = false)
    private Candidat candidat;

    /** BOITE_RECEPTION / BROUILLON / ENTRETIEN_TEL / ENTRETIEN_PHYSIQUE / EMBAUCHE */
    @Column(nullable = false, length = 25)
    private String etape = "BOITE_RECEPTION";

    private LocalDateTime dateEntretien;

    @Column(nullable = false)
    private LocalDateTime dateCreation;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "candidature_historique", joinColumns = @JoinColumn(name = "candidature_id"))
    @Column(name = "evenement", length = 500)
    private List<String> historique = new ArrayList<>();

    public Candidature() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public OffreEmploi getOffre() {
        return offre;
    }

    public void setOffre(OffreEmploi offre) {
        this.offre = offre;
    }

    public Candidat getCandidat() {
        return candidat;
    }

    public void setCandidat(Candidat candidat) {
        this.candidat = candidat;
    }

    public String getEtape() {
        return etape;
    }

    public void setEtape(String etape) {
        this.etape = etape;
    }

    public LocalDateTime getDateEntretien() {
        return dateEntretien;
    }

    public void setDateEntretien(LocalDateTime dateEntretien) {
        this.dateEntretien = dateEntretien;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public List<String> getHistorique() {
        return historique;
    }

    public void setHistorique(List<String> historique) {
        this.historique = historique;
    }
}
