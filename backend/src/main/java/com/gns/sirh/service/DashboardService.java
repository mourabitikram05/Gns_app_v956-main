package com.gns.sirh.service;

import com.gns.sirh.common.BusinessException;
import com.gns.sirh.dto.*;
import com.gns.sirh.entity.*;
import com.gns.sirh.repository.*;
import com.gns.sirh.entity.RapportRH;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final EmployeRepository employeRepository;
    private final DemandeCongeRepository demandeRepository;
    private final AbsenceRepository absenceRepository;
    private final EvenementRepository evenementRepository;
    private final PosteRepository posteRepository;
    private final AuditLogRepository auditLogRepository;
    private final RapportRHRepository rapportRepository;
    private final NoteFraisRepository noteFraisRepository;
    private final OffreEmploiRepository offreEmploiRepository;
    private final CandidatureRepository candidatureRepository;
    private final DepartementRepository departementRepository;

    public DashboardService(EmployeRepository employeRepository,
                            DemandeCongeRepository demandeRepository,
                            AbsenceRepository absenceRepository,
                            EvenementRepository evenementRepository,
                            PosteRepository posteRepository,
                            AuditLogRepository auditLogRepository,
                            RapportRHRepository rapportRepository,
                            NoteFraisRepository noteFraisRepository,
                            OffreEmploiRepository offreEmploiRepository,
                            CandidatureRepository candidatureRepository,
                            DepartementRepository departementRepository) {
        this.employeRepository = employeRepository;
        this.demandeRepository = demandeRepository;
        this.absenceRepository = absenceRepository;
        this.evenementRepository = evenementRepository;
        this.posteRepository = posteRepository;
        this.auditLogRepository = auditLogRepository;
        this.rapportRepository = rapportRepository;
        this.noteFraisRepository = noteFraisRepository;
        this.offreEmploiRepository = offreEmploiRepository;
        this.candidatureRepository = candidatureRepository;
        this.departementRepository = departementRepository;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<KpiCardDto> kpis() {
        YearMonth courant = YearMonth.now();
        YearMonth precedent = courant.minusMonths(1);
        LocalDate today = LocalDate.now();

        long effectif = employeRepository.countByStatut(StatutEmploye.ACTIF);
        long recrutementsThis = employeRepository.countByStatutAndDateEmbaucheBetween(
                StatutEmploye.ACTIF, courant.atDay(1), courant.atEndOfMonth());
        long recrutementsPrev = employeRepository.countByStatutAndDateEmbaucheBetween(
                StatutEmploye.ACTIF, precedent.atDay(1), precedent.atEndOfMonth());

        long absencesThis = absenceRepository.countByDateAbsenceBetween(courant.atDay(1), courant.atEndOfMonth());
        long absencesPrev = absenceRepository.countByDateAbsenceBetween(precedent.atDay(1), precedent.atEndOfMonth());
        int joursOuvresThis = joursOuvres(courant);
        int joursOuvresPrev = joursOuvres(precedent);
        double tauxThis = effectif > 0 && joursOuvresThis > 0
                ? (double) absencesThis / (effectif * joursOuvresThis) * 100 : 0;
        double tauxPrev = effectif > 0 && joursOuvresPrev > 0
                ? (double) absencesPrev / (effectif * joursOuvresPrev) * 100 : 0;

        long congesAttente = demandeRepository.countByStatut(StatutDemande.EN_ATTENTE);
        long congesAttenteThis = demandeRepository.countByStatut(StatutDemande.EN_ATTENTE);
        long congesAttentePrev = congesAttenteThis; // pas d'historique de statut : variation à 0
        long absAujourdhui = absenceRepository.countByDateAbsence(today);
        long absHier = absenceRepository.countByDateAbsence(today.minusDays(1));

        long postesOuverts = posteRepository.count();
        List<Employe> actifs = employeRepository.findByStatutOrderByNomAsc(StatutEmploye.ACTIF);
        Set<Long> postesOccupes = actifs.stream()
                .map(e -> e.getPoste() != null ? e.getPoste().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        postesOuverts = Math.max(0, postesOuverts - postesOccupes.size());

        long formationsThis = evenementRepository
                .findByTypeIgnoreCaseAndDateDebutBetweenOrderByDateDebutAsc("Formation", courant.atDay(1), courant.atEndOfMonth()).size();
        long formationsPrev = evenementRepository
                .findByTypeIgnoreCaseAndDateDebutBetweenOrderByDateDebutAsc("Formation", precedent.atDay(1), precedent.atEndOfMonth()).size();

        return List.of(
                new KpiCardDto("effectif", "Effectif total", String.valueOf(effectif),
                        "+" + recrutementsThis, true),
                new KpiCardDto("recrutements", "Nouveaux recrutements", String.valueOf(recrutementsThis),
                        signe(recrutementsThis - recrutementsPrev), recrutementsThis - recrutementsPrev >= 0),
                new KpiCardDto("absenteisme", "Taux d'absentéisme",
                        String.format(Locale.FRENCH, "%.1f%%", tauxThis),
                        String.format(Locale.FRENCH, "%+.1f%%", tauxThis - tauxPrev),
                        tauxThis <= tauxPrev),
                new KpiCardDto("engagement", "Engagement moyen",
                        String.format(Locale.FRENCH, "%.0f%%", Math.max(0, 100 - tauxThis)),
                        String.format(Locale.FRENCH, "%+.0f%%", tauxPrev - tauxThis),
                        tauxThis <= tauxPrev),
                new KpiCardDto("conges_attente", "Congés en attente", String.valueOf(congesAttente),
                        signe(congesAttenteThis - congesAttentePrev), congesAttenteThis - congesAttentePrev <= 0),
                new KpiCardDto("absences_jour", "Absences aujourd'hui", String.valueOf(absAujourdhui),
                        signe(absAujourdhui - absHier), absAujourdhui <= absHier),
                new KpiCardDto("postes_ouverts", "Postes ouverts", String.valueOf(postesOuverts),
                        "0", true),
                new KpiCardDto("formations", "Formations ce mois", String.valueOf(formationsThis),
                        signe(formationsThis - formationsPrev), formationsThis - formationsPrev >= 0)
        );
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<AbsenceMensuelleDto> absencesMensuelles() {
        List<AbsenceMensuelleDto> result = new ArrayList<>();
        YearMonth courant = YearMonth.now();
        for (int i = 7; i >= 0; i--) {
            YearMonth ym = courant.minusMonths(i);
            long jours = absenceRepository.countByDateAbsenceBetween(ym.atDay(1), ym.atEndOfMonth());
            result.add(new AbsenceMensuelleDto(abreviationMois(ym), (int) jours));
        }
        return result;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<DeptCountDto> effectifsDepartement() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Employe e : employeRepository.findByStatutOrderByNomAsc(StatutEmploye.ACTIF)) {
            String nom = e.getDepartement() != null ? e.getDepartement().getNom() : "Sans département";
            counts.merge(nom, 1L, Long::sum);
        }
        return counts.entrySet().stream()
                .map(e -> new DeptCountDto(e.getKey(), e.getValue()))
                .toList();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<ActionAttenteDto> actionsAttente() {
        List<ActionAttenteDto> resultats = new ArrayList<>();
        for (DemandeConge d : demandeRepository.findByStatutOrderByDateDemandeDesc(StatutDemande.EN_ATTENTE)) {
            resultats.add(new ActionAttenteDto(
                    d.getId(),
                    d.getEmploye().getNomComplet(),
                    d.getEmploye().getInitiales(),
                    d.getTypeConge().getNom(),
                    "du " + d.getDateDebut() + " au " + d.getDateFin(),
                    d.getDateDebut(),
                    d.getDateFin(),
                    d.getNombreJours(),
                    "CONGE",
                    0));
        }
        for (NoteFrais f : noteFraisRepository.findByEmployeEtStatut(null, "EN_ATTENTE")) {
            resultats.add(new ActionAttenteDto(
                    f.getId(),
                    f.getEmploye().getNomComplet(),
                    f.getEmploye().getInitiales(),
                    "Note de frais",
                    f.getTitre(),
                    f.getDate(),
                    f.getDate(),
                    0,
                    "FRAIS",
                    f.getMontantTotal()));
        }
        resultats.sort((a, b) -> {
            LocalDate da = a.dateDebut() != null ? a.dateDebut() : LocalDate.now();
            LocalDate db = b.dateDebut() != null ? b.dateDebut() : LocalDate.now();
            return da.compareTo(db);
        });
        return resultats.stream().limit(10).toList();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<ActiviteItemDto> activiteRecent() {
        return auditLogRepository.findTop10ByOrderByDateActionDesc()
                .stream()
                .map(log -> new ActiviteItemDto(
                        log.getDetail(),
                        tempsRelatif(log.getDateAction()),
                        couleurAction(log.getAction())))
                .toList();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<EvenementDto> evenementsAVenir() {
        return evenementRepository.findByDateFinGreaterThanEqualOrderByDateDebutAsc(LocalDate.now())
                .stream()
                .limit(10)
                .map(e -> new EvenementDto(e.getId(), e.getTitre(), e.getDescription(),
                        e.getDateDebut(), e.getDateFin(), e.getLieu(), e.getType(), e.getImageUrl()))
                .toList();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<MonEquipeDto> monEquipe(Long employeId) {
        Employe moi = employeRepository.findById(employeId)
                .orElseThrow(() -> new BusinessException("Collaborateur introuvable"));
        Long deptId = moi.getDepartement() != null ? moi.getDepartement().getId() : null;
        Long equipeId = moi.getEquipe() != null ? moi.getEquipe().getId() : null;
        List<Employe> collègues = new ArrayList<>();
        if (deptId != null) {
            collègues.addAll(employeRepository.findByStatutAndDepartementIdOrderByNomAsc(StatutEmploye.ACTIF, deptId));
        }
        if (equipeId != null) {
            for (Employe e : employeRepository.findByStatutOrderByNomAsc(StatutEmploye.ACTIF)) {
                if (e.getEquipe() != null && e.getEquipe().getId().equals(equipeId) && !collègues.contains(e)) {
                    collègues.add(e);
                }
            }
        }
        return collègues.stream()
                .filter(e -> !e.getId().equals(employeId))
                .limit(12)
                .map(e -> new MonEquipeDto(e.getId(), e.getNomComplet(), e.getInitiales(),
                        e.getPoste() != null ? e.getPoste().getNom() : null,
                        e.getDepartement() != null ? e.getDepartement().getNom() : null))
                .toList();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public RapportResultat genererRapport(String titre, String typeRapport) {
        List<KpiCardDto> kpis = kpis();
        List<AbsenceMensuelleDto> absences = absencesMensuelles();
        String titreRapport = titre == null || titre.isBlank() ? "Rapport mensuel" : titre;

        List<String[]> lignesKpis = new ArrayList<>();
        for (KpiCardDto k : kpis) {
            lignesKpis.add(new String[]{k.label(), k.value(), k.change()});
        }
        List<String[]> lignesAbsences = new ArrayList<>();
        for (AbsenceMensuelleDto a : absences) {
            lignesAbsences.add(new String[]{a.mois(), String.valueOf(a.jours())});
        }

        byte[] contenu;
        try {
            contenu = ExcelExporter.genererMultiFeuilles(
                    "GNS TECHNOLOGIES — " + titreRapport,
                    "Rapport généré le " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm")),
                    null, null,
                    List.of(
                            new ExcelExporter.Feuille("Indicateurs",
                                    new String[]{"Indicateur", "Valeur", "Variation"},
                                    lignesKpis, new Integer[]{36, 16, 14}, null),
                            new ExcelExporter.Feuille("Absences",
                                    new String[]{"Mois", "Jours d'absence"},
                                    lignesAbsences, new Integer[]{20, 16}, null)
                    ));
        } catch (IOException ex) {
            throw new BusinessException("Impossible de générer le rapport");
        }

        RapportRH rapport = new RapportRH();
        rapport.setTitre(titreRapport);
        rapport.setTypeRapport(typeRapport == null ? "MENSUEL" : typeRapport);
        rapport.setFormat("XLSX");
        String nomFichier = "rapport_rh_" + System.currentTimeMillis() + ".xlsx";
        rapport.setFichier(nomFichier);
        rapport.setDateGeneration(LocalDateTime.now());
        try {
            Files.createDirectories(Paths.get("uploads", "rapports"));
            Files.write(Paths.get("uploads", "rapports").resolve(nomFichier), contenu);
        } catch (IOException ex) {
            throw new BusinessException("Impossible de générer le rapport");
        }
        rapportRepository.save(rapport);

        return new RapportResultat(nomFichier, contenu);
    }


    public record RapportResultat(String nomFichier, byte[] contenu) {
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<RapportRH> historiqueRapports() {
        return rapportRepository.findAll().stream()
                .sorted((a, b) -> b.getDateGeneration().compareTo(a.getDateGeneration()))
                .toList();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public byte[] lireRapport(Long id) {
        RapportRH r = rapportRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Rapport introuvable"));
        try {
            return Files.readAllBytes(Paths.get("uploads", "rapports").resolve(r.getFichier()));
        } catch (IOException ex) {
            throw new BusinessException("Fichier du rapport introuvable");
        }
    }

    public String nomFichierRapport(RapportRH r) {
        return r.getFichier();
    }

    // ------------------------------------------------------------------
    // KPI & Reporting : indicateurs filtrables par catégorie et département
    // ------------------------------------------------------------------

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<KpiReport> kpisReporting(String categorie, String departement) {
        YearMonth courant = YearMonth.now();
        LocalDateTime maintenant = LocalDateTime.now();

        long effectifTotal = employeRepository.countByStatut(StatutEmploye.ACTIF);
        long effectifDept = 0;
        long congesAttenteDept = demandeRepository.countByStatut(StatutDemande.EN_ATTENTE);
        long absencesMois = absenceRepository.countByDateAbsenceBetween(courant.atDay(1), courant.atEndOfMonth());
        int joursOuvres = joursOuvres(courant);
        double tauxAbsenteisme = effectifTotal > 0 && joursOuvres > 0
                ? (double) absencesMois / (effectifTotal * joursOuvres) * 100 : 0;

        if (departement != null && !departement.isBlank()) {
            var dept = departementRepository.findByNomIgnoreCase(departement).orElse(null);
            if (dept != null) {
                effectifDept = employeRepository
                        .findByStatutAndDepartementIdOrderByNomAsc(StatutEmploye.ACTIF, dept.getId()).size();
            }
        }

        long postesOuverts = posteRepository.count()
                - employeRepository.findByStatutOrderByNomAsc(StatutEmploye.ACTIF).stream()
                        .map(e -> e.getPoste() != null ? e.getPoste().getId() : null)
                        .filter(Objects::nonNull).collect(Collectors.toSet()).size();
        long formations = evenementRepository
                .findByTypeIgnoreCaseAndDateDebutBetweenOrderByDateDebutAsc("Formation",
                        courant.atDay(1), courant.atEndOfMonth()).size();
        long offresOuvertes = offreEmploiRepository.findAll().stream()
                .filter(o -> "OUVERTE".equals(o.getStatut())).count();
        long candidaturesTotal = candidatureRepository.count();
        long entretiensPlanifies = candidatureRepository.findAll().stream()
                .filter(c -> c.getDateEntretien() != null).count();
        List<NoteFrais> frais = noteFraisRepository.findAll();
        double fraisEnAttente = frais.stream().filter(f -> "EN_ATTENTE".equals(f.getStatut()))
                .mapToDouble(NoteFrais::getMontantTotal).sum();
        double fraisRembourses = frais.stream().filter(f -> "REMBOURSEE".equals(f.getStatut()))
                .mapToDouble(NoteFrais::getMontantTotal).sum();
        long nbFraisEnAttente = frais.stream().filter(f -> "EN_ATTENTE".equals(f.getStatut())).count();

        long embauchesAnnee = employeRepository.findByStatutOrderByNomAsc(StatutEmploye.ACTIF).stream()
                .filter(e -> e.getDateEmbauche() != null && e.getDateEmbauche().getYear() == courant.getYear()).count();
        double tauxRetention = effectifTotal > 0
                ? Math.round((double) (effectifTotal - embauchesAnnee) / effectifTotal * 100) : 100;

        List<KpiReport> resultats = new ArrayList<>();
        resultats.add(new KpiReport("Effectif total", "Effectifs",
                String.valueOf(effectifDept > 0 ? effectifDept : effectifTotal), "collaborateurs", maintenant));
        resultats.add(new KpiReport("Taux de rétention", "Effectifs",
                String.format(java.util.Locale.FRENCH, "%.0f%%", tauxRetention), "%", maintenant));
        resultats.add(new KpiReport("Engagement moyen", "Effectifs",
                String.format(java.util.Locale.FRENCH, "%.0f%%", Math.max(0, 100 - tauxAbsenteisme)), "%", maintenant));
        resultats.add(new KpiReport("Postes ouverts", "Effectifs", String.valueOf(Math.max(0, postesOuverts)),
                "postes", maintenant));
        resultats.add(new KpiReport("Congés en attente", "Congés",
                String.valueOf(congesAttenteDept), "demandes", maintenant));
        resultats.add(new KpiReport("Taux d'absentéisme", "Congés",
                String.format(java.util.Locale.FRENCH, "%.1f%%", tauxAbsenteisme), "%", maintenant));
        resultats.add(new KpiReport("Offres publiées", "Recrutement", String.valueOf(offresOuvertes), "offres", maintenant));
        resultats.add(new KpiReport("Candidatures reçues", "Recrutement", String.valueOf(candidaturesTotal), "candidatures", maintenant));
        resultats.add(new KpiReport("Entretiens planifiés", "Recrutement", String.valueOf(entretiensPlanifies), "entretiens", maintenant));
        resultats.add(new KpiReport("Formations ce mois", "Formation", String.valueOf(formations), "formations", maintenant));
        resultats.add(new KpiReport("Notes de frais en attente", "Finance", String.valueOf(nbFraisEnAttente), "notes", maintenant));
        resultats.add(new KpiReport("Montant frais en attente", "Finance",
                String.format(java.util.Locale.FRENCH, "%.2f", fraisEnAttente), "MAD", maintenant));
        resultats.add(new KpiReport("Montant frais remboursés", "Finance",
                String.format(java.util.Locale.FRENCH, "%.2f", fraisRembourses), "MAD", maintenant));

        if (categorie != null && !categorie.isBlank()) {
            return resultats.stream().filter(k -> categorie.equalsIgnoreCase(k.categorie())).toList();
        }
        return resultats;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public byte[] exportXlsx(String categorie, String departement) {
        List<KpiReport> kpis = kpisReporting(categorie, departement);
        String[] cols = {"Indicateur", "Catégorie", "Valeur", "Unité", "Date de calcul"};
        List<String[]> lignes = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        for (KpiReport k : kpis) {
            lignes.add(new String[]{
                    k.nom(), k.categorie(), k.valeur(), k.unite(),
                    k.dateCalcul() != null ? k.dateCalcul().format(fmt) : ""
            });
        }
        StringBuilder filtre = new StringBuilder();
        if (categorie != null && !categorie.isBlank()) {
            filtre.append("catégorie : ").append(categorie);
        }
        if (departement != null && !departement.isBlank()) {
            if (!filtre.isEmpty()) {
                filtre.append(" · ");
            }
            filtre.append("département : ").append(departement);
        }
        try {
            return ExcelExporter.generer("GNS TECHNOLOGIES — KPI & Reporting",
                    "Export généré le " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm")),
                    null, filtre.isEmpty() ? null : filtre.toString(),
                    cols, lignes, "KPI & Reporting",
                    new Integer[]{40, 14, 12, 12, 18}, null);
        } catch (IOException ex) {
            throw new BusinessException("Erreur lors de la génération Excel");
        }
    }

    private String signe(long diff) {
        return diff > 0 ? "+" + diff : String.valueOf(diff);
    }

    private int joursOuvres(YearMonth ym) {
        int count = 0;
        LocalDate cursor = ym.atDay(1);
        while (cursor.getMonthValue() == ym.getMonthValue()) {
            if (cursor.getDayOfWeek().getValue() <= 5) {
                count++;
            }
            cursor = cursor.plusDays(1);
        }
        return count;
    }

    private String abreviationMois(YearMonth ym) {
        return switch (ym.getMonthValue()) {
            case 1 -> "Jan";
            case 2 -> "Fév";
            case 3 -> "Mar";
            case 4 -> "Avr";
            case 5 -> "Mai";
            case 6 -> "Juin";
            case 7 -> "Juil";
            case 8 -> "Août";
            case 9 -> "Sep";
            case 10 -> "Oct";
            case 11 -> "Nov";
            default -> "Déc";
        };
    }

    private String tempsRelatif(LocalDateTime date) {
        Duration d = Duration.between(date, LocalDateTime.now());
        long minutes = d.toMinutes();
        if (minutes < 1) {
            return "à l'instant";
        }
        if (minutes < 60) {
            return "il y a " + minutes + " min";
        }
        long heures = d.toHours();
        if (heures < 24) {
            return "il y a " + heures + " h";
        }
        long jours = d.toDays();
        return "il y a " + jours + " j";
    }

    private String couleurAction(String action) {
        if (action == null) {
            return "#0F1E3D";
        }
        if (action.startsWith("VALIDATION") || action.contains("APPROUVE")) {
            return "#10B981";
        }
        if (action.startsWith("REFUS") || action.contains("DESACTIV")) {
            return "#EF4444";
        }
        if (action.startsWith("DEMANDE") || action.startsWith("CONNEXION")) {
            return "#C9A227";
        }
        return "#0F1E3D";
    }
}
