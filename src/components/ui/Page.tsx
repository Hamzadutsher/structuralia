import { Icon, type IconName } from './Icon';

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
    </div>
  );
}

export function StatCard({
  icon,
  value,
  label,
  trend,
  trendUp,
}: {
  icon: IconName;
  value: string;
  label: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="stat">
      <div className="stat__icon">
        <Icon name={icon} size={22} />
      </div>
      <div>
        <div className="stat__value">{value}</div>
        <div className="stat__label">{label}</div>
        {trend && (
          <div className={`stat__trend ${trendUp ? 'up' : 'down'}`}>
            {trendUp ? '▲' : '▼'} {trend}
          </div>
        )}
      </div>
    </div>
  );
}
