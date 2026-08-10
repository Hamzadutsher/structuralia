/* =========================================================================
   Poteau BA en FLEXION COMPOSÉE (effort normal N + moment M) — BAEL 91/99.
   Section rectangulaire, aciers en deux nappes (basse = tendue/moins comprimée,
   haute = plus comprimée). Prise en compte des effets du 2ᵉ ordre par la
   méthode forfaitaire (excentricité complémentaire e₂).
   Unités internes : N, mm, MPa. Entrées/sorties : kN, kN·m, cm, cm².
   ========================================================================= */
import { aireBarre, type Etape, type PoteauResult } from './poteau';
import type { SectionSpec } from './section';

export interface PoteauFCInput {
  /** Largeur b (cm) — perpendiculaire au plan de flexion. */
  b: number;
  /** Hauteur h (cm) — dans le plan de flexion. */
  h: number;
  /** Enrobage béton (parement → nu du cadre), cm. */
  enrob: number;
  /** Longueur libre l₀ (m). */
  l0: number;
  /** Coefficient de flambement : lf = k·l₀. */
  k: number;
  /** Effort normal ultime de compression Nu (kN, > 0). */
  Nu: number;
  /** Moment ultime au centre de gravité Mu (kN·m, 1ᵉ ordre). */
  Mu: number;
  /** Rapport α = Mg/(Mg+Mq) des moments (fluage e₂). */
  alphaG: number;
  /** Coefficient de fluage φ (défaut 2). */
  phiFluage: number;
  fc28: number;
  fe: number;
  gammaB: number;
  gammaS: number;
  /** Ø aciers longitudinaux (mm). */
  phiL: number;
  /** Ø cadres (mm). */
  phiT: number;
}

export interface PoteauFCResult extends Omit<PoteauResult, 'B' | 'Br' | 'lambda' | 'alpha' | 'Ath' | 'As' | 'nBarres' | 'AsReel' | 'NuLim'> {
  section: 'SPC' | 'SEC';
  e0: number; // excentricité 1ᵉ ordre (cm)
  ea: number; // excentricité additionnelle (cm)
  e2: number; // excentricité 2ᵉ ordre (cm)
  eTot: number; // excentricité totale (cm)
  Abas: number; // acier nappe basse (cm²)
  Ahaut: number; // acier nappe haute (cm²)
  nBas: number;
  nHaut: number;
  AsReel: number; // acier total réel (cm²)
  Amax: number; // 5 % B (cm²)
}

const DIAM_STD = [6, 8, 10, 12, 14, 16, 20, 25, 32, 40];

