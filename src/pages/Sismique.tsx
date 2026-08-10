import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import { calculSismique, buildSismiqueSvg, type SismiqueInput, type Niveau } from '@/lib/calc/sismique';
import { exportSismiqueNotePdf } from '@/lib/calc/notePdf';

const DEFAULT: SismiqueInput = {
  A: 0.1,
  S: 1.2,
  D: 2.5,
  I: 1.0,
  K: 2.0,
  T: 0.5,
  niveaux: [
    { nom: 'R+3', W: 900, h: 12 },
    { nom: 'R+2', W: 1000, h: 9 },
    { nom: 'R+1', W: 1000, h: 6 },
    { nom: 'RDC', W: 1100, h: 3 },
  ],
};

export default function Sismique() {
  const data = useData();
  const [inp, setInp] = useState<SismiqueInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculSismique(inp), [inp]);

  const set = <K extends keyof SismiqueInput>(key: K, value: SismiqueInput[K]) =>
    setInp((s) => ({ ...s, [key]: value }));
  const num = <K extends keyof SismiqueInput>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as SismiqueInput[K]);

  const setNiveau = (i: number, field: keyof Niveau, v: string | number) =>
    setInp((s) => ({ ...s, niveaux: s.niveaux.map((n, j) => (j === i ? { ...n, [field]: v } : n)) }));
  const addNiveau = () =>
    setInp((s) => ({ ...s, niveaux: [{ nom: `N${s.niveaux.length + 1}`, W: 1000, h: 0 }, ...s.niveaux] }));
  const removeNiveau = (i: number) =>
    setInp((s) => ({ ...s, niveaux: s.niveaux.length > 1 ? s.niveaux.filter((_, j) => j !== i) : s.niveaux }));

  const projetNom = data.chantiers.find((c) => c.id === projetId)?.nom;
  const exportPdf = () =>
    exportSismiqueNotePdf(inp, res, { repere: repere.trim() || undefined, projet: projetNom });

  return (
    <>
      <PageHead
        title="Sismique — méthode statique équivalente"
        subtitle="RPS 2011 (Maroc) · effort tranchant à la base & distribution"
        actions={
          <button className="btn btn--primary" onClick={exportPdf}>
            <Icon name="download" size={16} /> Note de calcul PDF
          </button>
        }
      />

      <div className="msg msg--warn" style={{ marginBottom: 16 }}>
        <Icon name="alert" size={15} /> Les valeurs des coefficients A (zone), S (site), D, I (priorité) et K
        (comportement) doivent être prises dans les tableaux du RPS 2011 selon la zone, le site et le système
        de contreventement. L'outil applique la formule et la distribution ; il ne fige pas ces valeurs.
      </div>

      <div className="split" style={{ alignItems: 'start' }}>
        {/* ------------------------------------------------ Saisie */}
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="settings" size={18} /> Coefficients RPS 2011
          </div>
          <div className="form-grid">
            <div className="field">
              <label>A — accélération de zone (a/g)</label>
              <input type="number" value={inp.A} onChange={num('A')} min={0} step={0.01} />
            </div>
            <div className="field">
              <label>S — coefficient de site</label>
              <input type="number" value={inp.S} onChange={num('S')} min={0} step={0.1} />
            </div>
            <div className="field">
              <label>D — amplification dynamique</label>
              <input type="number" value={inp.D} onChange={num('D')} min={0} step={0.1} />
            </div>
            <div className="field">
              <label>I — priorité</label>
              <input type="number" value={inp.I} onChange={num('I')} min={0} step={0.1} />
            </div>
            <div className="field">
              <label>K — comportement (ductilité)</label>
              <input type="number" value={inp.K} onChange={num('K')} min={0.1} step={0.1} />
            </div>
            <div className="field">
              <label>T — période (s)</label>
              <input type="number" value={inp.T} onChange={num('T')} min={0} step={0.05} />
            </div>
            <div className="field">
              <label>Repère</label>
              <input type="text" value={repere} onChange={(e) => setRepere(e.target.value)} placeholder="ex. Bloc A" />
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

          <div className="section-title" style={{ marginTop: 18 }}>
            <Icon name="building" size={18} /> Niveaux (du haut vers le bas)
            <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }} onClick={addNiveau}>
              <Icon name="plus" size={14} /> Ajouter
            </button>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Niveau</th>
                  <th>W (kN)</th>
                  <th>h (m)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inp.niveaux.map((nv, i) => (
                  <tr key={i}>
                    <td>
                      <input className="mini-input" style={{ minWidth: 70 }} type="text" value={nv.nom}
                        onChange={(e) => setNiveau(i, 'nom', e.target.value)} />
                    </td>
                    <td>
                      <input className="mini-input" type="number" value={nv.W} step={50} min={0}
                        onChange={(e) => setNiveau(i, 'W', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td>
                      <input className="mini-input" type="number" value={nv.h} step={0.5} min={0}
                        onChange={(e) => setNiveau(i, 'h', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td>
                      <button className="icon-btn" onClick={() => removeNiveau(i)} title="Supprimer">
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------------------------ Résultats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card--pad">
            <div className="section-title">
              <Icon name="trending" size={18} /> Résultat
            </div>
            <div className="result-grid">
              <Res label="Poids total W" value={`${res.Wtot.toFixed(0)} kN`} />
              <Res label="V à la base" value={`${res.Vbase.toFixed(1)} kN`} strong />
              <Res label="Force sommet Ft" value={`${res.Ft.toFixed(1)} kN`} />
              <Res label="V / W" value={`${((res.Vbase / (res.Wtot || 1)) * 100).toFixed(1)} %`} />
            </div>
            <div dangerouslySetInnerHTML={{ __html: buildSismiqueSvg(res, 'app') }} />
          </div>

          <div className="card card--pad">
            <div className="section-title">
              <Icon name="document" size={18} /> Forces & efforts tranchants d'étage
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Niveau</th>
                    <th>W (kN)</th>
                    <th>h (m)</th>
                    <th>W·h</th>
                    <th>Fᵢ (kN)</th>
                    <th>Vᵢ (kN)</th>
                  </tr>
                </thead>
                <tbody>
                  {res.niveaux.map((n, i) => (
                    <tr key={i}>
                      <td className="cell-strong">{n.nom}</td>
                      <td>{n.W.toFixed(0)}</td>
                      <td>{n.h.toFixed(2)}</td>
                      <td>{n.Wh.toFixed(0)}</td>
                      <td className="cell-strong">{n.F.toFixed(1)}</td>
                      <td>{n.V.toFixed(1)}</td>
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
