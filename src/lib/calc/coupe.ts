/* =========================================================================
   Coupe transversale d'un poteau (SVG), rendue à partir du placement réel
   des armatures (src/lib/calc/section.ts). Deux modes :
     - 'app'   : classes CSS (thème turquoise, réactif au dark/print du thème)
     - 'print' : couleurs en dur (note de calcul PDF, hors feuille de style)
   ========================================================================= */
import { computeLayout, type SectionSpec, type Layout } from './section';
import type { SemellePlan } from './semelle';
import type { DallePlan } from './dalle';
import type { ElevationDraw } from './poutreContinue';

type Mode = 'app' | 'print';

const COLORS = {
  beton: '#f8fafb',
  betonStroke: '#64757e',
  cadre: '#14b8a6',
  bar: '#0f766e',
  barStroke: '#ffffff',
  cote: '#64757e',
  leg: '#0f766e',
};

function attrs(mode: Mode, cls: string, inline: string): string {
  return mode === 'app' ? `class="${cls}"` : `style="${inline}"`;
}

/** Construit la coupe transversale sous forme de chaîne SVG. */
export function buildCoupeSvg(spec: SectionSpec, mode: Mode = 'app'): string {
  const layout = computeLayout(spec);
  const VW = 260;
  const VH = 220;
  const pad = 36;

  // Échelle mm → pixels pour tenir dans la zone utile, en conservant les proportions.
  const scale = Math.min((VW - 2 * pad) / layout.W, (VH - 2 * pad) / layout.H);
  const w = layout.W * scale;
  const h = layout.H * scale;
  const x0 = (VW - w) / 2;
  const y0 = (VH - h) / 2;

  // mm (origine bas-gauche, Y haut) → pixels (origine haut-gauche, Y bas)
  const px = (xmm: number) => x0 + xmm * scale;
  const py = (ymm: number) => y0 + (layout.H - ymm) * scale;

  const betonA = attrs(mode, 'coupe__beton', `fill:${COLORS.beton};stroke:${COLORS.betonStroke};stroke-width:1.5`);
  const cadreA = attrs(mode, 'coupe__cadre', `fill:none;stroke:${COLORS.cadre};stroke-width:1.4;stroke-dasharray:4 3`);
  const barA = attrs(mode, 'coupe__bar', `fill:${COLORS.bar};stroke:${COLORS.barStroke};stroke-width:0.8`);
  const coteA = attrs(mode, 'coupe__cote', `fill:${COLORS.cote};font-size:11px;font-weight:600;text-anchor:middle`);
  const legA = attrs(mode, 'coupe__leg', `fill:${COLORS.leg};font-size:11px;font-weight:700;text-anchor:middle`);
  const svgA = mode === 'app' ? 'class="coupe"' : 'style="width:280px;height:auto;display:block"';

  const rBar = (d: number) => Math.max(2.5, (d / 2) * scale * 1.6); // léger grossissement pour lisibilité
  const barsSvg = layout.bars
    .map((b) => `<circle cx="${px(b.x).toFixed(1)}" cy="${py(b.y).toFixed(1)}" r="${rBar(b.d).toFixed(1)}" ${barA}/>`)
    .join('');
  const e = layout.enrobMm * scale; // enrobage en pixels

  let shapes: string;
  let cotes: string;
  if (layout.forme === 'rect') {
    shapes =
      `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" ${betonA}/>` +
      `<rect x="${(x0 + e).toFixed(1)}" y="${(y0 + e).toFixed(1)}" width="${(w - 2 * e).toFixed(1)}" height="${(h - 2 * e).toFixed(1)}" ${cadreA}/>`;
    cotes =
      `<text x="${VW / 2}" y="${(y0 + h + 20).toFixed(1)}" ${coteA}>b = ${dim(layout.W)} cm</text>` +
      `<text x="${(x0 - 12).toFixed(1)}" y="${VH / 2}" ${coteA} transform="rotate(-90 ${(x0 - 12).toFixed(1)} ${VH / 2})">h = ${dim(layout.H)} cm</text>`;
  } else {
    const cx = px(layout.W / 2);
    const cy = py(layout.H / 2);
    const R = (layout.W / 2) * scale;
    shapes =
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R.toFixed(1)}" ${betonA}/>` +
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(R - e).toFixed(1)}" ${cadreA}/>`;
    cotes = `<text x="${VW / 2}" y="${(cy + R + 20).toFixed(1)}" ${coteA}>D = ${dim(layout.W)} cm</text>`;
  }

  const legende = spec.legende
    ? `<text x="${VW / 2}" y="14" ${legA}>${escapeXml(spec.legende)}</text>`
    : '';

  return (
    `<svg viewBox="0 0 ${VW} ${VH}" ${svgA} xmlns="http://www.w3.org/2000/svg">` +
    shapes +
    barsSvg +
    cotes +
    legende +
    `</svg>`
  );
}

