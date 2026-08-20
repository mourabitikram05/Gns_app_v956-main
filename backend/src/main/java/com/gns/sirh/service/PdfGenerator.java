package com.gns.sirh.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Générateur de documents administratifs PDF (OpenPDF + polices Unicode embarquées).
 *
 * <p>Structure d'un document officiel A4 :</p>
 * <ol>
 *   <li>En-tête : nom de l'entreprise + service + adresse/contact, avec espace réservé au logo ;</li>
 *   <li>Titre officiel centré, séparé par un filet élégant ;</li>
 *   <li>Bloc d'informations du document (référence, dates, employé…) ;</li>
 *   <li>Contenu principal (paragraphes et/ou tableau professionnel à en-têtes répétés) ;</li>
 *   <li>Zone de signature (employé + responsable) et espace cachet ;</li>
 *   <li>Pied de page sur chaque page : informations société + référence + numéro de page.</li>
 * </ol>
 *
 * <p>Les polices DejaVu (licence libre, embarquées dans le PDF) couvrent l'intégralité des
 * caractères français : é è ê ë à â ä ù û ü ç ô ö î ï œ Œ — aucun caractère remplacé.</p>
 */
public final class PdfGenerator {

    /** Bleu marine GNS (charte de l'application). */
    private static final Color NAVY = new Color(0, 0, 0);
    /** Or GNS — filets discrets uniquement. */
    private static final Color GOLD = new Color(201, 162, 39);
    /** Gris secondaire. */
    private static final Color GRIS = new Color(107, 114, 128);
    /** Gris très clair (lignes alternées). */
    private static final Color FOND_ALTERNE = new Color(247, 248, 250);
    /** Gris des bordures. */
    private static final Color BORDURE = new Color(226, 230, 236);

    /** Marges (points). */
    private static final float MARGE = 50f;

    private static final BaseFont FONT_REGULIER;
    private static final BaseFont FONT_GRAS;

