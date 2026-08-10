import { Link } from 'react-router-dom';
import { PageHead } from '@/components/ui/Page';
import { Icon, type IconName } from '@/components/ui/Icon';

interface Module {
  to: string;
  titre: string;
  desc: string;
  icon: IconName;
  tags: string[];
}

interface Groupe {
  titre: string;
  modules: Module[];
}

const GROUPES: Groupe[] = [
  {
    titre: 'Éléments béton armé (BAEL 91)',
    modules: [
      { to: '/calcul/poteau', titre: 'Poteau — compression centrée', desc: 'Élancement, coefficient α, aciers longitudinaux et cadres.', icon: 'building', tags: ['Note PDF', 'DXF'] },
      { to: '/calcul/poteau-fc', titre: 'Poteau — flexion composée', desc: 'N + M, 2ᵉ ordre forfaitaire, sections SPC/SEC, deux nappes.', icon: 'building', tags: ['Note PDF', 'DXF'] },
      { to: '/calcul/poutre', titre: 'Poutre — flexion + tranchant', desc: 'Flexion simple, aciers comprimés, armatures d’âme.', icon: 'building', tags: ['Note PDF', 'DXF'] },
      { to: '/calcul/poutre-continue', titre: 'Poutre continue (Caquot)', desc: 'Enveloppes de moments multi-travées, chapeaux, élévation.', icon: 'building', tags: ['Note PDF', 'DXF'] },
      { to: '/calcul/semelle', titre: 'Semelle isolée', desc: 'Méthode des bielles, dimensions en plan, ancrage.', icon: 'building', tags: ['Note PDF', 'DXF plan'] },
      { to: '/calcul/semelle-filante', titre: 'Semelle filante', desc: 'Sous mur / voile, bielles par mètre linéaire.', icon: 'building', tags: ['Note PDF', 'DXF'] },
      { to: '/calcul/dalle', titre: 'Dalle pleine (1 ou 2 sens)', desc: 'Coefficients de Pigeaud, deux nappes, effort tranchant.', icon: 'building', tags: ['Note PDF', 'DXF plan'] },
      { to: '/calcul/escalier', titre: 'Escalier (paillasse)', desc: 'Dalle inclinée, loi de Blondel, acier principal + répartition.', icon: 'building', tags: ['Note PDF'] },
    ],
  },
  {
    titre: 'Structure & charges',
    modules: [
      { to: '/calcul/descente', titre: 'Descente de charges', desc: 'Cumul des charges par niveau → Nu / Nser en pied.', icon: 'trending', tags: ['Note PDF'] },
    ],
  },
  {
    titre: 'Sismique (RPS 2011)',
    modules: [
      { to: '/calcul/sismique', titre: 'Méthode statique équivalente', desc: 'Effort tranchant à la base et distribution par niveau.', icon: 'trending', tags: ['Note PDF'] },
    ],
  },
];

export default function CalcHub() {
  return (
    <>
      <PageHead
        title="Études & calculs"
        subtitle="Modules de dimensionnement béton armé (BAEL 91 rév. 99) et sismique (RPS 2011)"
      />
      {GROUPES.map((g) => (
        <div key={g.titre} style={{ marginBottom: 26 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>
            {g.titre}
          </div>
          <div className="calc-grid">
            {g.modules.map((m) => (
              <Link key={m.to} to={m.to} className="calc-card">
                <div className="calc-card__icon">
                  <Icon name={m.icon} size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="calc-card__title">{m.titre}</div>
                  <div className="calc-card__desc">{m.desc}</div>
                  <div className="calc-card__tags">
                    {m.tags.map((t) => (
                      <span key={t} className="badge badge--info">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <Icon name="chevron" size={16} />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
