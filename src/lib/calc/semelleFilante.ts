/* =========================================================================
   Semelle filante sous mur / voile — méthode des bielles (par mètre linéaire).
   BAEL 91 rév. 99. Semelle rigide, calcul par ml de longueur.
   Unités internes : N, mm, MPa. Entrées/sorties : kN/ml, cm, cm²/ml, MPa.
   ========================================================================= */
import { aireBarre, type Etape } from './poteau';
import type { SectionSpec } from './section';

export interface FilanteInput {
  /** Épaisseur du mur / voile porté b (cm). */
  bMur: number;
  /** Effort normal ultime par ml Nu (kN/ml, ELU). */
  Nu: number;
  /** Effort normal de service par ml Nser (kN/ml, ELS). */
  Nser: number;
  /** Contrainte admissible du sol σsol (MPa). */
  sigmaSol: number;
  fc28: number;
  fe: number;
  gammaB: number;
  gammaS: number;
  enrob: number; // cm
  phiL: number; // mm (transversaux)
  phiT: number; // mm (répartition longitudinale)
  gammaBeton: number; // kN/m³
}

export interface FilanteResult {
  ok: boolean;
  erreurs: string[];
  avertissements: string[];
  etapes: Etape[];
  B: number; // cm largeur
  d: number; // cm
  h: number; // cm
  sigmaSolCalc: number; // MPa
  As: number; // cm²/ml transversaux
  esp: number; // cm espacement transversaux
  Arep: number; // cm²/ml longitudinaux (répartition)
  crochets: boolean;
}

function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return '—';
  return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function ceil5(cm: number): number {
  return Math.ceil(cm / 5) * 5;
}

export function calculFilante(inp: FilanteInput): FilanteResult {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const etapes: Etape[] = [];
  const fed = inp.fe / inp.gammaS;

  // Largeur : B ≥ Nser / σsol (par ml)
  const B = ceil5(((inp.Nser / 1000 / inp.sigmaSol) * 100)); // cm (surface par ml = largeur)
  etapes.push({ sym: 'B', label: 'Largeur de la semelle', formule: 'Nser/σsol (par ml)', valeur: `${B} cm` });

  // Hauteur (rigidité) : d ≥ (B − b)/4
  const dReq = (B - inp.bMur) / 4;
  const h = ceil5(dReq + inp.enrob + 2);
  const d = h - inp.enrob;
  etapes.push({ sym: 'd', label: 'Hauteur utile', formule: 'd ≥ (B − b)/4', valeur: `${fmt(d, 0)} cm (≥ ${fmt(dReq, 1)})` });
  etapes.push({ sym: 'h', label: 'Hauteur totale', valeur: `${h} cm` });

  // Sol (ELS, poids propre par ml)
  const poids = (B / 100) * (h / 100) * inp.gammaBeton; // kN/ml
  const sigmaSolCalc = (inp.Nser + poids) / 1000 / (B / 100); // MPa
  etapes.push({ sym: 'σsol', label: 'Contrainte sous la semelle', formule: '(Nser+P)/B', valeur: `${fmt(sigmaSolCalc, 3)} MPa` });
  if (sigmaSolCalc > inp.sigmaSol) {
    avertissements.push(`Avec poids propre, σ = ${fmt(sigmaSolCalc, 3)} > σsol = ${fmt(inp.sigmaSol, 2)} MPa : élargir la semelle.`);
  }

  // Aciers transversaux (bielles) par ml
  const As_mm2 = (inp.Nu * 1e3 * (B * 10 - inp.bMur * 10)) / (8 * d * 10 * fed); // mm²/ml
  const As = As_mm2 / 100; // cm²/ml
  etapes.push({ sym: 'As', label: 'Aciers transversaux', formule: 'Nu·(B−b)/(8·d·fed)', valeur: `${fmt(As)} cm²/ml` });

  const aB = aireBarre(inp.phiL);
  const esp = Math.min(25, Math.max(10, Math.floor((100 * aB) / As))); // cm (borne 10–25)
  const Arep = Math.max(As / 4, 0.001 * B * h / 10); // répartition (min indicatif)
  etapes.push({ sym: 'esp', label: 'Espacement transversaux', valeur: `${fmt(esp, 0)} cm (HA${inp.phiL})` });
  etapes.push({ sym: 'Arep', label: 'Aciers de répartition', formule: 'As/4', valeur: `${fmt(Arep)} cm²/ml` });

  // Ancrage
  const ftj = 0.6 + 0.06 * inp.fc28;
  const tauSu = 0.6 * 1.5 * 1.5 * ftj;
  const ls = (inp.phiL * inp.fe) / (4 * tauSu) / 10; // cm
  const crochets = ls > B / 4;
  etapes.push({ sym: 'Ancrage', label: 'Type d’ancrage', formule: 'ls ⪋ B/4', valeur: crochets ? 'Crochets' : 'Droit' });

  return { ok: erreurs.length === 0, erreurs, avertissements, etapes, B, d, h, sigmaSolCalc, As, esp, Arep, crochets };
}

/** Coupe transversale (schéma) : section B×h avec nappe inférieure + filants. */
export function specFilante(inp: FilanteInput, res: FilanteResult): SectionSpec {
  const nBas = Math.max(3, Math.round((res.B - 2 * inp.enrob) / res.esp) + 1);
  return {
    forme: 'rect',
    width: res.B,
    height: res.h,
    D: res.h,
    enrob: inp.enrob,
    phiL: inp.phiL,
    phiT: inp.phiT,
    arr: { type: 'nappes', nBas, nHaut: 3 },
    legende: `Transv. HA${inp.phiL} e=${res.esp.toFixed(0)} · filants HA${inp.phiT}`,
  };
}
