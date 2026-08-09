import type { LigneDevis, Prestation } from './types';

/**
 * Catalogue de prestations standard du BET STRUCTURALIA, calqué sur le
 * modèle de devis officiel (missions Étude technique / Suivi des travaux /
 * Rapports de synthèse). Les prix unitaires sont des valeurs de référence,
 * modifiables lors de l'établissement du devis.
 */

export const SECTION_ETUDE = 'MISSION ÉTUDE TECHNIQUE';
export const SECTION_SUIVI = 'MISSION SUIVI DES TRAVAUX';
export const SECTION_RAPPORTS = 'ÉTABLISSEMENT DES RAPPORTS DE SYNTHÈSE';

export interface CatalogItem extends LigneDevis {
  section: string;
}

export const CATALOG: CatalogItem[] = [
  // --- Mission étude technique --- (total 39 500)
  { section: SECTION_ETUDE, designation: 'Étude technique structure BA', unite: 'F', quantite: 1, prixUnitaire: 12000 },
  { section: SECTION_ETUDE, designation: 'Étude technique électricité CFO', unite: 'U', quantite: 1, prixUnitaire: 6000 },
  { section: SECTION_ETUDE, designation: 'Étude technique plomberie et évacuations', unite: 'U', quantite: 1, prixUnitaire: 4500 },
  { section: SECTION_ETUDE, designation: 'Étude technique ferronnerie · menuiserie métallique · menuiserie aluminium', unite: 'U', quantite: 1, prixUnitaire: 4000 },
  { section: SECTION_ETUDE, designation: 'Étude technique climatisation centralisée HVAC', unite: 'U', quantite: 1, prixUnitaire: 8000 },
  { section: SECTION_ETUDE, designation: 'Étude technique CFA', unite: 'U', quantite: 1, prixUnitaire: 5000 },

  // --- Mission suivi des travaux --- (total 21 000)
  { section: SECTION_SUIVI, designation: 'Suivi et réceptions des phases structure BA', unite: 'U', quantite: 1, prixUnitaire: 6500 },
  { section: SECTION_SUIVI, designation: 'Suivi et réceptions des phases électricité CFO', unite: 'U', quantite: 1, prixUnitaire: 3000 },
  { section: SECTION_SUIVI, designation: 'Suivi et réceptions des phases plomberie et évacuations', unite: 'U', quantite: 1, prixUnitaire: 3000 },
  { section: SECTION_SUIVI, designation: 'Suivi et réceptions des phases structure métallique ou aluminium', unite: 'U', quantite: 1, prixUnitaire: 2000 },
  { section: SECTION_SUIVI, designation: 'Suivi et réceptions des phases climatisation centralisée HVAC', unite: 'U', quantite: 1, prixUnitaire: 4000 },
  { section: SECTION_SUIVI, designation: 'Suivi et réceptions des phases CFA', unite: 'U', quantite: 1, prixUnitaire: 2500 },

  // --- Rapports de synthèse --- (total 3 000)
  { section: SECTION_RAPPORTS, designation: 'Rapport de conformité électricité CFO', unite: 'Ft', quantite: 1, prixUnitaire: 1000 },
  { section: SECTION_RAPPORTS, designation: 'Rapport de conformité des installations CFA', unite: 'Ft', quantite: 1, prixUnitaire: 1000 },
  { section: SECTION_RAPPORTS, designation: 'Rapport de conformité plomberie et évacuations', unite: 'Ft', quantite: 1, prixUnitaire: 1000 },
];

/** Renvoie une copie des lignes du catalogue statique (pour préremplir un devis). */
export function catalogLignes(): LigneDevis[] {
  return CATALOG.map((c) => ({ ...c }));
}

/** Convertit une prestation du catalogue gérable en ligne de devis. */
export function prestationToLigne(p: Prestation): LigneDevis {
  return { section: p.section, designation: p.designation, unite: p.unite, quantite: 1, prixUnitaire: p.prixUnitaire };
}

/** Sections standard proposées lors de la saisie d'une prestation. */
export const SECTIONS_STANDARD = [SECTION_ETUDE, SECTION_SUIVI, SECTION_RAPPORTS];

/** Répartition standard des honoraires (échéancier du contrat). */
export interface EcheanceHonoraire {
  libelle: string;
  pourcentage: number;
}
export const ECHEANCIER_HONORAIRES: EcheanceHonoraire[] = [
  { libelle: 'Signature de la convention', pourcentage: 20 },
  { libelle: 'Études techniques de béton armé de la construction', pourcentage: 10 },
  { libelle: "Études techniques de l'électricité et de la plomberie", pourcentage: 10 },
  { libelle: 'Étude technique climatisation centralisée HVAC', pourcentage: 10 },
  { libelle: 'Étude technique CFA', pourcentage: 10 },
  { libelle: 'Suivi des travaux de la construction (gros œuvre, lots techniques)', pourcentage: 40 },
];
