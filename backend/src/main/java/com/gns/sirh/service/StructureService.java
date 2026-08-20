package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.entity.Departement;
import com.gns.sirh.entity.Equipe;
import com.gns.sirh.repository.DepartementRepository;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.repository.EquipeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Gestion des structures RH : départements et équipes.
 * Fournit le CRUD complet, le comptage des employés rattachés et la
 * protection des suppressions (impossible si des employés sont associés).
 */
@Service
public class StructureService {

    private final DepartementRepository departementRepository;
    private final EquipeRepository equipeRepository;
    private final EmployeRepository employeRepository;

    public StructureService(DepartementRepository departementRepository,
                            EquipeRepository equipeRepository,
                            EmployeRepository employeRepository) {
        this.departementRepository = departementRepository;
        this.equipeRepository = equipeRepository;
        this.employeRepository = employeRepository;
    }

    /* ---------------------------------------------------------------- */
    /* Départements                                                      */
    /* ---------------------------------------------------------------- */

    public record DepartementDto(Long id, String nom, String description,
                                 long nbEmployes, long nbEquipes) {
    }

    @Transactional(readOnly = true)
    public List<DepartementDto> listeDepartements() {
        return departementRepository.findAllByOrderByNomAsc().stream()
                .map(d -> new DepartementDto(d.getId(), d.getNom(), d.getDescription(),
                        employeRepository.countByDepartementId(d.getId()),
                        equipeRepository.countByDepartementId(d.getId())))
                .toList();
    }

    @Transactional
    public DepartementDto creerDepartement(String nom, String description) {
        String nomNet = nom != null ? nom.trim() : "";
        if (nomNet.isBlank()) {
            throw new BusinessException("Le nom du département est obligatoire");
        }
        departementRepository.findByNomIgnoreCase(nomNet)
                .ifPresent(d -> {
                    throw new BusinessException("Un département « " + d.getNom() + " » existe déjà");
                });
        Departement d = departementRepository.save(new Departement(nomNet, description));
        return new DepartementDto(d.getId(), d.getNom(), d.getDescription(), 0, 0);
    }

    @Transactional
    public DepartementDto modifierDepartement(Long id, String nom, String description) {
        Departement d = departementRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Département introuvable"));
        String nomNet = nom != null ? nom.trim() : "";
        if (nomNet.isBlank()) {
            throw new BusinessException("Le nom du département est obligatoire");
        }
        departementRepository.findByNomIgnoreCase(nomNet)
                .filter(a -> !a.getId().equals(id))
                .ifPresent(a -> {
                    throw new BusinessException("Un département « " + a.getNom() + " » existe déjà");
                });
        d.setNom(nomNet);
        d.setDescription(description);
        Departement maj = departementRepository.save(d);
        return new DepartementDto(maj.getId(), maj.getNom(), maj.getDescription(),
                employeRepository.countByDepartementId(maj.getId()),
                equipeRepository.countByDepartementId(maj.getId()));
    }

    @Transactional
    public void supprimerDepartement(Long id) {
        Departement d = departementRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Département introuvable"));
        long employes = employeRepository.countByDepartementId(id);
        long equipes = equipeRepository.countByDepartementId(id);
        if (employes > 0) {
            throw new BusinessException("Impossible de supprimer « " + d.getNom()
                    + " » : " + employes + " employé(s) y sont rattachés");
        }
        if (equipes > 0) {
            throw new BusinessException("Impossible de supprimer « " + d.getNom()
                    + " » : " + equipes + " équipe(s) y sont rattachées");
        }
        departementRepository.delete(d);
    }

    /* ---------------------------------------------------------------- */
    /* Équipes                                                           */
    /* ---------------------------------------------------------------- */

    public record EquipeDto(Long id, String nom, String description,
                            Long departementId, String departementNom, long nbEmployes) {
    }

    @Transactional(readOnly = true)
    public List<EquipeDto> listeEquipes() {
        return equipeRepository.findAllByOrderByNomAsc().stream()
                .map(e -> new EquipeDto(e.getId(), e.getNom(), e.getDescription(),
                        e.getDepartement() != null ? e.getDepartement().getId() : null,
                        e.getDepartement() != null ? e.getDepartement().getNom() : null,
                        employeRepository.countByEquipeId(e.getId())))
                .toList();
    }

    @Transactional
    public EquipeDto creerEquipe(String nom, String description, Long departementId) {
        String nomNet = nom != null ? nom.trim() : "";
        if (nomNet.isBlank()) {
            throw new BusinessException("Le nom de l'équipe est obligatoire");
        }
        equipeRepository.findByNomIgnoreCase(nomNet)
                .ifPresent(e -> {
                    throw new BusinessException("Une équipe « " + e.getNom() + " » existe déjà");
                });
        Equipe e = new Equipe(nomNet, description);
        e.setDepartement(resoudreDepartement(departementId));
        Equipe maj = equipeRepository.save(e);
        return new EquipeDto(maj.getId(), maj.getNom(), maj.getDescription(),
                departementId, maj.getDepartement() != null ? maj.getDepartement().getNom() : null, 0);
    }

    @Transactional
    public EquipeDto modifierEquipe(Long id, String nom, String description, Long departementId) {
        Equipe e = equipeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Équipe introuvable"));
        String nomNet = nom != null ? nom.trim() : "";
        if (nomNet.isBlank()) {
            throw new BusinessException("Le nom de l'équipe est obligatoire");
        }
        equipeRepository.findByNomIgnoreCase(nomNet)
                .filter(a -> !a.getId().equals(id))
                .ifPresent(a -> {
                    throw new BusinessException("Une équipe « " + a.getNom() + " » existe déjà");
                });
        e.setNom(nomNet);
        e.setDescription(description);
        e.setDepartement(resoudreDepartement(departementId));
        Equipe maj = equipeRepository.save(e);
        return new EquipeDto(maj.getId(), maj.getNom(), maj.getDescription(),
                maj.getDepartement() != null ? maj.getDepartement().getId() : null,
                maj.getDepartement() != null ? maj.getDepartement().getNom() : null,
                employeRepository.countByEquipeId(maj.getId()));
    }

    @Transactional
    public void supprimerEquipe(Long id) {
        Equipe e = equipeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Équipe introuvable"));
        long employes = employeRepository.countByEquipeId(id);
        if (employes > 0) {
            throw new BusinessException("Impossible de supprimer « " + e.getNom()
                    + " » : " + employes + " employé(s) y sont rattachés");
        }
        equipeRepository.delete(e);
    }

    private Departement resoudreDepartement(Long departementId) {
        if (departementId == null) {
            return null;
        }
        return departementRepository.findById(departementId)
                .orElseThrow(() -> new BusinessException("Département introuvable"));
    }
}
