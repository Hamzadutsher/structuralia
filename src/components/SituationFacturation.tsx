import { Fragment, useEffect, useState } from 'react';
import type { Devis } from '@/lib/types';
import { eur } from '@/lib/format';
import {
  type SituationMode,
  SITUATION_LABELS,
  calculerSituation,
  sumHT,
} from '@/lib/situation';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';

const MODES: SituationMode[] = ['AVANCEMENT', 'PHASES', 'MONTANT'];

export function SituationFacturation({
  open,
  devis,
  dejaFactureHT,
  chantierAvancement,
  onClose,
  onCreate,
}: {
  open: boolean;
  devis: Devis | null;
  dejaFactureHT: number;
  chantierAvancement?: number;
  onClose: () => void;
  onCreate: (montantHT: number, lignes: Devis['lignes'], libelle: string) => void;
}) {
  const [mode, setMode] = useState<SituationMode>('AVANCEMENT');
  const [pct, setPct] = useState(100);
  const [montant, setMontant] = useState(0);
  const [selection, setSelection] = useState<number[]>([]);

  useEffect(() => {
    if (!open || !devis) return;
    const devisHT = sumHT(devis.lignes);
    setMode('AVANCEMENT');
    setPct(chantierAvancement ?? 100);
    setMontant(Math.max(0, Math.round(devisHT - dejaFactureHT)));
    setSelection([]);
  }, [open, devis, chantierAvancement, dejaFactureHT]);

  if (!open || !devis) return null;

  const devisHT = sumHT(devis.lignes);
  const reste = Math.max(0, devisHT - dejaFactureHT);
  const result = calculerSituation(devis, { mode, pct, montant, selection, dejaFactureHT });
  const tva = result.montantHT * (devis.tauxTVA / 100);
  const ttc = result.montantHT + tva;
  const depasse = result.montantHT > reste + 1;

  const toggleLine = (i: number) =>
    setSelection((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  // Regroupement des lignes du devis par mission (pour le mode Phases).
  const sections: string[] = [];
  devis.lignes.forEach((l) => {
    const s = l.section ?? '';
    if (!sections.includes(s)) sections.push(s);
  });

  return (
    <Modal
      open={open}
      large
      title={`Facturer le devis ${devis.reference}`}
      onClose={onClose}
      footer={
        <>
          <div style={{ marginRight: 'auto', fontSize: 13 }}>
            <span className="cell-sub">Cette facture · HT </span>
            <b style={{ color: 'var(--primary-700)' }}>{eur(result.montantHT)}</b>
            <span className="cell-sub"> · TTC {eur(ttc)}</span>
          </div>
          <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
          <button
            className="btn btn--primary"
            onClick={() => onCreate(result.montantHT, result.lignes, result.libelle)}
            disabled={result.montantHT <= 0}
          >
            <Icon name="facture" size={16} /> Créer la facture
          </button>
        </>
      }
    >
      {/* Contexte */}
      <div className="detail-grid" style={{ marginBottom: 18 }}>
        <div className="detail"><label>Total devis HT</label><div>{eur(devisHT)}</div></div>
        <div className="detail"><label>Déjà facturé HT</label><div>{eur(dejaFactureHT)}</div></div>
        <div className="detail"><label>Reste à facturer HT</label><div style={{ color: 'var(--primary-700)' }}>{eur(reste)}</div></div>
      </div>

      {/* Choix du mode */}
      <div className="tabs" style={{ marginBottom: 18 }}>
        {MODES.map((m) => (
          <button key={m} className={`tab${mode === m ? ' active' : ''}`} onClick={() => setMode(m)} type="button">
            {SITUATION_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Mode : avancement */}
      {mode === 'AVANCEMENT' && (
        <div>
          <div className="field">
            <label>Avancement facturé (cumulé) : {pct}%</label>
            <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {[25, 50, 75, 100].map((v) => (
              <button key={v} type="button" className="btn btn--ghost btn--sm" onClick={() => setPct(v)}>{v}%</button>
            ))}
            {chantierAvancement !== undefined && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPct(chantierAvancement)}>
                <Icon name="chantier" size={13} /> Avancement chantier ({chantierAvancement}%)
              </button>
            )}
          </div>
          <p className="cell-sub" style={{ marginTop: 10 }}>
            Cumul à {pct}% = {eur(devisHT * (pct / 100))} · déjà facturé {eur(dejaFactureHT)} → <b>cette situation = {eur(result.montantHT)} HT</b>.
          </p>
        </div>
      )}

      {/* Mode : phases terminées */}
      {mode === 'PHASES' && (
        <div className="table-wrap">
          <table className="data lignes-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}></th>
                <th>Prestation</th>
                <th style={{ width: 140 }}>Montant HT</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <Fragment key={sec || '__none__'}>
                  {sec && (
                    <tr className="sec-row"><td></td><td colSpan={2} className="sec-label">{sec}</td></tr>
                  )}
                  {devis.lignes.map((l, i) =>
                    (l.section ?? '') !== sec ? null : (
                      <tr key={i} style={{ opacity: selection.includes(i) ? 1 : 0.55 }}>
                        <td><input type="checkbox" checked={selection.includes(i)} onChange={() => toggleLine(i)} /></td>
                        <td style={{ fontSize: 12.5 }}>{l.designation}</td>
                        <td className="cell-strong">{eur((l.quantite || 0) * (l.prixUnitaire || 0))}</td>
                      </tr>
                    ),
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          <p className="cell-sub" style={{ marginTop: 10 }}>
            {selection.length} prestation(s) sélectionnée(s) → <b>{eur(result.montantHT)} HT</b>.
          </p>
        </div>
      )}

      {/* Mode : montant fixé */}
      {mode === 'MONTANT' && (
        <div>
          <div className="field">
            <label>Montant HT à facturer (MAD)</label>
            <input type="number" min={0} value={montant} onChange={(e) => setMontant(Number(e.target.value))} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMontant(Math.round(reste))}>Reste ({eur(reste)})</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMontant(Math.round(reste / 2))}>50% du reste</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMontant(Math.round(devisHT * 0.3))}>Acompte 30%</button>
          </div>
          <p className="cell-sub" style={{ marginTop: 10 }}>
            Les prix des prestations sont répartis pour que leur somme fasse exactement <b>{eur(result.montantHT)} HT</b>.
          </p>
        </div>
      )}

      {depasse && (
        <div className="login-error" style={{ marginTop: 14 }}>
          <Icon name="alert" size={15} /> Cette situation dépasse le reste à facturer ({eur(reste)}).
        </div>
      )}
    </Modal>
  );
}
