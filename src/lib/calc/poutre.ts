/* =========================================================================
   Poutre BA sur appuis — flexion simple + effort tranchant. BAEL 91 rév. 99.
   Section rectangulaire, sollicitations ELU saisies (Mu, Vu).
   Unités internes : N, mm, MPa. Entrées/sorties : kN, kN·m, cm, cm².
   ========================================================================= */
import { aireBarre, type Etape } from './poteau';
import type { SectionSpec } from './section';

/** Situation de fissuration (BAEL A.4.5 / A.5.1). */
export type Fissuration = 'PP' | 'P' | 'TP';

export interface PoutreInput {
  /** Largeur b₀ (cm). */
  b: number;
  /** Hauteur totale h (cm). */
  h: number;
  /** Enrobage (parement → nu du cadre), cm. */
  enrob: number;
  /** Moment fléchissant ultime Mu (kN·m). */
  Mu: number;
  /** Effort tranchant ultime Vu (kN). */
  Vu: number;
  fc28: number;
  fe: number;
  gammaB: number;
  gammaS: number;
  /** Ø aciers longitudinaux (mm). */
  phiL: number;
  /** Ø cadres/étriers (mm). */
  phiT: number;
  /** Nombre de brins d'armature transversale (2 = cadre simple). */
  nBrins: number;
  fissuration: Fissuration;
}

export interface PoutreResult {
  ok: boolean;
  erreurs: string[];
  avertissements: string[];
  etapes: Etape[];

  d: number; // hauteur utile (cm)
  mu: number; // moment réduit
  As: number; // acier tendu (cm²)
  Asup: number; // acier comprimé (cm²)
  Amin: number; // non-fragilité (cm²)
  nInf: number; // nb barres inférieures
  nSup: number; // nb barres supérieures
  AsReel: number; // acier inférieur réel (cm²)
  tauU: number; // contrainte tangente (MPa)
  tauLim: number; // contrainte tangente limite (MPa)
  st: number; // espacement des cadres retenu (cm)
  stMax: number; // espacement maximal (cm)
  phiT: number;
}

const DIAM_STD = [6, 8, 10, 12, 14, 16, 20, 25, 32, 40];

