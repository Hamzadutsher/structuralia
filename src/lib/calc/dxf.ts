/* =========================================================================
   Export DXF (AutoCAD R12 / AC1009) de la coupe transversale d'un poteau.
   Format ASCII, échelle réelle 1:1 en millimètres. Calques francophones :
   BETON, CADRES, ACIERS, COTES, TEXTE. Généré à partir du placement réel
   des armatures (src/lib/calc/section.ts) → cohérent avec la coupe écran/PDF.
   ========================================================================= */
import { computeLayout, type SectionSpec } from './section';
import type { SemellePlan } from './semelle';
import type { DallePlan } from './dalle';
import type { ElevationDraw } from './poutreContinue';

interface DxfMeta {
  titre?: string; // ex. « POTEAU P1 — RDC »
  legende?: string; // ex. « 6 HA12 · cadres Ø6 »
}

/** Couleurs AutoCAD (ACI) par calque. */
const LAYERS: Array<[string, number]> = [
  ['BETON', 7], // blanc/noir
  ['CADRES', 3], // vert
  ['ACIERS', 1], // rouge
  ['COTES', 5], // bleu
  ['TEXTE', 2], // jaune
];

/** Petit accumulateur de paires (code de groupe, valeur). */
class Dxf {
  private buf: string[] = [];
  g(code: number, value: string | number) {
    this.buf.push(String(code), String(value));
    return this;
  }
  line(layer: string, x1: number, y1: number, x2: number, y2: number) {
    this.g(0, 'LINE').g(8, layer).g(10, f(x1)).g(20, f(y1)).g(30, 0).g(11, f(x2)).g(21, f(y2)).g(31, 0);
  }
  circle(layer: string, cx: number, cy: number, r: number) {
    this.g(0, 'CIRCLE').g(8, layer).g(10, f(cx)).g(20, f(cy)).g(30, 0).g(40, f(r));
  }
  text(layer: string, x: number, y: number, height: number, s: string) {
    this.g(0, 'TEXT').g(8, layer).g(10, f(x)).g(20, f(y)).g(30, 0).g(40, f(height)).g(1, s);
  }
  rect(layer: string, x: number, y: number, w: number, h: number) {
    this.line(layer, x, y, x + w, y);
    this.line(layer, x + w, y, x + w, y + h);
    this.line(layer, x + w, y + h, x, y + h);
    this.line(layer, x, y + h, x, y);
  }
  toString() {
    return this.buf.join('\n');
  }
}

