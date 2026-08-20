package com.gns.sirh.service;

import com.gns.sirh.common.ApiPage;
import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.EmployeDetail;
import com.gns.sirh.dto.EmployeListItem;
import com.gns.sirh.dto.EmployeRequest;
import com.gns.sirh.entity.*;
import com.gns.sirh.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EmployeService {

    private final EmployeRepository employeRepository;
    private final DepartementRepository departementRepository;
    private final PosteRepository posteRepository;
    private final EquipeRepository equipeRepository;
    private final CompetenceRepository competenceRepository;
    private final AuditService auditService;

    public EmployeService(EmployeRepository employeRepository,
                          DepartementRepository departementRepository,
                          PosteRepository posteRepository,
                          EquipeRepository equipeRepository,
                          CompetenceRepository competenceRepository,
                          AuditService auditService) {
        this.employeRepository = employeRepository;
        this.departementRepository = departementRepository;
        this.posteRepository = posteRepository;
        this.equipeRepository = equipeRepository;
        this.competenceRepository = competenceRepository;
        this.auditService = auditService;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ApiPage<EmployeListItem> search(String q, String departement, int page, int size, boolean includeInactifs) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by("nom").ascending());
        Page<Employe> result;
        if (includeInactifs) {
            result = employeRepository.searchAll(q, departement, pageable);
        } else {
            result = employeRepository.search(q, departement, StatutEmploye.ACTIF, pageable);
        }
        List<EmployeListItem> items = result.getContent().stream()
                .map(this::toListItem)
                .collect(Collectors.toList());
        return new ApiPage<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public EmployeDetail getDetail(Long id) {
        Employe e = employeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        return toDetail(e);
    }

    @Transactional
    public EmployeDetail create(EmployeRequest req, String acteur) {
        if (employeRepository.existsByMatricule(req.matricule())) {
            throw new BusinessException("Ce matricule existe déjà");
        }
        if (employeRepository.existsByEmail(req.email())) {
            throw new BusinessException("Cet email est déjà utilisé");
        }
        Employe e = new Employe();
        applyRequest(e, req);
        Employe saved = employeRepository.save(e);
        auditService.log(acteur, "CREATION_EMPLOYE", "Création de " + saved.getNomComplet());
        return toDetail(saved);
    }

    @Transactional
    public EmployeDetail update(Long id, EmployeRequest req, String acteur) {
        Employe e = employeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        String oldEmail = e.getEmail();
        if (!oldEmail.equalsIgnoreCase(req.email()) && employeRepository.existsByEmail(req.email())) {
            throw new BusinessException("Cet email est déjà utilisé");
        }
        applyRequest(e, req);
        Employe saved = employeRepository.save(e);
        auditService.log(acteur, "MODIFICATION_EMPLOYE", "Modification de " + saved.getNomComplet());
        return toDetail(saved);
    }

    @Transactional
    public void setStatut(Long id, StatutEmploye statut, String acteur) {
        Employe e = employeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        e.setStatut(statut);
        employeRepository.save(e);
        auditService.log(acteur, statut == StatutEmploye.INACTIF ? "DESACTIVATION_EMPLOYE" : "ACTIVATION_EMPLOYE",
                e.getNomComplet());
    }

    @Transactional
    public EmployeDetail addCompetences(Long employeId, List<Long> competenceIds, String acteur) {
        Employe e = employeRepository.findById(employeId)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        if (competenceIds != null) {
            for (Long cid : competenceIds) {
                Competence c = competenceRepository.findById(cid)
                        .orElseThrow(() -> new BusinessException("Compétence introuvable (id " + cid + ")"));
                if (e.getCompetences().stream().noneMatch(ex -> ex.getId().equals(cid))) {
                    e.getCompetences().add(c);
                }
            }
        }
        Employe saved = employeRepository.save(e);
        auditService.log(acteur, "COMPETENCES_EMPLOYE", "Compétences mises à jour pour " + saved.getNomComplet());
        return toDetail(saved);
    }

    @Transactional
    public void removeCompetence(Long employeId, Long competenceId, String acteur) {
        Employe e = employeRepository.findById(employeId)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        e.getCompetences().removeIf(c -> c.getId().equals(competenceId));
        employeRepository.save(e);
        auditService.log(acteur, "COMPETENCES_EMPLOYE", "Compétence retirée pour " + e.getNomComplet());
    }

    public List<Employe> getActifs() {
        return employeRepository.findByStatutOrderByNomAsc(StatutEmploye.ACTIF);
    }

    public Employe getById(Long id) {
        return employeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
    }

    private void applyRequest(Employe e, EmployeRequest req) {
        e.setMatricule(req.matricule());
        e.setCin(req.cin());
        e.setNom(req.nom());
        e.setPrenom(req.prenom());
        e.setDateNaissance(req.dateNaissance());
        e.setSexe(req.sexe() != null ? Sexe.valueOf(req.sexe()) : null);
        e.setNationalite(req.nationalite());
        e.setEmail(req.email());
        e.setTelephone(req.telephone());
        e.setAdresse(req.adresse());
        e.setDateEmbauche(req.dateEmbauche() != null ? req.dateEmbauche() : LocalDate.now());
        e.setStatut(req.statut() != null ? StatutEmploye.valueOf(req.statut()) : StatutEmploye.ACTIF);
        e.setBureau(req.bureau());

        e.setDepartement(departementRepository.findById(req.departementId())
                .orElseThrow(() -> new BusinessException("Département introuvable")));
        e.setPoste(req.posteId() != null
                ? posteRepository.findById(req.posteId()).orElseThrow(() -> new BusinessException("Poste introuvable"))
                : null);
        e.setEquipe(req.equipeId() != null
                ? equipeRepository.findById(req.equipeId()).orElseThrow(() -> new BusinessException("Équipe introuvable"))
                : null);
        e.setResponsable(req.responsableId() != null
                ? employeRepository.findById(req.responsableId()).orElseThrow(() -> new BusinessException("Responsable introuvable"))
                : null);
        if (req.competenceIds() != null) {
            e.setCompetences(competenceRepository.findAllById(req.competenceIds()));
        }
        if (req.missions() != null) {
            e.setMissions(req.missions().stream().filter(m -> m != null && !m.isBlank()).toList());
        }
    }

    public EmployeListItem toListItem(Employe e) {
        return new EmployeListItem(
                e.getId(),
                e.getMatricule(),
                e.getNomComplet(),
                e.getPoste() != null ? e.getPoste().getNom() : null,
                e.getDepartement() != null ? e.getDepartement().getNom() : null,
                e.getTelephone(),
                e.getEmail(),
                e.getBureau(),
                e.getResponsable() != null ? e.getResponsable().getNomComplet() : null,
                e.getInitiales(),
                e.getCompetences().stream().map(Competence::getNom).toList(),
                e.getStatut().name()
        );
    }

    public EmployeDetail toDetail(Employe e) {
        return new EmployeDetail(
                e.getId(),
                e.getMatricule(),
                e.getCin(),
                e.getNom(),
                e.getPrenom(),
                e.getNomComplet(),
                e.getInitiales(),
                e.getDateNaissance(),
                e.getSexe() != null ? e.getSexe().name() : null,
                e.getNationalite(),
                e.getEmail(),
                e.getTelephone(),
                e.getAdresse(),
                e.getPhoto(),
                e.getDateEmbauche(),
                e.getStatut().name(),
                e.getBureau(),
                e.getPoste() != null ? e.getPoste().getId() : null,
                e.getPoste() != null ? e.getPoste().getNom() : null,
                e.getDepartement() != null ? e.getDepartement().getId() : null,
                e.getDepartement() != null ? e.getDepartement().getNom() : null,
                e.getEquipe() != null ? e.getEquipe().getId() : null,
                e.getEquipe() != null ? e.getEquipe().getNom() : null,
                e.getResponsable() != null ? e.getResponsable().getId() : null,
                e.getResponsable() != null ? e.getResponsable().getNomComplet() : null,
                e.getCompetences().stream().map(Competence::getNom).toList(),
                e.getMissions()
        );
    }
}
