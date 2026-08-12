/**
 * Génération de références documentaires structurées :
 *   {TYPE}-{PROJET}-{CLIENT}-{AAMMJJ}-V{n}
 * à partir du type de lot, du projet, du client, de la date et de la version.
 */

export interface LotType {
  code: string;
  label: string;
}

/** Codes de lots / prestations (types de documents). */
export const LOT_TYPES: LotType[] = [
  { code: 'STR', label: 'Structure (béton armé)' },
  { code: 'CM', label: 'Charpente métallique' },
  { code: 'ELEC', label: 'Électricité (CFO)' },
  { code: 'CFA', label: 'Courants faibles (CFA)' },
  { code: 'PLOMB', label: 'Plomberie & évacuations' },
  { code: 'HVAC', label: 'Climatisation / CVC' },
  { code: 'VRD', label: 'Voirie & réseaux divers' },
  { code: 'MEN', label: 'Menuiserie / ferronnerie / aluminium' },
  { code: 'ETU', label: 'Étude / note de calcul' },
  { code: 'RAP', label: 'Rapport / synthèse' },
  { code: 'ADM', label: 'Administratif' },
  { code: 'GEN', label: 'Général' },
];

/** Supprime les accents et caractères non alphanumériques, en majuscules. */
function clean(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Code court d'un client (initiales si plusieurs mots significatifs, sinon le mot). */
export function clientCode(nom: string): string {
  const mots = (nom || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[\s.]+/)
    .filter((w) => w.replace(/[^A-Za-z0-9]/g, '').length > 1);
  if (mots.length >= 2) {
    return mots.map((w) => w[0].toUpperCase()).join('').slice(0, 4);
  }
  return clean(mots[0] ?? nom).slice(0, 8) || 'CLI';
}

/** Code projet à partir de la référence de chantier (ou d'un repli). */
export function projetCode(reference?: string, nom?: string): string {
  const src = reference || nom || '';
  return clean(src).slice(0, 10) || 'PRJ';
}

/** Formate une date ISO/aaaa-mm-jj en AAMMJJ. */
export function dateCode(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '000000';
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${jj}`;
}

export function buildReference(opts: {
  typeCode: string;
  projet?: string;
  client?: string;
  date?: string;
  version?: number;
}): string {
  const parts = [
    opts.typeCode || 'GEN',
    opts.projet ? projetCode(opts.projet) : '',
    opts.client ? clientCode(opts.client) : '',
    dateCode(opts.date),
    `V${Math.max(0, opts.version ?? 0)}`,
  ].filter(Boolean);
  return parts.join('-');
}
