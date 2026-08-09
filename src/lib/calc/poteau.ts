/* =========================================================================
   Dimensionnement d'un poteau en béton armé — compression centrée
   Référentiel : BAEL 91 révisé 99 (Article B.8.4)
   Unités internes : N, mm, MPa (= N/mm²). Entrées/sorties métier en kN, cm, cm².
   ========================================================================= */

export type SectionForme = 'rect' | 'circ';

/** Âge d'application de la majorité des charges (BAEL B.8.4,1). */
export type AgeCharges = 'apres90j' | 'avant90j' | 'avant28j';

export interface PoteauInput {
  forme: SectionForme;
  /** Petit côté (cm) — section rectangulaire. */
  a: number;
  /** Grand côté (cm) — section rectangulaire. */
  b: number;
  /** Diamètre (cm) — section circulaire. */
  D: number;
  /** Longueur libre du poteau (m). */
  l0: number;
  /** Coefficient de flambement : Lf = k · l0. */
  k: number;
  /** Effort normal ultime de compression Nu (kN). */
  Nu: number;
  /** Résistance caractéristique du béton à 28 j (MPa). */
  fc28: number;
  /** Limite d'élasticité des aciers (MPa). */
  fe: number;
  /** Âge d'application de la majorité des charges. */
  age: AgeCharges;
  /** Coefficient partiel du béton (situation durable = 1,5). */
  gammaB: number;
  /** Coefficient partiel de l'acier (situation durable = 1,15). */
  gammaS: number;
  /** Diamètre des aciers longitudinaux retenu (mm). */
  phiL: number;
}

export interface Etape {
  /** Symbole / grandeur. */
  sym: string;
  /** Libellé en clair. */
  label: string;
  /** Formule littérale (facultatif). */
  formule?: string;
  /** Valeur formatée avec unité. */
  valeur: string;
}

export interface PoteauResult {
  ok: boolean;
  /** Messages bloquants (dimensionnement impossible en l'état). */
  erreurs: string[];
  /** Avertissements non bloquants. */
  avertissements: string[];
  /** Étapes détaillées pour la note de calcul. */
  etapes: Etape[];

  // Grandeurs clés (unités métier)
  B: number; // section brute (cm²)
  Br: number; // section réduite (cm²)
  lambda: number; // élancement
  alpha: number; // coefficient de réduction
  Ath: number; // section d'acier théorique (cm²)
  Amin: number; // section minimale (cm²)
  Amax: number; // section maximale (cm²)
  As: number; // section d'acier retenue (cm²)
  nBarres: number; // nombre de barres longitudinales
  AsReel: number; // section réelle des barres (cm²)
  phiT: number; // diamètre des cadres (mm)
  stCourant: number; // espacement des cadres en zone courante (cm)
  lr: number; // longueur de recouvrement en compression (cm)
  NuLim: number; // effort normal ultime résistant de la section retenue (kN)
}

const DIAM_STD = [6, 8, 10, 12, 14, 16, 20, 25, 32, 40];

/** Aire d'une barre de diamètre phi (mm) en cm². */
export function aireBarre(phiMm: number): number {
  return (Math.PI * phiMm * phiMm) / 4 / 100;
}

function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return '—';
  return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/**
 * Dimensionne un poteau BA en compression centrée selon le BAEL 91 rév. 99.
 * Toutes les étapes intermédiaires sont exposées pour la note de calcul.
 */
