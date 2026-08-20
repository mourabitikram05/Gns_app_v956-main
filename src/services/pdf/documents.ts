/**
 * Générateur PDF — Documents administratifs.
 *  - documentPdf         : liste des demandes (vue RH / collaborateur), 100 % tableaux
 *  - documentOfficielPdf : document officiel individuel (attestation, certificat…)
 */
import type { DemandeDocument, StatsDocuments } from '../../api/types'
import {
  createDocument, dataTable, emptyState, finalizeDocument, fmtNum, frDate,
  paragraph, sectionTitle, summaryTable, type PdfContext, defaultReference,
} from './common'
import { FORMAT_DOCUMENT_LABEL, STATUT_DOCUMENT_LABEL, documentOfficielPdf } from './documentOfficiel'

export { FORMAT_DOCUMENT_LABEL, STATUT_DOCUMENT_LABEL }

/** PDF de la liste des demandes de documents. */
export function documentPdf(demandes: DemandeDocument[], stats?: StatsDocuments | null, titre = 'Demandes de documents'): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument(titre, `${demandes.length} demande(s)`, { reference: `GNS-DOC-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  if (stats) {
    sectionTitle(ctx, 'Synthèse')
    summaryTable(ctx, [
      ['Total des demandes', fmtNum(stats.total ?? demandes.length)],
      ['Demandes à traiter', fmtNum(stats.aTraiter ?? 0)],
      ['Traitées', fmtNum(demandes.filter((d) => d.statut === 'DISPONIBLE').length)],
      ['Refusées', fmtNum(demandes.filter((d) => d.statut === 'REFUSE').length)],
    ])
  }

  sectionTitle(ctx, 'Détail des demandes')
  if (demandes.length === 0) {
    emptyState(ctx, 'Aucune demande de document')
  } else {
    dataTable(ctx, {
      head: [['Référence', 'Collaborateur', 'Type de document', 'Format', 'Date', 'Statut']],
      body: demandes.map((d) => [
        d.reference,
        d.employeNom,
        d.typeDocument,
        FORMAT_DOCUMENT_LABEL[d.format] ?? d.format,
        frDate(d.dateDemande),
        STATUT_DOCUMENT_LABEL[d.statut] ?? d.statut,
      ]),
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 30 },
        2: { cellWidth: 34 },
        3: { cellWidth: 16 },
        4: { cellWidth: 22 },
        5: { cellWidth: 20 },
      },
    })
  }

  paragraph(ctx, 'Les documents disponibles peuvent être téléchargés individuellement au format PDF officiel depuis la liste.', { size: 7.5, italic: true, color: [107, 114, 128] })
  return finalizeDocument(ctx)
}

export { documentOfficielPdf }