function f(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function header(): string {
  const d = new Dxf();
  d.g(0, 'SECTION').g(2, 'HEADER').g(9, '$ACADVER').g(1, 'AC1009').g(0, 'ENDSEC');
  return d.toString();
}

function tables(): string {
  const d = new Dxf();
  d.g(0, 'SECTION').g(2, 'TABLES');
  // Type de ligne CONTINUOUS (requis par certains lecteurs)
  d.g(0, 'TABLE').g(2, 'LTYPE').g(70, 1);
  d.g(0, 'LTYPE').g(2, 'CONTINUOUS').g(70, 0).g(3, 'Solid line').g(72, 65).g(73, 0).g(40, 0);
  d.g(0, 'ENDTAB');
  // Calques
  d.g(0, 'TABLE').g(2, 'LAYER').g(70, LAYERS.length);
  for (const [name, color] of LAYERS) {
    d.g(0, 'LAYER').g(2, name).g(70, 0).g(62, color).g(6, 'CONTINUOUS');
  }
  d.g(0, 'ENDTAB');
  d.g(0, 'ENDSEC');
  return d.toString();
}

/** Construit le contenu DXF de la coupe transversale d'un élément BA (poteau, poutre…). */
export function buildCoupeDxf(spec: SectionSpec, meta: DxfMeta = {}): string {
  const layout = computeLayout(spec);
  const d = new Dxf();
  d.g(0, 'SECTION').g(2, 'ENTITIES');

  const W = layout.W;
  const H = layout.H;
  const e = layout.enrobMm;
  const th = Math.max(30, Math.min(W, H) / 14); // hauteur de texte (mm)

  // --- Contour béton + cadre --------------------------------------------
  if (layout.forme === 'rect') {
    d.rect('BETON', 0, 0, W, H);
    d.rect('CADRES', e, e, W - 2 * e, H - 2 * e);
  } else {
    const R = W / 2;
    d.circle('BETON', R, R, R);
    d.circle('CADRES', R, R, R - e);
  }

  // --- Aciers longitudinaux ---------------------------------------------
  for (const b of layout.bars) d.circle('ACIERS', b.x, b.y, b.d / 2);

  // --- Cotes (lignes d'attache + valeur) --------------------------------
  const off = Math.max(60, th * 2);
  if (layout.forme === 'rect') {
    // Cote horizontale (largeur), sous la section
    d.line('COTES', 0, -off, W, -off);
    d.line('COTES', 0, -off + 8, 0, -off - 8);
    d.line('COTES', W, -off + 8, W, -off - 8);
    d.text('COTES', W / 2 - th, -off - th - 4, th, `${cm(W)} cm`);
    // Cote verticale (hauteur), à gauche
    d.line('COTES', -off, 0, -off, H);
    d.line('COTES', -off - 8, 0, -off + 8, 0);
    d.line('COTES', -off - 8, H, -off + 8, H);
    d.text('COTES', -off - th * 3, H / 2, th, `${cm(H)} cm`);
  } else {
    d.line('COTES', 0, -off, W, -off);
    d.text('COTES', W / 2 - th, -off - th - 4, th, `Ø ${cm(W)} cm`);
  }

  // --- Titre + légende de ferraillage -----------------------------------
  if (meta.titre) d.text('TEXTE', 0, H + off, th * 1.2, meta.titre);
  const leg = meta.legende ?? spec.legende;
  if (leg) d.text('TEXTE', 0, H + off - th * 1.6, th, leg);

  d.g(0, 'ENDSEC');

  return [header(), tables(), d.toString(), '0\nEOF'].join('\n');
}

/** Construit le DXF de la vue en plan d'une semelle isolée (échelle 1:1 mm). */
export function buildSemelleDxf(plan: SemellePlan, meta: DxfMeta = {}): string {
  const d = new Dxf();
  d.g(0, 'SECTION').g(2, 'ENTITIES');

  const A = plan.A * 10;
  const B = plan.B * 10;
  const e = plan.enrob * 10;
  const th = Math.max(30, Math.min(A, B) / 16);

  // Contour de la semelle
  d.rect('BETON', 0, 0, A, B);
  // Poteau centré
  const aw = plan.a * 10;
  const bw = plan.b * 10;
  d.rect('BETON', (A - aw) / 2, (B - bw) / 2, aw, bw);

  // Nappe // A (barres horizontales réparties sur B)
  for (let i = 0; i < plan.nA; i++) {
    const t = plan.nA === 1 ? 0.5 : i / (plan.nA - 1);
    const y = e + (B - 2 * e) * t;
    d.line('ACIERS', e, y, A - e, y);
  }
  // Nappe // B (barres verticales réparties sur A)
  for (let i = 0; i < plan.nB; i++) {
    const t = plan.nB === 1 ? 0.5 : i / (plan.nB - 1);
    const x = e + (A - 2 * e) * t;
    d.line('ACIERS', x, e, x, B - e);
  }

  // Cotes
  const off = Math.max(60, th * 2);
  d.line('COTES', 0, -off, A, -off);
  d.text('COTES', A / 2 - th, -off - th - 4, th, `A = ${cm(A)} cm`);
  d.line('COTES', -off, 0, -off, B);
  d.text('COTES', -off - th * 3, B / 2, th, `B = ${cm(B)} cm`);

  if (meta.titre) d.text('TEXTE', 0, B + off, th * 1.2, meta.titre);
  const leg = meta.legende ?? plan.legende;
  if (leg) d.text('TEXTE', 0, B + off - th * 1.6, th, leg);

  d.g(0, 'ENDSEC');
  return [header(), tables(), d.toString(), '0\nEOF'].join('\n');
}

/** Construit le DXF de la vue en plan de ferraillage d'une dalle (échelle 1:1 mm). */
export function buildDalleDxf(plan: DallePlan, meta: DxfMeta = {}): string {
  const d = new Dxf();
  d.g(0, 'SECTION').g(2, 'ENTITIES');

  const LX = plan.lx * 10; // mm
  const LY = plan.ly * 10;
  const th = Math.max(40, Math.min(LX, LY) / 18);

  // Contour du panneau
  d.rect('BETON', 0, 0, LX, LY);

  // Nappe // lx (barres horizontales), entraxe réel espX (mm)
  const eX = plan.espX * 10;
  for (let y = eX; y < LY; y += eX) d.line('ACIERS', 0, y, LX, y);
  // Nappe // ly (barres verticales), entraxe réel espY
  if (plan.sens === 2) {
    const eY = plan.espY * 10;
    for (let x = eY; x < LX; x += eY) d.line('ACIERS', x, 0, x, LY);
  }

  // Cotes
  const off = Math.max(80, th * 2);
  d.line('COTES', 0, -off, LX, -off);
  d.text('COTES', LX / 2 - th, -off - th - 4, th, `lx = ${cm(LX)} cm`);
  d.line('COTES', -off, 0, -off, LY);
  d.text('COTES', -off - th * 3, LY / 2, th, `ly = ${cm(LY)} cm`);

  if (meta.titre) d.text('TEXTE', 0, LY + off, th * 1.2, meta.titre);
  const leg = meta.legende ?? plan.legende;
  if (leg) d.text('TEXTE', 0, LY + off - th * 1.6, th, leg);

  d.g(0, 'ENDSEC');
  return [header(), tables(), d.toString(), '0\nEOF'].join('\n');
}

/** DXF de l'élévation de ferraillage d'une poutre continue (échelle 1:1 mm). */
export function buildPoutreElevationDxf(draw: ElevationDraw, meta: DxfMeta = {}): string {
  const d = new Dxf();
  d.g(0, 'SECTION').g(2, 'ENTITIES');

  const H = draw.h * 10; // mm
  const spans = draw.spans.map((s) => s * 10); // mm
  const xs: number[] = [0];
  spans.forEach((s) => xs.push(xs[xs.length - 1] + s));
  const Ltot = xs[xs.length - 1];
  const th = Math.max(60, H / 4);

  // Contour de la poutre
  d.rect('BETON', 0, 0, Ltot, H);
  // Traits d'appui
  xs.forEach((x) => d.line('BETON', x, 0, x, -th));

  // Aciers inférieurs (par travée)
  draw.bottom.forEach((bar, i) => {
    const y = th * 0.6;
    d.line('ACIERS', xs[i] + 40, y, xs[i + 1] - 40, y);
    d.text('TEXTE', (xs[i] + xs[i + 1]) / 2 - th, -th - 10, th * 0.8, `${bar.n}HA${bar.phi}`);
    d.text('COTES', (xs[i] + xs[i + 1]) / 2 - th, H + 20, th * 0.8, `${cm(spans[i])} cm`);
  });
  // Chapeaux sur appuis internes
  draw.top.forEach((bar, k) => {
    if (bar.n === 0 || k === 0 || k === xs.length - 1) return;
    const xa = xs[k] - 0.2 * spans[k - 1];
    const xb = xs[k] + 0.2 * spans[k];
    const y = H - th * 0.6;
    d.line('ACIERS', xa, y, xb, y);
    d.text('TEXTE', xs[k] - th, H + th, th * 0.8, `${bar.n}HA${bar.phi}`);
  });

  if (meta.titre) d.text('TEXTE', 0, H + th * 2.4, th, meta.titre);

  d.g(0, 'ENDSEC');
  return [header(), tables(), d.toString(), '0\nEOF'].join('\n');
}

function cm(mm: number): string {
  const v = mm / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Déclenche le téléchargement d'un fichier DXF côté navigateur. */
export function downloadDxf(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.dxf') ? filename : `${filename}.dxf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 500);
}
