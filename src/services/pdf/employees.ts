/**
 * Générateur PDF — Employés (Annuaire).
 * Présentation 100 % tableau : liste structurée + synthèse "Indicateur | Valeur".
 */
import type { EmployeListItem } from '../../api/types'
import {
  createDocument, dataTable, emptyState, finalizeDocument, frDate,
  paragraph, sectionTitle, summaryTable, type PdfContext, defaultReference,
} from './common'

export const STATUT_EMPLOYE_LABEL: Record<string, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
}

function tableBody(employes: EmployeListItem[]) {
  return employes.map((e) => [
    e.matricule ?? '—',
    e.nomComplet,
    e.poste ?? '—',
    e.departement ?? '—',
    e.email ?? '—',
    e.telephone ?? '—',
    e.bureau ?? '—',
    e.manager ?? '—',
    STATUT_EMPLOYE_LABEL[e.statut] ?? e.statut ?? '—',
  ])
}

/** Génère le PDF de l'annuaire des employés (données réelles). */
export function employeePdf(employes: EmployeListItem[]): ReturnType<typeof finalizeDocument> {
  const ctx: PdfContext = createDocument('Annuaire des employés', `${employes.length} collaborateur(s) — export du référentiel RH`, { reference: `GNS-ANN-${defaultReference().slice(8)}` })
  const doc = ctx.doc

  sectionTitle(ctx, 'Liste des employés')

  if (employes.length === 0) {
    emptyState(ctx, 'Aucun employé enregistré')
  } else {
    dataTable(ctx, {
      head: [['Matricule', 'Nom complet', 'Poste', 'Département', 'Email', 'Téléphone', 'Bureau', 'Manager', 'Statut']],
      body: tableBody(employes),
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 25 },
        2: { cellWidth: 21 },
        3: { cellWidth: 19 },
        4: { cellWidth: 27 },
        5: { cellWidth: 17 },
        6: { cellWidth: 14 },
        7: { cellWidth: 20 },
        8: { cellWidth: 15 },
      },
    })
  }

  // Synthèse — tableau "Indicateur | Valeur"
  sectionTitle(ctx, 'Synthèse')
  const actifs = employes.filter((e) => e.statut !== 'INACTIF').length
  const parDepartement = new Map<string, number>()
  employes.forEach((e) => {
    const nom = e.departement ?? 'Sans département'
    parDepartement.set(nom, (parDepartement.get(nom) ?? 0) + 1)
  })
  summaryTable(ctx, [
    ['Total collaborateurs', employes.length],
    ['Actifs', actifs],
    ['Inactifs', employes.length - actifs],
    ['Départements représentés', parDepartement.size],
    ['Taux d\'activité', employes.length > 0 ? `${Math.round((actifs / employes.length) * 100)} %` : '—'],
  ])
  ctx.y += 2
  paragraph(ctx, `Annuaire officiel des ressources humaines au ${frDate(new Date())}. Document généré automatiquement par GNS SIRH.`,
    { size: 7.5, italic: true, color: [107, 114, 128] })

  return finalizeDocument(ctx)
}
