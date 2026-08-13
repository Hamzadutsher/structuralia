import type { IconName } from '@/components/ui/Icon';
import type { Permissions } from '@/lib/roles';

export interface NavLink {
  to: string;
  label: string;
  icon: IconName;
  /** Permission requise pour afficher ce lien (sinon toujours visible). */
  perm?: keyof Permissions;
}

/** Sous-groupe repliable à l'intérieur d'une catégorie. */
export interface NavGroup {
  title: string;
  icon: IconName;
  links: NavLink[];
}

/** Catégorie principale du menu. */
export interface NavCategory {
  /** En-tête de section (absent pour le bloc supérieur). */
  title?: string;
  icon?: IconName;
  /** Liens directs de la catégorie. */
  links?: NavLink[];
  /** Sous-catégories repliables. */
  groups?: NavGroup[];
}

/**
 * Architecture centrée sur la gestion des projets :
 * « Gestion des projets » est la catégorie principale (l'objectif),
 * la gestion interne et la gestion externe en sont les sous-catégories.
 */
export const NAV: NavCategory[] = [
  {
    // Bloc supérieur (sans en-tête)
    links: [{ to: '/', label: 'Tableau de bord', icon: 'dashboard' }],
  },
  {
    title: 'Gestion des projets',
    icon: 'chantier',
    links: [{ to: '/chantiers', label: 'Projets', icon: 'chantier' }],
    groups: [
      {
        title: 'Gestion interne',
        icon: 'convention',
        links: [
          { to: '/clients', label: 'Clients', icon: 'clients' },
          { to: '/facturation', label: 'Devis & Factures', icon: 'facture' },
          { to: '/conventions', label: 'Conventions', icon: 'convention' },
          { to: '/documents', label: 'Documentations', icon: 'document' },
          { to: '/catalogue', label: 'Catalogue prestations', icon: 'devis', perm: 'canManageFacturation' },
        ],
      },
      {
        title: 'Gestion externe',
        icon: 'suivi',
        links: [{ to: '/suivi', label: 'Suivi des travaux', icon: 'suivi' }],
      },
    ],
  },
  {
    title: 'Administration',
    links: [
      { to: '/comptabilite', label: 'Comptabilité', icon: 'euro', perm: 'canManageFacturation' },
      { to: '/donnees', label: 'Base de données', icon: 'folder', perm: 'canManageMembers' },
      { to: '/membres', label: 'Membres & rôles', icon: 'settings', perm: 'canManageMembers' },
    ],
  },
];

/** Titre de page affiché dans la topbar, par chemin. */
export const PAGE_TITLES: Record<string, string> = {
  '/': 'Tableau de bord',
  '/clients': 'Clients',
  '/facturation': 'Devis & Factures',
  '/conventions': 'Conventions',
  '/documents': 'Documentations',
  '/catalogue': 'Catalogue de prestations',
  '/chantiers': 'Projets',
  '/suivi': 'Suivi des travaux',
  '/membres': 'Membres & rôles',
  '/comptabilite': 'Comptabilité interne',
  '/donnees': 'Base de données',
  '/calcul': 'Études & calculs',
  '/calcul/poteau': 'Poteau BA — BAEL 91',
  '/calcul/poteau-fc': 'Poteau BA — flexion composée',
  '/calcul/poutre': 'Poutre BA — BAEL 91',
  '/calcul/poutre-continue': 'Poutre continue — Caquot',
  '/calcul/sismique': 'Sismique — RPS 2011',
  '/calcul/descente': 'Descente de charges',
  '/calcul/semelle': 'Semelle isolée — BAEL 91',
  '/calcul/semelle-filante': 'Semelle filante — BAEL 91',
  '/calcul/dalle': 'Dalle pleine — BAEL 91',
  '/calcul/escalier': 'Escalier — BAEL 91',
};