function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return '—';
  return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function calculPoutreBAEL(inp: PoutreInput): PoutreResult {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const etapes: Etape[] = [];

  const b = inp.b * 10; // mm
  const h = inp.h * 10; // mm
  const dp = inp.enrob * 10 + inp.phiT + inp.phiL / 2; // mm
  const d = h - dp; // mm
  const Mu = inp.Mu * 1e6; // N·mm
  const Vu = inp.Vu * 1e3; // N

  const fbu = (0.85 * inp.fc28) / inp.gammaB; // MPa
  const fed = inp.fe / inp.gammaS; // MPa
  const ft28 = 0.6 + 0.06 * inp.fc28; // MPa
  const ftj = Math.min(ft28, 3.3); // plafonné pour l'effort tranchant

  etapes.push({ sym: 'fbu', label: 'Résistance de calcul du béton', formule: '0,85·fc28/γb', valeur: `${fmt(fbu)} MPa` });
  etapes.push({ sym: 'd', label: 'Hauteur utile', formule: 'h − d′', valeur: `${fmt(d / 10, 1)} cm` });

  // --- Flexion simple (ELU) --------------------------------------------------
  const mu = Mu / (b * d * d * fbu);
  const eps_es = fed / 200000;
  const alpha_lu = 3.5 / (3.5 + 1000 * eps_es);
  const mu_lu = 0.8 * alpha_lu * (1 - 0.4 * alpha_lu);
  etapes.push({ sym: 'μbu', label: 'Moment réduit', formule: 'Mu/(b·d²·fbu)', valeur: fmt(mu, 3) });

  let As_mm2: number;
  let Asup_mm2 = 0;
  if (mu <= mu_lu) {
    const alpha = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * mu)));
    const z = d * (1 - 0.4 * alpha);
    As_mm2 = Mu / (z * fed);
    etapes.push({ sym: 'α', label: 'Position de l’axe neutre', formule: '1,25·(1−√(1−2μ))', valeur: fmt(alpha, 3) });
    etapes.push({ sym: 'z', label: 'Bras de levier', formule: 'd·(1 − 0,4·α)', valeur: `${fmt(z / 10, 1)} cm` });
  } else {
    const z_lu = d * (1 - 0.4 * alpha_lu);
    const M_lu = mu_lu * b * d * d * fbu;
    const dM = Mu - M_lu;
    Asup_mm2 = dM / ((d - dp) * fed);
    As_mm2 = M_lu / (z_lu * fed) + dM / ((d - dp) * fed);
    avertissements.push(
      `μbu = ${fmt(mu, 3)} > μlu = ${fmt(mu_lu, 3)} : aciers comprimés nécessaires (A′ = ${fmt(Asup_mm2 / 100)} cm²).`,
    );
    etapes.push({ sym: "A'", label: 'Aciers comprimés', valeur: `${fmt(Asup_mm2 / 100)} cm²` });
  }

  // Non-fragilité (BAEL A.4.2)
  const Amin = (0.23 * b * d * ft28) / inp.fe; // mm²
  const As_final = Math.max(As_mm2, Amin);
  etapes.push({ sym: 'As', label: 'Acier tendu', formule: 'Mu/(z·fed)', valeur: `${fmt(As_mm2 / 100)} cm²` });
  etapes.push({ sym: 'Amin', label: 'Non-fragilité', formule: '0,23·b·d·ft28/fe', valeur: `${fmt(Amin / 100)} cm²` });

  // --- Choix des barres ------------------------------------------------------
  const aB = aireBarre(inp.phiL);
  const nInf = Math.max(2, Math.ceil(As_final / 100 / aB));
  const nSup = Asup_mm2 > 0 ? Math.max(2, Math.ceil(Asup_mm2 / 100 / aB)) : 2; // 2 barres de montage mini
  const AsReel = nInf * aB;
  etapes.push({ sym: 'Choix', label: 'Nappe inférieure (tendue)', valeur: `${nInf} HA${inp.phiL} → ${fmt(nInf * aB)} cm²` });

  // --- Effort tranchant (BAEL A.5.1) -----------------------------------------
  const tauU = Vu / (b * d); // MPa
  const tauLim =
    inp.fissuration === 'PP'
      ? Math.min((0.2 * inp.fc28) / inp.gammaB, 5)
      : Math.min((0.15 * inp.fc28) / inp.gammaB, 4);
  etapes.push({ sym: 'τu', label: 'Contrainte tangente', formule: 'Vu/(b₀·d)', valeur: `${fmt(tauU, 2)} MPa` });
  etapes.push({ sym: 'τlim', label: 'Contrainte tangente limite', valeur: `${fmt(tauLim, 2)} MPa` });
  if (tauU > tauLim) {
    erreurs.push(
      `τu = ${fmt(tauU, 2)} MPa > τlim = ${fmt(tauLim, 2)} MPa : section insuffisante vis-à-vis de l'effort tranchant, augmentez b₀ ou h.`,
    );
  }

  // Armatures d'âme : At/(b₀·st) ≥ (τu − 0,3·ftj)/(0,9·fed)
  const At = inp.nBrins * aireBarre(inp.phiT) * 100; // mm²
  const besoin = (tauU - 0.3 * ftj) / (0.9 * fed); // 1/mm requis pour At/(b·st)
  const stMax = Math.min(0.9 * d, 400); // mm
  const stMinPct = (At * inp.fe) / (0.4 * b); // mm (pourcentage minimal 0,4 MPa)
  let st = Math.min(stMax, stMinPct);
  if (besoin > 0) st = Math.min(st, At / (b * besoin));
  // Arrondi commercial au cm inférieur
  st = Math.floor(st / 10) * 10;
  etapes.push({ sym: 'At', label: 'Section transversale', valeur: `${inp.nBrins}× Ø${inp.phiT} = ${fmt(At / 100)} cm²` });
  etapes.push({ sym: 'st', label: 'Espacement des cadres', formule: 'min(0,9d ; 40cm ; règle couture)', valeur: `${fmt(st / 10, 0)} cm` });

  return {
    ok: erreurs.length === 0,
    erreurs,
    avertissements,
    etapes,
    d: d / 10,
    mu,
    As: As_final / 100,
    Asup: Asup_mm2 / 100,
    Amin: Amin / 100,
    nInf,
    nSup,
    AsReel,
    tauU,
    tauLim,
    st: st / 10,
    stMax: stMax / 10,
    phiT: inp.phiT,
  };
}

/** Cadre : diamètre transversal courant (rappel BAEL φt ≤ φl/3, min 6). */
export function cadreDiam(phiL: number): number {
  return DIAM_STD.find((x) => x >= phiL / 3 && x >= 6) ?? 6;
}

/** Spécification géométrique (coupe / DXF) pour une poutre. */
export function specPoutre(inp: PoutreInput, res: PoutreResult): SectionSpec {
  return {
    forme: 'rect',
    width: inp.b,
    height: inp.h,
    D: inp.h,
    enrob: inp.enrob,
    phiL: inp.phiL,
    phiT: inp.phiT,
    arr: { type: 'nappes', nBas: res.nInf, nHaut: res.nSup },
    legende: `Inf ${res.nInf} HA${inp.phiL} · Sup ${res.nSup} HA${inp.phiL} · cadres Ø${inp.phiT}/${res.st.toFixed(0)}`,
  };
}
