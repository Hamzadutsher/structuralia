/* =========================================================================
   Semelle isolée sous poteau — méthode des bielles. BAEL 91 rév. 99.
   Semelle rectangulaire homothétique au poteau (A/a = B/b), rigide.
   Unités internes : N, mm, MPa. Entrées/sorties : kN, cm, cm², MPa (sol).
   ========================================================================= */
import { aireBarre, type Etape } from './poteau';

export interface SemelleInput {
  /** Poteau : côté a (cm). */
  a: number;
  /** Poteau : côté b (cm). */
  b: number;
  /** Effort normal ultime Nu (kN, ELU). */
  Nu: number;
  /** Effort normal de service Nser (kN, ELS). */
  Nser: number;
  /** Contrainte admissible du sol σsol (MPa). */
  sigmaSol: number;
  fc28: number;
  fe: number;
  gammaB: number;
  gammaS: number;
  /** Enrobage (cm). */
  enrob: number;
  /** Ø aciers (mm). */
  phiL: number;
  /** Poids volumique du béton (kN/m³). */
  gammaBeton: number;
}

export interface SemellePlan {
  A: number; // cm
  B: number; // cm
  a: number; // cm
  b: number; // cm
  nA: number; // barres parallèles à A
  nB: number; // barres parallèles à B
  phiL: number;
  enrob: number; // cm
  legende?: string;
}

export interface SemelleResult {
  ok: boolean;
  erreurs: string[];
  avertissements: string[];
  etapes: Etape[];

  A: number; // cm
  B: number; // cm
  d: number; // cm (hauteur utile)
  h: number; // cm (hauteur totale)
  sigmaSolCalc: number; // MPa (contrainte réelle sous semelle, ELS)
  Asa: number; // cm² acier // A
  Asb: number; // cm² acier // B
  nA: number;
  nB: number;
  espA: number; // cm entraxe nappe // A
  espB: number; // cm entraxe nappe // B
  crochets: boolean;
}

function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return '—';
  return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Arrondi supérieur au multiple de 5 cm. */
function ceil5(cm: number): number {
  return Math.ceil(cm / 5) * 5;
}

