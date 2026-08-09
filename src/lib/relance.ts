import type { Client, Facture } from './types';
import { eur, formatDate, daysUntil } from './format';

/** Construit le texte d'un courrier de relance pour une facture impayée. */
export function buildRelanceText(facture: Facture, client?: Client): string {
  const reste = facture.montantTTC - (facture.montantPaye || 0);
  const dj = daysUntil(facture.dateEcheance);
  const retard = dj !== null && dj < 0 ? -dj : 0;

  const niveau = retard > 30 ? 'deuxième relance' : 'relance';
  const civilite = client?.contactNom ? `${client.contactNom},` : 'Madame, Monsieur,';

  return `Objet : ${niveau.charAt(0).toUpperCase() + niveau.slice(1)} — facture ${facture.reference}

${civilite}

Sauf erreur ou omission de notre part, nous constatons que la facture ${facture.reference}${
    facture.objet ? ` (${facture.objet})` : ''
}, d'un montant de ${eur(facture.montantTTC)} TTC émise le ${formatDate(facture.dateEmission)} et arrivée à échéance le ${formatDate(
    facture.dateEcheance,
  )}, demeure impayée à ce jour${retard ? `, soit un retard de ${retard} jour(s)` : ''}.

Le solde restant dû s'élève à ${eur(reste)}.

Nous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais. Si ce paiement a été effectué entre-temps, nous vous prions de ne pas tenir compte de la présente.

Restant à votre disposition pour tout renseignement, nous vous prions d'agréer, ${civilite.replace(
    ',',
    '',
  )}, l'expression de nos salutations distinguées.

Le service comptabilité
STRUCTURALIA — Bureau d'études techniques`;
}
