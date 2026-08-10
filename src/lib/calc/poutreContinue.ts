/* =========================================================================
   Poutre continue à plusieurs travées — méthode de Caquot. BAEL 91 rév. 99.
   Calcul des enveloppes de moments (appuis / travées) et efforts tranchants
   par cas de charge, puis ferraillage de chaque travée et chapeau d'appui.
   Section rectangulaire constante. Unités : m, kN, kN·m, cm, cm².
   ========================================================================= */
import { aireBarre, type Etape } from './poteau';

export interface Trav8e {
  /** Portée (m). */
  L: number;
  /** Charge permanente répartie g (kN/m). */
  g: number;
  /** Charge d'exploitation répartie q (kN/m). */
  q: number;
}

export interface PoutreContinueInput {
  travees: Trav8e[];
  /** Largeur b₀ (cm). */
  b: number;
  /** Hauteur h (cm). */
  h: number;
  enrob: number; // cm
  fc28: number;
  fe: number;
  gammaB: number;
  gammaS: number;
  phiL: number; // mm
  phiT: number; // mm
}

export interface TraveeResult {
  index: number;
  L: number;
  Mt: number; // kN·m (moment max en travée, enveloppe)
  As: number; // cm² acier inférieur
  n: number; // nb barres
  phi: number;
  Vw: number; // kN effort tranchant appui gauche
  Ve: number; // kN effort tranchant appui droit
  st: number; // cm espacement cadres
}

export interface AppuiResult {
  index: number;
  Ma: number; // kN·m (moment sur appui, négatif)
  As: number; // cm² acier supérieur (chapeau)
  n: number;
  phi: number;
}

export interface PoutreContinueResult {
  ok: boolean;
  erreurs: string[];
  avertissements: string[];
  etapes: Etape[];
  travees: TraveeResult[];
  appuis: AppuiResult[];
}

function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return '—';
  return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Longueur réduite de Caquot : l pour une travée de rive, 0,8·l sinon. */
function lReduit(L: number, isRive: boolean): number {
  return isRive ? L : 0.8 * L;
}

/** Moment sur un appui interne (Caquot, charge répartie) : négatif. */
function momentAppui(pw: number, lw: number, pe: number, le: number): number {
  if (lw + le === 0) return 0;
  return -(pw * lw ** 3 + pe * le ** 3) / (8.5 * (lw + le));
}

