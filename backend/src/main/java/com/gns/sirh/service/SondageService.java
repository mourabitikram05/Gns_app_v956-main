package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.SondageDto;
import com.gns.sirh.dto.SondageRequest;
import com.gns.sirh.entity.Employe;
import com.gns.sirh.entity.ReponseSondage;
import com.gns.sirh.entity.Sondage;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.repository.ReponseSondageRepository;
import com.gns.sirh.repository.SondageRepository;
import com.gns.sirh.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SondageService {

    private static final String QUESTION_PAR_DEFAUT = "Comment évaluez-vous votre journée ?";
    private static final List<String> OPTIONS_PAR_DEFAUT = List.of("Très bonne", "Bonne", "Neutre", "Difficile");

    private final SondageRepository sondageRepository;
    private final ReponseSondageRepository reponseRepository;
    private final EmployeRepository employeRepository;
    private final AuditService auditService;

    public SondageService(SondageRepository sondageRepository,
                          ReponseSondageRepository reponseRepository,
                          EmployeRepository employeRepository,
                          AuditService auditService) {
        this.sondageRepository = sondageRepository;
        this.reponseRepository = reponseRepository;
        this.employeRepository = employeRepository;
        this.auditService = auditService;
    }

    /**
     * Sondage du jour pour le collaborateur connecté (crée un sondage par défaut si aucun n'existe).
     */
    @Transactional
    public SondageDto aujourdhui(AuthUser user) {
        LocalDate today = LocalDate.now();
        Sondage sondage = sondageRepository.findFirstByDateOrderByIdDesc(today)
                .orElseGet(() -> {
                    Sondage defaut = new Sondage();
                    defaut.setQuestion(QUESTION_PAR_DEFAUT);
                    defaut.setOptions(new java.util.ArrayList<>(OPTIONS_PAR_DEFAUT));
                    defaut.setDate(today);
                    defaut.setActif(true);
                    return sondageRepository.save(defaut);
                });
        return toDto(sondage, user.employeId());
    }

    /**
     * Le collaborateur répond au sondage (un seul vote possible).
     */
    @Transactional
    public SondageDto repondre(Long id, String option, AuthUser user) {
        Long employeId = user.employeId();
        if (employeId == null) {
            throw new BusinessException("Aucun employé lié à votre compte");
        }
        Sondage sondage = sondageRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Sondage introuvable"));
        if (!sondage.isActif()) {
            throw new BusinessException("Ce sondage est clôturé");
        }
        if (option == null || option.isBlank() || !sondage.getOptions().contains(option)) {
            throw new BusinessException("Option de réponse invalide");
        }
        if (reponseRepository.findBySondageIdAndEmployeId(id, employeId).isPresent()) {
            throw new BusinessException("Vous avez déjà répondu à ce sondage");
        }
        Employe employe = employeRepository.findById(employeId)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        ReponseSondage reponse = new ReponseSondage();
        reponse.setSondage(sondage);
        reponse.setEmploye(employe);
        reponse.setOptionChoisie(option);
        reponseRepository.save(reponse);
        auditService.log(user.email(), "SONDAGE", "Réponse au sondage « " + sondage.getQuestion() + " »");
        return toDto(sondage, employeId);
    }

    /**
     * Liste des sondages avec résultats (RH).
     */
    @Transactional(readOnly = true)
    public List<SondageDto> lister() {
        return sondageRepository.findAllByOrderByDateDesc().stream()
                .map(s -> toDto(s, null))
                .toList();
    }

    /**
     * Création d'un nouveau sondage (RH) — il devient le sondage actif du jour.
     */
    @Transactional
    public SondageDto creer(SondageRequest req, String acteur) {
        LocalDate date = req.date() != null ? req.date() : LocalDate.now();
        Sondage sondage = new Sondage();
        sondage.setQuestion(req.question().trim());
        sondage.setOptions(new java.util.ArrayList<>(req.options().stream().map(String::trim).filter(s -> !s.isBlank()).toList()));
        sondage.setDate(date);
        sondage.setActif(true);
        Sondage saved = sondageRepository.save(sondage);
        auditService.log(acteur, "SONDAGE", "Sondage créé : « " + saved.getQuestion() + " »");
        return toDto(saved, null);
    }

    /**
     * Modification d'un sondage (RH).
     */
    @Transactional
    public SondageDto modifier(Long id, SondageRequest req, String acteur) {
        Sondage sondage = sondageRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Sondage introuvable"));
        if (req.question() != null && !req.question().isBlank()) {
            sondage.setQuestion(req.question().trim());
        }
        if (req.options() != null && req.options().size() >= 2) {
            sondage.setOptions(new java.util.ArrayList<>(req.options().stream().map(String::trim).filter(s -> !s.isBlank()).toList()));
        }
        Sondage saved = sondageRepository.save(sondage);
        auditService.log(acteur, "SONDAGE", "Sondage modifié : « " + saved.getQuestion() + " »");
        return toDto(saved, null);
    }

    private SondageDto toDto(Sondage sondage, Long employeId) {
        Map<String, Long> parOption = new LinkedHashMap<>();
        for (String option : sondage.getOptions()) {
            parOption.put(option, reponseRepository.countBySondageIdAndOptionChoisie(sondage.getId(), option));
        }
        long total = reponseRepository.countBySondageId(sondage.getId());
        boolean aVote = false;
        String optionChoisie = null;
        if (employeId != null) {
            var reponse = reponseRepository.findBySondageIdAndEmployeId(sondage.getId(), employeId);
            if (reponse.isPresent()) {
                aVote = true;
                optionChoisie = reponse.get().getOptionChoisie();
            }
        }
        return new SondageDto(sondage.getId(), sondage.getQuestion(), List.copyOf(sondage.getOptions()),
                sondage.getDate(), sondage.isActif(), total, parOption, aVote, optionChoisie);
    }
}
