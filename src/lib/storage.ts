import type { Document } from './types';
import { isBackendConfigured } from './amplify';

/**
 * Abstraction du stockage de fichiers.
 *
 * - **Backend déployé** : upload/téléchargement réels via Amazon S3
 *   (Amplify Storage). Le chemin S3 est conservé dans `document.storageKey`.
 * - **Mode démo** : les petits fichiers (≤ 1,5 Mo) sont encodés en data URL et
 *   stockés localement pour permettre un vrai téléchargement ; les fichiers plus
 *   volumineux ne conservent que leurs métadonnées.
 */

const DEMO_MAX_INLINE = 1_500_000;

export interface UploadResult {
  storageKey?: string;
  dataUrl?: string;
  taille: number;
  type: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const type = file.name.split('.').pop()?.toLowerCase() || 'bin';

  if (isBackendConfigured) {
    const { uploadData } = await import('aws-amplify/storage');
    const storageKey = `documents/${Date.now()}-${file.name}`;
    await uploadData({ path: storageKey, data: file }).result;
    return { storageKey, taille: file.size, type };
  }

  // Mode démo
  if (file.size <= DEMO_MAX_INLINE) {
    const dataUrl = await fileToDataUrl(file);
    return { dataUrl, taille: file.size, type };
  }
  return { taille: file.size, type };
}

/** Résout une URL téléchargeable pour un document (ou null si indisponible). */
export async function resolveDownloadUrl(doc: Document): Promise<string | null> {
  if (isBackendConfigured && doc.storageKey) {
    const { getUrl } = await import('aws-amplify/storage');
    const res = await getUrl({ path: doc.storageKey });
    return res.url.toString();
  }
  return doc.dataUrl ?? null;
}

/** Déclenche le téléchargement d'un document dans le navigateur. */
export async function downloadDocument(doc: Document): Promise<boolean> {
  const url = await resolveDownloadUrl(doc);
  if (!url) return false;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.titre}.${doc.type ?? 'bin'}`;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
