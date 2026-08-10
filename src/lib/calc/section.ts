/* =========================================================================
   Géométrie de la section et positions des armatures — SOURCE UNIQUE.
   Coordonnées réelles en millimètres, origine en bas-gauche, axe Y vers le haut
   (convention dessin technique / DXF). Consommée par :
     - la coupe SVG à l'écran et dans la note PDF (src/lib/calc/coupe.ts),
     - l'export DXF (src/lib/calc/dxf.ts).
   Un seul calcul de placement garantit que schéma écran = PDF = DXF.
   ========================================================================= */
import type { SectionForme } from './poteau';

/** Disposition des aciers longitudinaux. */
export type Arrangement =
  | { type: 'perimetre'; n: number } // n barres réparties sur le pourtour (poteau comprimé)
  | { type: 'nappes'; nBas: number; nHaut: number }; // 2 nappes bas/haut (flexion composée)

export interface SectionSpec {
  forme: SectionForme;
  /** Largeur (horizontale), cm — section rectangulaire. */
  width: number;
  /** Hauteur (verticale), cm — section rectangulaire. */
  height: number;
  /** Diamètre, cm — section circulaire. */
  D: number;
  /** Enrobage du béton (parement → nu du cadre), cm. */
  enrob: number;
  /** Diamètre des aciers longitudinaux, mm. */
  phiL: number;
  /** Diamètre des aciers transversaux (cadre), mm. */
  phiT: number;
  arr: Arrangement;
  /** Légende affichée (ex. « 6 HA12 · cadres Ø6 »). */
  legende?: string;
}

export interface Bar {
  x: number; // mm
  y: number; // mm
  d: number; // diamètre mm
}

export interface Layout {
  forme: SectionForme;
  /** Encombrement du contour, mm. */
  W: number;
  H: number;
  /** Enrobage parement → cadre, mm. */
  enrobMm: number;
  /** Diamètre cadre, mm. */
  phiT: number;
  bars: Bar[];
  legende?: string;
}

/** Distance parement → axe des barres longitudinales (mm). */
function axeBarre(spec: SectionSpec): number {
  return spec.enrob * 10 + spec.phiT + spec.phiL / 2;
}

/** Construit le placement réel (mm) des armatures pour une section donnée. */
export function computeLayout(spec: SectionSpec): Layout {
  const phiL = spec.phiL;
  const c = axeBarre(spec); // mm, du parement à l'axe
  const bars: Bar[] = [];

  if (spec.forme === 'circ') {
    const R = (spec.D * 10) / 2;
    const Rb = R - c;
    const n = spec.arr.type === 'perimetre' ? spec.arr.n : spec.arr.nBas + spec.arr.nHaut;
    for (let i = 0; i < n; i++) {
      const ang = (2 * Math.PI * i) / n - Math.PI / 2;
      bars.push({ x: R + Rb * Math.cos(ang), y: R + Rb * Math.sin(ang), d: phiL });
    }
    return { forme: 'circ', W: spec.D * 10, H: spec.D * 10, enrobMm: spec.enrob * 10, phiT: spec.phiT, bars, legende: spec.legende };
  }

  const W = spec.width * 10;
  const H = spec.height * 10;

  if (spec.arr.type === 'nappes') {
    const { nBas, nHaut } = spec.arr;
    pushRow(bars, nBas, c, W - c, c, phiL); // nappe basse (aciers tendus)
    pushRow(bars, nHaut, c, W - c, H - c, phiL); // nappe haute
  } else {
    // Répartition sur le pourtour, en commençant par les 4 angles
    const n = spec.arr.n;
    const corners: Array<[number, number]> = [
      [c, c],
      [W - c, c],
      [W - c, H - c],
      [c, H - c],
    ];
    const take = Math.min(n, 4);
    for (let i = 0; i < take; i++) bars.push({ x: corners[i][0], y: corners[i][1], d: phiL });

    const extra = Math.max(0, n - 4);
    if (extra > 0) {
      const perSide = Math.floor(extra / 4);
      const reste = extra % 4;
      const sides: Array<[[number, number], [number, number]]> = [
        [corners[0], corners[1]],
        [corners[1], corners[2]],
        [corners[2], corners[3]],
        [corners[3], corners[0]],
      ];
      sides.forEach((s, si) => {
        const cnt = perSide + (si < reste ? 1 : 0);
        for (let j = 1; j <= cnt; j++) {
          const t = j / (cnt + 1);
          bars.push({ x: s[0][0] + (s[1][0] - s[0][0]) * t, y: s[0][1] + (s[1][1] - s[0][1]) * t, d: phiL });
        }
      });
    }
  }

  return { forme: 'rect', W, H, enrobMm: spec.enrob * 10, phiT: spec.phiT, bars, legende: spec.legende };
}

/** Place une rangée de n barres réparties entre x0 et x1 à l'ordonnée y. */
function pushRow(bars: Bar[], n: number, x0: number, x1: number, y: number, d: number) {
  if (n <= 0) return;
  if (n === 1) {
    bars.push({ x: (x0 + x1) / 2, y, d });
    return;
  }
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    bars.push({ x: x0 + (x1 - x0) * t, y, d });
  }
}
