/* =========================================================================
   Dalle pleine rectangulaire sur appuis — BAEL 91 rév. 99 (Annexe E.3).
   Portée sur 1 sens (α < 0,4) ou 2 sens (0,4 ≤ α ≤ 1), coefficients de Pigeaud.
   Bande de calcul : 1 mètre. Unités internes : N, mm, MPa.
   ========================================================================= */
import { aireBarre, type Etape } from './poteau';

export type AppuiDalle = 'isole' | 'continu';
export type Fissuration = 'PP' | 'P' | 'TP';

export interface DalleInput {
  /** Petite portée lx (m). */
  lx: number;
  /** Grande portée ly (m). */
  ly: number;
  /** Épaisseur h (cm). */
  h: number;
  /** Charges permanentes hors poids propre g (kN/m²). */
  g: number;
  /** Charges d'exploitation q (kN/m²). */
  q: number;
  enrob: number; // cm
  phi: number; // mm
  fc28: number;
  fe: number;
  gammaB: number;
  gammaS: number;
  /** Conditions d'appui : isolé (appuis simples) ou panneau continu. */
  appui: AppuiDalle;
  fissuration: Fissuration;
}

export interface DallePlan {
  lx: number; // cm
  ly: number; // cm
  espX: number; // cm entraxe nappe // lx (barres inférieures principales)
  espY: number; // cm entraxe nappe // ly
  phi: number;
  sens: 1 | 2;
  legende?: string;
}

export interface DalleResult {
  ok: boolean;
  erreurs: string[];
  avertissements: string[];
  etapes: Etape[];

  alpha: number;
  sens: 1 | 2;
  pu: number; // kN/m²
  Asx: number; // cm²/m (nappe // lx)
  Asy: number; // cm²/m (nappe // ly)
  espX: number; // cm
  espY: number; // cm
  hMin: number; // cm (épaisseur minimale conseillée)
  tauU: number; // MPa
  tauLim: number; // MPa
}

function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return '—';
  return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Coefficients de Pigeaud (ELU, ν = 0). */
function coeffsPigeaud(alpha: number): { mux: number; muy: number } {
  const mux = 1 / (8 * (1 + 2.4 * Math.pow(alpha, 3)));
  const muy = Math.max(0.25, Math.pow(alpha, 3) * (1.9 - 0.9 * alpha));
  return { mux, muy };
}

