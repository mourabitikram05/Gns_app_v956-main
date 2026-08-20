package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "demande_document")
public class DemandeDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employe_id", nullable = false)
    private Employe employe;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "type_document_id", nullable = false)
    private DocumentType typeDocument;

    /** DIGITAL ou PAPIER */
    @Column(nullable = false, length = 10)
    private String format;

    @Column(nullable = false)
    private LocalDateTime dateDemande;

    @Column(nullable = false, length = 15)
    private String statut = "EN_TRAITEMENT";

    @Column(length = 500)
    private String motifRefus;

    @Column(length = 500)
    private String remarque;

    /** Chemin du document final généré (PDF) une fois traité. */
    @Column(length = 255)
    private String fichierUrl;

    private LocalDateTime dateTraitement;

    /** Signature numérique de l'administration (email du signataire RH). */
    @Column(length = 120)
    private String signataire;

    private LocalDateTime dateSignature;

    public DemandeDocument() {
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

    public DocumentType getTypeDocument() {
        return typeDocument;
    }

    public void setTypeDocument(DocumentType typeDocument) {
        this.typeDocument = typeDocument;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public LocalDateTime getDateDemande() {
        return dateDemande;
    }

    public void setDateDemande(LocalDateTime dateDemande) {
        this.dateDemande = dateDemande;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public String getMotifRefus() {
        return motifRefus;
    }

    public void setMotifRefus(String motifRefus) {
        this.motifRefus = motifRefus;
    }

    public String getRemarque() {
        return remarque;
    }

    public void setRemarque(String remarque) {
        this.remarque = remarque;
    }

    public String getFichierUrl() {
        return fichierUrl;
    }

    public void setFichierUrl(String fichierUrl) {
        this.fichierUrl = fichierUrl;
    }

    public LocalDateTime getDateTraitement() {
        return dateTraitement;
    }

    public void setDateTraitement(LocalDateTime dateTraitement) {
        this.dateTraitement = dateTraitement;
    }

    public String getSignataire() {
        return signataire;
    }

    public void setSignataire(String signataire) {
        this.signataire = signataire;
    }

    public LocalDateTime getDateSignature() {
        return dateSignature;
    }

    public void setDateSignature(LocalDateTime dateSignature) {
        this.dateSignature = dateSignature;
    }
}
