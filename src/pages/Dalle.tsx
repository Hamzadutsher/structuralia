import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import { calculDalle, planDalle, type DalleInput, type AppuiDalle, type Fissuration } from '@/lib/calc/dalle';
import { buildDallePlanSvg } from '@/lib/calc/coupe';
import { exportDalleNotePdf } from '@/lib/calc/notePdf';
import { buildDalleDxf, downloadDxf } from '@/lib/calc/dxf';

const DEFAULT: DalleInput = {
  lx: 4,
  ly: 5,
  h: 16,
  g: 1.5,
  q: 2.5,
  enrob: 2,
  phi: 10,
  fc28: 25,
  fe: 500,
  gammaB: 1.5,
  gammaS: 1.15,
  appui: 'continu',
  fissuration: 'PP',
};

const DIAM = [6, 8, 10, 12, 14];

export default function Dalle() {
  const data = useData();
  const [inp, setInp] = useState<DalleInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculDalle(inp), [inp]);

  const set = <K extends keyof DalleInput>(key: K, value: DalleInput[K]) =>
    setInp((s) => ({ ...s, [key]: value }));
  const num = <K extends keyof DalleInput>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as DalleInput[K]);

  const plan = planDalle(inp, res);
  const projetNom = data.chantiers.find((c) => c.id === projetId)?.nom;
  const nomFichier = `Dalle_${(repere.trim() || 'element').replace(/[^\w-]+/g, '_')}`;

  const exportPdf = () =>
    exportDalleNotePdf(inp, res, { repere: repere.trim() || undefined, projet: projetNom });
  const exportDxf = () =>
    downloadDxf(
      nomFichier,
      buildDalleDxf(plan, { titre: `DALLE ${repere.trim() || ''}`.trim(), legende: plan.legende }),
    );

  return (
    <>
      <PageHead
        title="Dalle pleine — 1 ou 2 sens"
        subtitle="Dimensionnement selon BAEL 91 révisé 99 (Annexe E.3, Pigeaud)"
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
              <input type="text" value={repere} onChange={(e) => setRepere(e.target.value)} placeholder="ex. D1 — Étage" />
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
              <label>Petite portée lx (m)</label>
              <input type="number" value={inp.lx} onChange={num('lx')} min={1} step={0.1} />
            </div>
            <div className="field">
              <label>Grande portée ly (m)</label>
              <input type="number" value={inp.ly} onChange={num('ly')} min={1} step={0.1} />
            </div>

            <div className="field">
              <label>Épaisseur h (cm)</label>
              <input type="number" value={inp.h} onChange={num('h')} min={8} step={1} />
            </div>
            <div className="field">
              <label>Enrobage (cm)</label>
              <input type="number" value={inp.enrob} onChange={num('enrob')} min={1} step={0.5} />
            </div>

            <div className="field">
              <label>Charges permanentes g (kN/m²)</label>
              <input type="number" value={inp.g} onChange={num('g')} min={0} step={0.5} />
            </div>
            <div className="field">
              <label>Exploitation q (kN/m²)</label>
              <input type="number" value={inp.q} onChange={num('q')} min={0} step={0.5} />
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
              <select className="select" value={inp.phi} onChange={(e) => set('phi', parseFloat(e.target.value))}>
                {DIAM.map((v) => (
                  <option key={v} value={v}>
                    HA{v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Conditions d'appui</label>
              <select className="select" value={inp.appui} onChange={(e) => set('appui', e.target.value as AppuiDalle)}>
                <option value="continu">Panneau continu</option>
                <option value="isole">Appuis simples (isolé)</option>
              </select>
            </div>
            <div className="field field--full">
              <label>Fissuration</label>
              <select
                className="select"
                value={inp.fissuration}
                onChange={(e) => set('fissuration', e.target.value as Fissuration)}
              >
                <option value="PP">Peu préjudiciable</option>
                <option value="P">Préjudiciable</option>
                <option value="TP">Très préjudiciable</option>
              </select>
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 20 }}>
            Plan de ferraillage
          </div>
          <div dangerouslySetInnerHTML={{ __html: buildDallePlanSvg(plan, 'app') }} />
        </div>

        {/* ------------------------------------------------ Résultats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={`card card--pad ${res.ok ? '' : 'card--ko'}`}>
            <div className="section-title">
              <Icon name={res.ok ? 'check' : 'alert'} size={18} /> Résultat — portée sur {res.sens} sens
            </div>
            <div className="result-grid">
              <Res label="Rapport α" value={res.alpha.toFixed(3)} />
              <Res label="Charge pu" value={`${res.pu.toFixed(2)} kN/m²`} />
              <Res label="Aₛ // lx" value={`${res.Asx.toFixed(2)} cm²/m`} strong />
              <Res label="Aₛ // ly" value={`${res.Asy.toFixed(2)} cm²/m`} strong />
              <Res label="Espac. // lx" value={`HA${inp.phi} e=${res.espX.toFixed(0)} cm`} />
              <Res label="Espac. // ly" value={`HA${inp.phi} e=${res.espY.toFixed(0)} cm`} />
              <Res label="h min (flèche)" value={`${res.hMin.toFixed(1)} cm`} />
              <Res label="τu / τlim" value={`${res.tauU.toFixed(2)} / ${res.tauLim.toFixed(2)}`} />
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
              Coefficients de Pigeaud (ELU, ν = 0). Bande de calcul de 1 m. γb = {inp.gammaB} · γs = {inp.gammaS}.
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