    static {
        BaseFont regulier = null;
        BaseFont gras = null;
        try {
            // Polices Unicode EMBARQUÉES dans le PDF : rendu identique sur toutes
            // les machines, support complet des caractères français.
            regulier = BaseFont.createFont("/fonts/DejaVuSans.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
            gras = BaseFont.createFont("/fonts/DejaVuSans-Bold.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception ex) {
            // Repli sur les polices standard (Helvetica) si le chargement échoue
        }
        FONT_REGULIER = regulier;
        FONT_GRAS = gras;
    }

    private PdfGenerator() {
    }

    /**
     * Données d'un document administratif.
     *
     * @param enTeteSociete    nom de l'entreprise
     * @param serviceSociete   service / département émetteur (ex. « Direction des Ressources Humaines »)
     * @param adresseSociete   adresse et contacts
     * @param titre            titre officiel du document
     * @param reference        référence (ex. DOC-2026-00002)
     * @param dateEmission     date d'émission (texte formaté)
     * @param infos            paires clé/valeur du bloc d'informations
     * @param corps            paragraphes du contenu principal
     * @param tableau          tableau optionnel : tableau[0] = en-têtes, tableau[i] = lignes de données
     * @param pied             ligne de pied signé (lieu + date)
     * @param signataire       nom du responsable signataire
     * @param dateSignature    date de signature
     * @param signatureEmploye nom de l'employé (zone de signature) — null si non applicable
     */
    public record DonneesDocument(
            String enTeteSociete,
            String serviceSociete,
            String adresseSociete,
            String titre,
            String reference,
            String dateEmission,
            List<String[]> infos,
            List<String> corps,
            String[][] tableau,
            String pied,
            String signataire,
            String dateSignature,
            String signatureEmploye) {
    }

    /* ---------------------------------------------------------------- */
    /* API de compatibilité (signatures historiques)                     */
    /* ---------------------------------------------------------------- */

    public static byte[] generate(String enTeteSociete, String titre, List<String> lignes, String piedDePage) {
        return generate(new DonneesDocument(enTeteSociete, null, null, titre, null, null,
                List.of(), lignes, null, piedDePage, null, null, null));
    }

    public static byte[] generate(String enTeteSociete, String titre, List<String> lignes, String piedDePage,
                                  String signataire, String dateSignature) {
        return generate(new DonneesDocument(enTeteSociete, null, null, titre, null, null,
                List.of(), lignes, null, piedDePage, signataire, dateSignature, null));
    }

    /* ---------------------------------------------------------------- */
    /* Génération principale                                             */
    /* ---------------------------------------------------------------- */

    public static byte[] generate(DonneesDocument d) {
        try {
            Document doc = new Document(PageSize.A4, MARGE, MARGE, 58f, 78f);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new PiedDePage(d));
            doc.open();

            ajouterEnTete(doc, d);
            ajouterTitre(doc, d);
            if (d.infos() != null && !d.infos().isEmpty()) {
                ajouterBlocInfos(doc, d.infos());
            }
            ajouterCorps(doc, d.corps());
            if (d.tableau() != null && d.tableau().length > 0) {
                ajouterTableau(doc, d.tableau());
            }
            if (d.pied() != null && !d.pied().isBlank()) {
                ajouterPiedSigne(doc, d);
            }
            ajouterSignatures(doc, d);
            doc.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible de générer le PDF", ex);
        }
    }

    /* ---------------------------------------------------------------- */
    /* Polices                                                           */
    /* ---------------------------------------------------------------- */

    private static Font police(float taille, int style, Color couleur) {
        BaseFont bf = (style & Font.BOLD) != 0 ? FONT_GRAS : FONT_REGULIER;
        if (bf != null) {
            return new Font(bf, taille, style, couleur);
        }
        return FontFactory.getFont(FontFactory.HELVETICA, taille, style, couleur);
    }

    /* ---------------------------------------------------------------- */
    /* En-tête : logo + informations entreprise                          */
    /* ---------------------------------------------------------------- */

    private static void ajouterEnTete(Document doc, DonneesDocument d) {
        Font fNom = police(16f, Font.BOLD, NAVY);
        Font fService = police(10f, Font.BOLD, GRIS);
        Font fAdresse = police(9f, Font.NORMAL, GRIS);

        PdfPTable entete = new PdfPTable(2);
        entete.setWidthPercentage(100f);
        entete.setWidths(new float[]{72f, 28f});
        entete.setSpacingAfter(4f);

        // Colonne gauche : nom + service + adresse
        PdfPCell gauche = new PdfPCell();
        gauche.setBorder(Rectangle.NO_BORDER);
        gauche.setPadding(0f);
        if (d.enTeteSociete() != null && !d.enTeteSociete().isBlank()) {
            gauche.addElement(new Paragraph(d.enTeteSociete(), fNom));
        }
        if (d.serviceSociete() != null && !d.serviceSociete().isBlank()) {
            gauche.addElement(new Paragraph(" ", police(3f, Font.NORMAL, Color.WHITE)));
            gauche.addElement(new Paragraph(d.serviceSociete(), fService));
        }
        if (d.adresseSociete() != null && !d.adresseSociete().isBlank()) {
            gauche.addElement(new Paragraph(" ", police(3f, Font.NORMAL, Color.WHITE)));
            gauche.addElement(new Paragraph(d.adresseSociete(), fAdresse));
        }
        entete.addCell(gauche);

        // Colonne droite : espace réservé au logo
        PdfPCell logo = new PdfPCell(new Phrase("ESPACE\nLOGO", police(8f, Font.BOLD, GRIS)));
        logo.setBorder(Rectangle.BOX);
        logo.setBorderColor(BORDURE);
        logo.setBorderWidth(0.8f);
        logo.setMinimumHeight(48f);
        logo.setHorizontalAlignment(Element.ALIGN_CENTER);
        logo.setVerticalAlignment(Element.ALIGN_MIDDLE);
        logo.setPaddingTop(6f);
        logo.setPaddingBottom(6f);
        entete.addCell(logo);

        doc.add(entete);

        // Filet doré sous l'en-tête
        PdfPTable filet = new PdfPTable(1);
        filet.setWidthPercentage(100f);
        PdfPCell c = new PdfPCell();
        c.setBorder(Rectangle.BOTTOM);
        c.setBorderColor(GOLD);
        c.setBorderWidth(1.2f);
        c.setFixedHeight(5f);
        c.disableBorderSide(Rectangle.TOP);
        c.disableBorderSide(Rectangle.LEFT);
        c.disableBorderSide(Rectangle.RIGHT);
        c.setPaddingTop(0f);
        filet.addCell(c);
        doc.add(filet);
        doc.add(new Paragraph(" ", police(6f, Font.NORMAL, Color.WHITE)));
    }

    /* ---------------------------------------------------------------- */
    /* Titre officiel                                                    */
    /* ---------------------------------------------------------------- */

    private static void ajouterTitre(Document doc, DonneesDocument d) {
        Font fTitre = police(15f, Font.BOLD, NAVY);
        Font fSous = police(9f, Font.BOLD, GRIS);

        // Référence + date d'émission (gauche), mention officielle (droite)
        PdfPTable meta = new PdfPTable(2);
        meta.setWidthPercentage(100f);
        meta.setSpacingAfter(2f);

        PdfPCell gauche = new PdfPCell();
        gauche.setBorder(Rectangle.NO_BORDER);
        if (d.reference() != null && !d.reference().isBlank()) {
            gauche.addElement(new Paragraph("Référence : " + d.reference(), police(9f, Font.BOLD, GRIS)));
        }
        if (d.dateEmission() != null && !d.dateEmission().isBlank()) {
            gauche.addElement(new Paragraph("Date d'émission : " + d.dateEmission(), police(9f, Font.NORMAL, GRIS)));
        }
        meta.addCell(gauche);

        PdfPCell droite = new PdfPCell();
        droite.setBorder(Rectangle.NO_BORDER);
        droite.setHorizontalAlignment(Element.ALIGN_RIGHT);
        droite.addElement(new Paragraph("DOCUMENT ADMINISTRATIF", fSous));
        meta.addCell(droite);

        doc.add(meta);

        // Titre centré
        Paragraph titre = new Paragraph(d.titre() != null ? d.titre() : "", fTitre);
        titre.setAlignment(Element.ALIGN_CENTER);
        titre.setSpacingBefore(6f);
        titre.setSpacingAfter(2f);
        doc.add(titre);

        // Filet fin sous le titre (centré, 60 % de largeur)
        PdfPTable filet = new PdfPTable(1);
        filet.setHorizontalAlignment(Element.ALIGN_CENTER);
        filet.setWidthPercentage(60f);
        PdfPCell c = new PdfPCell();
        c.setBorder(Rectangle.BOTTOM);
        c.setBorderColor(BORDURE);
        c.setBorderWidth(0.8f);
        c.setFixedHeight(4f);
        c.disableBorderSide(Rectangle.TOP);
        c.disableBorderSide(Rectangle.LEFT);
        c.disableBorderSide(Rectangle.RIGHT);
        filet.addCell(c);
        doc.add(filet);
        doc.add(new Paragraph(" ", police(8f, Font.NORMAL, Color.WHITE)));
    }

    /* ---------------------------------------------------------------- */
    /* Bloc d'informations du document                                   */
    /* ---------------------------------------------------------------- */

    private static void ajouterBlocInfos(Document doc, List<String[]> infos) {
        Font fCle = police(9.5f, Font.BOLD, GRIS);
        Font fValeur = police(10.5f, Font.NORMAL, NAVY);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100f);
        table.setWidths(new float[]{30f, 70f});
        table.setSpacingBefore(2f);
        table.setSpacingAfter(12f);

        boolean alterner = false;
        for (String[] kv : infos) {
            if (kv == null || kv.length != 2) {
                continue;
            }
            PdfPCell cCle = new PdfPCell(new Phrase(kv[0] != null ? kv[0] : "", fCle));
            PdfPCell cVal = new PdfPCell(new Phrase(kv[1] != null ? kv[1] : "", fValeur));
            cCle.setPadding(6f);
            cVal.setPadding(6f);
            cCle.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cVal.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cCle.setBorderColor(BORDURE);
            cVal.setBorderColor(BORDURE);
            cCle.setBorderWidth(0.6f);
            cVal.setBorderWidth(0.6f);
            if (alterner) {
                cCle.setBackgroundColor(FOND_ALTERNE);
                cVal.setBackgroundColor(FOND_ALTERNE);
            }
            alterner = !alterner;
            table.addCell(cCle);
            table.addCell(cVal);
        }
        doc.add(table);
    }