function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return '—';
  return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function calculPoteauFC(inp: PoteauFCInput): PoteauFCResult {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const etapes: Etape[] = [];

  // --- Unités internes -------------------------------------------------------
  const b = inp.b * 10; // mm
  const h = inp.h * 10; // mm
  const dp = inp.enrob * 10 + inp.phiT + inp.phiL / 2; // d' (mm), axe des aciers
  const d = h - dp; // hauteur utile (mm)
  const Nu = inp.Nu * 1e3; // N
  const Mu = inp.Mu * 1e6; // N·mm

  const fbu = (0.85 * inp.fc28) / inp.gammaB; // MPa
  const fed = inp.fe / inp.gammaS; // MPa
  const ft28 = 0.6 + 0.06 * inp.fc28; // MPa

  etapes.push({ sym: 'fbu', label: 'Résistance de calcul du béton', formule: '0,85·fc28/γb', valeur: `${fmt(fbu)} MPa` });
  etapes.push({ sym: 'd', label: 'Hauteur utile', formule: 'h − d′', valeur: `${fmt(d / 10, 1)} cm` });

  // --- Excentricités ---------------------------------------------------------
  const e0 = Mu / Nu; // mm (1ᵉ ordre)
  const lf = inp.k * inp.l0 * 1000; // mm
  const ea = Math.max(20, (inp.l0 * 1000) / 250); // mm
  const e1 = e0 + ea;
  // Domaine de la méthode forfaitaire (BAEL B.8.3,1)
  if (lf / h > Math.max(15, (20 * e1) / h)) {
    avertissements.push(
      `lf/h = ${fmt(lf / h, 1)} dépasse max(15 ; 20·e₁/h) : la méthode forfaitaire du 2ᵉ ordre est hors domaine, une analyse plus fine est requise.`,
    );
  }
  const e2 = (3 * lf * lf * (2 + inp.alphaG * inp.phiFluage)) / (1e4 * h); // mm
  const eTot = e0 + ea + e2; // mm

  etapes.push({ sym: 'e₀', label: 'Excentricité du 1ᵉʳ ordre', formule: 'Mu/Nu', valeur: `${fmt(e0 / 10, 2)} cm` });
  etapes.push({ sym: 'eₐ', label: 'Excentricité additionnelle', formule: 'max(2 cm ; l₀/250)', valeur: `${fmt(ea / 10, 2)} cm` });
  etapes.push({ sym: 'e₂', label: 'Excentricité du 2ᵉ ordre', formule: '3·lf²·(2+α·φ)/(10⁴·h)', valeur: `${fmt(e2 / 10, 2)} cm` });
  etapes.push({ sym: 'e', label: 'Excentricité totale', formule: 'e₀ + eₐ + e₂', valeur: `${fmt(eTot / 10, 2)} cm` });

  // --- Moments de calcul -----------------------------------------------------
  const MuG = Nu * eTot; // N·mm au CdG (avec 2ᵉ ordre)
  const MuA = MuG + Nu * (d - h / 2); // N·mm au niveau des aciers tendus
  etapes.push({ sym: 'MuA', label: 'Moment / aciers tendus', formule: 'Nu·(e + d − h/2)', valeur: `${fmt(MuA / 1e6, 2)} kN·m` });

  // --- Classification SPC / SEC (BAEL) ---------------------------------------
  const LHS = Nu * (d - dp) - MuA;
  const RHS = (0.337 - (0.81 * dp) / h) * b * h * h * fbu;
  const isSPC = LHS <= RHS;
  etapes.push({
    sym: 'Test',
    label: 'Nature de la section',
    formule: 'Nu·(d−d′)−MuA ⪋ (0,337−0,81·d′/h)·b·h²·fbu',
    valeur: isSPC ? 'Partiellement comprimée' : 'Entièrement comprimée',
  });

  let Abas_mm2 = 0; // nappe tendue / moins comprimée
  let Ahaut_mm2 = 0; // nappe plus comprimée

  if (isSPC) {
    // Calcul en flexion simple sous MuA, puis correction de l'effort normal.
    const mu = MuA / (b * d * d * fbu);
    const eps_es = fed / 200000;
    const alpha_lu = 3.5 / (3.5 + 1000 * eps_es);
    const mu_lu = 0.8 * alpha_lu * (1 - 0.4 * alpha_lu);
    etapes.push({ sym: 'μ', label: 'Moment réduit', formule: 'MuA/(b·d²·fbu)', valeur: fmt(mu, 3) });

    let A1_mm2: number;
    if (mu <= mu_lu) {
      const alpha = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * mu)));
      const z = d * (1 - 0.4 * alpha);
      A1_mm2 = MuA / (z * fed);
      etapes.push({ sym: 'z', label: 'Bras de levier', formule: 'd·(1 − 0,4·α)', valeur: `${fmt(z / 10, 1)} cm` });
    } else {
      // Aciers comprimés nécessaires (nappe haute)
      const z_lu = d * (1 - 0.4 * alpha_lu);
      const M_lu = mu_lu * b * d * d * fbu;
      const dM = MuA - M_lu;
      Ahaut_mm2 = dM / ((d - dp) * fed);
      A1_mm2 = M_lu / (z_lu * fed) + dM / ((d - dp) * fed);
      avertissements.push(`μ = ${fmt(mu, 3)} > μlu = ${fmt(mu_lu, 3)} : aciers comprimés requis (nappe haute).`);
      etapes.push({ sym: "A'", label: 'Aciers comprimés (flexion)', valeur: `${fmt(Ahaut_mm2 / 100)} cm²` });
    }
    // Flexion composée : on retranche l'effort normal de compression.
    Abas_mm2 = A1_mm2 - Nu / fed;
    etapes.push({ sym: 'A', label: 'Aciers tendus (flexion composée)', formule: 'A_flexion − Nu/fed', valeur: `${fmt(Abas_mm2 / 100)} cm²` });
    if (Abas_mm2 < 0) {
      avertissements.push("L'effort normal suffit à comprimer la nappe basse : acier ramené au minimum réglementaire.");
      Abas_mm2 = 0;
    }
  } else {
    // Section entièrement comprimée — modèle d'équilibre simplifié :
    // béton comprimé uniforme fbu, deux nappes d'acier à fed.
    const sum = (Nu - b * h * fbu) / fed; // A + A'
    const diff = MuG / (fed * (h / 2 - dp)); // A' − A
    Ahaut_mm2 = (sum + diff) / 2;
    Abas_mm2 = (sum - diff) / 2;
    avertissements.push(
      'Section entièrement comprimée : modèle simplifié (béton comprimé uniforme fbu, aciers à fed). À valider pour les cas dimensionnants.',
    );
    if (Abas_mm2 < 0) Abas_mm2 = 0;
    if (Ahaut_mm2 < 0) Ahaut_mm2 = 0;
  }

  // --- Sections mini / maxi (BAEL A.4.2 & A.8.1) -----------------------------
  const A_nf = (0.23 * b * d * ft28) / inp.fe; // non-fragilité (mm²), nappe tendue
  const perim_m = (2 * (inp.b + inp.h)) / 100;
  const Amin_col = Math.max(400 * perim_m, 0.002 * b * h); // mm² (4 cm²/m ; 0,2 %B)
  const Amax = 0.05 * b * h; // mm²

  if (isSPC) Abas_mm2 = Math.max(Abas_mm2, A_nf);
  // Minimum de colonne réparti sur l'ensemble
  let total = Abas_mm2 + Ahaut_mm2;
  if (total < Amin_col) {
    const deficit = Amin_col - total;
    Abas_mm2 += deficit / 2;
    Ahaut_mm2 += deficit / 2;
    total = Abas_mm2 + Ahaut_mm2;
  }
  etapes.push({ sym: 'Amin', label: 'Section minimale (colonne)', formule: 'max(4·u ; 0,2 %·B)', valeur: `${fmt(Amin_col / 100)} cm²` });
  etapes.push({ sym: 'Amax', label: 'Section maximale', formule: '5 %·B', valeur: `${fmt(Amax / 100)} cm²` });
  if (total > Amax) {
    erreurs.push(
      `Acier total (${fmt(total / 100)} cm²) > Amax (${fmt(Amax / 100)} cm²) : section de béton insuffisante, augmentez les dimensions.`,
    );
  }

  // --- Choix des barres (2 nappes) ------------------------------------------
  const aB = aireBarre(inp.phiL); // cm²
  const nBas = Math.max(2, Math.ceil(Abas_mm2 / 100 / aB));
  const nHaut = Math.max(2, Math.ceil(Ahaut_mm2 / 100 / aB));
  const AsReel = (nBas + nHaut) * aB;
  etapes.push({ sym: 'Choix', label: 'Nappe basse (tendue)', valeur: `${nBas} HA${inp.phiL} → ${fmt(nBas * aB)} cm²` });
  etapes.push({ sym: 'Choix', label: 'Nappe haute (comprimée)', valeur: `${nHaut} HA${inp.phiL} → ${fmt(nHaut * aB)} cm²` });

  // --- Cadres ----------------------------------------------------------------
  const phiT = DIAM_STD.find((x) => x >= inp.phiL / 3 && x >= 6) ?? 6;
  const petitCote = Math.min(inp.b, inp.h);
  const stCourant = Math.min(40, petitCote + 10, (15 * inp.phiL) / 10);
  const ftj = 0.6 + 0.06 * inp.fc28;
  const tauSu = 0.6 * 1.5 * 1.5 * ftj;
  const ls = (inp.phiL * inp.fe) / (4 * tauSu);
  const lr = (0.6 * ls) / 10; // cm
  etapes.push({ sym: 'φt', label: 'Diamètre des cadres', formule: 'φt ≥ φl/3', valeur: `Ø${phiT} mm` });
  etapes.push({ sym: 'st', label: 'Espacement des cadres', formule: 'min(40 ; a+10 ; 15·φl)', valeur: `${fmt(stCourant, 0)} cm` });

  return {
    ok: erreurs.length === 0,
    erreurs,
    avertissements,
    etapes,
    section: isSPC ? 'SPC' : 'SEC',
    e0: e0 / 10,
    ea: ea / 10,
    e2: e2 / 10,
    eTot: eTot / 10,
    Abas: Abas_mm2 / 100,
    Ahaut: Ahaut_mm2 / 100,
    nBas,
    nHaut,
    AsReel,
    Amin: Amin_col / 100,
    Amax: Amax / 100,
    phiT,
    stCourant,
    lr,
  };
}

/** Spécification géométrique (dessin / DXF) pour la flexion composée. */
export function specPoteauFC(inp: PoteauFCInput, res: PoteauFCResult): SectionSpec {
  return {
    forme: 'rect',
    width: inp.b,
    height: inp.h,
    D: inp.h,
    enrob: inp.enrob,
    phiL: inp.phiL,
    phiT: res.phiT,
    arr: { type: 'nappes', nBas: res.nBas, nHaut: res.nHaut },
    legende: `Bas ${res.nBas} HA${inp.phiL} · Haut ${res.nHaut} HA${inp.phiL} · cadres Ø${res.phiT}`,
  };
}
