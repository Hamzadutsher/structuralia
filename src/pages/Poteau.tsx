import { useMemo, useState } from 'react';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useData } from '@/lib/store';
import {
  calculPoteauBAEL,
  aireBarre,
  type PoteauInput,
  type SectionForme,
  type AgeCharges,
} from '@/lib/calc/poteau';
import { buildCoupeSvg } from '@/lib/calc/coupe';
import { exportPoteauNotePdf } from '@/lib/calc/notePdf';

/** Valeurs par défaut d'un poteau courant de bâtiment. */
const DEFAULT: PoteauInput = {
  forme: 'rect',
  a: 25,
  b: 25,
  D: 30,
  l0: 3,
  k: 0.7,
  Nu: 900,
  fc28: 25,
  fe: 500,
  age: 'apres90j',
  gammaB: 1.5,
  gammaS: 1.15,
  phiL: 12,
};

const DIAM_L = [12, 14, 16, 20, 25, 32];

export default function Poteau() {
  const data = useData();
  const [inp, setInp] = useState<PoteauInput>(DEFAULT);
  const [repere, setRepere] = useState('');
  const [projetId, setProjetId] = useState('');
  const res = useMemo(() => calculPoteauBAEL(inp), [inp]);

  const set = <K extends keyof PoteauInput>(key: K, value: PoteauInput[K]) =>
    setInp((s) => ({ ...s, [key]: value }));
  const num = <K extends keyof PoteauInput>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as PoteauInput[K]);

  const exportPdf = () =>
    exportPoteauNotePdf(inp, res, {
      repere: repere.trim() || undefined,
      projet: data.chantiers.find((c) => c.id === projetId)?.nom,
    });

  return (
    <>
      <PageHead
        title="Poteau BA — compression centrée"
        subtitle="Dimensionnement selon BAEL 91 révisé 99 (Art. B.8.4)"
        actions={
          <button className="btn btn--primary" onClick={exportPdf}>
            <Icon name="download" size={16} /> Note de calcul PDF
          </button>
        }
      />

      <div className="split" style={{ alignItems: 'start' }}>
        {/* ------------------------------------------------ Colonne de saisie */}
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="edit" size={18} /> Données
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Repère de l'élément</label>
              <input
                type="text"
                value={repere}
                onChange={(e) => setRepere(e.target.value)}
                placeholder="ex. P1 — RDC"
              />
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

            <div className="field field--full">
              <label>Forme de la section</label>
              <select
                className="select"
                value={inp.forme}
                onChange={(e) => set('forme', e.target.value as SectionForme)}
              >
                <option value="rect">Rectangulaire</option>
                <option value="circ">Circulaire</option>
              </select>
            </div>

            {inp.forme === 'rect' ? (
              <>
                <div className="field">
                  <label>Petit côté a (cm)</label>
                  <input type="number" value={inp.a} onChange={num('a')} min={10} step={1} />
                </div>
                <div className="field">
                  <label>Grand côté b (cm)</label>
                  <input type="number" value={inp.b} onChange={num('b')} min={10} step={1} />
                </div>
              </>
            ) : (
              <div className="field field--full">
                <label>Diamètre D (cm)</label>
                <input type="number" value={inp.D} onChange={num('D')} min={15} step={1} />
              </div>
            )}

            <div className="field">
              <label>Longueur libre l₀ (m)</label>
              <input type="number" value={inp.l0} onChange={num('l0')} min={0.5} step={0.1} />
            </div>
            <div className="field">
              <label>Liaison → Lf = k·l₀</label>
              <select className="select" value={inp.k} onChange={(e) => set('k', parseFloat(e.target.value))}>
                <option value={0.7}>Bâtiment courant, poteau continu (k = 0,7)</option>
                <option value={1}>Articulé — articulé (k = 1,0)</option>
                <option value={0.5}>Encastré — encastré (k = 0,5)</option>
                <option value={2}>Encastré — libre / console (k = 2,0)</option>
              </select>
            </div>

            <div className="field field--full">
              <label>Effort normal ultime Nu (kN)</label>
              <input type="number" value={inp.Nu} onChange={num('Nu')} min={0} step={10} />
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
              <label>Application des charges</label>
              <select className="select" value={inp.age} onChange={(e) => set('age', e.target.value as AgeCharges)}>
                <option value="apres90j">Après 90 jours</option>
                <option value="avant90j">Avant 90 jours</option>
                <option value="avant28j">Avant 28 jours</option>
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
          </div>

          <div className="section-title" style={{ marginTop: 20 }}>
            Coupe transversale
          </div>
          <div
            dangerouslySetInnerHTML={{
              __html: buildCoupeSvg(
                { forme: inp.forme, a: inp.a, b: inp.b, D: inp.D, nBarres: res.nBarres, phiL: inp.phiL, phiT: res.phiT },
                'app',
              ),
            }}
          />
        </div>

        {/* ------------------------------------------------ Colonne résultats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Synthèse */}
          <div className={`card card--pad ${res.ok ? '' : 'card--ko'}`}>
            <div className="section-title">
              <Icon name={res.ok ? 'check' : 'alert'} size={18} /> Résultat
            </div>
            <div className="result-grid">
              <Res label="Élancement λ" value={res.lambda.toFixed(1)} />
              <Res label="Coefficient α" value={res.alpha.toFixed(3)} />
              <Res label="A théorique" value={`${res.Ath.toFixed(2)} cm²`} />
              <Res label="A retenue" value={`${res.As.toFixed(2)} cm²`} />
              <Res label="Choix" value={`${res.nBarres} HA${inp.phiL}`} strong />
              <Res label="Aⱼ réelle" value={`${res.AsReel.toFixed(2)} cm²`} />
              <Res label="Cadres" value={`Ø${res.phiT} · e = ${res.stCourant.toFixed(0)} cm`} />
              <Res label="Nu,lim" value={`${res.NuLim.toFixed(0)} kN`} />
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

          {/* Note de calcul */}
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
              γb = {inp.gammaB} · γs = {inp.gammaS} · combinaison fondamentale ELU. Aire d'une barre HA{inp.phiL} ={' '}
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