    /* ---------------------------------------------------------------- */
    /* Contenu principal                                                 */
    /* ---------------------------------------------------------------- */

    private static void ajouterCorps(Document doc, List<String> corps) {
        if (corps == null) {
            return;
        }
        Font fCorps = police(10.5f, Font.NORMAL, Color.BLACK);
        for (String raw : corps) {
            if (raw == null) {
                continue;
            }
            if (raw.isBlank()) {
                doc.add(new Paragraph(" ", police(6f, Font.NORMAL, Color.WHITE)));
                continue;
            }
            Paragraph p = new Paragraph(raw, fCorps);
            p.setAlignment(Element.ALIGN_JUSTIFIED);
            p.setLeading(17f);
            p.setSpacingAfter(7f);
            doc.add(p);
        }
    }

    /* ---------------------------------------------------------------- */
    /* Tableau professionnel (en-têtes répétés sur les pages)            */
    /* ---------------------------------------------------------------- */

    private static void ajouterTableau(Document doc, String[][] tableau) {
        if (tableau.length < 2) {
            return;
        }
        int colonnes = tableau[0].length;
        Font fEntete = police(9.5f, Font.BOLD, Color.WHITE);
        Font fCellule = police(9.5f, Font.NORMAL, NAVY);

        PdfPTable table = new PdfPTable(colonnes);
        table.setWidthPercentage(100f);
        table.setHeaderRows(1); // répète l'en-tête sur chaque page
        table.setSpacingBefore(4f);
        table.setSpacingAfter(14f);

        for (int c = 0; c < colonnes; c++) {
            PdfPCell h = new PdfPCell(new Phrase(tableau[0][c] != null ? tableau[0][c] : "", fEntete));
            h.setBackgroundColor(NAVY);
            h.setPadding(7f);
            h.setBorderColor(NAVY);
            h.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(h);
        }

        boolean alterner = false;
        for (int r = 1; r < tableau.length; r++) {
            for (int c = 0; c < colonnes; c++) {
                String valeur = c < tableau[r].length ? tableau[r][c] : "";
                PdfPCell cell = new PdfPCell(new Phrase(valeur, fCellule));
                cell.setPadding(6f);
                cell.setBorderColor(BORDURE);
                cell.setBorderWidth(0.6f);
                if (alterner) {
                    cell.setBackgroundColor(FOND_ALTERNE);
                }
                table.addCell(cell);
            }
            alterner = !alterner;
        }
        doc.add(table);
    }

