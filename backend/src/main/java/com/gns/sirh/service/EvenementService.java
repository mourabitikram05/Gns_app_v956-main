package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.EvenementDetail;
import com.gns.sirh.dto.EvenementRequest;
import com.gns.sirh.dto.InscritDto;
import com.gns.sirh.entity.Employe;
import com.gns.sirh.entity.Evenement;
import com.gns.sirh.entity.ParticipationEvenement;
import com.gns.sirh.entity.RoleType;
import com.gns.sirh.repository.EmployeRepository;
import com.gns.sirh.repository.EvenementRepository;
import com.gns.sirh.repository.ParticipationEvenementRepository;
import com.gns.sirh.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EvenementService {

    private final EvenementRepository evenementRepository;
    private final ParticipationEvenementRepository participationRepository;
    private final EmployeRepository employeRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public EvenementService(EvenementRepository evenementRepository,
                            ParticipationEvenementRepository participationRepository,
                            EmployeRepository employeRepository,
                            NotificationService notificationService,
                            AuditService auditService) {
        this.evenementRepository = evenementRepository;
        this.participationRepository = participationRepository;
        this.employeRepository = employeRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<EvenementDetail> liste(Long employeId) {
        return evenementRepository.findAll().stream()
                .sorted((a, b) -> a.getDateDebut().compareTo(b.getDateDebut()))
                .map(e -> toDetail(e, employeId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EvenementDetail> mesInscriptions(Long employeId) {
        return participationRepository.findByEmployeIdOrderByDateInscriptionDesc(employeId)
                .stream()
                .map(p -> toDetail(p.getEvenement(), employeId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EvenementDetail> aVenir(Long employeId) {
        return evenementRepository.findByDateFinGreaterThanEqualOrderByDateDebutAsc(java.time.LocalDate.now())
                .stream()
                .limit(10)
                .map(e -> toDetail(e, employeId))
                .toList();
    }

    @Transactional
    public EvenementDetail inscrire(Long evenementId, AuthUser user) {
        Evenement ev = evenementRepository.findById(evenementId)
                .orElseThrow(() -> new BusinessException("Événement introuvable"));
        Long employeId = user.employeId();
        if (employeId == null) {
            throw new BusinessException("Aucun employé lié à votre compte");
        }
        if (participationRepository.existsByEvenementIdAndEmployeId(evenementId, employeId)) {
            throw new BusinessException("Vous êtes déjà inscrit à cet événement");
        }
        long inscrits = participationRepository.countByEvenementIdAndStatut(evenementId, "INSCRIT");
        if (ev.getParticipantsMax() > 0 && inscrits >= ev.getParticipantsMax()) {
            throw new BusinessException("Cet événement est complet (place maximale atteinte)");
        }
        Employe employe = employeRepository.findById(employeId)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        ParticipationEvenement p = new ParticipationEvenement();
        p.setEvenement(ev);
        p.setEmploye(employe);
        p.setStatut("INSCRIT");
        p.setDateInscription(LocalDateTime.now());
        participationRepository.save(p);
        auditService.log(user.email(), "INSCRIPTION_EVENEMENT", "Inscription à « " + ev.getTitre() + " »");
        return toDetail(ev, employeId);
    }

    @Transactional
    public EvenementDetail desinscrire(Long evenementId, AuthUser user) {
        Long employeId = user.employeId();
        if (employeId == null) {
            throw new BusinessException("Aucun employé lié à votre compte");
        }
        participationRepository.findByEvenementIdAndEmployeId(evenementId, employeId)
                .ifPresent(participationRepository::delete);
        return toDetail(evenementRepository.findById(evenementId)
                .orElseThrow(() -> new BusinessException("Événement introuvable")), employeId);
    }

    @Transactional
    public EvenementDetail creer(EvenementRequest req, String acteur) {
        Evenement ev = new Evenement();
        appliquer(ev, req);
        Evenement saved = evenementRepository.save(ev);
        notificationService.notifierTous("Nouvel événement : « " + saved.getTitre() + " » le " + saved.getDateDebut(),
                "EVENEMENT_PUBLIE");
        auditService.log(acteur, "CREATION_EVENEMENT", "Événement « " + saved.getTitre() + " » créé");
        return toDetail(saved, null);
    }

    @Transactional
    public EvenementDetail modifier(Long id, EvenementRequest req, String acteur) {
        Evenement ev = evenementRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Événement introuvable"));
        appliquer(ev, req);
        Evenement saved = evenementRepository.save(ev);
        auditService.log(acteur, "MODIFICATION_EVENEMENT", "Événement « " + saved.getTitre() + " » modifié");
        return toDetail(saved, null);
    }

    @Transactional
    public void supprimer(Long id, String acteur) {
        Evenement ev = evenementRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Événement introuvable"));
        participationRepository.findByEvenementIdOrderByDateInscriptionAsc(id)
                .forEach(participationRepository::delete);
        evenementRepository.delete(ev);
        auditService.log(acteur, "SUPPRESSION_EVENEMENT", "Événement « " + ev.getTitre() + " » supprimé");
    }

    @Transactional(readOnly = true)
    public List<InscritDto> inscrits(Long evenementId) {
        return participationRepository.findByEvenementIdOrderByDateInscriptionAsc(evenementId)
                .stream()
                .map(p -> new InscritDto(
                        p.getEmploye().getId(),
                        p.getEmploye().getNomComplet(),
                        p.getEmploye().getInitiales(),
                        p.getEmploye().getEmail(),
                        p.getEmploye().getDepartement() != null ? p.getEmploye().getDepartement().getNom() : null,
                        p.getDateInscription()))
                .toList();
    }

    @Transactional(readOnly = true)
    public byte[] exportInscritsXlsx(Long evenementId) {
        Evenement ev = evenementRepository.findById(evenementId)
                .orElseThrow(() -> new BusinessException("Événement introuvable"));

        String[] enTetes = {"Collaborateur", "Email", "Département", "Date d'inscription"};
        List<String[]> lignes = new java.util.ArrayList<>();
        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm");
        for (InscritDto i : inscrits(evenementId)) {
            lignes.add(new String[]{
                    i.nomComplet(),
                    i.email(),
                    i.departement() == null ? "" : i.departement(),
                    i.dateInscription() != null ? i.dateInscription().format(fmt) : ""
            });
        }
        try {
            return ExcelExporter.generer("GNS TECHNOLOGIES — Liste des inscrits",
                    "Événement : " + ev.getTitre() + " (" + ev.getDateDebut() + ")",
                    null, "Export généré le " + LocalDateTime.now()
                            .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm")),
                    enTetes, lignes, "Inscrits",
                    new Integer[]{28, 30, 18, 20}, null);
        } catch (java.io.IOException ex) {
            throw new BusinessException("Erreur lors de la génération Excel");
        }
    }

    public String nomFichierInscrits(Long evenementId) {
        return "inscrits_evenement_" + evenementId + ".xlsx";
    }


    private void appliquer(Evenement ev, EvenementRequest req) {
        ev.setTitre(req.titre());
        ev.setDescription(req.description());
        ev.setType(req.type());
        ev.setDateDebut(req.date());
        ev.setDateFin(req.date());
        ev.setHeureDebut(req.heure());
        ev.setLieu(req.lieu());
        ev.setParticipantsMax(Math.max(0, req.participantsMax()));
    }

    private EvenementDetail toDetail(Evenement e, Long employeId) {
        long inscrits = participationRepository.countByEvenementIdAndStatut(e.getId(), "INSCRIT");
        boolean complet = e.getParticipantsMax() > 0 && inscrits >= e.getParticipantsMax();
        boolean inscrit = employeId != null && participationRepository.existsByEvenementIdAndEmployeId(e.getId(), employeId);
        double taux = e.getParticipantsMax() > 0
                ? Math.round((double) inscrits / e.getParticipantsMax() * 100) : 0;
        return new EvenementDetail(
                e.getId(), e.getTitre(), e.getDescription(), e.getType(),
                e.getDateDebut(), e.getDateFin(), e.getHeureDebut(), e.getLieu(),
                e.getParticipantsMax(), inscrits, complet, inscrit, taux);
    }
}
