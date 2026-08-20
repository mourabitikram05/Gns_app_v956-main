package com.gns.sirh.dto;

/**
 * Synthèse des 4 cartes du collaborateur : comptage + montant par statut.
 */
public record SyntheseFrais(Carte enAttente, Carte enCours, Carte remboursee, Carte refusee) {

    public record Carte(int count, double montant) {
    }
}
