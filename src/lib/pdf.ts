import type { Client, Devis, Facture, LigneDevis } from './types';
import { eur, formatDate } from './format';
import { getSettings, companyFooters } from './settings';

/**
 * Génère un document imprimable (devis ou facture) et ouvre la boîte
 * d'impression du navigateur, permettant d'« Enregistrer au format PDF ».
 * Implémentation sans dépendance externe (iframe caché).
 */

type Kind = 'devis' | 'facture';

interface DocLike {
  reference: string;
  objet?: string;
  dateEmission?: string;
  dateEcheance?: string;
  dateValidite?: string;
  montantHT: number;
  tauxTVA: number;
  remisePourcent?: number;
  montantTTC: number;
  lignes: LigneDevis[];
  notes?: string;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function renderLignes(doc: DocLike): { rows: string; ht: number } {
  const lignes =
    doc.lignes && doc.lignes.length > 0
      ? doc.lignes
      : [{ designation: doc.objet || 'Prestation', quantite: 1, prixUnitaire: doc.montantHT }];
  let ht = 0;
  let n = 0;
  let currentSection: string | null = null;
  const parts: string[] = [];
  for (const l of lignes) {
    const sec = (l.section ?? '').trim();
    if (sec && sec !== currentSection) {
      currentSection = sec;
      parts.push(`<tr class="sec"><td colspan="6">${escapeHtml(sec)}</td></tr>`);
    }
    n++;
    const total = (l.quantite || 0) * (l.prixUnitaire || 0);
    ht += total;
    parts.push(`<tr>
      <td class="num">${n}</td>
      <td>${escapeHtml(l.designation)}</td>
      <td class="center">${escapeHtml(l.unite ?? '')}</td>
      <td class="num">${l.quantite}</td>
      <td class="num">${eur(l.prixUnitaire)}</td>
      <td class="num">${eur(total)}</td>
    </tr>`);
  }
  return { rows: parts.join(''), ht };
}

function buildHtml(kind: Kind, doc: DocLike, client?: Client): string {
  const c = getSettings().company;
  const logo = getSettings().letterheadLogo;
  const foot = companyFooters();
  const title = kind === 'devis' ? 'DEVIS' : 'FACTURE';
  const { rows, ht } = renderLignes(doc);
  const brut = ht || doc.montantHT;
  const remisePct = doc.remisePourcent || 0;
  const remise = brut * (remisePct / 100);
  const htFinal = brut - remise;
  const tva = htFinal * (doc.tauxTVA / 100);
  const ttc = htFinal + tva;
  const dateLabel = kind === 'devis' ? 'Validité' : 'Échéance';
  const dateVal = kind === 'devis' ? doc.dateValidite : doc.dateEcheance;
  const clientLignes = [
    client?.contactNom,
    client?.adresse,
    [client?.codePostal, client?.ville].filter(Boolean).join(' '),
    client?.siret ? `RC/ICE : ${client.siret}` : '',
    client?.email,
    client?.telephone,
  ].filter(Boolean);

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${title} ${escapeHtml(doc.reference)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e2a30; margin: 0; padding: 36px 42px; font-size: 12.5px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #14b8a6; padding-bottom: 16px; margin-bottom: 18px; gap: 20px; }
  .brand { display: flex; flex-direction: column; gap: 3px; max-width: 62%; }
  .logo-img { height: 46px; width: auto; display: block; margin-bottom: 4px; }
  .brand .act { font-size: 10.5px; color: #1e2a30; font-weight: 700; }
  .brand .spec { font-size: 8.5px; color: #64757e; line-height: 1.35; }
  .doc-title { text-align: right; flex-shrink: 0; }
  .doc-title h1 { margin: 0; color: #0f766e; font-size: 24px; letter-spacing: 2px; }
  .doc-title .ref { font-size: 14px; font-weight: 700; margin-top: 4px; }
  .doc-title .date { font-size: 11px; color: #64757e; margin-top: 2px; }
  .objet { background: #0f766e; color: #fff; padding: 9px 14px; border-radius: 8px; font-weight: 700; margin-bottom: 16px; font-size: 12.5px; }
  .objet span { opacity: .8; font-weight: 600; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 18px; gap: 16px; }
  .bloc { background: #f4f7f9; border-radius: 10px; padding: 12px 15px; width: 50%; }
  .bloc label { text-transform: uppercase; font-size: 9.5px; letter-spacing: 1px; color: #93a2ab; font-weight: 700; }
  .bloc .n { font-weight: 700; margin: 3px 0; }
  .bloc div { margin-top: 2px; font-size: 11.5px; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.items th { background: #0f766e; color: #fff; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
  table.items th.num, table.items td.num { text-align: right; }
  table.items th.center, table.items td.center { text-align: center; }
  table.items td { padding: 7px 10px; border-bottom: 1px solid #e4e9ec; }
  table.items tr.sec td { background: #e6f5f2; color: #0f766e; font-weight: 800; text-transform: uppercase; font-size: 10.5px; letter-spacing: .5px; padding: 7px 10px; }
  .totaux { width: 290px; margin-left: auto; border-collapse: collapse; }
  .totaux td { padding: 6px 12px; }
  .totaux .lbl { color: #64757e; }
  .totaux .num { text-align: right; font-weight: 600; }
  .totaux .ttc td { border-top: 2px solid #14b8a6; font-weight: 800; font-size: 15px; color: #0f766e; padding-top: 9px; }
  .notes { margin-top: 18px; padding: 12px 15px; background: #f0fdfa; border-left: 3px solid #14b8a6; border-radius: 6px; color: #115e59; font-size: 11.5px; }
  .foot { margin-top: 34px; text-align: center; color: #93a2ab; font-size: 9.5px; border-top: 1px solid #e4e9ec; padding-top: 12px; line-height: 1.6; }
  @media print { body { padding: 16px 20px; } }
</style></head>
<body>
  <div class="head">
    <div class="brand">
      <img class="logo-img" src="${logo}" alt="${escapeHtml(c.nom)}" />
      <div class="act">${escapeHtml(c.activite.toUpperCase())}</div>
      <div class="spec">${escapeHtml(c.specialites)}</div>
    </div>
    <div class="doc-title">
      <h1>${title}</h1>
      <div class="ref">N° ${escapeHtml(doc.reference)}</div>
      <div class="date">Date : ${formatDate(doc.dateEmission)}</div>
    </div>
  </div>

  <div class="objet"><span>OBJET :</span> ${escapeHtml(doc.objet ?? '—')}</div>

  <div class="parties">
    <div class="bloc">
      <label>Émetteur</label>
      <div class="n">${escapeHtml(c.nom)}</div>
      <div>${escapeHtml(c.adresse)}</div>
      <div>ICE ${escapeHtml(c.ice)} · RC ${escapeHtml(c.rc)}</div>
      <div>${escapeHtml(c.email)} · ${escapeHtml(c.mobile)}</div>
    </div>
    <div class="bloc">
      <label>Client</label>
      <div class="n">${escapeHtml(client?.nom ?? '—')}</div>
      ${clientLignes.map((l) => `<div>${escapeHtml(String(l))}</div>`).join('')}
      <div style="margin-top:4px">${dateLabel} : ${formatDate(dateVal)}</div>
    </div>
  </div>

  <table class="items">
    <thead><tr>
      <th class="num" style="width:34px">N°</th>
      <th>Désignation</th>
      <th class="center" style="width:54px">Unité</th>
      <th class="num" style="width:50px">Qté</th>
      <th class="num" style="width:110px">P.U. HT</th>
      <th class="num" style="width:120px">Total HT</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totaux">
    ${remisePct > 0 ? `<tr><td class="lbl">Total brut HT</td><td class="num">${eur(brut)}</td></tr>
    <tr><td class="lbl">Remise (${remisePct} %)</td><td class="num">− ${eur(remise)}</td></tr>` : ''}
    <tr><td class="lbl">Total HT</td><td class="num">${eur(htFinal)}</td></tr>
    <tr><td class="lbl">TVA (${doc.tauxTVA} %)</td><td class="num">${eur(tva)}</td></tr>
    <tr class="ttc"><td>Total TTC</td><td class="num">${eur(ttc)}</td></tr>
  </table>

  ${doc.notes ? `<div class="notes">${escapeHtml(doc.notes)}</div>` : ''}

  <div class="foot">${escapeHtml(foot.legal)}<br>${escapeHtml(foot.contact)}</div>
</body></html>`;
}

export function printHtml(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const cw = iframe.contentWindow;
  if (!cw) return;
  cw.document.open();
  cw.document.write(html);
  cw.document.close();

  const trigger = () => {
    cw.focus();
    cw.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  // Laisse le temps au rendu (polices/styles) avant l'impression.
  setTimeout(trigger, 250);
}

export function exportDevisPdf(devis: Devis, client?: Client) {
  printHtml(buildHtml('devis', devis, client));
}

export function exportFacturePdf(facture: Facture, client?: Client) {
  printHtml(buildHtml('facture', facture, client));
}

/** Courrier de relance imprimable à partir d'un texte pré-rempli. */
export function exportRelancePdf(reference: string, client: Client | undefined, texte: string) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Relance ${escapeHtml(reference)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e2a30; margin: 0; padding: 48px 56px; font-size: 13px; line-height: 1.7; }
  .head { display: flex; justify-content: space-between; border-bottom: 3px solid #14b8a6; padding-bottom: 18px; margin-bottom: 26px; }
  .logo { width: 44px; height: 44px; border-radius: 10px; background: #14b8a6; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 20px; }
  .brand b { font-size: 18px; letter-spacing: 1px; }
  .brand small { color: #64757e; display: block; }
  .dest { text-align: right; color: #1e2a30; }
  .body { white-space: pre-wrap; }
  @media print { body { padding: 24px; } }
</style></head><body>
  <div class="head">
    <div style="display:flex;gap:12px;align-items:center">
      <div class="logo">S</div>
      <div class="brand"><b>STRUCTURALIA</b><small>Bureau d'études techniques</small></div>
    </div>
    <div class="dest">
      <strong>${escapeHtml(client?.nom ?? '')}</strong><br>
      ${escapeHtml(client?.ville ?? '')}<br>
      Le ${formatDate(new Date().toISOString())}
    </div>
  </div>
  <div class="body">${escapeHtml(texte)}</div>
</body></html>`;
  printHtml(html);
}
