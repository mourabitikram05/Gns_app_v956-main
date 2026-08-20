// /**
//  * Générateur PDF — Document officiel individuel (module Documents).
//  *
//  * Le PDF représente UNIQUEMENT le document administratif demandé par l'employé :
//  * AUCUN tableau, AUCUNE statistique, AUCUN graphique, AUCUNE synthèse.
//  * Présentation simple, officielle et professionnelle conforme au modèle :
//  * titre centré souligné, texte légal, « Fait à …, le … », signature en bas à
//  * droite et cachet « Certifié / conforme ».
//  */
// import type { DemandeDocument } from '../../api/types'
// import {
//   COMPANY_NAME, PAGE, THEME, createDocument, finalizeDocument,
//   frDate, frDateLong, type PdfContext,
// } from './common'
//
// export const STATUT_DOCUMENT_LABEL: Record<string, string> = {
//   EN_TRAITEMENT: 'À traiter',
//   DISPONIBLE: 'Traité',
//   REFUSE: 'Refusé',
// }
//
// export const FORMAT_DOCUMENT_LABEL: Record<string, string> = {
//   DIGITAL: 'Digital',
//   PAPIER: 'Papier',
// }
//
// /** Ville de délivrance des documents officiels (configurable). */
// const COMPANY_CITY = 'Casablanca'
//
// /** Colonne centrale compacte : marges larges, contenu recentré. */
// const COL = { left: 36, width: 138, center: 105 }
//
// /** Paragraphes du corps du document administratif, conformes au modèle. */
// function contenuDocument(d: DemandeDocument): string[] {
//   const statut = STATUT_DOCUMENT_LABEL[d.statut] ?? d.statut
//   const type = d.typeDocument || 'document administratif'
//   const signataire = d.signataire || 'la Direction des Ressources Humaines'
//   const lignes: string[] = []
//
//   lignes.push(`Je, soussigné ${signataire}, agissant en qualité de Responsable des Ressources Humaines de la société ${COMPANY_NAME}, atteste et certifie par la présente que :`)
//
//   lignes.push(`Monsieur / Madame ${d.employeNom}${d.departement ? `, collaborateur(trice) du département « ${d.departement} »` : ''},`)
//
//   lignes.push(`- a bien formulé une demande de « ${type} », enregistrée sous la référence ${d.reference} en date du ${frDate(d.dateDemande)},`)
//
//   if (d.statut === 'DISPONIBLE') {
//     lignes.push(`- le document demandé a été établi et mis à disposition${d.dateSignature ? ` le ${frDate(d.dateSignature)}` : ''} par le service des ressources humaines.`)
//   } else if (d.statut === 'REFUSE') {
//     lignes.push(`- cette demande a été refusée${d.motifRefus ? ` pour le motif suivant : « ${d.motifRefus} »` : ''} par le service des ressources humaines.`)
//   } else {
//     lignes.push(`- cette demande est actuellement en cours de traitement par le service des ressources humaines (statut : ${statut}).`)
//   }
//
//   if (d.remarque) {
//     lignes.push(`Remarque du collaborateur : « ${d.remarque} ».`)
//   }
//
//   lignes.push('Cette attestation est délivrée à la demande du collaborateur pour servir et valoir ce que de droit.')
//   return lignes
// }
//
// /** Génère le PDF officiel d'un document administratif — document pur, sans tableau. */
// export function documentOfficielPdf(d: DemandeDocument): ReturnType<typeof finalizeDocument> {
//   const ctx: PdfContext = createDocument('Document officiel', `Référence : ${d.reference}`)
//   const doc = ctx.doc
//
//   // --------------------------------------------------------- Titre centré
//   // (capitales, bleu marine, souligné or — conforme au modèle)
//   const titre = (d.typeDocument || 'Document officiel').toUpperCase()
//   ctx.y += 3
//   doc.setFont('helvetica', 'bold')
//   doc.setFontSize(16)
//   doc.setTextColor(...THEME.primary)
//   doc.text(titre, COL.center, ctx.y, { align: 'center' })
//   const titreW = doc.getTextWidth(titre) * 0.3528
//   doc.setDrawColor(...THEME.secondary)
//   doc.setLineWidth(0.6)
//   doc.line(COL.center - titreW / 2, ctx.y + 1.3, COL.center + titreW / 2, ctx.y + 1.3)
//   ctx.y += 10
//
//   // --------------------------------------------------------- Informations du document
//   // (ligne discrète : référence, format, statut, date de demande — ni tableau, ni statistique)
//   doc.setFont('helvetica', 'normal')
//   doc.setFontSize(7.5)
//   doc.setTextColor(107, 114, 128)
//   doc.text(
//     `Référence : ${d.reference}   ·   Format : ${FORMAT_DOCUMENT_LABEL[d.format] ?? d.format}   ·   Statut : ${STATUT_DOCUMENT_LABEL[d.statut] ?? d.statut}   ·   Demandé le ${frDate(d.dateDemande)}`,
//     COL.center, ctx.y, { align: 'center' },
//   )
//   ctx.y += 9
//
//   // --------------------------------------------------------- Contenu du document
//   doc.setFont('helvetica', 'normal')
//   doc.setFontSize(10)
//   doc.setTextColor(31, 41, 55)
//   contenuDocument(d).forEach((ligne) => {
//     const lines = doc.splitTextToSize(ligne, COL.width)
//     ensureRoom(ctx, lines.length * 4.4 + 2)
//     doc.text(lines, COL.left, ctx.y)
//     ctx.y += lines.length * 4.4 + 2
//   })
//
//   // --------------------------------------------------------- Fait à …, le …
//   ctx.y += 4
//   ensureRoom(ctx, 12)
//   doc.setFont('helvetica', 'bold')
//   doc.setFontSize(10)
//   doc.setTextColor(31, 41, 55)
//   doc.text(`Fait à ${COMPANY_CITY}, le ${frDateLong(d.dateSignature ?? new Date())}`, COL.left, ctx.y)
//   ctx.y += 8
//
//   // --------------------------------------------------------- Cachet + signature
//   ensureRoom(ctx, 28)
//   const sigY = ctx.y + 14
//   // Cachet « Certifié / conforme » (bas centre-gauche)
//   const sealCX = COL.left + 24
//   const sealCY = sigY + 2
//   doc.setFillColor(240, 242, 245)
//   doc.setDrawColor(156, 163, 175)
//   doc.setLineWidth(0.5)
//   doc.setLineDashPattern([1.2, 0.8], 0)
//   doc.circle(sealCX, sealCY, 9.5, 'FD')
//   doc.setLineDashPattern([], 0)
//   doc.setFont('helvetica', 'bold')
//   doc.setFontSize(6.5)
//   doc.setTextColor(107, 114, 128)
//   doc.text('Certifié', sealCX, sealCY - 2.5, { align: 'center' })
//   doc.text('conforme', sealCX, sealCY + 1.5, { align: 'center' })
//   // Cochet de validation au centre du cachet
//   doc.setDrawColor(107, 114, 128)
//   doc.setLineWidth(0.7)
//   doc.line(sealCX - 2.5, sealCY - 0.5, sealCX - 0.5, sealCY + 1.5)
//   doc.line(sealCX - 0.5, sealCY + 1.5, sealCX + 3, sealCY - 2.5)
//   // Signature en bas à droite de la colonne
//   doc.setFont('helvetica', 'bold')
//   doc.setFontSize(10)
//   doc.setTextColor(31, 41, 55)
//   doc.text(d.signataire || 'Le Responsable des Ressources Humaines', COL.left + COL.width, sigY, { align: 'right' })
//   doc.setFont('helvetica', 'normal')
//   doc.setFontSize(8.5)
//   doc.setTextColor(107, 114, 128)
//   doc.text('Signature', COL.left + COL.width, sigY + 4.5, { align: 'right' })
//   // Trait de signature
//   doc.setDrawColor(156, 163, 175)
//   doc.setLineWidth(0.3)
//   doc.line(COL.left + COL.width - 52, sigY + 3.2, COL.left + COL.width, sigY + 3.2)
//   ctx.y = sigY + 10
//
//   return finalizeDocument(ctx)
// }
//
// function ensureRoom(ctx: PdfContext, needed: number) {
//   if (ctx.y + needed > PAGE.footerY - 16) {
//     ctx.doc.addPage()
//     ctx.y = PAGE.contentStart
//   }
// }


