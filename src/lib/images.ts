/**
 * Traitement d'images côté client : redimensionnement + compression JPEG
 * avant stockage (évite de saturer le localStorage en mode démo ; en mode
 * backend, les fichiers partiront sur S3 via Amplify Storage).
 */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface ResizedImage {
  dataUrl: string;
  width: number;
  height: number;
  size: number; // octets approximatifs
}

/** Redimensionne (côté le plus long ≤ maxDim) et compresse en JPEG. */
export async function resizeImage(file: File, maxDim = 1280, quality = 0.72): Promise<ResizedImage> {
  const img = await loadImage(file);
  let { width, height } = img;
  const longest = Math.max(width, height);
  if (longest > maxDim) {
    const scale = maxDim / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  // Taille approximative des données base64 (3/4 de la longueur).
  const size = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
  return { dataUrl, width, height, size };
}

export function isImageFile(file: File): boolean {
  return /^image\//.test(file.type) || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name);
}
