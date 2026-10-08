import type { Program, ProgramStatus, Section, TableLink } from '../../shared/types';
import { AppIcon, Icons } from '../icons';
import { CardMenu } from './ui';

export function ActionButton({ program, status, onInstall, onOpen, size = 'sm' }: { program: Program; status?: ProgramStatus; onInstall: () => void; onOpen: () => void; size?: 'sm' | 'lg' }) {
  const cls = `btn ${size === 'sm' ? 'btn-sm' : ''}`;
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  if (!program.available) {
    return (
      <button className={`${cls} btn-outline`} disabled>
        Скоро
      </button>
    );
  }
  switch (status?.state) {
    case 'installed':
      return (
        <button className={`${cls} btn-primary`} onClick={stop(onOpen)}>
          <Icons.open /> Открыть
        </button>
      );
    case 'installing':
      return (
        <button className={`${cls} btn-primary`} disabled>
          <span className="spinner" /> Идёт установка
        </button>
      );
    case 'error':
      return (
        <button className={`${cls} btn-danger`} onClick={stop(onInstall)}>
          <Icons.alert /> Ошибка · повторить
        </button>
      );
    default:
      return (
        <button className={`${cls} btn-soft`} onClick={stop(onInstall)}>
          <Icons.download /> Установить
        </button>
      );
  }
}

interface ProgramCardProps {
  program: Program;
  section?: Section;
  status?: ProgramStatus;
  selected: boolean;
  favorite: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onInstall: () => void;
  onOpen: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export function ProgramCard(p: ProgramCardProps) {
  const menu = [
    ...(p.status?.state === 'installed' && p.program.type === 'external' ? [{ label: 'Удалить программу', icon: <Icons.trash />, onClick: p.onRemove }] : []),
    ...(p.status?.state === 'error' ? [{ label: 'Повторить установку', icon: <Icons.refresh />, onClick: p.onInstall }] : []),
    ...(p.canEdit
      ? [
          { label: 'Редактировать карточку', icon: <Icons.edit />, onClick: p.onEdit },
          { label: 'Удалить из каталога', icon: <Icons.trash />, danger: true, onClick: p.onDelete },
        ]
      : []),
  ];
  return (
    <article className={`card ${p.selected ? 'selected' : ''} ${p.program.available ? '' : 'disabled'}`} onClick={p.onSelect}>
      <button
        className={`btn-icon fav-btn ${p.favorite ? 'on' : ''}`}
        aria-label="В избранное"
        onClick={(e) => {
          e.stopPropagation();
          p.onToggleFavorite();
        }}
      >
        {p.favorite ? <Icons.starFilled size={16} /> : <Icons.star size={16} />}
      </button>
      {menu.length > 0 && <CardMenu items={menu} />}
      <AppIcon icon={p.program.icon} color={p.program.color} />
      <h3>{p.program.name}</h3>
      <span className="chip">{p.section?.name ?? '—'}</span>
      <p className="desc">{p.program.shortDescription}</p>
      <div className="card-actions">
        <ActionButton program={p.program} status={p.status} onInstall={p.onInstall} onOpen={p.onOpen} />
      </div>
    </article>
  );
}

interface TableCardProps {
  table: TableLink;
  section?: Section;
  selected: boolean;
  favorite: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export function TableCard(p: TableCardProps) {
  const menu = p.canEdit
    ? [
        { label: 'Редактировать ссылку', icon: <Icons.edit />, onClick: p.onEdit },
        { label: 'Удалить таблицу', icon: <Icons.trash />, danger: true, onClick: p.onDelete },
      ]
    : [];
  return (
    <article className={`card ${p.selected ? 'selected' : ''}`} onClick={p.onSelect}>
      <button
        className={`btn-icon fav-btn ${p.favorite ? 'on' : ''}`}
        aria-label="В избранное"
        onClick={(e) => {
          e.stopPropagation();
          p.onToggleFavorite();
        }}
      >
        {p.favorite ? <Icons.starFilled size={16} /> : <Icons.star size={16} />}
      </button>
      {menu.length > 0 && <CardMenu items={menu} />}
      <AppIcon icon="table" color="#0e8c8c" />
      <h3>{p.table.name}</h3>
      <span className="chip green">{p.section?.name ?? 'Таблицы'}</span>
      <p className="desc">{p.table.description || <span className="link-url">{p.table.url}</span>}</p>
      <div className="card-actions">
        <button
          className="btn btn-sm btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            p.onOpen();
          }}
        >
          <Icons.open /> Открыть
        </button>
      </div>
    </article>
  );
}
