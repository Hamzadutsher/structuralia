/* =========================================================================
   Descente de charges sur un poteau (file verticale). BAEL / ELU-ELS.
   Cumul niveau par niveau des charges permanentes G et d'exploitation Q
   à partir de la surface d'influence, du poids propre local et des charges
   surfaciques. Fournit Nu et Nser à chaque niveau et en pied (→ semelle).
   NB : la loi de dégression des charges d'exploitation (NF P06-001) n'est
   pas appliquée automatiquement ; réduisez Q par niveau si nécessaire.
   ========================================================================= */
import type { Etape } from './poteau';

export interface NiveauDC {
  nom: string;
  /** Surface d'influence S (m²). */
  S: number;
  /** Charge permanente surfacique G (kN/m²). */
  G: number;
  /** Charge d'exploitation surfacique Q (kN/m²). */
  Q: number;
  /** Poids propre local ajouté au niveau (poteau + poutres…), kN. */
  pp: number;
}

export interface DescenteInput {
  /** Niveaux ordonnés du haut vers le bas. */
  niveaux: NiveauDC[];
}

export interface NiveauDCResult {
  nom: string;
  G: number; // charge permanente du niveau (kN)
  Q: number; // charge d'exploitation du niveau (kN)
  Gcum: number; // cumul G (kN)
  Qcum: number; // cumul Q (kN)
  Nu: number; // 1,35·Gcum + 1,5·Qcum (kN)
  Nser: number; // Gcum + Qcum (kN)
}

export interface DescenteResult {
  ok: boolean;
  erreurs: string[];
  avertissements: string[];
  etapes: Etape[];
  niveaux: NiveauDCResult[];
  /** Charges en pied (dernier niveau) → base / fondation. */
  NuPied: number;
  NserPied: number;
}

export function calculDescente(inp: DescenteInput): DescenteResult {
  const etapes: Etape[] = [];
  let Gcum = 0;
  let Qcum = 0;
  const niveaux: NiveauDCResult[] = inp.niveaux.map((n) => {
    const G = n.G * n.S + n.pp;
    const Q = n.Q * n.S;
    Gcum += G;
    Qcum += Q;
    const Nu = 1.35 * Gcum + 1.5 * Qcum;
    const Nser = Gcum + Qcum;
    return { nom: n.nom, G, Q, Gcum, Qcum, Nu, Nser };
  });

  const pied = niveaux[niveaux.length - 1] ?? { Nu: 0, Nser: 0 };
  etapes.push({ sym: 'ΣG', label: 'Charges permanentes cumulées', valeur: `${Gcum.toFixed(0)} kN` });
  etapes.push({ sym: 'ΣQ', label: "Charges d'exploitation cumulées", valeur: `${Qcum.toFixed(0)} kN` });
  etapes.push({ sym: 'Nu', label: 'Effort ultime en pied', formule: '1,35·ΣG + 1,5·ΣQ', valeur: `${pied.Nu.toFixed(0)} kN` });
  etapes.push({ sym: 'Nser', label: 'Effort de service en pied', formule: 'ΣG + ΣQ', valeur: `${pied.Nser.toFixed(0)} kN` });

  return {
    ok: true,
    erreurs: [],
    avertissements: [],
    etapes,
    niveaux,
    NuPied: pied.Nu,
    NserPied: pied.Nser,
  };
}
