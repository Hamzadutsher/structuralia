import { useSyncExternalStore } from 'react';
import type { AppData, EntityKey } from './types';
import { seedData } from './seed';
import { isBackendConfigured } from './amplify';
import * as backend from './amplifyData';
import { logChange } from './journal';

/**
 * Store applicatif réactif, avec deux implémentations transparentes :
 *
 * - **Mode démo** (aucun backend) : persistance dans `localStorage`, seed initial.
 * - **Mode backend** (Amplify déployé) : les données proviennent d'Amplify Data
 *   (DynamoDB). Les mutations sont appliquées de façon optimiste en local puis
 *   propagées au backend ; un chargement initial (`hydrate`) remplit l'état.
 *
 * L'API (`useData`, `store.create/update/remove`) et les composants restent
 * identiques dans les deux modes.
 */

const STORAGE_KEY = 'structuralia:data:v7';

let state: AppData = load();
const listeners = new Set<() => void>();

function emptyData(): AppData {
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
    prestations: [],
    depenses: [],
  };
}

function load(): AppData {
  if (isBackendConfigured) return emptyData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Fusion avec la structure vide : garantit la présence de toutes les
      // collections même si le blob persisté provient d'une version antérieure.
      return { ...emptyData(), ...(JSON.parse(raw) as Partial<AppData>) };
    }
  } catch {
    /* ignore */
  }
  const seeded = seedData();
  persist(seeded);
  return seeded;
}

function persist(data: AppData) {
  if (isBackendConfigured) return; // pas de persistance locale en mode backend
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode : on garde l'état en mémoire */
  }
}

const AUTOBACKUP_KEY = 'structuralia:autobackup';
let autoTimer: ReturnType<typeof setTimeout> | null = null;

/** Écrit une sauvegarde automatique (débattue) dans le localStorage. */
function scheduleAutoBackup() {
  if (isBackendConfigured) return;
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    try {
      localStorage.setItem(AUTOBACKUP_KEY, JSON.stringify({ time: new Date().toISOString(), data: state }));
    } catch {
      /* quota : ignore */
    }
  }, 2000);
}

export function getAutoBackup(): { time: string; data: AppData } | null {
  try {
    const raw = localStorage.getItem(AUTOBACKUP_KEY);
    if (raw) return JSON.parse(raw) as { time: string; data: AppData };
  } catch {
    /* ignore */
  }
  return null;
}

function emit() {
  state = { ...state };
  persist(state);
  scheduleAutoBackup();
  listeners.forEach((l) => l());
}

function uid(prefix: string): string {
  return `${prefix}_${Math.floor(performance.now() * 1000).toString(36)}${listeners.size}${
    state.clients.length + state.chantiers.length
  }`;
}

function getArr<K extends EntityKey>(key: K): AppData[K][number][] {
  return state[key] as AppData[K][number][];
}

// --- API publique -----------------------------------------------------------

export const store = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  snapshot(): AppData {
    return state;
  },

  create<K extends EntityKey>(
    key: K,
    item: Omit<AppData[K][number], 'id' | 'createdAt' | 'updatedAt'>,
  ): AppData[K][number] {
    const now = new Date().toISOString();
    const tempId = uid(key.slice(0, 3));
    const record = { ...(item as object), id: tempId, createdAt: now, updatedAt: now } as AppData[K][number];
    state[key] = [record, ...getArr(key)] as AppData[K];
    emit();
    logChange('create', key, tempId);

    if (isBackendConfigured) {
      backend
        .createRecord(key, item as Record<string, unknown>)
        .then((saved) => {
          if (!saved) return;
          // Réconcilie l'enregistrement temporaire avec celui du backend (id réel).
          state[key] = getArr(key).map((r) =>
            (r as { id: string }).id === tempId ? (saved as AppData[K][number]) : r,
          ) as AppData[K];
          emit();
        })
        .catch(() => {
          // Échec : on retire l'enregistrement optimiste.
          state[key] = getArr(key).filter((r) => (r as { id: string }).id !== tempId) as AppData[K];
          emit();
        });
    }
    return record;
  },

  update<K extends EntityKey>(key: K, id: string, patch: Partial<AppData[K][number]>) {
    state[key] = getArr(key).map((r) =>
      (r as { id: string }).id === id
        ? ({ ...r, ...patch, updatedAt: new Date().toISOString() } as AppData[K][number])
        : r,
    ) as AppData[K];
    emit();
    logChange('update', key, id);

    if (isBackendConfigured) {
      backend.updateRecord(key, id, patch as Record<string, unknown>).catch(() => {});
    }
  },

  remove<K extends EntityKey>(key: K, id: string) {
    state[key] = getArr(key).filter((r) => (r as { id: string }).id !== id) as AppData[K];
    emit();
    logChange('delete', key, id);

    if (isBackendConfigured) {
      backend.deleteRecord(key, id).catch(() => {});
    }
  },

  reset() {
    if (isBackendConfigured) return; // réservé au mode démo
    state = seedData();
    persist(state);
    listeners.forEach((l) => l());
  },

  /** Vide totalement la base (toutes les collections). */
  clear() {
    state = emptyData();
    persist(state);
    listeners.forEach((l) => l());
  },

  /**
   * Restaure des données (sauvegarde). En mode « replace », remplace tout ;
   * en mode « merge », fusionne par collection avec dédoublonnage par id
   * (les enregistrements importés priment).
   */
  importAll(data: Partial<AppData>, mode: 'replace' | 'merge' = 'replace', collections?: EntityKey[]) {
    const keys = collections ?? (Object.keys(emptyData()) as EntityKey[]);
    const next = { ...state } as Record<string, unknown[]>;
    keys.forEach((k) => {
      const incoming = (data[k] as unknown[]) ?? [];
      if (mode === 'replace') {
        next[k] = incoming;
      } else {
        const current = (state[k] as unknown[]) ?? [];
        const ids = new Set(incoming.map((r) => (r as { id: string }).id));
        next[k] = [...incoming, ...current.filter((r) => !ids.has((r as { id: string }).id))];
      }
    });
    state = next as unknown as AppData;
    persist(state);
    scheduleAutoBackup();
    listeners.forEach((l) => l());
  },
};

/** Chargement initial depuis Amplify Data (mode backend uniquement). */
export async function hydrate(): Promise<void> {
  if (!isBackendConfigured) return;
  const keys = Object.keys(state) as EntityKey[];
  const results = await Promise.all(
    keys.map((k) =>
      backend
        .listAll(k)
        .then((d) => [k, d] as const)
        .catch(() => [k, [] as unknown[]] as const),
    ),
  );
  const next = { ...state } as Record<string, unknown>;
  for (const [k, d] of results) {
    next[k] = d;
  }
  state = next as unknown as AppData;
  listeners.forEach((l) => l());
}

// Déclenche le chargement backend au démarrage.
if (isBackendConfigured) {
  void hydrate();
}

/** Hook React : renvoie l'ensemble des données, réactif aux mutations. */
export function useData(): AppData {
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}
