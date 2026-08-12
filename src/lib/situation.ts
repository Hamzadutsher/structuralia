import type { Devis, LigneDevis } from './types';

/**
 * Facturation par **situations** : produit les lignes d'une facture partielle
 * à partir d'un devis, selon l'avancement, les phases terminées ou un montant
 * fixé. Les prix affectés aux prestations facturées somment **exactement** au
 * montant total de la situation (répartition proportionnelle + ajustement
 * d'arrondi sur la dernière ligne).
 */

export type SituationMode = 'AVANCEMENT' | 'PHASES' | 'MONTANT';

export const SITUATION_LABELS: Record<SituationMode, string> = {
  AVANCEMENT: 'Par avancement (%)',
  PHASES: 'Phases terminées',
  MONTANT: 'Montant fixé',
};

export function sumHT(lignes: LigneDevis[]): number {
  return (lignes ?? []).reduce((s, l) => s + (l.quantite || 0) * (l.prixUnitaire || 0), 0);
}

/**
 * Répartit un montant HT cible sur les lignes proportionnellement à leur poids.
 * La somme des montants produits est EXACTEMENT égale à `round(targetHT)`.
 */
export function repartir(lignes: LigneDevis[], targetHT: number): LigneDevis[] {
  const poids = lignes.map((l) => (l.quantite || 0) * (l.prixUnitaire || 0));
  const total = poids.reduce((a, b) => a + b, 0) || 1;
  const cible = Math.max(0, Math.round(targetHT));
  const out: LigneDevis[] = lignes.map((l, i) => ({
    section: l.section,
    designation: l.designation,
    unite: l.unite,
    quantite: 1,
    prixUnitaire: Math.round((cible * poids[i]) / total),
  }));
  const somme = out.reduce((s, l) => s + (l.prixUnitaire || 0), 0);
  if (out.length) out[out.length - 1].prixUnitaire = (out[out.length - 1].prixUnitaire || 0) + (cible - somme);
  return out;
}

export interface SituationResult {
  lignes: LigneDevis[];
  montantHT: number;
  libelle: string;
}

export function calculerSituation(
  devis: Devis,
  opts: { mode: SituationMode; pct?: number; montant?: number; selection?: number[]; dejaFactureHT?: number },
): SituationResult {
  const devisHT = sumHT(devis.lignes);
  const deja = opts.dejaFactureHT || 0;

  if (opts.mode === 'MONTANT') {
    const m = Math.max(0, Math.round(opts.montant || 0));
    return { lignes: repartir(devis.lignes, m), montantHT: m, libelle: 'Facturation d’un montant fixé' };
  }

  if (opts.mode === 'AVANCEMENT') {
    const pct = Math.max(0, Math.min(100, opts.pct ?? 0));
    const cumul = devisHT * (pct / 100);
    const situation = Math.max(0, Math.round(cumul - deja));
    return { lignes: repartir(devis.lignes, situation), montantHT: situation, libelle: `Situation à ${pct}% d’avancement` };
  }

  // PHASES : les lignes sélectionnées sont facturées à 100 %.
  const sel = (opts.selection ?? []).map((i) => devis.lignes[i]).filter(Boolean);
  const m = Math.round(sumHT(sel));
  return { lignes: sel.map((l) => ({ ...l })), montantHT: m, libelle: 'Facturation des phases terminées' };
}
