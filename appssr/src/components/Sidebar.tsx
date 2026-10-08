import { AlabugaLogo, Icons } from '../icons';

export type View = 'all' | 'installed' | 'favorites' | 'tables' | 'settings';

interface Props {
  view: View;
  onView: (v: View) => void;
  counts: Partial<Record<View, number>>;
}

export function Sidebar({ view, onView, counts }: Props) {
  const items: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Все приложения', icon: <Icons.grid /> },
    { id: 'installed', label: 'Установленные', icon: <Icons.download /> },
    { id: 'favorites', label: 'Избранное', icon: <Icons.star /> },
    { id: 'tables', label: 'Таблицы', icon: <Icons.table /> },
    { id: 'settings', label: 'Настройки', icon: <Icons.settings /> },
  ];
  return (
    <aside className="sidebar">
      <nav className="nav" aria-label="Навигация">
        {items.map((it) => (
          <button key={it.id} className={view === it.id ? 'active' : ''} onClick={() => onView(it.id)}>
            {it.icon}
            {it.label}
            {counts[it.id] !== undefined && <span className="count">{counts[it.id]}</span>}
          </button>
        ))}
      </nav>
      <div className="spacer" />
      <AlabugaLogo />
    </aside>
  );
}
