/** Fonctions de formatage (devise, dates, libellés). */

/** Devise : dirham marocain (MAD). */
export const DEVISE = 'MAD';

const nfMontant = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formate un montant en dirhams (MAD).
 * Le nom `eur` est conservé pour compatibilité avec le code existant ;
 * l'alias `mad` est disponible pour les nouveaux usages.
 */
export const eur = (n: number | undefined | null): string => `${nfMontant.format(n ?? 0)} ${DEVISE}`;
export const mad = eur;

export const eurShort = (n: number | undefined | null): string => {
  const v = n ?? 0;
  if (Math.abs(v) >= 1000) {
    return `${(v / 1000).toLocaleString('fr-MA', { maximumFractionDigits: 1 })} k ${DEVISE}`;
  }
  return eur(v);
};
export const madShort = eurShort;

export const formatDate = (d?: string | null): string => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const daysUntil = (d?: string | null): number | null => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86_400_000);
};

export const formatBytes = (bytes?: number): string => {
  if (!bytes) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

/** Convertit un enum SNAKE_CASE en libellé lisible. */
export const humanize = (s?: string): string => {
  if (!s) return '—';
  return s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
};
