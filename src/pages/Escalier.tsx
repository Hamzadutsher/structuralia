import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import { calculEscalier, buildEscalierSvg, type EscalierInput } from '@/lib/calc/escalier';
import { exportEscalierNotePdf } from '@/lib/calc/notePdf';

const DEFAULT: EscalierInput = {
  L: 2.7,
  ep: 15,
  contremarche: 17,
  giron: 28,
  Grev: 1.5,
  Q: 2.5,
  enrob: 2,
  phi: 10,
  fc28: 25,
  fe: 500,
  gammaB: 1.5,
  gammaS: 1.15,
};

export default function Escalier() {
  const data = useData();
  const [inp, setInp] = useState<EscalierInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculEscalier(inp), [inp]);

  const set = <K extends keyof EscalierInput>(key: K, value: EscalierInput[K]) =>
    setInp((s) => ({ ...s, [key]: value }));
  const num = <K extends keyof EscalierInput>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as EscalierInput[K]);

  const projetNom = data.chantiers.find((c) => c.id === projetId)?.nom;
  const exportPdf = () =>
    exportEscalierNotePdf(inp, res, { repere: repere.trim() || undefined, projet: projetNom });

  return (
    <>
      <PageHead
        title="Escalier droit — paillasse BA"
        subtitle="Dimensionnement selon BAEL 91 révisé 99 (dalle inclinée)"
        actions={
          <button className="btn btn--primary" onClick={exportPdf}>
            <Icon name="download" size={16} /> Note de calcul PDF
          </button>
        }
      />

      <div className="split" style={{ alignItems: 'start' }}>
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="edit" size={18} /> Données
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Repère</label>
              <input type="text" value={repere} onChange={(e) => setRepere(e.target.value)} placeholder="ex. Esc. A" />
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
              <label>Portée horizontale L (m)</label>
              <input type="number" value={inp.L} onChange={num('L')} min={0.5} step={0.1} />
            </div>
            <div className="field">
              <label>Épaisseur paillasse (cm)</label>
              <input type="number" value={inp.ep} onChange={num('ep')} min={8} step={1} />
            </div>
            <div className="field">
              <label>Contremarche (cm)</label>
              <input type="number" value={inp.contremarche} onChange={num('contremarche')} min={14} step={0.5} />
            </div>
            <div className="field">
              <label>Giron (cm)</label>
              <input type="number" value={inp.giron} onChange={num('giron')} min={22} step={0.5} />
            </div>
            <div className="field">
              <label>G additionnel (kN/m²)</label>
              <input type="number" value={inp.Grev} onChange={num('Grev')} min={0} step={0.5} />
            </div>
            <div className="field">
              <label>Exploitation q (kN/m²)</label>
              <input type="number" value={inp.Q} onChange={num('Q')} min={0} step={0.5} />
            </div>
            <div className="field">
              <label>fc28 (MPa)</label>
              <select className="select" value={inp.fc28} onChange={(e) => set('fc28', parseFloat(e.target.value))}>
                {[20, 25, 30, 35].map((v) => (
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
              <label>Ø aciers (mm)</label>
              <select className="select" value={inp.phi} onChange={(e) => set('phi', parseFloat(e.target.value))}>
                {[8, 10, 12, 14].map((v) => (
                  <option key={v} value={v}>
                    HA{v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Enrobage (cm)</label>
              <input type="number" value={inp.enrob} onChange={num('enrob')} min={1} step={0.5} />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 18 }}>
            Coupe schématique
          </div>
          <div dangerouslySetInnerHTML={{ __html: buildEscalierSvg(inp, res, 'app') }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={`card card--pad ${res.ok ? '' : 'card--ko'}`}>
            <div className="section-title">
              <Icon name={res.ok ? 'check' : 'alert'} size={18} /> Résultat
            </div>
            <div className="result-grid">
              <Res label="Inclinaison" value={`${res.alphaDeg.toFixed(1)}°`} />
              <Res label="Charge pu" value={`${res.pu.toFixed(2)} kN/m²`} />
              <Res label="Moment travée" value={`${res.Mt.toFixed(2)} kN·m/m`} />
              <Res label="Marches" value={`${res.nMarches} · ${res.hauteurTotale.toFixed(2)} m`} />
              <Res label="Acier principal" value={`HA${inp.phi} e=${res.esp.toFixed(0)} cm`} strong />
              <Res label="Aₛ principal" value={`${res.As.toFixed(2)} cm²/m`} />
              <Res label="Aₛ répartition" value={`${res.Ar.toFixed(2)} cm²/m`} />
              <Res label="G total" value={`${res.G.toFixed(2)} kN/m²`} />
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

          <div className="card card--pad">
            <div className="section-title">
              <Icon name="document" size={18} /> Note de calcul
            </div>
            <div className="table-wrap">
              <table className="data note">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Symb.</th>
                    <th>Désignation</th>
                    <th>Formule</th>
                    <th style={{ textAlign: 'right' }}>Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {res.etapes.map((et, i) => (
                    <tr key={i}>
                      <td className="cell-strong">{et.sym}</td>
                      <td>{et.label}</td>
                      <td className="cell-sub" style={{ fontStyle: 'italic' }}>
                        {et.formule ?? ''}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="cell-strong">
                        {et.valeur}
                      </td>
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