export function calculDalle(inp: DalleInput): DalleResult {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const etapes: Etape[] = [];

  // lx = petite portée
  let lx = inp.lx;
  let ly = inp.ly;
  if (lx > ly) {
    [lx, ly] = [ly, lx];
    avertissements.push('lx > ly : les portées ont été interverties (lx = petite portée).');
  }
  const alpha = lx / ly;

  const fbu = (0.85 * inp.fc28) / inp.gammaB;
  const fed = inp.fe / inp.gammaS;
  const eps_es = fed / 200000;
  const alpha_lu = 3.5 / (3.5 + 1000 * eps_es);
  const mu_lu = 0.8 * alpha_lu * (1 - 0.4 * alpha_lu);

  // --- Charges ---------------------------------------------------------------
  const pp = (inp.h / 100) * 25; // kN/m² poids propre
  const gTot = inp.g + pp;
  const pu = 1.35 * gTot + 1.5 * inp.q; // kN/m²
  etapes.push({ sym: 'g₀', label: 'Poids propre', formule: 'h·25', valeur: `${fmt(pp, 2)} kN/m²` });
  etapes.push({ sym: 'pu', label: 'Charge ultime', formule: '1,35·(g+g₀) + 1,5·q', valeur: `${fmt(pu, 2)} kN/m²` });
  etapes.push({ sym: 'α', label: 'Rapport des portées', formule: 'lx/ly', valeur: fmt(alpha, 3) });

  const sens: 1 | 2 = alpha < 0.4 ? 1 : 2;

  // --- Moments (kN·m/m) ------------------------------------------------------
  let M0x: number;
  let M0y: number;
  if (sens === 1) {
    M0x = (pu * lx * lx) / 8;
    M0y = 0;
    etapes.push({ sym: 'M0x', label: 'Moment isostatique (1 sens)', formule: 'pu·lx²/8', valeur: `${fmt(M0x, 2)} kN·m/m` });
    avertissements.push('α < 0,4 : la dalle porte sur un seul sens ; nappe secondaire de répartition.');
  } else {
    const { mux, muy } = coeffsPigeaud(alpha);
    M0x = mux * pu * lx * lx;
    M0y = muy * M0x;
    etapes.push({ sym: 'μx', label: 'Coefficient Pigeaud', valeur: fmt(mux, 4) });
    etapes.push({ sym: 'μy', label: 'Coefficient Pigeaud', valeur: fmt(muy, 4) });
    etapes.push({ sym: 'M0x', label: 'Moment // lx', formule: 'μx·pu·lx²', valeur: `${fmt(M0x, 2)} kN·m/m` });
    etapes.push({ sym: 'M0y', label: 'Moment // ly', formule: 'μy·M0x', valeur: `${fmt(M0y, 2)} kN·m/m` });
  }

  // Répartition en travée (dalle isolée : appuis simples ; continu : panneau courant)
  const kTravee = inp.appui === 'isole' ? 1.0 : 0.75;
  const Mtx = kTravee * M0x;
  const Mty = kTravee * M0y;
  etapes.push({
    sym: 'Mt',
    label: `Moments en travée (${inp.appui === 'isole' ? 'appuis simples' : 'panneau continu'})`,
    formule: `${kTravee}·M0`,
    valeur: `x: ${fmt(Mtx, 2)} · y: ${fmt(Mty, 2)} kN·m/m`,
  });

  // --- Aciers (flexion simple, bande de 1 m) --------------------------------
  const b = 1000; // mm
  const dx = inp.h * 10 - inp.enrob * 10 - inp.phi / 2; // mm
  const dy = dx - inp.phi; // 2ᵉ lit
  etapes.push({ sym: 'dx', label: 'Hauteur utile // lx', valeur: `${fmt(dx / 10, 1)} cm` });

  const asFlexion = (M_kNm: number, d: number): number => {
    if (M_kNm <= 0) return 0;
    const M = M_kNm * 1e6; // N·mm par mètre
    const mu = M / (b * d * d * fbu);
    if (mu > mu_lu) {
      erreurs.push(`μ = ${fmt(mu, 3)} > μlu : dalle trop mince, augmentez l'épaisseur h.`);
      return (mu / mu_lu) * (M / (0.9 * d * fed)); // valeur indicative
    }
    const al = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * mu)));
    const z = d * (1 - 0.4 * al);
    return M / (z * fed); // mm²
  };

  let Asx = asFlexion(Mtx, dx) / 100; // cm²/m
  let Asy = sens === 1 ? Asx / 4 : asFlexion(Mty, dy) / 100; // cm²/m

  // --- Sections minimales (BAEL B.7.4) --------------------------------------
  const rho0 = inp.fe >= 500 ? 0.0008 : 0.0012;
  const AsyMin = rho0 * 100 * inp.h; // cm²/m (b = 100 cm)
  const AsxMin = (AsyMin * (3 - alpha)) / 2;
  Asx = Math.max(Asx, AsxMin);
  Asy = Math.max(Asy, AsyMin);
  etapes.push({ sym: 'Asx', label: 'Acier // lx (inférieur)', valeur: `${fmt(Asx)} cm²/m` });
  etapes.push({ sym: 'Asy', label: 'Acier // ly', valeur: `${fmt(Asy)} cm²/m` });
  etapes.push({ sym: 'Amin', label: 'Sections minimales', formule: 'ρ₀·h ; ·(3−α)/2', valeur: `x: ${fmt(AsxMin)} · y: ${fmt(AsyMin)}` });

  // --- Espacements -----------------------------------------------------------
  const aB = aireBarre(inp.phi);
  const stxMax = Math.min(3 * inp.h, 33); // cm (armatures principales)
  const styMax = Math.min(4 * inp.h, 45); // cm (armatures secondaires)
  const espX = Math.min(stxMax, Math.floor(((100 * aB) / Asx) / 1) ); // cm
  const espY = Math.min(styMax, Math.floor((100 * aB) / Asy));
  etapes.push({ sym: 'ex', label: 'Espacement // lx', formule: 'min(3h ; 33cm)', valeur: `${fmt(espX, 0)} cm (HA${inp.phi})` });
  etapes.push({ sym: 'ey', label: 'Espacement // ly', formule: 'min(4h ; 45cm)', valeur: `${fmt(espY, 0)} cm (HA${inp.phi})` });

  // --- Épaisseur minimale conseillée ----------------------------------------
  const denom = sens === 1 ? (inp.appui === 'isole' ? 22 : 30) : inp.appui === 'isole' ? 30 : 40;
  const hMin = (lx * 100) / denom; // cm
  if (inp.h < hMin) {
    avertissements.push(`h = ${inp.h} cm < h min conseillée ≈ ${fmt(hMin, 0)} cm (flèche) : vérifiez la déformabilité.`);
  }
  etapes.push({ sym: 'hmin', label: 'Épaisseur minimale (flèche)', formule: `lx/${denom}`, valeur: `${fmt(hMin, 1)} cm` });

  // --- Effort tranchant ------------------------------------------------------
  const Vu =
    sens === 1 ? (pu * lx) / 2 : ((pu * lx) / 2) * (1 / (1 + alpha / 2)); // kN/m
  const tauU = (Vu * 1e3) / (b * dx); // MPa
  const tauLim = (0.07 * inp.fc28) / inp.gammaB; // dalle sans armatures d'effort tranchant
  etapes.push({ sym: 'τu', label: 'Contrainte tangente', formule: 'Vu/(b·d)', valeur: `${fmt(tauU, 3)} MPa` });
  if (tauU > tauLim) {
    avertissements.push(
      `τu = ${fmt(tauU, 3)} > ${fmt(tauLim, 3)} MPa : épaissir la dalle (pas d'armatures d'effort tranchant en dalle).`,
    );
  }

  return {
    ok: erreurs.length === 0,
    erreurs,
    avertissements,
    etapes,
    alpha,
    sens,
    pu,
    Asx,
    Asy,
    espX,
    espY,
    hMin,
    tauU,
    tauLim,
  };
}

/** Spécification de la vue en plan (dessin / DXF). */
export function planDalle(inp: DalleInput, res: DalleResult): DallePlan {
  const lx = Math.min(inp.lx, inp.ly) * 100;
  const ly = Math.max(inp.lx, inp.ly) * 100;
  return {
    lx,
    ly,
    espX: res.espX,
    espY: res.espY,
    phi: inp.phi,
    sens: res.sens,
    legende: `HA${inp.phi} e=${res.espX.toFixed(0)} (//lx) · HA${inp.phi} e=${res.espY.toFixed(0)} (//ly)`,
  };
}