export function calculPoutreContinue(inp: PoutreContinueInput): PoutreContinueResult {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const etapes: Etape[] = [];
  const n = inp.travees.length; // nombre de travées
  const nApp = n + 1; // appuis 0..n

  const fbu = (0.85 * inp.fc28) / inp.gammaB;
  const fed = inp.fe / inp.gammaS;
  const ft28 = 0.6 + 0.06 * inp.fc28;
  const eps_es = fed / 200000;
  const alpha_lu = 3.5 / (3.5 + 1000 * eps_es);
  const mu_lu = 0.8 * alpha_lu * (1 - 0.4 * alpha_lu);

  const b = inp.b * 10;
  const d = (inp.h - inp.enrob) * 10 - inp.phiL / 2; // mm (approx 1 lit)
  const aB = aireBarre(inp.phiL);

  // Charges par travée
  const pu = inp.travees.map((t) => 1.35 * t.g + 1.5 * t.q); // kN/m (travée chargée)
  const pmin = inp.travees.map((t) => 1.35 * t.g); // kN/m (travée déchargée)
  const isRive = (i: number) => i === 0 || i === n - 1;
  const lr = inp.travees.map((t, i) => lReduit(t.L, isRive(i)));

  etapes.push({ sym: 'pu', label: 'Charges ultimes par travée', valeur: pu.map((p) => fmt(p, 1)).join(' · ') + ' kN/m' });

  const asFlexion = (M_kNm: number): { As: number; warn: boolean } => {
    const M = Math.abs(M_kNm) * 1e6;
    if (M === 0) return { As: 0, warn: false };
    const mu = M / (b * d * d * fbu);
    if (mu > mu_lu) return { As: (M / (0.9 * d * fed)) / 100, warn: true };
    const al = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * mu)));
    const z = d * (1 - 0.4 * al);
    return { As: M / (z * fed) / 100, warn: false };
  };
  const Anf = (0.23 * b * d * ft28) / inp.fe / 100; // cm² non-fragilité

  // --- Moments sur appuis : enveloppe (appuis adjacents chargés) -------------
  // Appui interne k (1..n-1) borde les travées k-1 (gauche) et k (droite).
  const MaEnv: number[] = new Array(nApp).fill(0);
  for (let k = 1; k < n; k++) {
    MaEnv[k] = momentAppui(pu[k - 1], lr[k - 1], pu[k], lr[k]);
  }

  const appuis: AppuiResult[] = [];
  for (let k = 0; k < nApp; k++) {
    const { As, warn } = asFlexion(MaEnv[k]);
    if (warn) avertissements.push(`Appui ${k} : moment réduit > μlu, section à revoir.`);
    const As_final = Math.max(As, k === 0 || k === n ? 0 : Anf);
    const nb = As_final > 0 ? Math.max(2, Math.ceil(As_final / aB)) : 0;
    appuis.push({ index: k, Ma: MaEnv[k], As: As_final, n: nb, phi: inp.phiL });
  }

  // --- Travées : moment max (travée chargée, adjacentes déchargées) ----------
  const travees: TraveeResult[] = [];
  for (let i = 0; i < n; i++) {
    const L = inp.travees[i].L;
    const p = pu[i];
    // Moments d'appui gauche (i) et droit (i+1) pour la travée i chargée seule.
    const Mw =
      i === 0 ? 0 : momentAppui(pmin[i - 1], lr[i - 1], p, lr[i]);
    const Me =
      i === n - 1 ? 0 : momentAppui(p, lr[i], pmin[i + 1], lr[i + 1]);
    // Position et valeur du moment maxi en travée
    const x0 = L / 2 - (Mw - Me) / (p * L);
    const Mmax = (p * x0 * (L - x0)) / 2 + Mw * (1 - x0 / L) + Me * (x0 / L);
    const { As, warn } = asFlexion(Mmax);
    if (warn) avertissements.push(`Travée ${i + 1} : moment réduit > μlu, augmentez la section.`);
    const As_final = Math.max(As, Anf);
    const nb = Math.max(2, Math.ceil(As_final / aB));

    // Efforts tranchants (travée chargée, enveloppe)
    const Vw = (p * L) / 2 + (Me - Mw) / L; // appui gauche
    const Ve = -(p * L) / 2 + (Me - Mw) / L; // appui droit
    const Vmax = Math.max(Math.abs(Vw), Math.abs(Ve));
    const tauU = (Vmax * 1e3) / (b * d);
    const At = 2 * aireBarre(inp.phiT) * 100; // mm²
    const ftj = Math.min(ft28, 3.3);
    const besoin = (tauU - 0.3 * ftj) / (0.9 * fed);
    let st = Math.min(0.9 * d, 400);
    if (besoin > 0) st = Math.min(st, At / (b * besoin));
    st = Math.max(70, Math.floor(st / 10) * 10); // mm, borne basse 7 cm

    travees.push({
      index: i,
      L,
      Mt: Mmax,
      As: As_final,
      n: nb,
      phi: inp.phiL,
      Vw,
      Ve,
      st: st / 10,
    });
  }

  etapes.push({ sym: 'Ma', label: 'Moments sur appuis (enveloppe)', valeur: MaEnv.map((m) => fmt(m, 1)).join(' · ') + ' kN·m' });
  etapes.push({ sym: 'Mt', label: 'Moments en travée (enveloppe)', valeur: travees.map((t) => fmt(t.Mt, 1)).join(' · ') + ' kN·m' });

  // Détail par travée et par appui pour la note de calcul
  travees.forEach((t) =>
    etapes.push({
      sym: `T${t.index + 1}`,
      label: `Travée ${t.index + 1} (${fmt(t.L, 2)} m)`,
      formule: `Mt = ${fmt(t.Mt, 1)} kN·m · V = ${fmt(Math.max(Math.abs(t.Vw), Math.abs(t.Ve)), 1)} kN`,
      valeur: `${t.n} HA${t.phi} · cadres Ø${inp.phiT}/${fmt(t.st, 0)}`,
    }),
  );
  appuis.forEach((a) => {
    if (a.n === 0) return;
    etapes.push({
      sym: `A${a.index}`,
      label: `Appui ${a.index} (chapeau)`,
      formule: `Ma = ${fmt(a.Ma, 1)} kN·m`,
      valeur: `${a.n} HA${a.phi}`,
    });
  });

  return { ok: erreurs.length === 0, erreurs, avertissements, etapes, travees, appuis };
}

export interface ElevationDraw {
  spans: number[]; // cm
  h: number; // cm
  bottom: Array<{ n: number; phi: number }>; // par travée
  top: Array<{ n: number; phi: number }>; // par appui (0..n)
  legende?: string;
}

/** Prépare les données de dessin de l'élévation à partir des résultats. */
export function elevationPoutreContinue(inp: PoutreContinueInput, res: PoutreContinueResult): ElevationDraw {
  return {
    spans: inp.travees.map((t) => t.L * 100),
    h: inp.h,
    bottom: res.travees.map((t) => ({ n: t.n, phi: t.phi })),
    top: res.appuis.map((a) => ({ n: a.n, phi: a.phi })),
    legende: `${res.travees.length} travées · b×h ${inp.b}×${inp.h} · cadres Ø${inp.phiT}`,
  };
}
