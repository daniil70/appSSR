import { useState, type FormEvent } from 'react';
import type { IconKey, Program, Section, TableLink } from '../../shared/types';
import { AppIcon, Icons } from '../icons';
import { Modal } from './ui';

const ICONS: IconKey[] = ['app', 'assessment', 'analytics', 'lif', 'bc', 'doc', 'shield', 'cloud', 'drive', 'table'];
const COLORS = ['#1769e0', '#1b8a5a', '#6a3fd6', '#d97706', '#0e8c8c', '#d64545', '#2c8cff', '#15233a'];

export function emptyProgram(sectionId: string): Program {
  return {
    id: '',
    name: '',
    sectionId,
    type: 'external',
    shortDescription: '',
    description: '',
    features: [],
    icon: 'app',
    color: '#1769e0',
    installCommand: '',
    repoUrl: '',
    installDir: '',
    exePath: '',
    version: '1.0.0',
    developer: 'SSR',
    size: '—',
    updatedAt: new Date().toISOString().slice(0, 10),
    available: true,
    popularity: 50,
  };
}

interface ProgramFormProps {
  initial: Program;
  sections: Section[];
  onSave: (p: Program) => Promise<string | null>;
  onClose: () => void;
}

export function ProgramForm({ initial, sections, onSave, onClose }: ProgramFormProps) {
  const [p, setP] = useState<Program>({ ...initial, features: [...initial.features] });
  const [feature, setFeature] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Program>(k: K, v: Program[K]) => setP((x) => ({ ...x, [k]: v }));

  // Папка установки по умолчанию выводится из команды (имя репозитория).
  const suggestedDir = (() => {
    const m = p.installCommand?.match(/([^/\s"']+?)(?:\.git)?["']?\s*$/);
    return m?.[1] || p.id || 'program';
  })();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const err = await onSave(p);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Modal
      title={initial.id ? 'Редактирование программы' : 'Новая программа'}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" type="submit" form="program-form" disabled={busy}>
            {busy && <span className="spinner" />} Сохранить
          </button>
        </>
      }
    >
      <form id="program-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <AppIcon icon={p.icon} color={p.color} size={64} />
          <div style={{ flex: 1 }}>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Иконка</label>
              <div className="tag-list">
                {ICONS.map((ic) => (
                  <button type="button" key={ic} className={`btn-icon ${p.icon === ic ? 'active' : ''}`} style={{ border: p.icon === ic ? '2px solid var(--primary)' : '1px solid var(--border)', width: 36, height: 36 }} onClick={() => set('icon', ic)} aria-label={ic}>
                    <AppIcon icon={ic} color={p.color} size={26} />
                  </button>
                ))}
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Цвет</label>
              <div className="tag-list">
                {COLORS.map((c) => (
                  <button type="button" key={c} onClick={() => set('color', c)} aria-label={c} style={{ width: 26, height: 26, borderRadius: 8, background: c, border: p.color === c ? '3px solid #fff' : '0', boxShadow: p.color === c ? `0 0 0 2px ${c}` : 'none' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="pf-name">Название *</label>
            <input id="pf-name" className="input" value={p.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="pf-section">Раздел *</label>
            <select id="pf-section" className="select" value={p.sectionId} onChange={(e) => set('sectionId', e.target.value)}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="pf-short">Краткое описание</label>
          <input id="pf-short" className="input" value={p.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="pf-desc">Описание</label>
          <textarea id="pf-desc" className="textarea" value={p.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="field">
          <label>Основные возможности</label>
          <div className="tag-list" style={{ marginBottom: p.features.length ? 8 : 0 }}>
            {p.features.map((f, i) => (
              <span className="tag" key={`${f}-${i}`}>
                {f}
                <button type="button" onClick={() => set('features', p.features.filter((_, j) => j !== i))} aria-label="Убрать">
                  <Icons.close size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="inline-row">
            <input
              className="input"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="Добавить пункт и нажать Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && feature.trim()) {
                  e.preventDefault();
                  set('features', [...p.features, feature.trim()]);
                  setFeature('');
                }
              }}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="pf-type">Тип</label>
            <select id="pf-type" className="select" value={p.type} onChange={(e) => set('type', e.target.value as Program['type'])}>
              <option value="external">Внешняя (установка из GitLab)</option>
              <option value="builtin">Встроенная в AppSSR</option>
            </select>
          </div>
          <div className="field">
            <label>Доступность</label>
            <label className="checkbox" style={{ padding: '10px 0' }}>
              <input type="checkbox" checked={p.available} onChange={(e) => set('available', e.target.checked)} /> Доступна для установки
            </label>
          </div>
        </div>

        {p.type === 'external' && (
          <>
            <div className="field">
              <label htmlFor="pf-cmd">Команда установки (cmd)</label>
              <input id="pf-cmd" className="input mono" value={p.installCommand ?? ''} onChange={(e) => set('installCommand', e.target.value)} placeholder='git clone https://gitlab.alabuga.space/Sibmag/<repo>.git' />
              <span className="help">Выполняется в папке установки AppSSR. Авторизация GitLab должна быть настроена на устройстве заранее.</span>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="pf-dir">Папка программы</label>
                <input id="pf-dir" className="input mono" value={p.installDir ?? ''} onChange={(e) => set('installDir', e.target.value)} placeholder={suggestedDir} />
                <span className="help">Имя подпапки в apps или абсолютный путь. По наличию файлов определяется статус «Установлена».</span>
              </div>
              <div className="field">
                <label htmlFor="pf-exe">Исполняемый файл</label>
                <input id="pf-exe" className="input mono" value={p.exePath ?? ''} onChange={(e) => set('exePath', e.target.value)} placeholder="app.exe" />
                <span className="help">Относительно папки программы. Если пусто — «Открыть» откроет папку.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="pf-repo">Адрес репозитория</label>
              <input id="pf-repo" className="input mono" value={p.repoUrl ?? ''} onChange={(e) => set('repoUrl', e.target.value)} />
            </div>
          </>
        )}

        <div className="form-row">
          <div className="field">
            <label htmlFor="pf-ver">Версия</label>
            <input id="pf-ver" className="input" value={p.version ?? ''} onChange={(e) => set('version', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-dev">Разработчик</label>
            <input id="pf-dev" className="input" value={p.developer ?? ''} onChange={(e) => set('developer', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="pf-size">Размер</label>
            <input id="pf-size" className="input" value={p.size ?? ''} onChange={(e) => set('size', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-upd">Дата обновления</label>
            <input id="pf-upd" className="input" value={p.updatedAt ?? ''} onChange={(e) => set('updatedAt', e.target.value)} placeholder="ГГГГ-ММ-ДД" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

interface TableFormProps {
  initial: TableLink | null;
  sections: Section[];
  defaultSectionId: string;
  onSave: (t: TableLink) => Promise<string | null>;
  onClose: () => void;
}

export function TableForm({ initial, sections, defaultSectionId, onSave, onClose }: TableFormProps) {
  const [t, setT] = useState<TableLink>(
    initial ?? { id: '', name: '', url: '', sectionId: defaultSectionId, description: '', createdAt: '' },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof TableLink>(k: K, v: TableLink[K]) => setT((x) => ({ ...x, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const err = await onSave(t);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Modal
      title={initial ? 'Редактирование таблицы' : 'Новая ссылка на таблицу'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" type="submit" form="table-form" disabled={busy}>
            {busy && <span className="spinner" />} Сохранить
          </button>
        </>
      }
    >
      <form id="table-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="tf-name">Название *</label>
          <input id="tf-name" className="input" value={t.name} onChange={(e) => set('name', e.target.value)} placeholder="Например: Сводная аналитика за месяц" required autoFocus />
          <span className="help">Это название будет отображаться на карточке.</span>
        </div>
        <div className="field">
          <label htmlFor="tf-url">Ссылка *</label>
          <input id="tf-url" className="input mono" type="url" value={t.url} onChange={(e) => set('url', e.target.value)} placeholder="https://synology.alabuga.space/..." required />
          <span className="help">Открывается в браузере по умолчанию.</span>
        </div>
        <div className="field">
          <label htmlFor="tf-section">Раздел</label>
          <select id="tf-section" className="select" value={t.sectionId} onChange={(e) => set('sectionId', e.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tf-desc">Описание</label>
          <textarea id="tf-desc" className="textarea" value={t.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}

interface SectionFormProps {
  initial: Section | null;
  defaultKind: Section['kind'];
  onSave: (s: Section) => Promise<string | null>;
  onClose: () => void;
}

export function SectionForm({ initial, defaultKind, onSave, onClose }: SectionFormProps) {
  const [s, setS] = useState<Section>(initial ?? { id: '', name: '', kind: defaultKind, order: 0 });
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = await onSave(s);
    if (err) setError(err);
    else onClose();
  };
  return (
    <Modal
      title={initial ? 'Редактирование раздела' : 'Новый раздел'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" type="submit" form="section-form">
            Сохранить
          </button>
        </>
      }
    >
      <form id="section-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="sf-name">Название *</label>
          <input id="sf-name" className="input" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} required autoFocus placeholder="Например: ПО Аналитика" />
        </div>
        <div className="field">
          <label htmlFor="sf-kind">Содержимое</label>
          <select id="sf-kind" className="select" value={s.kind} onChange={(e) => setS({ ...s, kind: e.target.value as Section['kind'] })} disabled={Boolean(initial)}>
            <option value="apps">Программы</option>
            <option value="tables">Таблицы</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