/**
 * Générateur PDF — Document officiel individuel (module Documents).
 *
 * Le PDF représente UNIQUEMENT le document administratif demandé par l'employé :
 * AUCUN tableau, AUCUNE statistique, AUCUN graphique, AUCUNE synthèse.
 * Présentation simple, officielle et professionnelle conforme au modèle :
 * titre centré souligné, texte légal, « Fait à …, le … », signature en bas à
 * droite et cachet « Certifié / conforme ».
 */
import type { DemandeDocument } from '../../api/types'
import {
  COMPANY_NAME, PAGE, THEME, createDocument, finalizeDocument,
  frDate, frDateLong, type PdfContext,
} from './common'

export const STATUT_DOCUMENT_LABEL: Record<string, string> = {
  EN_TRAITEMENT: 'À traiter',
  DISPONIBLE: 'Traité',
  REFUSE: 'Refusé',
}

export const FORMAT_DOCUMENT_LABEL: Record<string, string> = {
  DIGITAL: 'Digital',
  PAPIER: 'Papier',
}

/** Ville de délivrance des documents officiels (configurable). */
const COMPANY_CITY = 'Casablanca'

/** Colonne centrale compacte : marges larges, contenu recentré. */
const COL = { left: 16, width: 168, center: 105 }

/** Paragraphes du corps du document administratif, conformes au modèle. */
function contenuDocument(d: DemandeDocument): string[] {
  const statut = STATUT_DOCUMENT_LABEL[d.statut] ?? d.statut
  const type = d.typeDocument || 'document administratif'
  const signataire = d.signataire || 'la Direction des Ressources Humaines'
  const lignes: string[] = []

  lignes.push(`Je soussigné ${signataire} agissant en qualité de Responsable des Ressources Humaines de la société ${COMPANY_NAME}, atteste et certifie par la présente que   ${d.employeNom}${d.departement ? `, collaborateur du département « ${d.departement} »` : ''}, a bien formulé une demande de « ${type} », enregistrée sous la référence ${d.reference} en date du ${frDate(d.dateDemande)}`)



  // lignes.push(`- a bien formulé une demande de « ${type} », enregistrée sous la référence ${d.reference} en date du ${frDate(d.dateDemande)},`)

  if (d.statut === 'DISPONIBLE') {
    lignes.push(` le document demandé a été établi et mis à disposition${d.dateSignature ? ` le ${frDate(d.dateSignature)}` : ''} par le service des ressources humaines.`)
  } else if (d.statut === 'REFUSE') {
    lignes.push(` cette demande a été refusée${d.motifRefus ? ` pour le motif suivant : « ${d.motifRefus} »` : ''} par le service des ressources humaines.`)
  } else {
    lignes.push(` cette demande est actuellement en cours de traitement par le service des ressources humaines (statut : ${statut}).`)
  }

  if (d.remarque) {
    lignes.push(`Remarque du collaborateur : « ${d.remarque} ».`)
  }

  lignes.push('Cette attestation est délivrée à la demande du collaborateur pour servir et valoir ce que de droit.')
  return lignes
}