    /* ---------------------------------------------------------------- */
    /* Pied signé (lieu + date)                                          */
    /* ---------------------------------------------------------------- */

    private static void ajouterPiedSigne(Document doc, DonneesDocument d) {
        Font fPied = police(10f, Font.NORMAL, Color.BLACK);
        Paragraph p = new Paragraph(d.pied(), fPied);
        p.setSpacingBefore(6f);
        p.setSpacingAfter(10f);
        doc.add(p);
    }

    /* ---------------------------------------------------------------- */
    /* Zones de signature + cachet                                       */
    /* ---------------------------------------------------------------- */

    private static void ajouterSignatures(Document doc, DonneesDocument d) {
        Font fTitreZone = police(8f, Font.BOLD, GRIS);
        Font fNom = police(10f, Font.BOLD, NAVY);
        Font fLabel = police(8.5f, Font.NORMAL, GRIS);

        boolean employe = d.signatureEmploye() != null && !d.signatureEmploye().isBlank();
        boolean responsable = d.signataire() != null && !d.signataire().isBlank();
        if (!employe && !responsable) {
            return;
        }

        // Regroupe tout le bloc pour éviter une coupure entre les pages
        PdfPTable bloc = new PdfPTable(1);
        bloc.setKeepTogether(true);
        bloc.setWidthPercentage(100f);

        PdfPCell zone = new PdfPCell();
        zone.setBorder(Rectangle.NO_BORDER);
        zone.setPadding(0f);

        zone.addElement(new Paragraph("SIGNATURES", fTitreZone));
        zone.addElement(new Paragraph(" ", police(4f, Font.NORMAL, Color.WHITE)));

        PdfPTable lignes = new PdfPTable(employe && responsable ? 2 : 1);
        lignes.setWidthPercentage(100f);
        lignes.setSpacingBefore(2f);

        // Signature de l'employé
        if (employe) {
            PdfPCell cEmp = new PdfPCell();
            cEmp.setBorder(Rectangle.BOX);
            cEmp.setBorderColor(BORDURE);
            cEmp.setPadding(10f);
            cEmp.addElement(new Paragraph("Signature de l'employé", fTitreZone));
            cEmp.addElement(new Paragraph(" ", police(4f, Font.NORMAL, Color.WHITE)));
            cEmp.addElement(new Paragraph(d.signatureEmploye(), fNom));
            cEmp.addElement(new Paragraph("Fonction : ..............................................", fLabel));
            cEmp.addElement(new Paragraph(" ", police(58f, Font.NORMAL, Color.WHITE)));
            cEmp.addElement(new Paragraph("Signature", fLabel));
            lignes.addCell(cEmp);
        }

        // Signature du responsable
        if (responsable) {
            PdfPCell cResp = new PdfPCell();
            cResp.setBorder(Rectangle.BOX);
            cResp.setBorderColor(BORDURE);
            cResp.setPadding(10f);
            cResp.addElement(new Paragraph("Signature du responsable", fTitreZone));
            cResp.addElement(new Paragraph(" ", police(4f, Font.NORMAL, Color.WHITE)));
            cResp.addElement(new Paragraph(d.signataire(), fNom));
            cResp.addElement(new Paragraph("Fonction : ..............................................", fLabel));
            cResp.addElement(new Paragraph(" ", police(58f, Font.NORMAL, Color.WHITE)));
            cResp.addElement(new Paragraph("Signature", fLabel));
            lignes.addCell(cResp);
        }
        zone.addElement(lignes);
        zone.addElement(new Paragraph(" ", police(10f, Font.NORMAL, Color.WHITE)));

        // Espace réservé au cachet officiel
        PdfPTable cachetTable = new PdfPTable(1);
        cachetTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cachetTable.setWidthPercentage(38f);
        PdfPCell cachet = new PdfPCell(new Phrase("Cachet de l'entreprise", fLabel));
        cachet.setBorder(Rectangle.BOX);
        cachet.setBorderColor(BORDURE);
        cachet.setBorderWidth(0.8f);
        cachet.setMinimumHeight(64f);
        cachet.setHorizontalAlignment(Element.ALIGN_CENTER);
        cachet.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cachetTable.addCell(cachet);
        zone.addElement(cachetTable);

        bloc.addCell(zone);
        doc.add(bloc);
    }

