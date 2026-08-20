package com.gns.sirh.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Utilitaire central de génération de classeurs Excel (.xlsx) professionnels
 * et uniformes pour GNS SIRH :
 * <ul>
 *   <li>bandeau entreprise « GNS TECHNOLOGIES — GNS SIRH » (navy) ;</li>
 *   <li>titre du document + ligne de métadonnées (date de génération, auteur, période) ;</li>
 *   <li>en-têtes de colonnes (navy, blanc, gras, centrés, retour à la ligne) ;</li>
 *   <li>lignes de données alternées, bordures fines, première colonne en gras ;</li>
 *   <li>ligne de totaux optionnelle ;</li>
 *   <li>filtre automatique, gel des en-têtes ;</li>
 *   <li>impression A4 paysage, ajustée à la largeur, en-têtes répétés à chaque page ;</li>
 *   <li>largeurs de colonnes automatiques ou personnalisées ;</li>
 *   <li>multi-feuilles (rapports RH).</li>
 * </ul>
 * L'encodage XLSX (UTF-8) supporte nativement tous les caractères français.
 */
public final class ExcelExporter {

    /** Navy GNS (identité visuelle). */
    public static final XSSFColor NAVY = new XSSFColor(new byte[]{(byte) 0x00, (byte) 0x00, (byte) 0x00}, null);
    /** Or GNS. */
    public static final XSSFColor GOLD = new XSSFColor(new byte[]{(byte) 0xC9, (byte) 0xA2, (byte) 0x27}, null);
    /** Fond des lignes alternées. */
    public static final XSSFColor LIGNE_ALTERNEE = new XSSFColor(
            new byte[]{(byte) 0xF7, (byte) 0xF8, (byte) 0xFA}, null);
    /** Fond clair or de la ligne de totaux. */
    public static final XSSFColor FOND_TOTAUX = new XSSFColor(
            new byte[]{(byte) 0xFB, (byte) 0xF3, (byte) 0xD9}, null);

    private static final DateTimeFormatter FORMAT_HEURE = DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm");
    private static final int LIGNE_EN_TETES = 4;

    /** Une feuille d'un classeur multi-feuilles. */
    public record Feuille(String nom, String[] enTetes, List<String[]> lignes,
                          Integer[] largeurs, String[] ligneTotaux) {
    }

    private ExcelExporter() {
    }

    /** Signature historique — compatibilité (sans auteur, période, largeurs ni totaux). */
    public static byte[] generer(String titre, String sousTitre, String[] enTetes,
                                 List<String[]> lignes, String nomFeuille) throws IOException {
        return generer(titre, sousTitre, null, null, enTetes, lignes, nomFeuille, null, null);
    }

    /**
     * Génère un classeur professionnel (une feuille).
     *
     * @param titre       titre principal du document
     * @param sousTitre   ligne secondaire (période, contexte…)
     * @param auteur      personne ayant généré l'export (peut être null)
     * @param periode     période couverte par l'export (peut être null)
     * @param enTetes     noms des colonnes
     * @param lignes      données (une ligne = une cellule par colonne)
     * @param nomFeuille  nom de la feuille
     * @param largeurs    largeurs de colonnes en caractères (null = automatique)
     * @param ligneTotaux ligne de totaux facultative (null = absente)
     */
    public static byte[] generer(String titre, String sousTitre, String auteur, String periode,
                                 String[] enTetes, List<String[]> lignes, String nomFeuille,
                                 Integer[] largeurs, String[] ligneTotaux) throws IOException {
        return genererMultiFeuilles(titre, sousTitre, auteur, periode,
                List.of(new Feuille(nomFeuille, enTetes, lignes, largeurs, ligneTotaux)));
    }

    /**
     * Génère un classeur professionnel multi-feuilles (rapports RH).
     */
    public static byte[] genererMultiFeuilles(String titre, String sousTitre, String auteur, String periode,
                                              List<Feuille> feuilles) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.getProperties().getCoreProperties().setCreator("GNS SIRH");
            wb.getProperties().getCoreProperties().setTitle(titre != null ? titre : "GNS SIRH");
            Styles styles = new Styles(wb);
            for (Feuille f : feuilles) {
                if (f == null || f.enTetes() == null || f.enTetes().length == 0) {
                    continue;
                }
                remplirFeuille(wb, styles, titre, sousTitre, auteur, periode, f);
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    private static void remplirFeuille(XSSFWorkbook wb, Styles s, String titre, String sousTitre,
                                       String auteur, String periode, Feuille f) {
        String nomFeuille = (f.nom() == null || f.nom().isBlank()) ? "Export" : f.nom();
        if (nomFeuille.length() > 31) {
            nomFeuille = nomFeuille.substring(0, 31);
        }
        Sheet sheet = wb.createSheet(nomFeuille);
        int derniereColonne = f.enTetes().length - 1;

        // Titre du document sans le préfixe entreprise (déjà présent dans le bandeau)
        String titreDoc = titre != null
                ? titre.replaceFirst("^GNS TECHNOLOGIES\\s*[—–-]\\s*", "").trim()
                : "";

        // Ligne de métadonnées : date + auteur + période
        String meta = (sousTitre != null && !sousTitre.isBlank())
                ? sousTitre
                : "Export généré le " + LocalDateTime.now().format(FORMAT_HEURE);
        if (auteur != null && !auteur.isBlank()) {
            meta += " · Généré par " + auteur;
        }
        if (periode != null && !periode.isBlank()) {
            meta += " · " + periode;
        }

        // ---- Bandeau entreprise ----
        Row bandeau = sheet.createRow(0);
        bandeau.setHeightInPoints(22);
        Cell cBandeau = bandeau.createCell(0);
        cBandeau.setCellValue("GNS TECHNOLOGIES  —  GNS SIRH");
        cBandeau.setCellStyle(s.bandeau);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, derniereColonne));

