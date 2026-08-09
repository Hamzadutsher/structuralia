import { Icon, type IconName } from './Icon';

export interface TabDef {
  key: string;
  label: string;
  icon?: IconName;
  count?: number;
}

interface Props {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}

/** Onglets internes à une page — regroupe les éléments d'une même catégorie. */
export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          className={`tab${active === t.key ? ' active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.icon && <Icon name={t.icon} size={16} />}
          {t.label}
          {t.count !== undefined && <span className="tab__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
