import type { PublicUser, Section } from '../../shared/types';
import { Icons } from '../icons';

interface Props {
  user: PublicUser;
  sections: Section[];
  activeSection: string;
  onSection: (id: string) => void;
  search: string;
  onSearch: (s: string) => void;
  onLogout: () => void;
}

export function TopBar({ user, sections, activeSection, onSection, search, onSearch, onLogout }: Props) {
  const initials = user.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="topbar">
      <div className="user-chip">
        <div className="avatar">{initials || <Icons.user />}</div>
        <div>
          <div className="name">{user.displayName}</div>
          <div className="role">{user.role === 'admin' ? 'Администратор' : user.permissions.manageCatalog ? 'Редактор каталога' : 'Пользователь'}</div>
        </div>
        <button className="logout" onClick={onLogout}>
          Выйти
        </button>
      </div>
      <nav className="tabs" aria-label="Разделы">
        <button className={activeSection === 'all' ? 'active' : ''} onClick={() => onSection('all')}>
          Все
        </button>
        {sections.map((s) => (
          <button key={s.id} className={activeSection === s.id ? 'active' : ''} onClick={() => onSection(s.id)}>
            {s.name}
          </button>
        ))}
      </nav>
      <label className="search">
        <Icons.search />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Поиск программ..." aria-label="Поиск" />
        {search && (
          <button className="btn-icon" style={{ color: '#fff', width: 24, height: 24 }} onClick={() => onSearch('')} aria-label="Очистить">
            <Icons.close size={14} />
          </button>
        )}
      </label>
    </header>
  );
}
