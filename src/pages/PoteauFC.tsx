import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import { aireBarre } from '@/lib/calc/poteau';
import { calculPoteauFC, specPoteauFC, type PoteauFCInput } from '@/lib/calc/poteauFC';
import { buildCoupeSvg } from '@/lib/calc/coupe';
import { exportPoteauFCNotePdf } from '@/lib/calc/notePdf';
import { buildCoupeDxf, downloadDxf } from '@/lib/calc/dxf';

const DEFAULT: PoteauFCInput = {
  b: 25,
  h: 50,
  enrob: 3,
  l0: 3,
  k: 0.7,
  Nu: 700,
  Mu: 90,
  alphaG: 0.6,
  phiFluage: 2,
  fc28: 25,
  fe: 500,
  gammaB: 1.5,
  gammaS: 1.15,
  phiL: 14,
  phiT: 8,
};

const DIAM_L = [12, 14, 16, 20, 25, 32];

export default function PoteauFC() {
  const data = useData();
  const [inp, setInp] = useState<PoteauFCInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculPoteauFC(inp), [inp]);

  const set = <K extends keyof PoteauFCInput>(key: K, value: PoteauFCInput[K]) =>
    setInp((s) => ({ ...s, [key]: value }));
  const num = <K extends keyof PoteauFCInput>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as PoteauFCInput[K]);

  const spec = specPoteauFC(inp, res);
  const projetNom = data.chantiers.find((c) => c.id === projetId)?.nom;
  const nomFichier = `PoteauFC_${(repere.trim() || 'element').replace(/[^\w-]+/g, '_')}`;

  const exportPdf = () =>
    exportPoteauFCNotePdf(inp, res, { repere: repere.trim() || undefined, projet: projetNom });
  const exportDxf = () =>
    downloadDxf(
      nomFichier,
      buildCoupeDxf(spec, { titre: `POTEAU ${repere.trim() || ''}`.trim(), legende: spec.legende }),
    );

  return (
    <>
      <PageHead
        title="Poteau BA — flexion composée"
        subtitle="Effort normal + moment · BAEL 91 rév. 99 (2ᵉ ordre forfaitaire)"
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
              <input type="text" value={repere} onChange={(e) => setRepere(e.target.value)} placeholder="ex. P3 — R+1" />
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
              <label>Largeur b (cm)</label>
              <input type="number" value={inp.b} onChange={num('b')} min={15} step={1} />
            </div>
            <div className="field">
              <label>Hauteur h (cm) — plan de flexion</label>
              <input type="number" value={inp.h} onChange={num('h')} min={15} step={1} />
            </div>

            <div className="field">
              <label>Effort normal Nu (kN)</label>
              <input type="number" value={inp.Nu} onChange={num('Nu')} min={0} step={10} />
            </div>
            <div className="field">
              <label>Moment Mu (kN·m)</label>
              <input type="number" value={inp.Mu} onChange={num('Mu')} min={0} step={5} />
            </div>

            <div className="field">
              <label>Longueur libre l₀ (m)</label>
              <input type="number" value={inp.l0} onChange={num('l0')} min={0.5} step={0.1} />
            </div>
            <div className="field">
              <label>Liaison → lf = k·l₀</label>
              <select className="select" value={inp.k} onChange={(e) => set('k', parseFloat(e.target.value))}>
                <option value={0.7}>Bâtiment courant (k = 0,7)</option>
                <option value={1}>Articulé — articulé (k = 1,0)</option>
                <option value={0.5}>Encastré — encastré (k = 0,5)</option>
                <option value={2}>Encastré — libre / console (k = 2,0)</option>
              </select>
            </div>

            <div className="field">
              <label>α = Mg/(Mg+Mq)</label>
              <input type="number" value={inp.alphaG} onChange={num('alphaG')} min={0} max={1} step={0.05} />
            </div>
            <div className="field">
              <label>Fluage φ</label>
              <input type="number" value={inp.phiFluage} onChange={num('phiFluage')} min={0} step={0.5} />
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
              <label>Ø aciers longitudinaux (mm)</label>
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
              <Icon name={res.ok ? 'check' : 'alert'} size={18} /> Résultat —{' '}
              {res.section === 'SPC' ? 'section partiellement comprimée' : 'section entièrement comprimée'}
            </div>
            <div className="result-grid">
              <Res label="e₀ (1ᵉʳ ordre)" value={`${res.e0.toFixed(1)} cm`} />
              <Res label="e totale" value={`${res.eTot.toFixed(1)} cm`} />
              <Res label="Nappe basse" value={`${res.nBas} HA${inp.phiL}`} strong />
              <Res label="Nappe haute" value={`${res.nHaut} HA${inp.phiL}`} strong />
              <Res label="A bas" value={`${res.Abas.toFixed(2)} cm²`} />
              <Res label="A haut" value={`${res.Ahaut.toFixed(2)} cm²`} />
              <Res label="Aₛ total réel" value={`${res.AsReel.toFixed(2)} cm²`} />
              <Res label="Cadres" value={`Ø${res.phiT} · e = ${res.stCourant.toFixed(0)} cm`} />
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
