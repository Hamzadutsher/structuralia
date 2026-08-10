import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import { calculFilante, specFilante, type FilanteInput } from '@/lib/calc/semelleFilante';
import { buildCoupeSvg } from '@/lib/calc/coupe';
import { exportFilanteNotePdf } from '@/lib/calc/notePdf';
import { buildCoupeDxf, downloadDxf } from '@/lib/calc/dxf';

const DEFAULT: FilanteInput = {
  bMur: 20,
  Nu: 200,
  Nser: 145,
  sigmaSol: 0.2,
  fc28: 25,
  fe: 500,
  gammaB: 1.5,
  gammaS: 1.15,
  enrob: 5,
  phiL: 10,
  phiT: 8,
  gammaBeton: 25,
};

export default function SemelleFilante() {
  const data = useData();
  const [inp, setInp] = useState<FilanteInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculFilante(inp), [inp]);

  const set = <K extends keyof FilanteInput>(key: K, value: FilanteInput[K]) =>
    setInp((s) => ({ ...s, [key]: value }));
  const num = <K extends keyof FilanteInput>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as FilanteInput[K]);

  const spec = specFilante(inp, res);
  const projetNom = data.chantiers.find((c) => c.id === projetId)?.nom;
  const nomFichier = `SemelleFilante_${(repere.trim() || 'element').replace(/[^\w-]+/g, '_')}`;

  const exportPdf = () =>
    exportFilanteNotePdf(inp, res, { repere: repere.trim() || undefined, projet: projetNom });
  const exportDxf = () =>
    downloadDxf(nomFichier, buildCoupeDxf(spec, { titre: `SEMELLE FILANTE ${repere.trim() || ''}`.trim(), legende: spec.legende }));

  return (
    <>
      <PageHead
        title="Semelle filante — méthode des bielles"
        subtitle="Sous mur / voile · BAEL 91 rév. 99 (par mètre linéaire)"
        actions={
          <>
            <button className="btn btn--ghost" onClick={exportDxf}>
              <Icon name="download" size={16} /> Coupe DXF
            </button>
            <button className="btn btn--primary" onClick={exportPdf}>
              <Icon name="download" size={16} /> Note de calcul PDF
            </button>
          </>
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
              <input type="text" value={repere} onChange={(e) => setRepere(e.target.value)} placeholder="ex. SF mur pignon" />
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
              <label>Épaisseur du mur (cm)</label>
              <input type="number" value={inp.bMur} onChange={num('bMur')} min={10} step={1} />
            </div>
            <div className="field">
              <label>σsol (MPa)</label>
              <input type="number" value={inp.sigmaSol} onChange={num('sigmaSol')} min={0.05} step={0.05} />
            </div>
            <div className="field">
              <label>Nu — ELU (kN/ml)</label>
              <input type="number" value={inp.Nu} onChange={num('Nu')} min={0} step={10} />
            </div>
            <div className="field">
              <label>Nser — ELS (kN/ml)</label>
              <input type="number" value={inp.Nser} onChange={num('Nser')} min={0} step={10} />
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
              <label>Ø transversaux (mm)</label>
              <select className="select" value={inp.phiL} onChange={(e) => set('phiL', parseFloat(e.target.value))}>
                {[8, 10, 12, 14].map((v) => (
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

          <div className="section-title" style={{ marginTop: 18 }}>
            Coupe transversale (schéma)
          </div>
          <div dangerouslySetInnerHTML={{ __html: buildCoupeSvg(spec, 'app') }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={`card card--pad ${res.ok ? '' : 'card--ko'}`}>
            <div className="section-title">
              <Icon name={res.ok ? 'check' : 'alert'} size={18} /> Résultat
            </div>
            <div className="result-grid">
              <Res label="Largeur B" value={`${res.B} cm`} strong />
              <Res label="Hauteur h" value={`${res.h} cm`} />
              <Res label="σ sol calc." value={`${res.sigmaSolCalc.toFixed(3)} MPa`} />
              <Res label="σ sol admis." value={`${inp.sigmaSol.toFixed(2)} MPa`} />
              <Res label="Transversaux" value={`HA${inp.phiL} e=${res.esp.toFixed(0)} cm`} strong />
              <Res label="Aₛ transv." value={`${res.As.toFixed(2)} cm²/ml`} />
              <Res label="Répartition" value={`${res.Arep.toFixed(2)} cm²/ml`} />
              <Res label="Ancrage" value={res.crochets ? 'Crochets' : 'Droit'} />
            </div>
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
