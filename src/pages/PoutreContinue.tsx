import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import {
  calculPoutreContinue,
  elevationPoutreContinue,
  type PoutreContinueInput,
  type Trav8e,
} from '@/lib/calc/poutreContinue';
import { buildPoutreElevationSvg } from '@/lib/calc/coupe';
import { exportPoutreContinueNotePdf } from '@/lib/calc/notePdf';
import { buildPoutreElevationDxf, downloadDxf } from '@/lib/calc/dxf';

const DEFAULT: PoutreContinueInput = {
  travees: [
    { L: 4.5, g: 20, q: 10 },
    { L: 5.0, g: 20, q: 10 },
    { L: 4.0, g: 20, q: 10 },
  ],
  b: 25,
  h: 50,
  enrob: 3,
  fc28: 25,
  fe: 500,
  gammaB: 1.5,
  gammaS: 1.15,
  phiL: 16,
  phiT: 8,
};

export default function PoutreContinue() {
  const data = useData();
  const [inp, setInp] = useState<PoutreContinueInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculPoutreContinue(inp), [inp]);

  const set = <K extends keyof PoutreContinueInput>(key: K, value: PoutreContinueInput[K]) =>
    setInp((s) => ({ ...s, [key]: value }));
  const numField = <K extends keyof PoutreContinueInput>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as PoutreContinueInput[K]);

  const setTravee = (i: number, field: keyof Trav8e, v: number) =>
    setInp((s) => ({ ...s, travees: s.travees.map((t, j) => (j === i ? { ...t, [field]: v } : t)) }));
  const addTravee = () =>
    setInp((s) => ({ ...s, travees: [...s.travees, { L: 4, g: 20, q: 10 }] }));
  const removeTravee = (i: number) =>
    setInp((s) => ({ ...s, travees: s.travees.length > 1 ? s.travees.filter((_, j) => j !== i) : s.travees }));

  const draw = elevationPoutreContinue(inp, res);
  const projetNom = data.chantiers.find((c) => c.id === projetId)?.nom;
  const nomFichier = `PoutreContinue_${(repere.trim() || 'element').replace(/[^\w-]+/g, '_')}`;

  const exportPdf = () =>
    exportPoutreContinueNotePdf(inp, res, { repere: repere.trim() || undefined, projet: projetNom });
  const exportDxf = () =>
    downloadDxf(nomFichier, buildPoutreElevationDxf(draw, { titre: `POUTRE ${repere.trim() || ''}`.trim() }));

  return (
    <>
      <PageHead
        title="Poutre continue — méthode de Caquot"
        subtitle="Enveloppes de moments & efforts tranchants · BAEL 91 rév. 99"
        actions={
          <>
            <button className="btn btn--ghost" onClick={exportDxf}>
              <Icon name="download" size={16} /> Élévation DXF
            </button>
            <button className="btn btn--primary" onClick={exportPdf}>
              <Icon name="download" size={16} /> Note de calcul PDF
            </button>
          </>
        }
      />

      {/* Élévation pleine largeur */}
      <div className="card card--pad" style={{ marginBottom: 20 }}>
        <div className="section-title">
          <Icon name="building" size={18} /> Élévation de ferraillage
        </div>
        <div dangerouslySetInnerHTML={{ __html: buildPoutreElevationSvg(draw, 'app') }} />
      </div>

      <div className="split" style={{ alignItems: 'start' }}>
        {/* ------------------------------------------------ Saisie */}
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="edit" size={18} /> Travées
            <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }} onClick={addTravee}>
              <Icon name="plus" size={14} /> Ajouter
            </button>
          </div>

          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>#</th>
                  <th>L (m)</th>
                  <th>g (kN/m)</th>
                  <th>q (kN/m)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inp.travees.map((t, i) => (
                  <tr key={i}>
                    <td className="cell-strong">T{i + 1}</td>
                    <td>
                      <input className="mini-input" type="number" value={t.L} step={0.1} min={1}
                        onChange={(e) => setTravee(i, 'L', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td>
                      <input className="mini-input" type="number" value={t.g} step={1} min={0}
                        onChange={(e) => setTravee(i, 'g', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td>
                      <input className="mini-input" type="number" value={t.q} step={1} min={0}
                        onChange={(e) => setTravee(i, 'q', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td>
                      <button className="icon-btn" onClick={() => removeTravee(i)} title="Supprimer">
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-title">
            <Icon name="settings" size={18} /> Section & matériaux
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Repère</label>
              <input type="text" value={repere} onChange={(e) => setRepere(e.target.value)} placeholder="ex. Fil A" />
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
            <div className="field">
              <label>Largeur b₀ (cm)</label>
              <input type="number" value={inp.b} onChange={numField('b')} min={10} step={1} />
            </div>
            <div className="field">
              <label>Hauteur h (cm)</label>
              <input type="number" value={inp.h} onChange={numField('h')} min={20} step={1} />
            </div>
            <div className="field">
              <label>fc28 (MPa)</label>
              <select className="select" value={inp.fc28} onChange={(e) => set('fc28', parseFloat(e.target.value))}>
                {[20, 25, 30, 35, 40].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Acier fe (MPa)</label>
              <select className="select" value={inp.fe} onChange={(e) => set('fe', parseFloat(e.target.value))}>
                {[400, 500].map((v) => (
                  <option key={v} value={v}>
                    FeE{v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Ø longitudinaux (mm)</label>
              <select className="select" value={inp.phiL} onChange={(e) => set('phiL', parseFloat(e.target.value))}>
                {[12, 14, 16, 20, 25].map((v) => (
                  <option key={v} value={v}>
                    HA{v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Ø cadres (mm)</label>
              <select className="select" value={inp.phiT} onChange={(e) => set('phiT', parseFloat(e.target.value))}>
                {[6, 8, 10].map((v) => (
                  <option key={v} value={v}>
                    Ø{v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field field--full">
              <label>Enrobage (cm)</label>
              <input type="number" value={inp.enrob} onChange={numField('enrob')} min={1} step={0.5} />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ Résultats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={`card card--pad ${res.ok ? '' : 'card--ko'}`}>
            <div className="section-title">
              <Icon name={res.ok ? 'check' : 'alert'} size={18} /> Travées
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Travée</th>
                    <th>Mt (kN·m)</th>
                    <th>Aₛ (cm²)</th>
                    <th>Choix</th>
                    <th>Cadres</th>
                  </tr>
                </thead>
                <tbody>
                  {res.travees.map((t) => (
                    <tr key={t.index}>
                      <td className="cell-strong">T{t.index + 1}</td>
                      <td>{t.Mt.toFixed(1)}</td>
                      <td>{t.As.toFixed(2)}</td>
                      <td className="cell-strong">{t.n} HA{t.phi}</td>
                      <td>Ø{inp.phiT} / {t.st.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="section-title" style={{ marginTop: 16 }}>
              <Icon name="building" size={18} /> Appuis (chapeaux)
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Appui</th>
                    <th>Ma (kN·m)</th>
                    <th>Aₛ (cm²)</th>
                    <th>Choix</th>
                  </tr>
                </thead>
                <tbody>
                  {res.appuis.map((a) => (
                    <tr key={a.index}>
                      <td className="cell-strong">A{a.index}</td>
                      <td>{a.Ma.toFixed(1)}</td>
                      <td>{a.As.toFixed(2)}</td>
                      <td className="cell-strong">{a.n > 0 ? `${a.n} HA${a.phi}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {res.erreurs.map((e, i) => (
              <div key={i} className="msg msg--err">
                <Icon name="alert" size={15} /> {e}
              </div>
            ))}
            {res.avertissements.map((w, i) => (
              <div key={i} className="msg msg--warn">
                <Icon name="alert" size={15} /> {w}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
