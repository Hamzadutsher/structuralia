import type { Client, Convention } from './types';
import { printHtml, escapeHtml } from './pdf';
import { eur, formatDate } from './format';
import { COMPANY, COMPANY_LEGAL_FOOTER, COMPANY_CONTACT_FOOTER } from './company';
import { LETTERHEAD_LOGO } from './letterhead';
import { ECHEANCIER_HONORAIRES } from './catalog';

/**
 * Génère le contrat du bureau d'études (convention) au format imprimable,
 * calqué sur le modèle officiel STRUCTURALIA : parties, articles 1 à 10 et
 * échéancier des honoraires.
 */
/** Tableau détaillé des prestations retenues, groupé par mission. */
function renderPrestations(prestations: Convention['prestations']): string {
  if (!prestations || prestations.length === 0) return '';
  let currentSection: string | null = null;
  let n = 0;
  let ht = 0;
  const rows: string[] = [];
  for (const l of prestations) {
    const sec = (l.section ?? '').trim();
    if (sec && sec !== currentSection) {
      currentSection = sec;
      rows.push(`<tr class="sec"><td colspan="5">${escapeHtml(sec)}</td></tr>`);
    }
    n++;
    const total = (l.quantite || 0) * (l.prixUnitaire || 0);
    ht += total;
    rows.push(`<tr>
      <td class="num">${n}</td>
      <td>${escapeHtml(l.designation)}</td>
      <td class="center">${escapeHtml(l.unite ?? '')}</td>
      <td class="num">${l.quantite}</td>
      <td class="num">${eur(total)}</td>
    </tr>`);
  }
  return `
  <h2>Détail des prestations retenues</h2>
  <table class="prest">
    <thead><tr><th style="width:30px">N°</th><th>Désignation</th><th style="width:50px">Unité</th><th style="width:44px">Qté</th><th style="width:120px">Total HT</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
    <tfoot><tr><td colspan="4">Total HT</td><td class="num">${eur(ht)}</td></tr></tfoot>
  </table>`;
}

