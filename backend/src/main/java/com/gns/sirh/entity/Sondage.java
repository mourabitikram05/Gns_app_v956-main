package com.gns.sirh.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Sondage du jour : une question posée aux collaborateurs avec plusieurs options.
 */
@Entity
@Table(name = "sondages")
public class Sondage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String question;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "sondage_options", joinColumns = @JoinColumn(name = "sondage_id"))
    @Column(name = "option_label", length = 120)
    @OrderColumn(name = "position")
    private List<String> options = new ArrayList<>();

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private boolean actif = true;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public List<String> getOptions() {
        return options;
    }

    public void setOptions(List<String> options) {
        this.options = options;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }
}
