import { Fragment } from 'react';
import type { LigneDevis } from '@/lib/types';
import { eur } from '@/lib/format';
import { Icon } from './Icon';

/**
 * Éditeur de lignes de prestation (devis / factures).
 * Les lignes sont regroupées par mission (section) — comme sur le devis officiel —
 * afin de laisser toute la place à la désignation. Totaux HT / TVA / TTC en direct.
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
  const ht = totalHT(lignes);
  const tva = ht * (tauxTVA / 100);

  const update = (i: number, patch: Partial<LigneDevis>) =>
    onChange(lignes.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(lignes.filter((_, idx) => idx !== i));
  const addLine = (section: string) =>
    onChange([...lignes, { section, designation: '', unite: 'U', quantite: 1, prixUnitaire: 0 }]);
  const renameSection = (oldSec: string, newSec: string) =>
    onChange(lignes.map((l) => ((l.section ?? '') === oldSec ? { ...l, section: newSec } : l)));

  // Sections uniques dans l'ordre d'apparition.
  const sections: string[] = [];
  lignes.forEach((l) => {
    const s = l.section ?? '';
    if (!sections.includes(s)) sections.push(s);
  });

  return (
    <div className="lignes">
      <div className="table-wrap">
        <table className="data lignes-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th style={{ width: 60 }}>Unité</th>
              <th style={{ width: 90 }}>Qté</th>
              <th style={{ width: 130 }}>P.U. HT</th>
              <th style={{ width: 130 }}>Total HT</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr>
                <td colSpan={6} className="cell-sub" style={{ textAlign: 'center', padding: 16 }}>
                  Aucune ligne — ajoutez une prestation ou chargez le modèle BET.
                </td>
              </tr>
            )}
            {sections.map((sec) => {
              const items = lignes.map((l, i) => ({ l, i })).filter((x) => (x.l.section ?? '') === sec);
              return (
                <Fragment key={sec || '__none__'}>
                  <tr className="lignes-sec">
                    <td colSpan={5}>
                      <input
                        className="lignes-sec__input"
                        value={sec}
                        placeholder="Mission (optionnel)…"
                        onChange={(e) => renameSection(sec, e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="icon-btn"
                        title="Ajouter une ligne à cette mission"
                        type="button"
                        onClick={() => addLine(sec)}
                      >
                        <Icon name="plus" size={14} />
                      </button>
                    </td>
                  </tr>
                  {items.map(({ l, i }) => (
                    <tr key={i}>
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
                          className="ligne-input center"
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
                      <td className="cell-strong num">{eur((l.quantite || 0) * (l.prixUnitaire || 0))}</td>
                      <td>
                        <button className="icon-btn danger" onClick={() => remove(i)} aria-label="Retirer la ligne" type="button">
                          <Icon name="trash" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => addLine('')} type="button">
            <Icon name="plus" size={14} /> Ajouter une ligne
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => addLine('NOUVELLE MISSION')} type="button">
            <Icon name="plus" size={14} /> Ajouter une mission
          </button>
        </div>
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