export function exportConventionPdf(conv: Convention, client?: Client) {
  const montant = conv.montant ?? 0;
  const prestationsTable = renderPrestations(conv.prestations);
  const echeancier = ECHEANCIER_HONORAIRES.map(
    (e) => `<tr>
      <td>${escapeHtml(e.libelle)}</td>
      <td class="num">${e.pourcentage} %</td>
      <td class="num">${eur((montant * e.pourcentage) / 100)}</td>
    </tr>`,
  ).join('');

  const clientDomicile = [client?.adresse, client?.codePostal, client?.ville].filter(Boolean).join(', ');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Contrat BET ${escapeHtml(conv.reference)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e2a30; margin: 0; padding: 40px 46px; font-size: 12px; line-height: 1.55; }
  .band { border-bottom: 3px solid #14b8a6; padding-bottom: 12px; margin-bottom: 18px; }
  .band .co { display: flex; gap: 12px; align-items: center; }
  .logo-img { height: 46px; width: auto; display: block; }
  .band .act { font-size: 9px; color: #64757e; font-weight: 700; margin-top: 3px; }
  h1.t { text-align: center; color: #0f766e; font-size: 16px; margin: 6px 0 2px; letter-spacing: .5px; }
  .projet { text-align: center; font-weight: 700; margin-bottom: 16px; }
  h2 { font-size: 12.5px; color: #0f766e; margin: 16px 0 6px; border-bottom: 1px solid #e4e9ec; padding-bottom: 3px; }
  p { margin: 6px 0; text-align: justify; }
  ul { margin: 6px 0 6px 18px; }
  li { margin-bottom: 3px; }
  .parties { background: #f4f7f9; border-radius: 10px; padding: 12px 16px; margin-bottom: 8px; }
  table.ech { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.ech th { background: #0f766e; color: #fff; text-align: left; padding: 7px 10px; font-size: 10px; text-transform: uppercase; }
  table.ech td { padding: 6px 10px; border-bottom: 1px solid #e4e9ec; }
  table.ech .num { text-align: right; }
  table.ech tfoot td { font-weight: 800; color: #0f766e; border-top: 2px solid #14b8a6; }
  table.prest { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.prest th { background: #0f766e; color: #fff; text-align: left; padding: 6px 9px; font-size: 9.5px; text-transform: uppercase; }
  table.prest td { padding: 5px 9px; border-bottom: 1px solid #e4e9ec; }
  table.prest .num { text-align: right; }
  table.prest .center { text-align: center; }
  table.prest tr.sec td { background: #e6f5f2; color: #0f766e; font-weight: 800; text-transform: uppercase; font-size: 9.5px; }
  table.prest tfoot td { font-weight: 800; color: #0f766e; border-top: 2px solid #14b8a6; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; }
  .sign div { width: 45%; text-align: center; }
  .sign .role { font-weight: 700; margin-bottom: 46px; }
  .sign .line { border-top: 1px solid #93a2ab; padding-top: 4px; color: #64757e; font-size: 10.5px; }
  .foot { margin-top: 26px; text-align: center; color: #93a2ab; font-size: 9.5px; border-top: 1px solid #e4e9ec; padding-top: 10px; line-height: 1.6; }
  @media print { body { padding: 18px 22px; } h2 { page-break-after: avoid; } }
</style></head>
<body>
  <div class="band">
    <div class="co">
      <img class="logo-img" src="${LETTERHEAD_LOGO}" alt="STRUCTURALIA" />
      <div class="act">${escapeHtml(COMPANY.activite.toUpperCase())}</div>
    </div>
  </div>

  <h1 class="t">CONTRAT DU BUREAU D'ÉTUDES TECHNIQUES N° : ${escapeHtml(conv.reference)}</h1>
  <div class="projet">PROJET : ${escapeHtml(conv.objet)}</div>

  <div class="parties">
    <p><b>ENTRE</b> : Le Bureau d'Études Techniques (BET) <b>${escapeHtml(COMPANY.nom)}</b>, faisant élection de domicile au ${escapeHtml(COMPANY.adresse)} (ICE ${escapeHtml(COMPANY.ice)}, RC ${escapeHtml(COMPANY.rc)}).<br><i>D'une part,</i></p>
    <p><b>ET</b> : <b>${escapeHtml(client?.nom ?? '…')}</b>${clientDomicile ? `, faisant élection de domicile à ${escapeHtml(clientDomicile)}` : ''}${client?.siret ? ` (RC/ICE : ${escapeHtml(client.siret)})` : ''}.<br><i>D'autre part.</i></p>
  </div>
  <p style="text-align:center"><b>IL A ÉTÉ ARRÊTÉ ET CONVENU CE QUI SUIT :</b></p>

  <h2>Article 1 : Objet du contrat</h2>
  <p>Le présent contrat a pour objet les études techniques et le suivi des travaux de : <b>${escapeHtml(conv.objet)}</b>.</p>

  <h2>Article 2 : Données de base du projet</h2>
  <p>Le Maître de l'Ouvrage, le Maître d'Œuvre et l'entreprise remettent au BET, préalablement, les documents et renseignements nécessaires à l'accomplissement de sa mission, et notamment : les plans architecturaux et de repérage des lots techniques, les études de sol établies par un laboratoire, et tout autre document présentant un intérêt pour la mission du BET.</p>

  <h2>Article 3 : Engagement</h2>
  <p>Le BET devra accomplir sa mission selon les règles de l'Art et s'engage à observer, outre les prescriptions du code des devoirs professionnels de l'ingénierie, les directives et instructions du Maître d'Ouvrage relatives aux programmes, aux délais, à l'ordre d'urgence des travaux et aux modalités d'exécution de chacune des missions prévues au présent contrat.</p>

  <h2>Article 4 : Missions du BET</h2>
  <ul>
    <li>Réalisation des études techniques tous corps d'état de la construction.</li>
    <li>Suivi et contrôle de la bonne exécution des travaux tous corps d'état.</li>
  </ul>

  <h2>Article 5 : Description des éléments de missions</h2>
  <p><b>A. En phase d'étude</b> — Projet d'exécution des ouvrages (PEO) comprenant l'ensemble des plans d'exécution accompagnés de leurs nomenclatures et instructions techniques :</p>
  <ul>
    <li><b>Structure BA</b> : plans de coffrage et de ferraillage, plans de détails, détail d'étanchéité.</li>
    <li><b>Électricité basse tension (CFO)</b> : plan de repérage, note de calcul et bilan de puissance, étude des courants forts, éclairage et prise force, schémas unifilaires détaillés.</li>
    <li><b>Plomberie sanitaire</b> : note de calcul des débits, schémas et plans d'implantation des équipements.</li>
    <li><b>Ferronnerie · menuiserie métallique · aluminium</b> : notes de calcul et plans de détails éventuels.</li>
    <li><b>Climatisation centralisée (HVAC)</b> : plans de détails des gaines et d'installation des équipements.</li>
    <li><b>CFA</b> : plan général de câblage et plan synoptique de l'installation.</li>
  </ul>
  <p><b>B. En phase travaux</b> — Suivi des travaux : vérification de la conformité aux pièces contractuelles, participation à la réception des fonds de fouille, contrôle du ferraillage et délivrance du bon à couler des principales structures, contrôle des travaux d'électricité et de plomberie. Le BET dispose d'un délai de 15 jours pour formuler son accord ou ses observations sur les documents reçus.</p>

  <h2>Article 6 : Rémunération du BET</h2>
  <p>Le BET est rémunéré exclusivement par l'entreprise contractante, sous forme d'honoraires. Le montant forfaitaire arrêté est de <b>${eur(montant)} HT</b>, réparti comme suit :</p>
  <table class="ech">
    <thead><tr><th>Élément de mission</th><th class="num">%</th><th class="num">Montant HT</th></tr></thead>
    <tbody>${echeancier}</tbody>
    <tfoot><tr><td>Total</td><td class="num">100 %</td><td class="num">${eur(montant)}</td></tr></tfoot>
  </table>
  <p><i>N.B. : la phase Suivi des Travaux (honoraires) est payée au fur et à mesure de l'avancement des travaux. Les états d'honoraires sont établis à chaque étape accomplie, sous forme cumulative.</i></p>
  ${prestationsTable}

  <h2>Article 7 : Délais d'établissement et d'approbation des documents</h2>
  <p>Le BET fournit ses prestations dans les délais fixés d'un commun accord avec le Maître d'Ouvrage et le Maître d'Œuvre. Le délai de suivi des travaux est étalé sur le délai d'exécution des travaux. Le Maître de l'Ouvrage dispose d'un délai de quatre semaines pour approuver les documents soumis.</p>

  <h2>Article 8 : Modifications apportées dans le programme</h2>
  <p>En cas de modification, de diminution ou d'augmentation des constructions prévues, le BET devra s'y conformer après approbation préalable du Maître de l'Ouvrage. Toute modification du plan de l'architecte nécessitant un redimensionnement de la structure fera l'objet d'une plus-value aux honoraires, en fonction de la complexité.</p>

  <h2>Article 9 : Litiges</h2>
  <p>Toute contestation sera portée devant les tribunaux de la ville du lieu de la direction du Maître de l'Ouvrage.</p>

  <h2>Article 10 : Entrée en vigueur du contrat</h2>
  <p>Le présent contrat entrera en vigueur dès sa signature par les deux parties contractantes.</p>
  <p style="text-align:center; margin-top:14px">Fait à Casablanca, le ${formatDate(conv.dateDebut ?? conv.createdAt)}. — <i>Lu et approuvé.</i></p>

  <div class="sign">
    <div><div class="role">Le Bureau d'Études</div><div class="line">${escapeHtml(COMPANY.nom)}</div></div>
    <div><div class="role">Le Client</div><div class="line">${escapeHtml(client?.nom ?? '')}</div></div>
  </div>

  <div class="foot">${escapeHtml(COMPANY_LEGAL_FOOTER)}<br>${escapeHtml(COMPANY_CONTACT_FOOTER)}</div>
</body></html>`;

  printHtml(html);
}