/** Génère le PDF officiel d'un document administratif — document pur, sans tableau. */
export function documentOfficielPdf(d: DemandeDocument): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Document officiel', `Référence : ${d.reference}`)
  const doc = ctx.doc

  // --------------------------------------------------------- Titre centré
  // // (capitales, bleu marine, souligné or — conforme au modèle)
  // const titre = (d.typeDocument || 'Document officiel').toUpperCase()
  // ctx.y += 3
  // doc.setFont('helvetica', 'bold')
  // doc.setFontSize(16)
  // doc.setTextColor(...THEME.primary)
  // doc.text(titre, COL.center, ctx.y, { align: 'center' })
  // const titreW = doc.getTextWidth(titre) * 0.3528
  // doc.setDrawColor(...THEME.secondary)
  // doc.setLineWidth(0.6)
  // doc.line(COL.center - titreW / 2, ctx.y + 1.3, COL.center + titreW / 2, ctx.y + 1.3)
  // ctx.y += 10
// ---------------------------------------------------------
// Titre centré
// ---------------------------------------------------------
  const titre = (d.typeDocument || 'Document officiel').toUpperCase()

  ctx.y += 26

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...THEME.primary)

  doc.text(titre, COL.center, ctx.y, {
    align: 'center',
  })

// Ligne élégante sous le titre
  const titreW = doc.getTextWidth(titre)

  doc.setDrawColor(...THEME.secondary)
  doc.setLineWidth(0.45)

  const lineWidth = Math.min(titreW * 0.75, 65)+18
  const lineY = ctx.y + 3

  doc.line(
      COL.center - lineWidth  / 2,
      lineY,
      COL.center + lineWidth / 2,
      lineY,
  )

  ctx.y += 20
  // --------------------------------------------------------- Informations du document
  // (ligne discrète : référence, format, statut, date de demande — ni tableau, ni statistique)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(107, 114, 128)
  // doc.text(
  //   `Référence : ${d.reference}   ·   Format : ${FORMAT_DOCUMENT_LABEL[d.format] ?? d.format}   ·   Statut : ${STATUT_DOCUMENT_LABEL[d.statut] ?? d.statut}   ·   Demandé le ${frDate(d.dateDemande)}`,
  //   COL.center, ctx.y, { align: 'center' },
  // )
  ctx.y += 9

  // --------------------------------------------------------- Contenu du document
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(31, 41, 55)
  contenuDocument(d).forEach((ligne) => {
    const lines = doc.splitTextToSize(ligne, COL.width)
    ensureRoom(ctx, lines.length * 5.4 + 2)
    doc.text(lines, COL.left, ctx.y)
    ctx.y += lines.length * 5.4 + 2
  })

  // --------------------------------------------------------- Fait à …, le …
  ctx.y += 4
  ensureRoom(ctx, 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(31, 41, 55)
  doc.text(`Fait à ${COMPANY_CITY}, le ${frDateLong(d.dateSignature ?? new Date())}`, COL.left, ctx.y)
  ctx.y += 8

  // --------------------------------------------------------- Cachet + signature
  // ensureRoom(ctx, 28)
  // const sigY = ctx.y + 14
  // // Cachet « Certifié / conforme » (bas centre-gauche)
  // const sealCX = COL.left + 24
  // const sealCY = sigY + 2
  // doc.setFillColor(240, 242, 245)
  // doc.setDrawColor(156, 163, 175)
  // doc.setLineWidth(0.5)
  // doc.setLineDashPattern([1.2, 0.8], 0)
  // doc.circle(sealCX, sealCY, 9.5, 'FD')
  // doc.setLineDashPattern([], 0)
  // doc.setFont('helvetica', 'bold')
  // doc.setFontSize(6.5)
  // doc.setTextColor(107, 114, 128)
  // doc.text('Certifié', sealCX, sealCY - 2.5, { align: 'center' })
  // doc.text('conforme', sealCX, sealCY + 1.5, { align: 'center' })
  // // Cochet de validation au centre du cachet
  // doc.setDrawColor(107, 114, 128)
  // doc.setLineWidth(0.7)
  // doc.line(sealCX - 2.5, sealCY - 0.5, sealCX - 0.5, sealCY + 1.5)
  // doc.line(sealCX - 0.5, sealCY + 1.5, sealCX + 3, sealCY - 2.5)
  // // Signature en bas à droite de la colonne
  // doc.setFont('helvetica', 'bold')
  // doc.setFontSize(10)
  // doc.setTextColor(31, 41, 55)
  // doc.text(d.signataire || 'Le Responsable des Ressources Humaines', COL.left + COL.width, sigY, { align: 'right' })
  // doc.setFont('helvetica', 'normal')
  // doc.setFontSize(8.5)
  // doc.setTextColor(107, 114, 128)
  // doc.text('Signature', COL.left+3+ COL.width, sigY + 4.5, { align: 'right' })
  // // Trait de signature
  // doc.setDrawColor(156, 163, 175)
  // doc.setLineWidth(0.3)
  // doc.line(COL.left + COL.width - 52, sigY + 3.2, COL.left + COL.width, sigY + 3.2)
  // ctx.y = sigY + 10
// ---------------------------------------------------------
// Cachet + signature
// ---------------------------------------------------------
  ensureRoom(ctx, 38)

// Position globale de la zone de validation
  const validationY = ctx.y + 6

// =========================
// CACHEt — bas gauche
// =========================
  const sealCX = COL.left + 22
  const sealCY = validationY + 10

  doc.setFillColor(248, 249, 250)
  doc.setDrawColor(156, 163, 175)
  doc.setLineWidth(0.5)
  doc.setLineDashPattern([1.2, 0.8], 0)
  doc.circle(sealCX, sealCY, 10, 'FD')
  doc.setLineDashPattern([], 0)

// Texte du cachet
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(107, 114, 128)

  doc.text('Certifié', sealCX, sealCY - 2.5, {
    align: 'center',
  })

  doc.text('conforme', sealCX, sealCY + 1.5, {
    align: 'center',
  })

// Petite coche dans le cachet
  doc.setDrawColor(107, 114, 128)
  doc.setLineWidth(0.7)

  doc.line(
      sealCX - 2.5,
      sealCY - 0.5,
      sealCX - 0.5,
      sealCY + 1.5,
  )

  doc.line(
      sealCX - 0.5,
      sealCY + 1.5,
      sealCX + 3,
      sealCY - 2.5,
  )

// =========================
// SIGNATURE — bas droite
// =========================

// Zone signature indépendante du cachet
  const signatureX = COL.left + COL.width - 8

// Nom du signataire
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(31, 41, 55)

  doc.text(
      d.signataire || 'Le Responsable des Ressources Humaines',
      signatureX,
      validationY + 2,
      { align: 'right' },
  )

// Ligne de signature
  const signatureLineWidth = 48
  const signatureLineY = validationY + 9

  doc.setDrawColor(107, 114, 128)
  doc.setLineWidth(0.35)

  doc.line(
      signatureX - signatureLineWidth,
      signatureLineY,
      signatureX,
      signatureLineY,
  )

// Mention Signature
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)

  doc.text(
      'Signature',
      signatureX,
      signatureLineY + 5,
      { align: 'right' },
  )

// Mise à jour de la position verticale
  ctx.y = validationY + 20
  return finalizeDocument(ctx)
}

function ensureRoom(ctx: PdfContext, needed: number) {
  if (ctx.y + needed > PAGE.footerY - 16) {
    ctx.doc.addPage()
    ctx.y = PAGE.contentStart
  }
}
