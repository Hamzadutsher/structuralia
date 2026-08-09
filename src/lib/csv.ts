/** Utilitaires CSV (compatibles Excel français : séparateur point-virgule). */

/** Analyse un CSV en tenant compte des guillemets et des sauts de ligne. */
export function parseCsv(text: string, delimiter = ';'): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Détecte le séparateur ( ; ou , ) d'après la première ligne. */
export function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/)[0] ?? '';
  return first.includes(';') ? ';' : ',';
}

/** Génère un CSV (séparateur point-virgule) à partir d'en-têtes et de lignes. */
export function toCsv(headers: string[], rows: (string | number)[][], delimiter = ';'): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /["\n\r;,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(delimiter)).join('\r\n');
}

/** Déclenche le téléchargement d'un contenu texte (avec BOM UTF-8 pour Excel). */
export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