export function calculPoteauBAEL(input: PoteauInput): PoteauResult {
  const { forme, l0, k, fc28, fe, age, gammaB, gammaS, phiL } = input;
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const etapes: Etape[] = [];

  const Nu_N = input.Nu * 1e3; // kN -> N

  // --- Géométrie : section brute B et rayon de giration i --------------------
  let B: number; // cm²
  let iMin_m: number; // m
  let Br: number; // cm²

  if (forme === 'rect') {
    const a = input.a;
    const b = input.b;
    if (a <= 0 || b <= 0) erreurs.push('Les dimensions de la section doivent être positives.');
    B = a * b;
    // Rayon de giration minimal (flambement autour de l'axe faible) : i = a/√12
    const petitCote = Math.min(a, b);
    iMin_m = petitCote / 100 / Math.sqrt(12);
    // Section réduite : on retire 1 cm sur tout le pourtour (2 cm par dimension)
    Br = Math.max(0, a - 2) * Math.max(0, b - 2);
    etapes.push({ sym: 'B', label: 'Section brute de béton', formule: 'a × b', valeur: `${fmt(B, 0)} cm²` });
    etapes.push({
      sym: 'Br',
      label: 'Section réduite (BAEL B.8.4,1)',
      formule: '(a − 2) × (b − 2)',
      valeur: `${fmt(Br, 0)} cm²`,
    });
  } else {
    const D = input.D;
    if (D <= 0) erreurs.push('Le diamètre doit être positif.');
    B = (Math.PI * D * D) / 4;
    iMin_m = D / 100 / 4; // i = D/4
    Br = (Math.PI * Math.max(0, D - 2) * Math.max(0, D - 2)) / 4;
    etapes.push({ sym: 'B', label: 'Section brute de béton', formule: 'π·D²/4', valeur: `${fmt(B, 0)} cm²` });
    etapes.push({
      sym: 'Br',
      label: 'Section réduite (BAEL B.8.4,1)',
      formule: 'π·(D − 2)²/4',
      valeur: `${fmt(Br, 0)} cm²`,
    });
  }

  // --- Élancement ------------------------------------------------------------
  const Lf = k * l0; // m
  const lambda = iMin_m > 0 ? Lf / iMin_m : Infinity;
  etapes.push({ sym: 'Lf', label: 'Longueur de flambement', formule: 'k · l₀', valeur: `${fmt(Lf, 2)} m` });
  etapes.push({ sym: 'λ', label: 'Élancement', formule: 'Lf / i', valeur: fmt(lambda, 1) });

  if (lambda > 70) {
    erreurs.push(
      `Élancement λ = ${fmt(lambda, 1)} > 70 : hors domaine du BAEL pour la compression centrée. Augmentez la section.`,
    );
  } else if (lambda > 35) {
    avertissements.push(
      `λ = ${fmt(lambda, 1)} > 35 : disposez toutes les barres près des parois ; la totalité des aciers ne peut être prise en compte que si λ ≤ 35.`,
    );
  }

  // --- Coefficient de réduction α (BAEL B.8.4,1) -----------------------------
  let alpha: number;
  if (lambda <= 50) {
    alpha = 0.85 / (1 + 0.2 * Math.pow(lambda / 35, 2));
  } else {
    alpha = 0.6 * Math.pow(50 / lambda, 2);
  }
  etapes.push({
    sym: 'α₀',
    label: 'Coefficient de réduction',
    formule: lambda <= 50 ? '0,85 / [1 + 0,2·(λ/35)²]' : '0,60·(50/λ)²',
    valeur: fmt(alpha, 3),
  });

  // Correction selon l'âge d'application des charges
  if (age === 'avant90j') {
    alpha = alpha / 1.1;
    etapes.push({
      sym: 'α',
      label: 'Correction (charges appliquées avant 90 j)',
      formule: 'α₀ / 1,10',
      valeur: fmt(alpha, 3),
    });
  } else if (age === 'avant28j') {
    alpha = alpha / 1.2;
    etapes.push({
      sym: 'α',
      label: 'Correction (charges appliquées avant 28 j)',
      formule: 'α₀ / 1,20',
      valeur: fmt(alpha, 3),
    });
    avertissements.push(
      "Charges appliquées avant 28 j : il convient de remplacer fc28 par la résistance fcj à l'âge réel de mise en charge.",
    );
  }

  // --- Section d'acier théorique (BAEL B.8.4,1) ------------------------------
  // A ≥ [ Nu/α − Br·fc28/(0,9·γb) ] · γs/fe
  const Br_mm2 = Br * 100; // cm² -> mm²
  const termeBeton = (Br_mm2 * fc28) / (0.9 * gammaB); // N
  const Ath_mm2 = ((Nu_N / alpha - termeBeton) * gammaS) / fe; // mm²
  const Ath = Ath_mm2 / 100; // cm²
  etapes.push({
    sym: 'Ath',
    label: "Section d'acier théorique",
    formule: '[Nu/α − Br·fc28/(0,9·γb)]·γs/fe',
    valeur: `${fmt(Ath, 2)} cm²`,
  });

  // --- Sections mini / maxi (BAEL A.8.1) -------------------------------------
  let perimetre_m: number;
  if (forme === 'rect') perimetre_m = (2 * (input.a + input.b)) / 100;
  else perimetre_m = (Math.PI * input.D) / 100;
  const Amin1 = 4 * perimetre_m; // 4 cm² par mètre de périmètre
  const Amin2 = 0.002 * B; // 0,2 % de B
  const Amin = Math.max(Amin1, Amin2);
  const Amax = 0.05 * B; // 5 % de B
  etapes.push({
    sym: 'Amin',
    label: 'Section minimale',
    formule: 'max(4·u ; 0,2 %·B)',
    valeur: `${fmt(Amin, 2)} cm²`,
  });
  etapes.push({ sym: 'Amax', label: 'Section maximale', formule: '5 %·B', valeur: `${fmt(Amax, 2)} cm²` });

  // --- Section retenue -------------------------------------------------------
  const As = Math.max(Ath, Amin);
  if (Ath > Amax) {
    erreurs.push(
      `Section d'acier théorique (${fmt(Ath, 2)} cm²) > Amax (${fmt(Amax, 2)} cm²) : la section de béton est insuffisante. Augmentez les dimensions.`,
    );
  }
  etapes.push({
    sym: 'As',
    label: "Section d'acier retenue",
    formule: 'max(Ath ; Amin)',
    valeur: `${fmt(As, 2)} cm²`,
  });

  // --- Choix des barres longitudinales ---------------------------------------
  const aBarre = aireBarre(phiL);
  const nMin = forme === 'circ' ? 6 : 4;
  let nBarres = Math.max(nMin, Math.ceil(As / aBarre));
  // Pour une section rectangulaire, on privilégie un nombre pair (symétrie).
  if (forme === 'rect' && nBarres % 2 !== 0) nBarres += 1;
  const AsReel = nBarres * aBarre;
  etapes.push({
    sym: 'Choix',
    label: 'Aciers longitudinaux',
    valeur: `${nBarres} HA${phiL} → ${fmt(AsReel, 2)} cm²`,
  });

  // --- Armatures transversales (cadres) — BAEL A.8.1,3 -----------------------
  // φt ≥ φl/3, arrondi au diamètre normalisé supérieur (mini 6 mm)
  const phiTmin = phiL / 3;
  const phiT = DIAM_STD.find((d) => d >= phiTmin && d >= 6) ?? 6;
  const petitCoteCm = forme === 'rect' ? Math.min(input.a, input.b) : input.D;
  // Espacement en zone courante : st ≤ min(40 cm ; a+10 cm ; 15·φl)
  const stCourant = Math.min(40, petitCoteCm + 10, (15 * phiL) / 10);
  etapes.push({
    sym: 'φt',
    label: 'Diamètre des cadres',
    formule: 'φt ≥ φl/3',
    valeur: `Ø${phiT} mm`,
  });
  etapes.push({
    sym: 'st',
    label: 'Espacement des cadres (zone courante)',
    formule: 'min(40 cm ; a+10 cm ; 15·φl)',
    valeur: `${fmt(stCourant, 0)} cm`,
  });

  // --- Longueur de recouvrement en compression -------------------------------
  const ftj = 0.6 + 0.06 * fc28; // MPa
  const tauSu = 0.6 * 1.5 * 1.5 * ftj; // ψs = 1,5 (HA) → τsu = 1,35·ftj
  const ls_mm = (phiL * fe) / (4 * tauSu); // longueur de scellement droit (mm)
  const lr = (0.6 * ls_mm) / 10; // recouvrement compression ≈ 0,6·ls (cm)
  etapes.push({
    sym: 'lr',
    label: 'Longueur de recouvrement (compression)',
    formule: '0,6·ls, ls = φ·fe/(4·τsu)',
    valeur: `${fmt(lr, 0)} cm`,
  });

  // --- Vérification finale : effort résistant de la section retenue ----------
  // Nu,lim = α·[ Br·fc28/(0,9·γb) + As·fe/γs ]
  const NuLim_N = alpha * (termeBeton + (AsReel * 100 * fe) / gammaS);
  const NuLim = NuLim_N / 1e3; // kN
  etapes.push({
    sym: 'Nu,lim',
    label: 'Effort résistant de la section retenue',
    formule: 'α·[Br·fc28/(0,9·γb) + As·fe/γs]',
    valeur: `${fmt(NuLim, 1)} kN`,
  });
  if (NuLim < input.Nu && erreurs.length === 0) {
    avertissements.push(
      `Nu,lim (${fmt(NuLim, 1)} kN) < Nu (${fmt(input.Nu, 1)} kN) : vérifiez le choix des barres.`,
    );
  }

  return {
    ok: erreurs.length === 0,
    erreurs,
    avertissements,
    etapes,
    B,
    Br,
    lambda,
    alpha,
    Ath,
    Amin,
    Amax,
    As,
    nBarres,
    AsReel,
    phiT,
    stCourant,
    lr,
    NuLim,
  };
}