        // ---- Titre du document ----
        Row titreRow = sheet.createRow(1);
        titreRow.setHeightInPoints(24);
        Cell cTitre = titreRow.createCell(0);
        cTitre.setCellValue(titreDoc);
        cTitre.setCellStyle(s.titre);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, derniereColonne));

        // ---- Métadonnées ----
        Row metaRow = sheet.createRow(2);
        metaRow.setHeightInPoints(16);
        Cell cMeta = metaRow.createCell(0);
        cMeta.setCellValue(meta);
        cMeta.setCellStyle(s.meta);
        sheet.addMergedRegion(new CellRangeAddress(2, 2, 0, derniereColonne));

        // ---- En-têtes ----
        Row headerRow = sheet.createRow(LIGNE_EN_TETES);
        headerRow.setHeightInPoints(26);
        for (int i = 0; i < f.enTetes().length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(f.enTetes()[i]);
            cell.setCellStyle(s.enTete);
        }

        // ---- Données ----
        int rowIdx = LIGNE_EN_TETES + 1;
        for (String[] ligne : f.lignes()) {
            if (ligne == null) {
                continue;
            }
            Row row = sheet.createRow(rowIdx);
            boolean alterne = ((rowIdx - LIGNE_EN_TETES - 1) % 2) == 1;
            for (int i = 0; i < f.enTetes().length; i++) {
                Cell cell = row.createCell(i);
                String valeur = i < ligne.length && ligne[i] != null ? ligne[i] : "";
                cell.setCellValue(valeur);
                cell.setCellStyle(i == 0 ? s.premiereColonne : (alterne ? s.dataAlterne : s.data));
            }
            rowIdx++;
        }

        int premiereDonnee = LIGNE_EN_TETES + 1;
        int derniereDonnee = rowIdx - 1;

        // ---- Ligne de totaux ----
        if (f.ligneTotaux() != null && f.ligneTotaux().length > 0) {
            Row totauxRow = sheet.createRow(rowIdx);
            totauxRow.setHeightInPoints(20);
            for (int i = 0; i < f.enTetes().length; i++) {
                Cell cell = totauxRow.createCell(i);
                String valeur = i < f.ligneTotaux().length && f.ligneTotaux()[i] != null
                        ? f.ligneTotaux()[i] : "";
                cell.setCellValue(valeur);
                cell.setCellStyle(s.totaux);
            }
            rowIdx++;
        }

        // ---- Filtre + gel ----
        if (derniereDonnee >= premiereDonnee) {
            sheet.setAutoFilter(new CellRangeAddress(LIGNE_EN_TETES, derniereDonnee, 0, derniereColonne));
        }
        sheet.createFreezePane(0, LIGNE_EN_TETES + 1);

        // ---- Largeurs de colonnes ----
        for (int i = 0; i < f.enTetes().length; i++) {
            int largeur;
            if (f.largeurs() != null && i < f.largeurs().length && f.largeurs()[i] != null) {
                largeur = f.largeurs()[i];
            } else {
                int max = f.enTetes()[i].length();
                for (String[] ligne : f.lignes()) {
                    if (ligne != null && i < ligne.length && ligne[i] != null) {
                        max = Math.max(max, ligne[i].length());
                    }
                }
                if (f.ligneTotaux() != null && i < f.ligneTotaux().length && f.ligneTotaux()[i] != null) {
                    max = Math.max(max, f.ligneTotaux()[i].length());
                }
                largeur = Math.max(12, Math.min(max + 2, 55));
            }
            sheet.setColumnWidth(i, largeur * 256);
        }

        // ---- Impression professionnelle ----
        configurerImpression(sheet);
    }

    private static void configurerImpression(Sheet sheet) {
        PrintSetup ps = sheet.getPrintSetup();
        ps.setPaperSize(PrintSetup.A4_PAPERSIZE);
        ps.setLandscape(true);
        ps.setFitWidth((short) 1);
        ps.setFitHeight((short) 0);
        sheet.setFitToPage(true);
        sheet.setMargin(Sheet.TopMargin, 0.6);
        sheet.setMargin(Sheet.BottomMargin, 0.6);
        sheet.setMargin(Sheet.LeftMargin, 0.4);
        sheet.setMargin(Sheet.RightMargin, 0.4);
        // Répète le bandeau, le titre, les métadonnées et les en-têtes sur chaque page imprimée
        sheet.setRepeatingRows(new CellRangeAddress(0, LIGNE_EN_TETES, -1, -1));
    }

    /** Ensemble des styles partagés par toutes les feuilles d'un classeur. */
    private static final class Styles {

        final XSSFCellStyle bandeau;
        final XSSFCellStyle titre;
        final XSSFCellStyle meta;
        final XSSFCellStyle enTete;
        final XSSFCellStyle data;
        final XSSFCellStyle dataAlterne;
        final XSSFCellStyle premiereColonne;
        final XSSFCellStyle totaux;

        Styles(XSSFWorkbook wb) {
            // Bandeau entreprise : navy, blanc, gras, espacé
            bandeau = wb.createCellStyle();
            bandeau.setFillForegroundColor(NAVY);
            bandeau.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            bandeau.setVerticalAlignment(VerticalAlignment.CENTER);
            Font bandeauFont = wb.createFont();
            bandeauFont.setColor(IndexedColors.WHITE.getIndex());
            bandeauFont.setBold(true);
            bandeauFont.setFontHeightInPoints((short) 10);
            bandeau.setFont(bandeauFont);

            // Titre du document : navy, gras, 16 pt
            titre = wb.createCellStyle();
            titre.setVerticalAlignment(VerticalAlignment.CENTER);
            XSSFFont titreFont = wb.createFont();
            titreFont.setColor(NAVY);
            titreFont.setBold(true);
            titreFont.setFontHeightInPoints((short) 16);
            titre.setFont(titreFont);

            // Métadonnées : gris, italique, 10 pt
            meta = wb.createCellStyle();
            XSSFFont metaFont = wb.createFont();
            metaFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            metaFont.setItalic(true);
            metaFont.setFontHeightInPoints((short) 10);
            meta.setFont(metaFont);
            meta.setVerticalAlignment(VerticalAlignment.CENTER);

            // En-têtes : navy, blanc, gras, centrés, retour à la ligne
            enTete = wb.createCellStyle();
            enTete.setFillForegroundColor(NAVY);
            enTete.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont headerFont = wb.createFont();
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            enTete.setFont(headerFont);
            enTete.setAlignment(HorizontalAlignment.CENTER);
            enTete.setVerticalAlignment(VerticalAlignment.CENTER);
            enTete.setWrapText(true);
            enTete.setBorderTop(BorderStyle.THIN);
            enTete.setBorderBottom(BorderStyle.THIN);
            enTete.setBorderLeft(BorderStyle.THIN);
            enTete.setBorderRight(BorderStyle.THIN);
            enTete.setTopBorderColor(NAVY);
            enTete.setBottomBorderColor(NAVY);
            enTete.setLeftBorderColor(NAVY);
            enTete.setRightBorderColor(NAVY);

            // Cellule de données standard
            data = wb.createCellStyle();
            data.setVerticalAlignment(VerticalAlignment.CENTER);
            data.setBorderTop(BorderStyle.THIN);
            data.setBorderBottom(BorderStyle.THIN);
            data.setBorderLeft(BorderStyle.THIN);
            data.setBorderRight(BorderStyle.THIN);
            data.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            data.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            data.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            data.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());

            // Cellule de données alternée (liseré clair)
            dataAlterne = wb.createCellStyle();
            dataAlterne.cloneStyleFrom(data);
            dataAlterne.setFillForegroundColor(LIGNE_ALTERNEE);
            dataAlterne.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Première colonne (identifiant) en gras
            premiereColonne = wb.createCellStyle();
            premiereColonne.cloneStyleFrom(data);
            XSSFFont boldFont = wb.createFont();
            boldFont.setBold(true);
            premiereColonne.setFont(boldFont);

            // Ligne de totaux : gras, fond or clair, liseré supérieur navy
            totaux = wb.createCellStyle();
            totaux.cloneStyleFrom(data);
            totaux.setFillForegroundColor(FOND_TOTAUX);
            totaux.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont totauxFont = wb.createFont();
            totauxFont.setBold(true);
            totaux.setFont(totauxFont);
            totaux.setBorderTop(BorderStyle.MEDIUM);
            totaux.setTopBorderColor(NAVY);
        }
    }
}
