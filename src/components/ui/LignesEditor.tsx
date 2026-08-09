import type { LigneDevis } from '@/lib/types';
import { eur } from '@/lib/format';
import { Icon } from './Icon';

/**
 * Éditeur de lignes de prestation (devis / factures).
 * Calcule et affiche les totaux HT / TVA / TTC en temps réel.
 */
export function LignesEditor({
  value,
  onChange,
  tauxTVA,
}: {
  value: LigneDevis[];
  onChange: (lignes: LigneDevis[]) => void;
  tauxTVA: number;
}) {
  const lignes = value ?? [];
  const ht = lignes.reduce((s, l) => s + (l.quantite || 0) * (l.prixUnitaire || 0), 0);
  const tva = ht * (tauxTVA / 100);

  const update = (i: number, patch: Partial<LigneDevis>) =>
    onChange(lignes.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const add = () => onChange([...lignes, { designation: '', quantite: 1, prixUnitaire: 0 }]);
  const remove = (i: number) => onChange(lignes.filter((_, idx) => idx !== i));

  return (
    <div className="lignes">
      <div className="table-wrap">
        <table className="data lignes-table">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Mission</th>
              <th>Désignation</th>
              <th style={{ width: 60 }}>Unité</th>
              <th style={{ width: 70 }}>Qté</th>
              <th style={{ width: 110 }}>P.U. HT</th>
              <th style={{ width: 110 }}>Total HT</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr>
                <td colSpan={7} className="cell-sub" style={{ textAlign: 'center', padding: 16 }}>
                  Aucune ligne — ajoutez une prestation ou chargez le modèle BET.
                </td>
              </tr>
            )}
            {lignes.map((l, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="ligne-input"
                    value={l.section ?? ''}
                    placeholder="Mission…"
                    onChange={(e) => update(i, { section: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="ligne-input"
                    value={l.designation}
                    placeholder="Prestation…"
                    onChange={(e) => update(i, { designation: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="ligne-input"
                    value={l.unite ?? ''}
                    placeholder="U"
                    onChange={(e) => update(i, { unite: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="ligne-input num"
                    type="number"
                    min={0}
                    value={l.quantite}
                    onChange={(e) => update(i, { quantite: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="ligne-input num"
                    type="number"
                    min={0}
                    value={l.prixUnitaire}
                    onChange={(e) => update(i, { prixUnitaire: Number(e.target.value) })}
                  />
                </td>
                <td className="cell-strong">{eur((l.quantite || 0) * (l.prixUnitaire || 0))}</td>
                <td>
                  <button className="icon-btn danger" onClick={() => remove(i)} aria-label="Retirer la ligne" type="button">
                    <Icon name="trash" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12, gap: 16, flexWrap: 'wrap' }}>
        <button className="btn btn--ghost btn--sm" onClick={add} type="button">
          <Icon name="plus" size={14} /> Ajouter une ligne
        </button>
        <table className="totaux-mini">
          <tbody>
            <tr>
              <td>Total HT</td>
              <td className="num">{eur(ht)}</td>
            </tr>
            <tr>
              <td>TVA ({tauxTVA} %)</td>
              <td className="num">{eur(tva)}</td>
            </tr>
            <tr className="ttc">
              <td>Total TTC</td>
              <td className="num">{eur(ht + tva)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Somme HT des lignes. */
export function totalHT(lignes: LigneDevis[]): number {
  return (lignes ?? []).reduce((s, l) => s + (l.quantite || 0) * (l.prixUnitaire || 0), 0);
}
