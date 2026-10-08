import { useEffect, useState } from 'react';
import type { AppSettings, AuditEntry, Catalog, PublicUser, Section } from '../../shared/types';
import { api, isElectron } from '../api';
import { Icons } from '../icons';
import { useConfirm, useToast } from './ui';
import { SectionForm } from './Forms';

interface Props {
  user: PublicUser;
  catalog: Catalog;
  onCatalogChanged: () => Promise<void>;
}

export function SettingsView({ user, catalog, onCatalogChanged }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user.role === 'admin';
  const canEdit = isAdmin || user.permissions.manageCatalog;

  const [appsRoot, setAppsRoot] = useState(catalog.settings.appsRoot);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [sectionForm, setSectionForm] = useState<{ open: boolean; initial: Section | null }>({ open: false, initial: null });

  useEffect(() => setAppsRoot(catalog.settings.appsRoot), [catalog.settings.appsRoot]);

  const reloadAdmin = async () => {
    if (!isAdmin) return;
    setUsers(await api.users.list());
    setAudit(await api.catalog.audit());
  };
  useEffect(() => {
    void reloadAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const saveSettings = async () => {
    const res = await api.catalog.saveSettings({ appsRoot } as AppSettings);
    if (!res.ok) return toast(res.message ?? 'Ошибка', 'error');
    toast('Настройки сохранены', 'success');
    await onCatalogChanged();
  };

  const togglePerm = async (u: PublicUser) => {
    const res = await api.users.setPermissions(u.id, { manageCatalog: !u.permissions.manageCatalog });
    if (!res.ok) return toast(res.message ?? 'Ошибка', 'error');
    await reloadAdmin();
  };
  const setRole = async (u: PublicUser, role: PublicUser['role']) => {
    const res = await api.users.setRole(u.id, role);
    if (!res.ok) return toast(res.message ?? 'Ошибка', 'error');
    await reloadAdmin();
  };

  const deleteSection = async (s: Section) => {
    if (!(await confirm({ title: 'Удалить раздел?', message: `Раздел «${s.name}» будет удалён. Удалить можно только пустой раздел.`, confirmText: 'Удалить', danger: true }))) return;
    const res = await api.catalog.deleteSection(s.id);
    if (!res.ok) return toast(res.message ?? 'Ошибка', 'error');
    await onCatalogChanged();
  };

  return (
    <div className="settings">
      <div className="section-card">
        <h3>Папка установки</h3>
        <p className="sub">Внешние программы устанавливаются в подпапки этой папки. Команды установки выполняются в ней через cmd.</p>
        <div className="inline-row">
          <input className="input mono" value={appsRoot} onChange={(e) => setAppsRoot(e.target.value)} disabled={!isAdmin} />
          {isAdmin && isElectron && (
            <button
              className="btn btn-outline"
              onClick={async () => {
                const dir = await api.system.chooseFolder();
                if (dir) setAppsRoot(dir);
              }}
            >
              <Icons.folder /> Выбрать
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-primary" onClick={saveSettings} disabled={appsRoot === catalog.settings.appsRoot}>
              Сохранить
            </button>
          )}
        </div>
      </div>

      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3>Разделы каталога</h3>
            <p className="sub">Состав разделов настраивается без пересборки приложения.</p>
          </div>
          {canEdit && (
            <button className="btn btn-soft btn-sm" onClick={() => setSectionForm({ open: true, initial: null })}>
              <Icons.plus /> Добавить раздел
            </button>
          )}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Содержимое</th>
              <th>Записей</th>
              {canEdit && <th style={{ width: 90 }} />}
            </tr>
          </thead>
          <tbody>
            {[...catalog.sections]
              .sort((a, b) => a.order - b.order)
              .map((s) => {
                const count = s.kind === 'apps' ? catalog.programs.filter((p) => p.sectionId === s.id).length : catalog.tables.filter((t) => t.sectionId === s.id).length;
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.kind === 'apps' ? 'Программы' : 'Таблицы'}</td>
                    <td>{count}</td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn-icon" onClick={() => setSectionForm({ open: true, initial: s })} aria-label="Изменить">
                            <Icons.edit />
                          </button>
                          <button className="btn-icon" onClick={() => deleteSection(s)} aria-label="Удалить" disabled={count > 0} style={{ opacity: count > 0 ? 0.35 : 1 }}>
                            <Icons.trash />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <div className="section-card">
          <h3>Пользователи и права</h3>
          <p className="sub">Администратор может выдавать и отзывать право добавлять ПО и таблицы в каталог.</p>
          <table className="table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Логин</th>
                <th>Роль</th>
                <th>Управление каталогом</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.displayName}</td>
                  <td>{u.login}</td>
                  <td>
                    <select className="select" style={{ padding: '6px 8px', width: 'auto' }} value={u.role} onChange={(e) => setRole(u, e.target.value as PublicUser['role'])} disabled={u.login === 'admin' || u.id === user.id}>
                      <option value="user">Пользователь</option>
                      <option value="admin">Администратор</option>
                    </select>
                  </td>
                  <td>
                    <button className={`switch ${u.role === 'admin' || u.permissions.manageCatalog ? 'on' : ''}`} disabled={u.role === 'admin'} onClick={() => togglePerm(u)} aria-label="Право управления каталогом" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && audit.length > 0 && (
        <div className="section-card">
          <h3>Журнал изменений каталога</h3>
          <p className="sub">Последние действия пользователей с указанием времени.</p>
          <table className="table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Пользователь</th>
                <th>Действие</th>
                <th>Объект</th>
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 30).map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(a.at).toLocaleString('ru-RU')}</td>
                  <td>{a.user}</td>
                  <td>{a.action}</td>
                  <td>{a.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-card">
        <h3>О программе</h3>
        <p className="sub" style={{ margin: 0 }}>
          AppSSR v0.1 — макет без базы данных. Данные хранятся локально в JSON-файле, пароли — только в виде хэшей с солью. Режим: {isElectron ? `Electron (${api.platform})` : 'браузер (демо)'}.
        </p>
      </div>

      {sectionForm.open && (
        <SectionForm
          initial={sectionForm.initial}
          defaultKind="apps"
          onClose={() => setSectionForm({ open: false, initial: null })}
          onSave={async (s) => {
            const res = await api.catalog.saveSection(s);
            if (!res.ok) return res.message ?? 'Ошибка';
            await onCatalogChanged();
            return null;
          }}
        />
      )}
    </div>
  );
}
