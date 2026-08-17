import { useSyncExternalStore } from 'react';
import { COMPANY } from './company';
import { LETTERHEAD_LOGO } from './letterhead';

/**
 * Paramètres de l'entreprise, éditables dans l'application et propagés à tous
 * les documents générés (devis, factures, conventions, PV). Persistés en
 * localStorage ; valeurs par défaut issues de l'identité officielle STRUCTURALIA.
 */

export interface CompanyInfo {
  nom: string;
  activite: string;
  specialites: string;
  adresse: string;
  ice: string;
  rc: string;
  ifisc: string;
  email: string;
  fixe: string;
  mobile: string;
}

export interface AppSettings {
  company: CompanyInfo;
  tvaDefaut: number;
  baremeKm: number;
  letterheadLogo: string;
}

const KEY = 'structuralia:settings';

const DEFAULTS: AppSettings = {
  company: {
    nom: COMPANY.nom,
    activite: COMPANY.activite,
    specialites: COMPANY.specialites,
    adresse: COMPANY.adresse,
    ice: COMPANY.ice,
    rc: COMPANY.rc,
    ifisc: COMPANY.if,
    email: COMPANY.email,
    fixe: COMPANY.fixe,
    mobile: COMPANY.mobile,
  },
  tvaDefaut: 20,
  baremeKm: 2.5,
  letterheadLogo: LETTERHEAD_LOGO,
};

const listeners = new Set<() => void>();
let settings: AppSettings = load();

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        ...DEFAULTS,
        ...parsed,
        company: { ...DEFAULTS.company, ...(parsed.company ?? {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS, company: { ...DEFAULTS.company } };
}

export function getSettings(): AppSettings {
  return settings;
}

export function saveSettings(next: AppSettings): void {
  settings = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota : garde en mémoire */
  }
  listeners.forEach((l) => l());
}

export function resetSettings(): void {
  saveSettings({ ...DEFAULTS, company: { ...DEFAULTS.company } });
}

/** Pieds de page réglementaires calculés à partir des paramètres. */
export function companyFooters(): { legal: string; contact: string } {
  const c = settings.company;
  return {
    legal: `Siège : ${c.adresse} · ICE ${c.ice} · RC ${c.rc} · IF ${c.ifisc}`,
    contact: `Email : ${c.email} · Fixe : ${c.fixe} · Mobile : ${c.mobile}`,
  };
}

export function useSettings(): AppSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
    () => settings,
  );
}
