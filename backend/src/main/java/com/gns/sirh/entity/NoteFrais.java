package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "note_frais")
public class NoteFrais {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employe_id", nullable = false)
    private Employe employe;

    @Column(nullable = false, length = 150)
    private String titre;

    @Column(length = 5)
    private String devise = "MAD";

    @Column(nullable = false)
    private LocalDate date;

    @Column(length = 20)
    private String priorite = "Normale";

    @Column(length = 500)
    private String remarque;

    @Column(nullable = false)
    private double montantTotal;

    /** EN_ATTENTE / EN_COURS / REMBOURSEE / REFUSEE / ANNULEE */
    @Column(nullable = false, length = 15)
    private String statut = "EN_ATTENTE";

    @Column(nullable = false)
    private LocalDateTime dateCreation;

    @Column(length = 500)
    private String motifRefus;

    private LocalDateTime dateTraitement;

    @OneToMany(mappedBy = "noteFrais", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Depense> depenses = new ArrayList<>();

    @OneToMany(mappedBy = "noteFrais", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Justificatif> justificatifs = new ArrayList<>();

    public NoteFrais() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public Employe getEmploye() {
        return employe;
    }

    public void setEmploye(Employe employe) {
        this.employe = employe;
    }

    public String getTitre() {
        return titre;
    }

    public void setTitre(String titre) {
        this.titre = titre;
    }

    public String getDevise() {
        return devise;
    }

    public void setDevise(String devise) {
        this.devise = devise;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getPriorite() {
        return priorite;
    }

    public void setPriorite(String priorite) {
        this.priorite = priorite;
    }

    public String getRemarque() {
        return remarque;
    }

    public void setRemarque(String remarque) {
        this.remarque = remarque;
    }

    public double getMontantTotal() {
        return montantTotal;
    }

    public void setMontantTotal(double montantTotal) {
        this.montantTotal = montantTotal;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public String getMotifRefus() {
        return motifRefus;
    }

    public void setMotifRefus(String motifRefus) {
        this.motifRefus = motifRefus;
    }

    public LocalDateTime getDateTraitement() {
        return dateTraitement;
    }

    public void setDateTraitement(LocalDateTime dateTraitement) {
        this.dateTraitement = dateTraitement;
    }

    public List<Depense> getDepenses() {
        return depenses;
    }

    public void setDepenses(List<Depense> depenses) {
        this.depenses = depenses;
    }

    public List<Justificatif> getJustificatifs() {
        return justificatifs;
    }

    public void setJustificatifs(List<Justificatif> justificatifs) {
        this.justificatifs = justificatifs;
    }
}