export function calculSemelle(inp: SemelleInput): SemelleResult {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const etapes: Etape[] = [];

  const fed = inp.fe / inp.gammaS;

  // --- Dimensions en plan (ELS sol, homothétie A/a = B/b) --------------------
  // Surface requise S = Nser / σsol
  const S = inp.Nser / 1000 / inp.sigmaSol; // m²  (Nser kN→MN, σsol MPa=MN/m²)
  const ratio = inp.a / inp.b;
  // A/B = a/b et A·B = S  →  A = √(S·a/b), B = √(S·b/a)
  const A = ceil5(Math.sqrt(S * ratio) * 100); // cm
  const B = ceil5(Math.sqrt(S / ratio) * 100); // cm
  etapes.push({ sym: 'S', label: 'Surface d’appui requise', formule: 'Nser/σsol', valeur: `${fmt(S, 3)} m²` });
  etapes.push({ sym: 'A×B', label: 'Dimensions en plan', formule: 'homothétie A/a = B/b', valeur: `${A} × ${B} cm` });

  // --- Hauteur (condition de rigidité des bielles) ---------------------------
  const dReq = Math.max((A - inp.a) / 4, (B - inp.b) / 4); // cm
  const h = ceil5(dReq + inp.enrob + 2); // cm (hauteur totale)
  const d = h - inp.enrob; // cm
  etapes.push({ sym: 'd', label: 'Hauteur utile (rigidité)', formule: 'd ≥ max((A−a)/4 ; (B−b)/4)', valeur: `${fmt(d, 0)} cm (≥ ${fmt(dReq, 1)})` });
  etapes.push({ sym: 'h', label: 'Hauteur totale', formule: 'd + enrobage', valeur: `${h} cm` });

  // --- Vérification du sol (ELS, poids propre inclus) ------------------------
  const poids = (A / 100) * (B / 100) * (h / 100) * inp.gammaBeton; // kN
  const sigmaSolCalc = (inp.Nser + poids) / 1000 / ((A / 100) * (B / 100)); // MPa
  etapes.push({ sym: 'P', label: 'Poids propre de la semelle', formule: 'A·B·h·γbéton', valeur: `${fmt(poids, 1)} kN` });
  etapes.push({ sym: 'σsol', label: 'Contrainte sous la semelle', formule: '(Nser+P)/(A·B)', valeur: `${fmt(sigmaSolCalc, 3)} MPa` });
  if (sigmaSolCalc > inp.sigmaSol) {
    avertissements.push(
      `Avec le poids propre, σ = ${fmt(sigmaSolCalc, 3)} MPa > σsol = ${fmt(inp.sigmaSol, 2)} MPa : agrandissez légèrement la semelle.`,
    );
  }

  // --- Aciers par la méthode des bielles (ELU) -------------------------------
  const Amm = A * 10;
  const Bmm = B * 10;
  const amm = inp.a * 10;
  const bmm = inp.b * 10;
  const dmm = d * 10;
  const Nu = inp.Nu * 1e3;
  const Asa_mm2 = (Nu * (Amm - amm)) / (8 * dmm * fed); // // A
  const Asb_mm2 = (Nu * (Bmm - bmm)) / (8 * dmm * fed); // // B
  etapes.push({ sym: 'Asa', label: 'Aciers // A', formule: 'Nu·(A−a)/(8·d·fed)', valeur: `${fmt(Asa_mm2 / 100)} cm²` });
  etapes.push({ sym: 'Asb', label: 'Aciers // B', formule: 'Nu·(B−b)/(8·d·fed)', valeur: `${fmt(Asb_mm2 / 100)} cm²` });

  // --- Choix des barres ------------------------------------------------------
  const aB = aireBarre(inp.phiL);
  const nA = Math.max(4, Math.ceil(Asa_mm2 / 100 / aB)); // barres // A réparties sur B
  const nB = Math.max(4, Math.ceil(Asb_mm2 / 100 / aB)); // barres // B réparties sur A
  const espA = (B - 2 * inp.enrob) / (nA - 1); // entraxe (cm)
  const espB = (A - 2 * inp.enrob) / (nB - 1);
  etapes.push({ sym: 'nA', label: 'Nappe // A', valeur: `${nA} HA${inp.phiL} · e ≈ ${fmt(espA, 0)} cm` });
  etapes.push({ sym: 'nB', label: 'Nappe // B', valeur: `${nB} HA${inp.phiL} · e ≈ ${fmt(espB, 0)} cm` });

  // --- Ancrage des barres (crochets ?) ---------------------------------------
  const ftj = 0.6 + 0.06 * inp.fc28;
  const tauSu = 0.6 * 1.5 * 1.5 * ftj;
  const ls = (inp.phiL * inp.fe) / (4 * tauSu) / 10; // cm
  // Si ls > A/4, les barres doivent être prolongées avec crochets aux extrémités.
  const crochets = ls > A / 4;
  etapes.push({ sym: 'ls', label: 'Longueur de scellement', formule: 'φ·fe/(4·τsu)', valeur: `${fmt(ls, 0)} cm` });
  etapes.push({
    sym: 'Ancrage',
    label: 'Type d’ancrage',
    formule: 'ls ⪋ A/4',
    valeur: crochets ? 'Barres avec crochets' : 'Ancrage droit suffisant',
  });

  return {
    ok: erreurs.length === 0,
    erreurs,
    avertissements,
    etapes,
    A,
    B,
    d,
    h,
    sigmaSolCalc,
    Asa: Asa_mm2 / 100,
    Asb: Asb_mm2 / 100,
    nA,
    nB,
    espA,
    espB,
    crochets,
  };
}

/** Spécification de la vue en plan (dessin / DXF). */
export function planSemelle(inp: SemelleInput, res: SemelleResult): SemellePlan {
  return {
    A: res.A,
    B: res.B,
    a: inp.a,
    b: inp.b,
    nA: res.nA,
    nB: res.nB,
    phiL: inp.phiL,
    enrob: inp.enrob,
    legende: `${res.nA} HA${inp.phiL} (//A) · ${res.nB} HA${inp.phiL} (//B)`,
  };
}
