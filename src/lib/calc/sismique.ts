/* =========================================================================
   Analyse sismique — méthode statique équivalente (RPS 2011, Maroc).
   Effort tranchant à la base V = (A·S·D·I / K)·W, réparti sur la hauteur.
   IMPORTANT : les VALEURS des coefficients (A zone, S site, D amplification,
   I priorité, K comportement/ductilité) sont saisies par l'ingénieur d'après
   les tableaux du RPS 2011 — elles ne sont pas figées ici.
   ========================================================================= */
import type { Etape } from './poteau';

export interface Niveau {
  nom: string;
  /** Poids (masse pondérée) du niveau W (kN). */
  W: number;
  /** Hauteur du niveau au-dessus de la base h (m). */
  h: number;
}

export interface SismiqueInput {
  /** Coefficient d'accélération de zone A = a_max/g (RPS 2011). */
  A: number;
  /** Coefficient de site S. */
  S: number;
  /** Facteur d'amplification dynamique D. */
  D: number;
  /** Coefficient de priorité / importance I. */
  I: number;
  /** Facteur de comportement (ductilité) K. */
  K: number;
  /** Période fondamentale T (s). */
  T: number;
  niveaux: Niveau[];
}

export interface NiveauResult {
  nom: string;
  W: number;
  h: number;
  Wh: number;
  /** Force sismique de niveau F_i (kN). */
  F: number;
  /** Effort tranchant d'étage V_i (kN, cumulé depuis le sommet). */
  V: number;
}

export interface SismiqueResult {
  ok: boolean;
  erreurs: string[];
  avertissements: string[];
  etapes: Etape[];
  Wtot: number;
  Vbase: number;
  Ft: number;
  niveaux: NiveauResult[];
}

function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return '—';
  return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function calculSismique(inp: SismiqueInput): SismiqueResult {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const etapes: Etape[] = [];

  const Wtot = inp.niveaux.reduce((s, n) => s + n.W, 0);
  if (inp.K <= 0) erreurs.push('Le facteur de comportement K doit être positif.');

  // Effort tranchant à la base
  const Vbase = ((inp.A * inp.S * inp.D * inp.I) / (inp.K || 1)) * Wtot;
  etapes.push({ sym: 'W', label: 'Poids total', formule: 'Σ Wi', valeur: `${fmt(Wtot, 0)} kN` });
  etapes.push({
    sym: 'V',
    label: 'Effort tranchant à la base',
    formule: '(A·S·D·I/K)·W',
    valeur: `${fmt(Vbase, 1)} kN`,
  });

  // Force additionnelle au sommet (RPS : T > 0,7 s)
  const Ft = inp.T > 0.7 ? Math.min(0.07 * inp.T * Vbase, 0.25 * Vbase) : 0;
  if (Ft > 0) {
    etapes.push({ sym: 'Ft', label: 'Force au sommet (T > 0,7 s)', formule: 'min(0,07·T·V ; 0,25·V)', valeur: `${fmt(Ft, 1)} kN` });
  }

  // Répartition verticale : F_i = (V − Ft)·Wi·hi / Σ(Wj·hj)
  const sumWh = inp.niveaux.reduce((s, n) => s + n.W * n.h, 0);
  const nTop = inp.niveaux.length - 1;
  const niveaux: NiveauResult[] = inp.niveaux.map((n, i) => {
    const Wh = n.W * n.h;
    let F = sumWh > 0 ? ((Vbase - Ft) * Wh) / sumWh : 0;
    if (i === nTop) F += Ft; // la force additionnelle s'applique au dernier niveau
    return { nom: n.nom, W: n.W, h: n.h, Wh, F, V: 0 };
  });

  // Effort tranchant d'étage : somme des forces situées au niveau considéré
  // et au-dessus (par la hauteur, indépendamment de l'ordre des lignes).
  // Il est donc maximal à la base (= V) et minimal au sommet.
  niveaux.forEach((lvl) => {
    lvl.V = niveaux.filter((o) => o.h >= lvl.h).reduce((s, o) => s + o.F, 0);
  });

  return { ok: erreurs.length === 0, erreurs, avertissements, etapes, Wtot, Vbase, Ft, niveaux };
}

/** Diagramme de la distribution des forces sismiques (SVG). */
export function buildSismiqueSvg(res: SismiqueResult, mode: 'app' | 'print' = 'app'): string {
  const VW = 340;
  const VH = 240;
  const padL = 30;
  const padR = 120;
  const padB = 30;
  const padT = 20;
  const n = res.niveaux;
  if (n.length === 0) return `<svg viewBox="0 0 ${VW} ${VH}"></svg>`;

  const hMax = Math.max(...n.map((x) => x.h), 1);
  const fMax = Math.max(...n.map((x) => x.F), 1);
  const x0 = padL;
  const yBase = VH - padB;
  const yTop = padT;
  const usableH = yBase - yTop;
  const yAt = (h: number) => yBase - (h / hMax) * usableH;
  const arrowLen = (F: number) => (F / fMax) * (VW - padL - padR);

  const axis = mode === 'app' ? 'stroke:var(--text-muted)' : 'stroke:#64757e';
  const arrow = mode === 'app' ? 'stroke:var(--primary-600);fill:var(--primary-600)' : 'stroke:#0d9488;fill:#0d9488';
  const txt = mode === 'app' ? 'fill:var(--text)' : 'fill:#1e2a30';
  const sub = mode === 'app' ? 'fill:var(--text-muted)' : 'fill:#64757e';
  const svgA = mode === 'app' ? 'class="coupe coupe--wide"' : 'style="width:100%;max-width:360px;height:auto;display:block"';

  const parts: string[] = [];
  // Poteau vertical (bâtiment)
  parts.push(`<line x1="${x0}" y1="${yBase}" x2="${x0}" y2="${yTop}" style="${axis};stroke-width:2"/>`);
  parts.push(`<line x1="${x0 - 10}" y1="${yBase}" x2="${x0 + 10}" y2="${yBase}" style="${axis};stroke-width:2"/>`);
  n.forEach((lvl) => {
    const y = yAt(lvl.h);
    const len = arrowLen(lvl.F);
    parts.push(`<line x1="${x0}" y1="${y.toFixed(1)}" x2="${(x0 + len).toFixed(1)}" y2="${y.toFixed(1)}" style="${arrow};stroke-width:2"/>`);
    parts.push(`<path d="M ${(x0 + len).toFixed(1)} ${(y - 4).toFixed(1)} L ${(x0 + len + 7).toFixed(1)} ${y.toFixed(1)} L ${(x0 + len).toFixed(1)} ${(y + 4).toFixed(1)} Z" style="${arrow}"/>`);
    parts.push(`<circle cx="${x0}" cy="${y.toFixed(1)}" r="3" style="${arrow}"/>`);
    parts.push(`<text x="${(x0 + len + 12).toFixed(1)}" y="${(y + 3).toFixed(1)}" style="${txt};font-size:10px;font-weight:600">${lvl.nom} : ${fmt(lvl.F, 1)} kN</text>`);
    parts.push(`<text x="${(x0 - 4).toFixed(1)}" y="${(y + 3).toFixed(1)}" style="${sub};font-size:9px;text-anchor:end">${fmt(lvl.h, 1)}</text>`);
  });
  parts.push(`<text x="${VW / 2}" y="12" style="${sub};font-size:10px;font-weight:700;text-anchor:middle">Distribution des forces sismiques (kN)</text>`);

  return `<svg viewBox="0 0 ${VW} ${VH}" ${svgA} xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}
