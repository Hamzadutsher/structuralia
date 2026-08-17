import type { EntityKey } from './types';

/**
 * Journal des modifications (historique) : trace les créations, mises à jour et
 * suppressions. Conservé dans le localStorage (anneau borné) — utile pour le
 * suivi des changements et l'audit interne.
 */

export type JournalAction = 'create' | 'update' | 'delete';
export interface JournalEntry {
  time: string;
  action: JournalAction;
  entity: EntityKey;
  id: string;
  user?: string;
}

const KEY = 'structuralia:journal';
const MAX = 300;

let entries: JournalEntry[] = load();
let currentUser = '';

/** Définit l'utilisateur courant (attribué aux entrées du journal). */
export function setJournalUser(name: string): void {
  currentUser = name;
}

function load(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as JournalEntry[];
  } catch {
    /* ignore */
  }
  return [];
}

export function logChange(action: JournalAction, entity: EntityKey, id: string): void {
  entries = [{ time: new Date().toISOString(), action, entity, id, user: currentUser || undefined }, ...entries].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* quota : on garde en mémoire */
  }
}

export function getJournal(): JournalEntry[] {
  return entries;
}

export function clearJournal(): void {
  entries = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
