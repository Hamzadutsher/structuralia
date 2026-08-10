import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import { aireBarre } from '@/lib/calc/poteau';
import { calculPoutreBAEL, specPoutre, type PoutreInput, type Fissuration } from '@/lib/calc/poutre';
import { buildCoupeSvg } from '@/lib/calc/coupe';
import { exportPoutreNotePdf } from '@/lib/calc/notePdf';
import { buildCoupeDxf, downloadDxf } from '@/lib/calc/dxf';

const DEFAULT: PoutreInput = {
  b: 25,
  h: 50,
  enrob: 3,
  Mu: 120,
  Vu: 140,
  fc28: 25,
  fe: 500,
  gammaB: 1.5,
  gammaS: 1.15,
  phiL: 16,
  phiT: 8,
  nBrins: 2,
  fissuration: 'PP',
};

const DIAM_L = [10, 12, 14, 16, 20, 25, 32];
const DIAM_T = [6, 8, 10, 12];

export default function Poutre() {
  const data = useData();
  const [inp, setInp] = useState<PoutreInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculPoutreBAEL(inp), [inp]);

  const set = <K extends keyof PoutreInput>(key: K, value: PoutreInput[K]) =>
    setInp((s) => ({ ...s, [key]: value }));
  const num = <K extends keyof PoutreInput>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as PoutreInput[K]);

  const spec = specPoutre(inp, res);
  const projetNom = data.chantiers.find((c) => c.id === projetId)?.nom;
  const nomFichier = `Poutre_${(repere.trim() || 'element').replace(/[^\w-]+/g, '_')}`;

  const exportPdf = () =>
    exportPoutreNotePdf(inp, res, { repere: repere.trim() || undefined, projet: projetNom });
  const exportDxf = () =>
    downloadDxf(
      nomFichier,
      buildCoupeDxf(spec, { titre: `POUTRE ${repere.trim() || ''}`.trim(), legende: spec.legende }),
    );

  return (
    <>
      <PageHead
        title="Poutre BA — flexion simple + tranchant"
        subtitle="Dimensionnement selon BAEL 91 révisé 99 (Art. A.4 & A.5)"
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
        {/* ------------------------------------------------ Saisie */}
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="edit" size={18} /> Données
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Repère de l'élément</label>
              <input type="text" value={repere} onChange={(e) => setRepere(e.target.value)} placeholder="ex. P.12 — N2" />
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
              <input type="number" value={inp.b} onChange={num('b')} min={10} step={1} />
            </div>
            <div className="field">
              <label>Hauteur h (cm)</label>
              <input type="number" value={inp.h} onChange={num('h')} min={15} step={1} />
            </div>

            <div className="field">
              <label>Moment Mu (kN·m)</label>
              <input type="number" value={inp.Mu} onChange={num('Mu')} min={0} step={5} />
            </div>
            <div className="field">
              <label>Effort tranchant Vu (kN)</label>
              <input type="number" value={inp.Vu} onChange={num('Vu')} min={0} step={5} />
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
                {DIAM_L.map((v) => (
                  <option key={v} value={v}>
                    HA{v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Ø cadres (mm)</label>
              <select className="select" value={inp.phiT} onChange={(e) => set('phiT', parseFloat(e.target.value))}>
                {DIAM_T.map((v) => (
                  <option key={v} value={v}>
                    Ø{v}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Brins transversaux</label>
              <select className="select" value={inp.nBrins} onChange={(e) => set('nBrins', parseFloat(e.target.value))}>
                <option value={2}>2 (cadre)</option>
                <option value={4}>4 (cadre + étrier)</option>
              </select>
            </div>
            <div className="field">
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
            <div className="field field--full">
              <label>Enrobage (cm)</label>
              <input type="number" value={inp.enrob} onChange={num('enrob')} min={1} step={0.5} />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 20 }}>
            Coupe transversale
          </div>
          <div dangerouslySetInnerHTML={{ __html: buildCoupeSvg(spec, 'app') }} />
        </div>

        {/* ------------------------------------------------ Résultats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={`card card--pad ${res.ok ? '' : 'card--ko'}`}>
            <div className="section-title">
              <Icon name={res.ok ? 'check' : 'alert'} size={18} /> Résultat
            </div>
            <div className="result-grid">
              <Res label="Moment réduit μ" value={res.mu.toFixed(3)} />
              <Res label="Hauteur utile d" value={`${res.d.toFixed(1)} cm`} />
              <Res label="A tendu" value={`${res.As.toFixed(2)} cm²`} />
              <Res label="A comprimé" value={`${res.Asup.toFixed(2)} cm²`} />
              <Res label="Nappe inf." value={`${res.nInf} HA${inp.phiL}`} strong />
              <Res label="Aₛ réel" value={`${res.AsReel.toFixed(2)} cm²`} />
              <Res label="τu / τlim" value={`${res.tauU.toFixed(2)} / ${res.tauLim.toFixed(2)}`} />
              <Res label="Cadres" value={`Ø${res.phiT} · e = ${res.st.toFixed(0)} cm`} strong />
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
              γb = {inp.gammaB} · γs = {inp.gammaS} · ELU. Aire d'une barre HA{inp.phiL} ={' '}
              {aireBarre(inp.phiL).toFixed(2)} cm².
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
