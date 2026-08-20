package com.gns.sirh.dto;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Grille planning RH : une ligne par collaborateur, une colonne par jour.
 * jours : "1" -> {code, libelle, couleur, demandeId}
 * presentParJour : "1" -> nombre de collaborateurs présents ce jour-là.
 */
public class CalendrierEquipeResponse {

    private int mois;
    private int annee;
    private List<LigneCollaborateur> employes;
    private Map<Integer, Integer> presentParJour = new LinkedHashMap<>();

    public static class LigneCollaborateur {
        private Long employeId;
        private String nom;
        private String initiales;
        private String departement;
        private Map<Integer, Cellule> jours = new LinkedHashMap<>();

        public Long getEmployeId() {
            return employeId;
        }

        public void setEmployeId(Long employeId) {
            this.employeId = employeId;
        }

        public String getNom() {
            return nom;
        }

        public void setNom(String nom) {
            this.nom = nom;
        }

        public String getInitiales() {
            return initiales;
        }

        public void setInitiales(String initiales) {
            this.initiales = initiales;
        }

        public String getDepartement() {
            return departement;
        }

        public void setDepartement(String departement) {
            this.departement = departement;
        }

        public Map<Integer, Cellule> getJours() {
            return jours;
        }

        public void setJours(Map<Integer, Cellule> jours) {
            this.jours = jours;
        }
    }

    public static class Cellule {
        private String code;
        private String libelle;
        private String couleur;
        private Long demandeId;

        public Cellule() {
        }

        public Cellule(String code, String libelle, String couleur, Long demandeId) {
            this.code = code;
            this.libelle = libelle;
            this.couleur = couleur;
            this.demandeId = demandeId;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getLibelle() {
            return libelle;
        }

        public void setLibelle(String libelle) {
            this.libelle = libelle;
        }

        public String getCouleur() {
            return couleur;
        }

        public void setCouleur(String couleur) {
            this.couleur = couleur;
        }

        public Long getDemandeId() {
            return demandeId;
        }

        public void setDemandeId(Long demandeId) {
            this.demandeId = demandeId;
        }
    }

    public int getMois() {
        return mois;
    }

    public void setMois(int mois) {
        this.mois = mois;
    }

    public int getAnnee() {
        return annee;
    }

    public void setAnnee(int annee) {
        this.annee = annee;
    }

    public List<LigneCollaborateur> getEmployes() {
        return employes;
    }

    public void setEmployes(List<LigneCollaborateur> employes) {
        this.employes = employes;
    }

    public Map<Integer, Integer> getPresentParJour() {
        return presentParJour;
    }

    public void setPresentParJour(Map<Integer, Integer> presentParJour) {
        this.presentParJour = presentParJour;
    }
}