/** mm → cm formaté sans décimale superflue. */
function dim(mm: number): string {
  const cm = mm / 10;
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1);
}

function escapeXml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
}

export type { Layout };

/** Vue en plan d'une semelle isolée (contour + poteau + deux nappes d'aciers). */
export function buildSemellePlanSvg(plan: SemellePlan, mode: Mode = 'app'): string {
  const VW = 280;
  const VH = 240;
  const pad = 40;
  const scale = Math.min((VW - 2 * pad) / plan.A, (VH - 2 * pad) / plan.B);
  const w = plan.A * scale;
  const h = plan.B * scale;
  const x0 = (VW - w) / 2;
  const y0 = (VH - h) / 2;
  const c = plan.enrob * scale;

  // Poteau centré
  const pw = plan.a * scale;
  const ph = plan.b * scale;
  const px0 = x0 + (w - pw) / 2;
  const py0 = y0 + (h - ph) / 2;

  const betonA = attrs(mode, 'coupe__beton', `fill:${COLORS.beton};stroke:${COLORS.betonStroke};stroke-width:1.5`);
  const poteauA = attrs(mode, 'coupe__cadre', `fill:none;stroke:${COLORS.cadre};stroke-width:1.6`);
  const barA = attrs(mode, 'coupe__barline', `stroke:${COLORS.bar};stroke-width:1.1`);
  const coteA = attrs(mode, 'coupe__cote', `fill:${COLORS.cote};font-size:11px;font-weight:600;text-anchor:middle`);
  const legA = attrs(mode, 'coupe__leg', `fill:${COLORS.leg};font-size:11px;font-weight:700;text-anchor:middle`);
  const svgA = mode === 'app' ? 'class="coupe"' : 'style="width:300px;height:auto;display:block"';

  // Nappe // A : barres horizontales, réparties sur B (hauteur)
  const barsA: string[] = [];
  for (let i = 0; i < plan.nA; i++) {
    const t = plan.nA === 1 ? 0.5 : i / (plan.nA - 1);
    const y = y0 + c + (h - 2 * c) * t;
    barsA.push(`<line x1="${(x0 + c).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x0 + w - c).toFixed(1)}" y2="${y.toFixed(1)}" ${barA}/>`);
  }
  // Nappe // B : barres verticales, réparties sur A (largeur)
  const barsB: string[] = [];
  for (let i = 0; i < plan.nB; i++) {
    const t = plan.nB === 1 ? 0.5 : i / (plan.nB - 1);
    const x = x0 + c + (w - 2 * c) * t;
    barsB.push(`<line x1="${x.toFixed(1)}" y1="${(y0 + c).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y0 + h - c).toFixed(1)}" ${barA}/>`);
  }

  return (
    `<svg viewBox="0 0 ${VW} ${VH}" ${svgA} xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" ${betonA}/>` +
    barsA.join('') +
    barsB.join('') +
    `<rect x="${px0.toFixed(1)}" y="${py0.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" ${poteauA}/>` +
    `<text x="${VW / 2}" y="${(y0 + h + 22).toFixed(1)}" ${coteA}>A = ${plan.A} cm</text>` +
    `<text x="${(x0 - 14).toFixed(1)}" y="${VH / 2}" ${coteA} transform="rotate(-90 ${(x0 - 14).toFixed(1)} ${VH / 2})">B = ${plan.B} cm</text>` +
    `<text x="${VW / 2}" y="14" ${legA}>${escapeXml(plan.legende ?? '')}</text>` +
    `</svg>`
  );
}