    /* ---------------------------------------------------------------- */
    /* Pied de page : société + référence + numéro de page               */
    /* ---------------------------------------------------------------- */

    /** Affiche en bas de chaque page : informations société à gauche, « Page X / Y » à droite. */
    private static final class PiedDePage extends PdfPageEventHelper {
        private final DonneesDocument donnees;

        private PiedDePage(DonneesDocument donnees) {
            this.donnees = donnees;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            Font f = police(7.5f, Font.NORMAL, GRIS);
            float largeur = document.right() - document.leftMargin();
            float y = document.bottom() - 14f;

            // Informations société (gauche)
            String gauche = (donnees.enTeteSociete() != null ? donnees.enTeteSociete() : "")
                    + (donnees.adresseSociete() != null && !donnees.adresseSociete().isBlank()
                    ? "  ·  " + donnees.adresseSociete() : "");
            ColumnText.showTextAligned(writer.getDirectContent(), Element.ALIGN_LEFT,
                    new Phrase(gauche, f), document.left(), y, 0f);

            // Référence (centre)
            if (donnees.reference() != null && !donnees.reference().isBlank()) {
                ColumnText.showTextAligned(writer.getDirectContent(), Element.ALIGN_CENTER,
                        new Phrase("Réf. " + donnees.reference(), f), document.left() + largeur / 2f, y, 0f);
            }

            // Numéro de page (droite)
            ColumnText.showTextAligned(writer.getDirectContent(), Element.ALIGN_RIGHT,
                    new Phrase("Page " + writer.getPageNumber(), f), document.right(), y, 0f);
        }
    }
}
