import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon = 'folder',
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-label">
      <div className="progress">
        <div className="progress__bar" style={{ width: `${v}%` }} />
      </div>
      <span>{v}%</span>
    </div>
  );
}

export function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detail">
      <label>{label}</label>
      <div>{children}</div>
    </div>
  );
}