/** Élévation de ferraillage d'une poutre continue (travées, appuis, chapeaux). */
export function buildPoutreElevationSvg(draw: ElevationDraw, mode: Mode = 'app'): string {
  const VW = 480;
  const VH = 180;
  const padX = 24;
  const padTop = 30;
  const beamH = 46;
  const Ltot = draw.spans.reduce((s, v) => s + v, 0);
  const scale = (VW - 2 * padX) / Ltot;
  const y0 = padTop;
  const x0 = padX;

  const betonA = attrs(mode, 'coupe__beton', `fill:${COLORS.beton};stroke:${COLORS.betonStroke};stroke-width:1.5`);
  const barA = attrs(mode, 'coupe__barline', `stroke:${COLORS.bar};stroke-width:1.8`);
  const supA = attrs(mode, 'coupe__sup', `fill:${COLORS.betonStroke}`);
  const coteA = attrs(mode, 'coupe__cote', `fill:${COLORS.cote};font-size:10px;font-weight:600;text-anchor:middle`);
  const legA = attrs(mode, 'coupe__leg', `fill:${COLORS.leg};font-size:11px;font-weight:700;text-anchor:middle`);
  const svgA = mode === 'app' ? 'class="coupe coupe--wide"' : 'style="width:100%;max-width:520px;height:auto;display:block"';

  // Positions cumulées des appuis (cm → px)
  const xs: number[] = [0];
  draw.spans.forEach((s) => xs.push(xs[xs.length - 1] + s));
  const pxAt = (cm: number) => x0 + cm * scale;

  const parts: string[] = [];
  // Poutre
  parts.push(`<rect x="${x0.toFixed(1)}" y="${y0}" width="${(Ltot * scale).toFixed(1)}" height="${beamH}" ${betonA}/>`);
  // Appuis (triangles sous la poutre)
  xs.forEach((cx) => {
    const x = pxAt(cx);
    const yb = y0 + beamH;
    parts.push(`<path d="M ${(x - 6).toFixed(1)} ${(yb + 12).toFixed(1)} L ${x.toFixed(1)} ${yb.toFixed(1)} L ${(x + 6).toFixed(1)} ${(yb + 12).toFixed(1)} Z" ${supA}/>`);
  });
  // Aciers inférieurs par travée
  draw.bottom.forEach((bar, i) => {
    const xa = pxAt(xs[i]) + 6;
    const xb = pxAt(xs[i + 1]) - 6;
    const y = y0 + beamH - 8;
    parts.push(`<line x1="${xa.toFixed(1)}" y1="${y}" x2="${xb.toFixed(1)}" y2="${y}" ${barA}/>`);
    parts.push(`<text x="${((xa + xb) / 2).toFixed(1)}" y="${y + 13}" ${coteA}>${bar.n} HA${bar.phi}</text>`);
    // cote de travée
    parts.push(`<text x="${((xa + xb) / 2).toFixed(1)}" y="${y0 - 8}" ${coteA}>${(draw.spans[i] / 100).toFixed(2)} m</text>`);
  });
  // Chapeaux sur appuis internes
  draw.top.forEach((bar, k) => {
    if (bar.n === 0 || k === 0 || k === xs.length - 1) return;
    const lLeft = draw.spans[k - 1];
    const lRight = draw.spans[k];
    const xa = pxAt(xs[k] - 0.2 * lLeft);
    const xb = pxAt(xs[k] + 0.2 * lRight);
    const y = y0 + 8;
    parts.push(`<line x1="${xa.toFixed(1)}" y1="${y}" x2="${xb.toFixed(1)}" y2="${y}" ${barA}/>`);
    parts.push(`<text x="${pxAt(xs[k]).toFixed(1)}" y="${y - 4}" ${coteA}>${bar.n} HA${bar.phi}</text>`);
  });
  parts.push(`<text x="${VW / 2}" y="14" ${legA}>${escapeXml(draw.legende ?? '')}</text>`);

  return `<svg viewBox="0 0 ${VW} ${VH}" ${svgA} xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

/** Vue en plan d'une dalle (panneau + deux nappes d'aciers à l'entraxe réel). */
export function buildDallePlanSvg(plan: DallePlan, mode: Mode = 'app'): string {
  const VW = 280;
  const VH = 240;
  const pad = 40;
  const scale = Math.min((VW - 2 * pad) / plan.lx, (VH - 2 * pad) / plan.ly);
  const w = plan.lx * scale;
  const h = plan.ly * scale;
  const x0 = (VW - w) / 2;
  const y0 = (VH - h) / 2;

  const betonA = attrs(mode, 'coupe__beton', `fill:${COLORS.beton};stroke:${COLORS.betonStroke};stroke-width:1.5`);
  const barA = attrs(mode, 'coupe__barline', `stroke:${COLORS.bar};stroke-width:1`);
  const coteA = attrs(mode, 'coupe__cote', `fill:${COLORS.cote};font-size:11px;font-weight:600;text-anchor:middle`);
  const legA = attrs(mode, 'coupe__leg', `fill:${COLORS.leg};font-size:11px;font-weight:700;text-anchor:middle`);
  const svgA = mode === 'app' ? 'class="coupe"' : 'style="width:300px;height:auto;display:block"';

  // Nappe // lx (barres horizontales) réparties sur ly à l'entraxe espX
  const nX = Math.min(40, Math.max(2, Math.round(plan.ly / plan.espX) + 1));
  const barsX: string[] = [];
  for (let i = 0; i < nX; i++) {
    const y = y0 + (h * i) / (nX - 1);
    barsX.push(`<line x1="${x0.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x0 + w).toFixed(1)}" y2="${y.toFixed(1)}" ${barA}/>`);
  }
  // Nappe // ly (barres verticales) réparties sur lx à l'entraxe espY
  const nY = Math.min(40, Math.max(2, Math.round(plan.lx / plan.espY) + 1));
  const barsY: string[] = [];
  if (plan.sens === 2) {
    for (let i = 0; i < nY; i++) {
      const x = x0 + (w * i) / (nY - 1);
      barsY.push(`<line x1="${x.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y0 + h).toFixed(1)}" ${barA}/>`);
    }
  }

  return (
    `<svg viewBox="0 0 ${VW} ${VH}" ${svgA} xmlns="http://www.w3.org/2000/svg">` +
    barsX.join('') +
    barsY.join('') +
    `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" ${betonA} fill="none"/>` +
    `<text x="${VW / 2}" y="${(y0 + h + 22).toFixed(1)}" ${coteA}>lx = ${(plan.lx / 100).toFixed(2)} m</text>` +
    `<text x="${(x0 - 14).toFixed(1)}" y="${VH / 2}" ${coteA} transform="rotate(-90 ${(x0 - 14).toFixed(1)} ${VH / 2})">ly = ${(plan.ly / 100).toFixed(2)} m</text>` +
    `<text x="${VW / 2}" y="14" ${legA}>${escapeXml(plan.legende ?? '')}</text>` +
    `</svg>`
  );
}
