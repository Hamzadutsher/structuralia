import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import { calculDescente, type DescenteInput, type NiveauDC } from '@/lib/calc/descente';
import { exportDescenteNotePdf } from '@/lib/calc/notePdf';

const DEFAULT: DescenteInput = {
  niveaux: [
    { nom: 'Terrasse', S: 20, G: 6.5, Q: 1.0, pp: 8 },
    { nom: 'Étage 2', S: 20, G: 5.5, Q: 1.5, pp: 10 },
    { nom: 'Étage 1', S: 20, G: 5.5, Q: 1.5, pp: 10 },
    { nom: 'RDC', S: 20, G: 5.5, Q: 2.5, pp: 12 },
  ],
};

export default function Descente() {
  const data = useData();
  const [inp, setInp] = useState<DescenteInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculDescente(inp), [inp]);

  const setN = (i: number, field: keyof NiveauDC, v: string | number) =>
    setInp((s) => ({ ...s, niveaux: s.niveaux.map((n, j) => (j === i ? { ...n, [field]: v } : n)) }));
  const addN = () =>
    setInp((s) => ({ ...s, niveaux: [{ nom: `N${s.niveaux.length + 1}`, S: 20, G: 5.5, Q: 1.5, pp: 10 }, ...s.niveaux] }));
  const removeN = (i: number) =>
    setInp((s) => ({ ...s, niveaux: s.niveaux.length > 1 ? s.niveaux.filter((_, j) => j !== i) : s.niveaux }));

  const projetNom = data.chantiers.find((c) => c.id === projetId)?.nom;
  const exportPdf = () =>
    exportDescenteNotePdf(inp, res, { repere: repere.trim() || undefined, projet: projetNom });

  return (
    <>
      <PageHead
        title="Descente de charges — poteau"
        subtitle="Cumul des charges par niveau → Nu / Nser en pied"
        actions={
          <button className="btn btn--primary" onClick={exportPdf}>
            <Icon name="download" size={16} /> Note de calcul PDF
          </button>
        }
      />

      <div className="split" style={{ alignItems: 'start' }}>
        {/* Saisie */}
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="building" size={18} /> Niveaux (du haut vers le bas)
            <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }} onClick={addN}>
              <Icon name="plus" size={14} /> Ajouter
            </button>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Niveau</th>
                  <th>S (m²)</th>
                  <th>G (kN/m²)</th>
                  <th>Q (kN/m²)</th>
                  <th>PP (kN)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inp.niveaux.map((n, i) => (
                  <tr key={i}>
                    <td>
                      <input className="mini-input" style={{ minWidth: 84 }} type="text" value={n.nom}
                        onChange={(e) => setN(i, 'nom', e.target.value)} />
                    </td>
                    <td><input className="mini-input" type="number" value={n.S} step={1} min={0}
                      onChange={(e) => setN(i, 'S', parseFloat(e.target.value) || 0)} /></td>
                    <td><input className="mini-input" type="number" value={n.G} step={0.5} min={0}
                      onChange={(e) => setN(i, 'G', parseFloat(e.target.value) || 0)} /></td>
                    <td><input className="mini-input" type="number" value={n.Q} step={0.5} min={0}
                      onChange={(e) => setN(i, 'Q', parseFloat(e.target.value) || 0)} /></td>
                    <td><input className="mini-input" type="number" value={n.pp} step={1} min={0}
                      onChange={(e) => setN(i, 'pp', parseFloat(e.target.value) || 0)} /></td>
                    <td>
                      <button className="icon-btn" onClick={() => removeN(i)} title="Supprimer">
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Repère</label>
              <input type="text" value={repere} onChange={(e) => setRepere(e.target.value)} placeholder="ex. File B2" />
            </div>
            <div className="field">
              <label>Projet</label>
              <select className="select" value={projetId} onChange={(e) => setProjetId(e.target.value)}>
                <option value="">— Aucun —</option>
                {data.chantiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="cell-sub" style={{ marginTop: 10 }}>
            PP = poids propre local ajouté au niveau (poteau + retombées de poutres…). La dégression des charges
            d'exploitation (NF P06-001) n'est pas appliquée automatiquement.
          </p>
        </div>

        {/* Résultats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card--pad">
            <div className="section-title">
              <Icon name="trending" size={18} /> Charges en pied
            </div>
            <div className="result-grid">
              <Res label="Nu en pied" value={`${res.NuPied.toFixed(0)} kN`} strong />
              <Res label="Nser en pied" value={`${res.NserPied.toFixed(0)} kN`} strong />
            </div>
            <p className="cell-sub">Ces valeurs alimentent le dimensionnement du poteau et de la semelle.</p>
          </div>

          <div className="card card--pad">
            <div className="section-title">
              <Icon name="document" size={18} /> Cumul par niveau
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Niveau</th>
                    <th>G niv.</th>
                    <th>ΣG</th>
                    <th>ΣQ</th>
                    <th>Nser</th>
                    <th>Nu</th>
                  </tr>
                </thead>
                <tbody>
                  {res.niveaux.map((n, i) => (
                    <tr key={i}>
                      <td className="cell-strong">{n.nom}</td>
                      <td>{n.G.toFixed(0)}</td>
                      <td>{n.Gcum.toFixed(0)}</td>
                      <td>{n.Qcum.toFixed(0)}</td>
                      <td>{n.Nser.toFixed(0)}</td>
                      <td className="cell-strong">{n.Nu.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Res({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="res">
      <div className="res__label">{label}</div>
      <div className={`res__value ${strong ? 'res__value--strong' : ''}`}>{value}</div>
    </div>
  );
}
