import type { AppData } from './types';
import type { IconName } from '@/components/ui/Icon';
import { daysUntil } from './format';

export type NotifTone = 'danger' | 'warning' | 'info';

export interface Notif {
  icon: IconName;
  tone: NotifTone;
  label: string;
  sub: string;
  to: string;
}

const ORDER: Record<NotifTone, number> = { danger: 0, warning: 1, info: 2 };

/** Calcule les alertes actionnables (échéances, retards) à partir des données. */
export function computeNotifications(data: AppData): Notif[] {
  const out: Notif[] = [];

  // Factures non soldées dont l'échéance est dépassée.
  data.factures.forEach((f) => {
    if (f.statut === 'PAYEE' || f.statut === 'ANNULEE') return;
    const reste = (f.montantTTC || 0) - (f.montantPaye || 0);
    const dj = daysUntil(f.dateEcheance);
    if (reste > 0 && dj !== null && dj < 0) {
      out.push({ icon: 'facture', tone: 'danger', label: `Facture ${f.reference} en retard`, sub: `${-dj} j de retard`, to: '/tresorerie' });
    }
  });

  // Tâches en retard ou à échéance proche.
  data.taches.forEach((t) => {
    if (t.statut === 'TERMINE') return;
    const dj = daysUntil(t.dateEcheance);
    if (dj === null) return;
    if (dj < 0) out.push({ icon: 'suivi', tone: 'danger', label: t.titre, sub: `Tâche en retard (${-dj} j)`, to: '/suivi' });
    else if (dj <= 3) out.push({ icon: 'suivi', tone: 'warning', label: t.titre, sub: `Échéance dans ${dj} j`, to: '/suivi' });
  });

  // Conventions expirées ou expirant bientôt.
  data.conventions.forEach((cv) => {
    if (cv.statut === 'RESILIEE' || cv.statut === 'BROUILLON') return;
    const dj = daysUntil(cv.dateFin);
    if (dj === null) return;
    if (dj < 0 && cv.statut !== 'EXPIREE') out.push({ icon: 'convention', tone: 'warning', label: cv.reference, sub: 'Convention expirée', to: '/conventions' });
    else if (dj >= 0 && dj <= 30) out.push({ icon: 'convention', tone: 'info', label: cv.reference, sub: `Expire dans ${dj} j`, to: '/conventions' });
  });

  // Dépenses à payer dont la date est dépassée.
  data.depenses.forEach((d) => {
    if (d.statut !== 'A_PAYER') return;
    const dj = daysUntil(d.date);
    if (dj !== null && dj < 0) out.push({ icon: 'euro', tone: 'warning', label: d.libelle, sub: `Dépense à payer (${-dj} j)`, to: '/comptabilite' });
  });

  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
}
