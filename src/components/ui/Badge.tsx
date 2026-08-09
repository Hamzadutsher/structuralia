import { humanize } from '@/lib/format';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

/** Mappe un statut métier vers une couleur + libellé lisible. */
const STATUS_TONE: Record<string, Tone> = {
  // Clients
  ACTIF: 'success',
  PROSPECT: 'info',
  INACTIF: 'neutral',
  // Conventions / Devis / Factures
  ACTIVE: 'success',
  BROUILLON: 'neutral',
  EXPIREE: 'danger',
  EXPIRE: 'danger',
  RESILIEE: 'danger',
  ENVOYE: 'info',
  ENVOYEE: 'info',
  ACCEPTE: 'success',
  REFUSE: 'danger',
  PAYEE: 'success',
  PARTIELLE: 'warning',
  EN_RETARD: 'danger',
  ANNULEE: 'neutral',
  // Chantiers
  PLANIFIE: 'info',
  EN_COURS: 'primary',
  SUSPENDU: 'warning',
  TERMINE: 'success',
  ANNULE: 'neutral',
  // Tâches
  A_FAIRE: 'neutral',
  BLOQUE: 'danger',
  // Priorités
  BASSE: 'neutral',
  NORMALE: 'info',
  HAUTE: 'warning',
  CRITIQUE: 'danger',
};

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return <Badge tone="neutral">—</Badge>;
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{humanize(status)}</Badge>;
}
