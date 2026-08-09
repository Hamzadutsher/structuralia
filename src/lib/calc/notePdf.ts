/* =========================================================================
   Note de calcul imprimable (PDF via impression navigateur) — Poteau BA.
   Réutilise l'identité STRUCTURALIA et le moteur d'impression sans dépendance.
   ========================================================================= */
import { printHtml, escapeHtml } from '@/lib/pdf';
import { COMPANY, COMPANY_LEGAL_FOOTER, COMPANY_CONTACT_FOOTER } from '@/lib/company';
import { formatDate } from '@/lib/format';
import type { PoteauInput, PoteauResult } from './poteau';
import { buildCoupeSvg } from './coupe';

export interface NoteMeta {
  /** Repère de l'élément (ex. « P1 — RDC »). */
  repere?: string;
  /** Nom du projet / chantier. */
  projet?: string;
  /** Nom de l'ingénieur / rédacteur. */
  ingenieur?: string;
}

function hypotheses(inp: PoteauInput): Array<[string, string]> {
  const geom =
    inp.forme === 'rect'
      ? `Section rectangulaire ${inp.a} × ${inp.b} cm`
      : `Section circulaire Ø ${inp.D} cm`;
  const liaison: Record<number, string> = {
    0.7: 'Poteau continu de bâtiment (k = 0,7)',
    1: 'Articulé — articulé (k = 1,0)',
    0.5: 'Encastré — encastré (k = 0,5)',
    2: 'Encastré — libre / console (k = 2,0)',
  };
  const age: Record<string, string> = {
    apres90j: 'Après 90 jours',
    avant90j: 'Avant 90 jours',
    avant28j: 'Avant 28 jours',
  };
  return [
    ['Règlement', 'BAEL 91 révisé 99 — compression centrée (Art. B.8.4)'],
    ['Géométrie', geom],
    ['Longueur libre l₀', `${inp.l0} m`],
    ['Conditions de liaison', liaison[inp.k] ?? `k = ${inp.k}`],
    ['Effort normal ultime Nu', `${inp.Nu} kN`],
    ['Béton', `fc28 = ${inp.fc28} MPa (γb = ${inp.gammaB})`],
    ['Acier', `FeE${inp.fe} — fe = ${inp.fe} MPa (γs = ${inp.gammaS})`],
    ['Application des charges', age[inp.age] ?? inp.age],
    ['Aciers longitudinaux', `HA${inp.phiL}`],
  ];
}

