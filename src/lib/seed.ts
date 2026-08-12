import type { AppData } from './types';
import { CATALOG } from './catalog';

/**
 * Données initiales de l'application : **projet vierge**.
 *
 * Aucune donnée fictive (clients, chantiers, devis, factures, conventions,
 * documents, tâches, PV, membres restent vides). Seul le **catalogue de
 * prestations** — référence réelle du bureau d'études — est pré-chargé, prêt à
 * alimenter devis, factures et conventions.
 */
export function seedData(): AppData {
  const now = '2026-08-01T09:00:00.000Z';
  const mk = (id: string) => ({ id, createdAt: now, updatedAt: now });

  return {
    clients: [],
    conventions: [],
    devis: [],
    factures: [],
    documents: [],
    chantiers: [],
    taches: [],
    membres: [],
    pvs: [],
    prestations: CATALOG.map((c, i) => ({
      ...mk(`pr${i + 1}`),
      section: c.section,
      designation: c.designation,
      unite: c.unite,
      prixUnitaire: c.prixUnitaire,
      actif: true,
    })),
  };
}
