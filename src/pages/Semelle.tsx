import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import { calculSemelle, planSemelle, type SemelleInput } from '@/lib/calc/semelle';
import { buildSemellePlanSvg } from '@/lib/calc/coupe';
import { exportSemelleNotePdf } from '@/lib/calc/notePdf';
import { buildSemelleDxf, downloadDxf } from '@/lib/calc/dxf';

const DEFAULT: SemelleInput = {
  a: 25,
  b: 25,
  Nu: 900,
  Nser: 650,
  sigmaSol: 0.2,
  fc28: 25,
  fe: 500,
  gammaB: 1.5,
  gammaS: 1.15,
  enrob: 5,
  phiL: 12,
  gammaBeton: 25,
};

const DIAM_L = [10, 12, 14, 16, 20];

export default function Semelle() {
  const data = useData();
  const [inp, setInp] = useState<SemelleInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculSemelle(inp), [inp]);

  const set = <K extends keyof SemelleInput>(key: K, value: SemelleInput[K]) =>
    setInp((s) => ({ ...s, [key]: value }));
  const num = <K extends keyof SemelleInput>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as SemelleInput[K]);

  const plan = planSemelle(inp, res);
  const projetNom = data.chantiers.find((c) => c.id === projetId)?.nom;
  const nomFichier = `Semelle_${(repere.trim() || 'element').replace(/[^\w-]+/g, '_')}`;

  const exportPdf = () =>
    exportSemelleNotePdf(inp, res, { repere: repere.trim() || undefined, projet: projetNom });
  const exportDxf = () =>
    downloadDxf(
      nomFichier,
      buildSemelleDxf(plan, { titre: `SEMELLE ${repere.trim() || ''}`.trim(), legende: plan.legende }),
    );

  return (
    <>
      <PageHead
        title="Semelle isolée — méthode des bielles"
        subtitle="Dimensionnement selon BAEL 91 révisé 99 (semelle rigide)"
        actions={
          <>
            <button className="btn btn--ghost" onClick={exportDxf}>
              <Icon name="download" size={16} /> Plan DXF
            </button>
            <button className="btn btn--primary" onClick={exportPdf}>
              <Icon name="download" size={16} /> Note de calcul PDF
            </button>
          </>
        }
      />

      <div className="split" style={{ alignItems: 'start' }}>
        {/* ------------------------------------------------ Saisie */}
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="edit" size={18} /> Données
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Repère de l'élément</label>
              <input type="text" value={repere} onChange={(e) => setRepere(e.target.value)} placeholder="ex. S1 — P1" />
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
              <label>Poteau — côté a (cm)</label>
              <input type="number" value={inp.a} onChange={num('a')} min={15} step={1} />
            </div>
            <div className="field">
              <label>Poteau — côté b (cm)</label>
              <input type="number" value={inp.b} onChange={num('b')} min={15} step={1} />
            </div>

            <div className="field">
              <label>Nu — ELU (kN)</label>
              <input type="number" value={inp.Nu} onChange={num('Nu')} min={0} step={10} />
            </div>
            <div className="field">
              <label>Nser — ELS (kN)</label>
              <input type="number" value={inp.Nser} onChange={num('Nser')} min={0} step={10} />
            </div>

            <div className="field field--full">
              <label>Contrainte admissible du sol σsol (MPa)</label>
              <input type="number" value={inp.sigmaSol} onChange={num('sigmaSol')} min={0.05} step={0.05} />
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
              <label>Ø aciers (mm)</label>
              <select className="select" value={inp.phiL} onChange={(e) => set('phiL', parseFloat(e.target.value))}>
                {DIAM_L.map((v) => (
                  <option key={v} value={v}>
                    HA{v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Enrobage (cm)</label>
              <input type="number" value={inp.enrob} onChange={num('enrob')} min={2} step={0.5} />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 20 }}>
            Vue en plan
          </div>
          <div dangerouslySetInnerHTML={{ __html: buildSemellePlanSvg(plan, 'app') }} />
        </div>

        {/* ------------------------------------------------ Résultats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={`card card--pad ${res.ok ? '' : 'card--ko'}`}>
            <div className="section-title">
              <Icon name={res.ok ? 'check' : 'alert'} size={18} /> Résultat
            </div>
            <div className="result-grid">
              <Res label="Semelle A × B" value={`${res.A} × ${res.B} cm`} strong />
              <Res label="Hauteur h" value={`${res.h} cm`} />
              <Res label="σ sol calculée" value={`${res.sigmaSolCalc.toFixed(3)} MPa`} />
              <Res label="σ sol admis." value={`${inp.sigmaSol.toFixed(2)} MPa`} />
              <Res label="Nappe // A" value={`${res.nA} HA${inp.phiL}`} strong />
              <Res label="Nappe // B" value={`${res.nB} HA${inp.phiL}`} strong />
              <Res label="Aₛ // A" value={`${res.Asa.toFixed(2)} cm²`} />
              <Res label="Ancrage" value={res.crochets ? 'Crochets' : 'Droit'} />
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
                    <th style={{ width: 70 }}>Symb.</th>
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
            <p className="cell-sub" style={{ marginTop: 10 }}>
              Semelle homothétique au poteau (A/a = B/b), supposée rigide. γb = {inp.gammaB} · γs = {inp.gammaS}.
            </p>
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
