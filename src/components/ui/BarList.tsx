/**
 * Liste de barres horizontales (comparaison de magnitudes).
 * - Chaque barre porte un libellé texte : l'identité n'est jamais portée par la
 *   couleur seule (important pour les couleurs de statut).
 * - Mono-teinte par défaut (magnitude) ; couleur par élément possible (statut).
 */
export interface BarItem {
  label: string;
  value: number;
  /** Valeur affichée (ex. « 12 480 € ») ; à défaut, la valeur brute. */
  display?: string;
  /** Couleur de la barre (variable CSS) ; à défaut, turquoise. */
  color?: string;
}

export function BarList({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="barlist">
      {items.map((it, i) => (
        <div className="barlist__row" key={i} title={`${it.label} : ${it.display ?? it.value}`}>
          <div className="barlist__label">{it.label}</div>
          <div className="barlist__track">
            <div
              className="barlist__bar"
              style={{
                width: `${Math.max(2, (it.value / max) * 100)}%`,
                background: it.color ?? 'var(--primary-500)',
              }}
            />
          </div>
          <div className="barlist__value">{it.display ?? it.value}</div>
        </div>
      ))}
      {items.length === 0 && <p className="cell-sub">Aucune donnée.</p>}
    </div>
  );
}