export function exportPoteauNotePdf(inp: PoteauInput, res: PoteauResult, meta: NoteMeta = {}): void {
  const svg = buildCoupeSvg(
    { forme: inp.forme, a: inp.a, b: inp.b, D: inp.D, nBarres: res.nBarres, phiL: inp.phiL, phiT: res.phiT },
    'print',
  );

  const hypRows = hypotheses(inp)
    .map(
      ([k, v]) =>
        `<tr><td class="hk">${escapeHtml(k)}</td><td class="hv">${escapeHtml(v)}</td></tr>`,
    )
    .join('');

  const etapeRows = res.etapes
    .map(
      (e) => `<tr>
        <td class="sym">${escapeHtml(e.sym)}</td>
        <td>${escapeHtml(e.label)}</td>
        <td class="formule">${escapeHtml(e.formule ?? '')}</td>
        <td class="val">${escapeHtml(e.valeur)}</td>
      </tr>`,
    )
    .join('');

  const messages = [
    ...res.erreurs.map((m) => `<div class="msg err">⚠︎ ${escapeHtml(m)}</div>`),
    ...res.avertissements.map((m) => `<div class="msg warn">⚠︎ ${escapeHtml(m)}</div>`),
  ].join('');

  const verdict = res.ok
    ? `<div class="verdict ok">✓ Dimensionnement vérifié — ${res.nBarres} HA${inp.phiL} (${res.AsReel.toFixed(2)} cm²), cadres Ø${res.phiT} espacés de ${res.stCourant.toFixed(0)} cm. Nu,lim = ${res.NuLim.toFixed(0)} kN ≥ Nu = ${inp.Nu} kN.</div>`
    : `<div class="verdict ko">✗ Dimensionnement à revoir (voir observations ci-dessous).</div>`;

  const sousTitre = [meta.repere, meta.projet]
    .filter((x): x is string => Boolean(x))
    .map(escapeHtml)
    .join(' · ');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Note de calcul — Poteau ${escapeHtml(meta.repere ?? '')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e2a30; margin: 0; padding: 34px 40px; font-size: 12px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #14b8a6; padding-bottom: 14px; margin-bottom: 16px; gap: 20px; }
  .brand { display: flex; gap: 12px; align-items: flex-start; max-width: 62%; }
  .logo { width: 44px; height: 44px; border-radius: 10px; background: #14b8a6; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 22px; flex-shrink: 0; }
  .brand b { font-size: 19px; letter-spacing: 1px; color: #0f766e; }
  .brand .act { font-size: 10px; color: #1e2a30; font-weight: 600; margin-top: 2px; }
  .doc-title { text-align: right; flex-shrink: 0; }
  .doc-title h1 { margin: 0; color: #0f766e; font-size: 18px; letter-spacing: 1px; }
  .doc-title .ref { font-size: 12px; font-weight: 700; margin-top: 4px; }
  .doc-title .date { font-size: 10.5px; color: #64757e; margin-top: 2px; }
  h2 { font-size: 12.5px; color: #0f766e; text-transform: uppercase; letter-spacing: .5px; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e4e9ec; }
  .cols { display: flex; gap: 18px; align-items: flex-start; }
  .cols .left { flex: 1; }
  .cols .right { width: 300px; flex-shrink: 0; text-align: center; }
  table.hyp { width: 100%; border-collapse: collapse; }
  table.hyp td { padding: 5px 8px; border-bottom: 1px solid #eef2f4; vertical-align: top; }
  table.hyp .hk { color: #64757e; width: 42%; font-weight: 600; }
  table.hyp .hv { font-weight: 600; }
  .coupe-box { border: 1px solid #e4e9ec; border-radius: 10px; padding: 10px; background: #ffffff; display: inline-block; }
  .coupe-cap { font-size: 10px; color: #64757e; margin-top: 6px; }
  table.note { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.note th { background: #0f766e; color: #fff; text-align: left; padding: 7px 9px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .4px; }
  table.note td { padding: 6px 9px; border-bottom: 1px solid #e4e9ec; }
  table.note .sym { font-weight: 700; color: #0f766e; width: 64px; }
  table.note .formule { font-style: italic; color: #64757e; }
  table.note .val { text-align: right; font-weight: 700; white-space: nowrap; }
  .verdict { margin-top: 14px; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; }
  .verdict.ok { background: #dcfce7; color: #166534; }
  .verdict.ko { background: #fee2e2; color: #991b1b; }
  .msg { margin-top: 8px; padding: 8px 12px; border-radius: 6px; font-size: 11px; }
  .msg.err { background: #fee2e2; color: #991b1b; }
  .msg.warn { background: #fef3c7; color: #92580a; }
  .foot { margin-top: 28px; text-align: center; color: #93a2ab; font-size: 9px; border-top: 1px solid #e4e9ec; padding-top: 10px; line-height: 1.6; }
  .sign { margin-top: 22px; display: flex; justify-content: flex-end; }
  .sign .box { width: 240px; text-align: center; font-size: 10.5px; color: #64757e; }
  .sign .line { border-top: 1px solid #93a2ab; margin-top: 40px; padding-top: 5px; }
  @media print { body { padding: 16px 20px; } h2 { page-break-after: avoid; } table.note tr { page-break-inside: avoid; } }
</style></head><body>
  <div class="head">
    <div class="brand">
      <div class="logo">S</div>
      <div>
        <b>${escapeHtml(COMPANY.nom)}</b>
        <div class="act">${escapeHtml(COMPANY.activite)}</div>
      </div>
    </div>
    <div class="doc-title">
      <h1>NOTE DE CALCUL</h1>
      <div class="ref">Poteau BA — compression centrée</div>
      ${sousTitre ? `<div class="ref">${sousTitre}</div>` : ''}
      <div class="date">Date : ${formatDate(new Date().toISOString())}${meta.ingenieur ? ` · Rédacteur : ${escapeHtml(meta.ingenieur)}` : ''}</div>
    </div>
  </div>

  <div class="cols">
    <div class="left">
      <h2>1. Hypothèses</h2>
      <table class="hyp"><tbody>${hypRows}</tbody></table>
    </div>
    <div class="right">
      <h2>Coupe transversale</h2>
      <div class="coupe-box">${svg}</div>
      <div class="coupe-cap">Ferraillage indicatif (schéma non coté à l'échelle)</div>
    </div>
  </div>

  <h2>2. Détail du calcul</h2>
  <table class="note">
    <thead><tr><th>Symb.</th><th>Désignation</th><th>Formule</th><th style="text-align:right">Valeur</th></tr></thead>
    <tbody>${etapeRows}</tbody>
  </table>

  <h2>3. Conclusion</h2>
  ${verdict}
  ${messages}

  <div class="sign">
    <div class="box"><div class="line">Ingénieur BET — cachet & signature</div></div>
  </div>

  <div class="foot">${escapeHtml(COMPANY_LEGAL_FOOTER)}<br>${escapeHtml(COMPANY_CONTACT_FOOTER)}</div>
</body></html>`;

  printHtml(html);
}
