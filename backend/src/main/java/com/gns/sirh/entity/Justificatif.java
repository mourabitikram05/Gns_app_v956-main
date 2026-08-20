package com.gns.sirh.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "justificatif")
public class Justificatif {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "note_frais_id", nullable = false)
    private NoteFrais noteFrais;

    @Column(nullable = false, length = 255)
    private String fichierUrl;

    @Column(length = 150)
    private String nomOriginal;

    public Justificatif() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public NoteFrais getNoteFrais() {
        return noteFrais;
    }

    public void setNoteFrais(NoteFrais noteFrais) {
        this.noteFrais = noteFrais;
    }

    public String getFichierUrl() {
        return fichierUrl;
    }

    public void setFichierUrl(String fichierUrl) {
        this.fichierUrl = fichierUrl;
    }

    public String getNomOriginal() {
        return nomOriginal;
    }

    public void setNomOriginal(String nomOriginal) {
        this.nomOriginal = nomOriginal;
    }
}
