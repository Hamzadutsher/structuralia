import { useEffect, useState } from 'react';
import { CATALOG } from '@/lib/catalog';
import { useData } from '@/lib/store';
import type { LigneDevis } from '@/lib/types';
import { eur } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';

interface Row extends LigneDevis {
  section: string;
  _sel: boolean;
}

/**
 * Sélecteur de prestations prédéfinies (catalogue STRUCTURALIA).
 * L'utilisateur coche les prestations voulues, ajuste quantités/prix, et les
 * ajoute au devis ou à la facture en cours.
 */
export function CatalogPicker({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (lignes: LigneDevis[]) => void;
}) {
  const data = useData();
  const [rows, setRows] = useState<Row[]>([]);

  // (Re)construit la liste à l'ouverture, depuis le catalogue géré (ou statique en secours).
  useEffect(() => {
    if (!open) return;
    const source = data.prestations.filter((p) => p.actif);
    const built: Row[] = source.length
      ? source.map((p) => ({ section: p.section, designation: p.designation, unite: p.unite, quantite: 1, prixUnitaire: p.prixUnitaire, _sel: true }))
      : CATALOG.map((c) => ({ ...c, _sel: true }));
    setRows(built);
  }, [open, data.prestations]);

  const sections = [...new Set(rows.map((r) => r.section))];
  const selected = rows.filter((r) => r._sel);
  const totalHT = selected.reduce((s, r) => s + (r.quantite || 0) * (r.prixUnitaire || 0), 0);

  const update = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const toggleSection = (sec: string, val: boolean) =>
    setRows(rows.map((r) => (r.section === sec ? { ...r, _sel: val } : r)));

  const add = () => {
    onAdd(selected.map(({ _sel, section, designation, unite, quantite, prixUnitaire }) => {
      void _sel;
      return { section, designation, unite, quantite, prixUnitaire };
    }));
    onClose();
  };

  return (
    <Modal
      open={open}
      large
      elevated
      title="Prestations prédéfinies (catalogue BET)"
      onClose={onClose}
      footer={
        <>
          <div style={{ marginRight: 'auto', fontSize: 13 }}>
            <span className="cell-sub">{selected.length} prestation(s) · Total HT </span>
            <b style={{ color: 'var(--primary-700)' }}>{eur(totalHT)}</b>
          </div>
          <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn--primary" onClick={add} disabled={selected.length === 0}>
            <Icon name="plus" size={16} /> Ajouter la sélection
          </button>
        </>
      }
    >
      <div className="table-wrap">
        <table className="data lignes-table">
          <thead>
            <tr>
              <th style={{ width: 34 }}></th>
              <th>Désignation</th>
              <th style={{ width: 56 }}>Unité</th>
              <th style={{ width: 70 }}>Qté</th>
              <th style={{ width: 120 }}>P.U. HT</th>
              <th style={{ width: 120 }}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((sec) => {
              const secRows = rows.filter((r) => r.section === sec);
              const allSel = secRows.every((r) => r._sel);
              return (
                <SectionBlock
                  key={sec}
                  sec={sec}
                  allSel={allSel}
                  onToggleAll={() => toggleSection(sec, !allSel)}
                  rows={rows}
                  update={update}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function SectionBlock({
  sec,
  allSel,
  onToggleAll,
  rows,
  update,
}: {
  sec: string;
  allSel: boolean;
  onToggleAll: () => void;
  rows: Row[];
  update: (i: number, patch: Partial<Row>) => void;
}) {
  return (
    <>
      <tr className="sec-row">
        <td>
          <input type="checkbox" checked={allSel} onChange={onToggleAll} aria-label={`Tout ${sec}`} />
        </td>
        <td colSpan={5} className="sec-label">{sec}</td>
      </tr>
      {rows.map((r, i) =>
        r.section !== sec ? null : (
          <tr key={i} style={{ opacity: r._sel ? 1 : 0.5 }}>
            <td>
              <input type="checkbox" checked={r._sel} onChange={(e) => update(i, { _sel: e.target.checked })} />
            </td>
            <td style={{ fontSize: 12.5 }}>{r.designation}</td>
            <td className="center">{r.unite}</td>
            <td>
              <input className="ligne-input num" type="number" min={0} value={r.quantite} onChange={(e) => update(i, { quantite: Number(e.target.value) })} />
            </td>
            <td>
              <input className="ligne-input num" type="number" min={0} value={r.prixUnitaire} onChange={(e) => update(i, { prixUnitaire: Number(e.target.value) })} />
            </td>
            <td className="cell-strong">{eur((r.quantite || 0) * (r.prixUnitaire || 0))}</td>
          </tr>
        ),
      )}
    </>
  );
}
