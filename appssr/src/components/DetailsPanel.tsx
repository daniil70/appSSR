import { useEffect, useRef } from 'react';
import type { Program, ProgramStatus, Section, TableLink } from '../../shared/types';
import { AppIcon, Icons } from '../icons';
import { ActionButton } from './Cards';

interface ProgramPanelProps {
  program: Program;
  section?: Section;
  status?: ProgramStatus;
  log: string;
  canEdit: boolean;
  onClose: () => void;
  onInstall: () => void;
  onOpen: () => void;
  onRemove: () => void;
  onEdit: () => void;
}

export function ProgramPanel({ program, section, status, log, canEdit, onClose, onInstall, onOpen, onRemove, onEdit }: ProgramPanelProps) {
  const logRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const state = status?.state ?? 'not_installed';
  const stateChip =
    state === 'installed' ? <span className="chip green">Установлена</span> : state === 'installing' ? <span className="chip">Идёт установка</span> : state === 'error' ? <span className="chip red">Ошибка</span> : !program.available ? <span className="chip amber">Нет репозитория</span> : <span className="chip gray">Не установлена</span>;

  return (
    <aside className="panel">
      <button className="btn-icon close" onClick={onClose} aria-label="Закрыть панель">
        <Icons.close />
      </button>
      <div className="panel-head">
        <AppIcon icon={program.icon} color={program.color} size={72} />
        <div>
          <h2>{program.name}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="chip">{section?.name ?? '—'}</span>
            {stateChip}
          </div>
        </div>
      </div>

      <div className="panel-actions">
        <div className={state === 'installed' && program.type === 'external' ? '' : 'span2'}>
          <div style={{ display: 'grid' }}>
            <ActionButton program={program} status={status} onInstall={onInstall} onOpen={onOpen} size="lg" />
          </div>
        </div>
        {state === 'installed' && program.type === 'external' && (
          <button className="btn btn-outline" onClick={onRemove}>
            <Icons.trash /> Удалить
          </button>
        )}
        {canEdit && (
          <button className="btn btn-ghost span2" onClick={onEdit}>
            <Icons.edit /> Редактировать карточку
          </button>
        )}
      </div>

      {state === 'installing' && (
        <div className="status-banner info" style={{ display: 'block' }}>
          Выполняется команда установки, интерфейс остаётся доступным.
          <div className="progress">
            <i />
          </div>
        </div>
      )}
      {state === 'error' && (
        <div className="status-banner error">
          <Icons.alert />
          <span>{status?.error}</span>
        </div>
      )}
      {(log || status?.log) && (
        <>
          <h4>Вывод команды</h4>
          <pre ref={logRef} className="code log">
            {log || status?.log}
          </pre>
        </>
      )}

      <h4>О программе</h4>
      <p>{program.description}</p>

      {program.features.length > 0 && (
        <>
          <h4>Основные возможности</h4>
          <ul className="features">
            {program.features.map((f) => (
              <li key={f}>
                <Icons.check />
                {f}
              </li>
            ))}
          </ul>
        </>
      )}

      {program.type === 'external' && (
        <>
          <h4>Установка</h4>
          {program.installCommand ? <code className="code">{program.installCommand}</code> : <p style={{ color: 'var(--muted)' }}>Команда установки ещё не задана.</p>}
        </>
      )}

      <div className="meta">
        <div>
          <span>Версия</span>
          <span>{program.version ?? '—'}</span>
        </div>
        <div>
          <span>Разработчик</span>
          <span>{program.developer ?? '—'}</span>
        </div>
        <div>
          <span>Размер</span>
          <span>{program.size ?? '—'}</span>
        </div>
        <div>
          <span>Категория</span>
          <span>{section?.name ?? '—'}</span>
        </div>
        <div>
          <span>Тип</span>
          <span>{program.type === 'builtin' ? 'Встроенная' : 'Внешняя (GitLab)'}</span>
        </div>
        {program.type === 'external' && (
          <>
            <div>
              <span>Папка</span>
              <span>{status?.resolvedDir ?? '—'}</span>
            </div>
            <div>
              <span>Исполняемый файл</span>
              <span>{program.exePath ?? '—'}</span>
            </div>
          </>
        )}
        <div>
          <span>Дата обновления</span>
          <span>{program.updatedAt ?? '—'}</span>
        </div>
      </div>
    </aside>
  );
}

interface TablePanelProps {
  table: TableLink;
  section?: Section;
  canEdit: boolean;
  onClose: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TablePanel({ table, section, canEdit, onClose, onOpen, onEdit, onDelete }: TablePanelProps) {
  return (
    <aside className="panel">
      <button className="btn-icon close" onClick={onClose} aria-label="Закрыть панель">
        <Icons.close />
      </button>
      <div className="panel-head">
        <AppIcon icon="table" color="#0e8c8c" size={72} />
        <div>
          <h2>{table.name}</h2>
          <span className="chip green">{section?.name ?? 'Таблицы'}</span>
        </div>
      </div>
      <div className="panel-actions">
        <button className="btn btn-primary span2" onClick={onOpen}>
          <Icons.open /> Открыть в браузере
        </button>
        {canEdit && (
          <>
            <button className="btn btn-outline" onClick={onEdit}>
              <Icons.edit /> Изменить
            </button>
            <button className="btn btn-danger" onClick={onDelete}>
              <Icons.trash /> Удалить
            </button>
          </>
        )}
      </div>
      <h4>Описание</h4>
      <p>{table.description || 'Описание не задано.'}</p>
      <h4>Ссылка</h4>
      <code className="code">{table.url}</code>
      <div className="meta">
        <div>
          <span>Раздел</span>
          <span>{section?.name ?? '—'}</span>
        </div>
        <div>
          <span>Добавил</span>
          <span>{table.createdBy ?? '—'}</span>
        </div>
        <div>
          <span>Дата добавления</span>
          <span>{new Date(table.createdAt).toLocaleDateString('ru-RU')}</span>
        </div>
      </div>
      <div className="status-banner info" style={{ marginTop: 18 }}>
        <Icons.alert />
        <span>Авторизация в Synology выполняется средствами самого Synology.</span>
      </div>
    </aside>
  );
}
