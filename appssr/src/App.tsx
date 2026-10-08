import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Catalog, Program, ProgramStatus, PublicUser, TableLink } from '../shared/types';
import { api } from './api';
import { Icons } from './icons';
import { Login } from './components/Login';
import { TopBar } from './components/TopBar';
import { Sidebar, type View } from './components/Sidebar';
import { ProgramCard, TableCard } from './components/Cards';
import { ProgramPanel, TablePanel } from './components/DetailsPanel';
import { ProgramForm, TableForm, emptyProgram } from './components/Forms';
import { SettingsView } from './components/SettingsView';
import { UiProvider, useConfirm, useToast } from './components/ui';

const PAGE_SIZE = 9;
type Selected = { kind: 'program' | 'table'; id: string } | null;
type SortKey = 'popularity' | 'name' | 'updated';

export default function App() {
  return (
    <UiProvider>
      <div className="deco" />
      <Root />
    </UiProvider>
  );
}

function Root() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    api.auth.current().then((u) => {
      setUser(u);
      setChecking(false);
    });
  }, []);
  if (checking) return null;
  if (!user) return <Login onLogin={setUser} />;
  return (
    <Shell
      user={user}
      onLogout={async () => {
        await api.auth.logout();
        setUser(null);
      }}
      onUserChanged={setUser}
    />
  );
}

function Shell({ user, onLogout, onUserChanged }: { user: PublicUser; onLogout: () => void; onUserChanged: (u: PublicUser) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canEdit = user.role === 'admin' || user.permissions.manageCatalog;

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ProgramStatus>>({});
  const [logs, setLogs] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [view, setView] = useState<View>('all');
  const [section, setSection] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('popularity');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Selected>(null);
  const [programForm, setProgramForm] = useState<Program | null>(null);
  const [tableForm, setTableForm] = useState<{ open: boolean; initial: TableLink | null }>({ open: false, initial: null });

  const reloadCatalog = useCallback(async () => {
    const [c, s, f] = await Promise.all([api.catalog.get(), api.programs.statuses(), api.system.favorites()]);
    setCatalog(c);
    setStatuses(s);
    setFavorites(f);
  }, []);
  const refreshStatuses = useCallback(async () => setStatuses(await api.programs.statuses()), []);

  useEffect(() => {
    void reloadCatalog();
    // Актуализируем права текущего пользователя (их мог изменить администратор).
    const t = setInterval(() => api.auth.current().then((u) => u && onUserChanged(u)), 15000);
    return () => clearInterval(t);
  }, [reloadCatalog, onUserChanged]);

  // Статус «установлена» определяется по файловой системе — периодически перечитываем.
  useEffect(() => {
    const t = setInterval(refreshStatuses, 5000);
    const onFocus = () => void refreshStatuses();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshStatuses]);

  useEffect(
    () =>
      api.programs.onInstallEvent((e) => {
        if (e.type === 'started') {
          setLogs((l) => ({ ...l, [e.programId]: '' }));
          void refreshStatuses();
        } else if (e.type === 'log') {
          setLogs((l) => ({ ...l, [e.programId]: (l[e.programId] ?? '') + e.chunk }));
        } else {
          void refreshStatuses();
          const name = catalog?.programs.find((p) => p.id === e.programId)?.name ?? 'Программа';
          if (e.ok) toast(`${name}: установка завершена`, 'success');
          else toast(`${name}: установка не выполнена${e.code !== null ? ` (код ${e.code})` : ''}. Подробности — в карточке программы.`, 'error');
        }
      }),
    [catalog, refreshStatuses, toast],
  );

  const sections = useMemo(() => [...(catalog?.sections ?? [])].sort((a, b) => a.order - b.order), [catalog]);
  const appSections = sections.filter((s) => s.kind === 'apps');
  const tableSections = sections.filter((s) => s.kind === 'tables');
  const sectionById = (id: string) => sections.find((s) => s.id === id);
  const activeSectionObj = sectionById(section);

  const showTables = view === 'tables' || (view !== 'settings' && activeSectionObj?.kind === 'tables');

  const q = search.trim().toLowerCase();
  const match = (...fields: (string | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q));

  const programs = useMemo(() => {
    if (!catalog) return [];
    let list = catalog.programs.filter((p) => match(p.name, p.shortDescription, p.description, sectionById(p.sectionId)?.name));
    if (section !== 'all' && activeSectionObj?.kind === 'apps') list = list.filter((p) => p.sectionId === section);
    if (view === 'installed') list = list.filter((p) => statuses[p.id]?.state === 'installed');
    if (view === 'favorites') list = list.filter((p) => favorites.includes(p.id));
    const by: Record<SortKey, (a: Program, b: Program) => number> = {
      popularity: (a, b) => b.popularity - a.popularity,
      name: (a, b) => a.name.localeCompare(b.name, 'ru'),
      updated: (a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
    };
    return [...list].sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, q, section, view, statuses, favorites, sort]);

  const tables = useMemo(() => {
    if (!catalog) return [];
    let list = catalog.tables.filter((t) => match(t.name, t.description, t.url));
    if (section !== 'all' && activeSectionObj?.kind === 'tables') list = list.filter((t) => t.sectionId === section);
    if (view === 'favorites') list = list.filter((t) => favorites.includes(t.id));
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, q, section, view, favorites]);

  const items: ({ kind: 'program'; item: Program } | { kind: 'table'; item: TableLink })[] = showTables
    ? tables.map((t) => ({ kind: 'table', item: t }))
    : view === 'favorites'
      ? [...programs.map((p) => ({ kind: 'program' as const, item: p })), ...tables.map((t) => ({ kind: 'table' as const, item: t }))]
      : programs.map((p) => ({ kind: 'program', item: p }));

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => setPage(1), [view, section, q, sort]);

  // ---- actions ----------------------------------------------------------
  const programById = (id: string) => catalog?.programs.find((p) => p.id === id);

  const install = async (p: Program) => {
    const res = await api.programs.install(p.id);
    if (!res.ok) toast(res.message ?? 'Не удалось начать установку', 'error');
    void refreshStatuses();
  };
  const open = async (p: Program) => {
    const res = await api.programs.open(p.id);
    if (res.ok) {
      if (res.message) toast(res.message);
      return;
    }
    if (res.exeMissing) {
      const yes = await confirm({ title: 'Файл не найден', message: res.message, confirmText: 'Переустановить' });
      if (yes) {
        await api.programs.remove(p.id);
        await install(p);
      }
    } else toast(res.message ?? 'Не удалось запустить программу', 'error');
  };
  const remove = async (p: Program) => {
    const yes = await confirm({ title: 'Удалить программу?', message: `Папка «${statuses[p.id]?.resolvedDir}» будет удалена. Карточка вернётся в состояние «не установлена».`, confirmText: 'Удалить', danger: true });
    if (!yes) return;
    const res = await api.programs.remove(p.id);
    if (!res.ok) toast(res.message ?? 'Не удалось удалить', 'error');
    else toast(`${p.name} удалена`, 'success');
    setLogs((l) => ({ ...l, [p.id]: '' }));
    void refreshStatuses();
  };
  const deleteProgram = async (p: Program) => {
    const yes = await confirm({ title: 'Удалить из каталога?', message: `Карточка «${p.name}» будет удалена из каталога для всех пользователей. Файлы на диске не затрагиваются.`, confirmText: 'Удалить', danger: true });
    if (!yes) return;
    const res = await api.catalog.deleteProgram(p.id);
    if (!res.ok) return toast(res.message ?? 'Ошибка', 'error');
    if (selected?.id === p.id) setSelected(null);
    await reloadCatalog();
  };
  const openTable = async (t: TableLink) => {
    const res = await api.system.openExternal(t.url);
    if (!res.ok) toast(res.message ?? 'Не удалось открыть ссылку', 'error');
  };
  const deleteTable = async (t: TableLink) => {
    const yes = await confirm({ title: 'Удалить таблицу?', message: `Ссылка «${t.name}» будет удалена из каталога.`, confirmText: 'Удалить', danger: true });
    if (!yes) return;
    const res = await api.catalog.deleteTable(t.id);
    if (!res.ok) return toast(res.message ?? 'Ошибка', 'error');
    if (selected?.id === t.id) setSelected(null);
    await reloadCatalog();
  };
  const toggleFavorite = async (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
    setFavorites(next);
    await api.system.setFavorites(next);
  };

  if (!catalog) return null;

  const selectedProgram = selected?.kind === 'program' ? programById(selected.id) : undefined;
  const selectedTable = selected?.kind === 'table' ? catalog.tables.find((t) => t.id === selected.id) : undefined;
  const panelOpen = Boolean(selectedProgram || selectedTable) && view !== 'settings';

  const title = view === 'settings' ? 'Настройки' : view === 'installed' ? 'Установленные' : view === 'favorites' ? 'Избранное' : showTables ? 'Таблицы' : 'Приложения';
  const subtitle =
    view === 'settings'
      ? 'Папка установки, разделы каталога, пользователи и права.'
      : showTables
        ? 'Ссылки на таблицы с аналитикой в Synology. Открываются в браузере по умолчанию.'
        : view === 'installed'
          ? 'Программы, файлы которых найдены в папке установки.'
          : 'Выберите программу из каталога, чтобы установить или открыть.';

  const defaultTableSection = (activeSectionObj?.kind === 'tables' ? activeSectionObj.id : tableSections[0]?.id) ?? '';
  const defaultAppSection = (activeSectionObj?.kind === 'apps' ? activeSectionObj.id : appSections[0]?.id) ?? '';

  return (
    <div className="shell">
      <TopBar
        user={user}
        sections={sections}
        activeSection={section}
        onSection={(id) => {
          setSection(id);
          if (view === 'settings') setView('all');
          const s = sectionById(id);
          if (s?.kind === 'tables') setView('tables');
          else if (view === 'tables') setView('all');
        }}
        search={search}
        onSearch={setSearch}
        onLogout={onLogout}
      />
      <div className={`body ${panelOpen ? 'with-panel' : ''}`}>
        <Sidebar
          view={view}
          onView={(v) => {
            setView(v);
            if (v === 'tables' && activeSectionObj?.kind === 'apps') setSection('all');
            if ((v === 'all' || v === 'installed') && activeSectionObj?.kind === 'tables') setSection('all');
          }}
          counts={{
            all: catalog.programs.length,
            installed: catalog.programs.filter((p) => statuses[p.id]?.state === 'installed').length,
            tables: catalog.tables.length,
          }}
        />

        <main className="content">
          <div className="content-head">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {view !== 'settings' && (
              <div className="head-actions">
                {canEdit && showTables && tableSections.length > 0 && (
                  <button className="btn btn-primary" onClick={() => setTableForm({ open: true, initial: null })}>
                    <Icons.plus /> Добавить таблицу
                  </button>
                )}
                {canEdit && !showTables && view !== 'favorites' && appSections.length > 0 && (
                  <button className="btn btn-primary" onClick={() => setProgramForm(emptyProgram(defaultAppSection))}>
                    <Icons.plus /> Добавить ПО
                  </button>
                )}
                {!showTables && (
                  <label className="sort">
                    <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Сортировка">
                      <option value="popularity">По популярности</option>
                      <option value="name">По названию</option>
                      <option value="updated">По дате обновления</option>
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>

          {view === 'settings' ? (
            <SettingsView user={user} catalog={catalog} onCatalogChanged={reloadCatalog} />
          ) : pageItems.length === 0 ? (
            <div className="empty">
              {showTables ? <Icons.table size={40} /> : <Icons.grid size={40} />}
              <h3>{q ? 'Ничего не найдено' : showTables ? 'Таблиц пока нет' : view === 'installed' ? 'Нет установленных программ' : view === 'favorites' ? 'Избранное пусто' : 'В этом разделе пока нет программ'}</h3>
              <p>{q ? 'Попробуйте изменить запрос.' : canEdit && showTables ? 'Добавьте первую ссылку кнопкой «Добавить таблицу».' : view === 'favorites' ? 'Отмечайте карточки звёздочкой, чтобы они появились здесь.' : ''}</p>
            </div>
          ) : (
            <>
              <div className="grid">
                {pageItems.map((it) =>
                  it.kind === 'program' ? (
                    <ProgramCard
                      key={it.item.id}
                      program={it.item}
                      section={sectionById(it.item.sectionId)}
                      status={statuses[it.item.id]}
                      selected={selected?.id === it.item.id}
                      favorite={favorites.includes(it.item.id)}
                      canEdit={canEdit}
                      onSelect={() => setSelected({ kind: 'program', id: it.item.id })}
                      onInstall={() => install(it.item)}
                      onOpen={() => open(it.item)}
                      onRemove={() => remove(it.item)}
                      onEdit={() => setProgramForm(it.item)}
                      onDelete={() => deleteProgram(it.item)}
                      onToggleFavorite={() => toggleFavorite(it.item.id)}
                    />
                  ) : (
                    <TableCard
                      key={it.item.id}
                      table={it.item}
                      section={sectionById(it.item.sectionId)}
                      selected={selected?.id === it.item.id}
                      favorite={favorites.includes(it.item.id)}
                      canEdit={canEdit}
                      onSelect={() => setSelected({ kind: 'table', id: it.item.id })}
                      onOpen={() => openTable(it.item)}
                      onEdit={() => setTableForm({ open: true, initial: it.item })}
                      onDelete={() => deleteTable(it.item)}
                      onToggleFavorite={() => toggleFavorite(it.item.id)}
                    />
                  ),
                )}
              </div>
              {pageCount > 1 && (
                <div className="pagination">
                  <button disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="Назад">
                    <Icons.arrowLeft />
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                    <button key={n} className={n === safePage ? 'active' : ''} onClick={() => setPage(n)}>
                      {n}
                    </button>
                  ))}
                  <button disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)} aria-label="Вперёд">
                    <Icons.arrowRight />
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {panelOpen && selectedProgram && (
          <ProgramPanel
            program={selectedProgram}
            section={sectionById(selectedProgram.sectionId)}
            status={statuses[selectedProgram.id]}
            log={logs[selectedProgram.id] ?? ''}
            canEdit={canEdit}
            onClose={() => setSelected(null)}
            onInstall={() => install(selectedProgram)}
            onOpen={() => open(selectedProgram)}
            onRemove={() => remove(selectedProgram)}
            onEdit={() => setProgramForm(selectedProgram)}
          />
        )}
        {panelOpen && selectedTable && (
          <TablePanel
            table={selectedTable}
            section={sectionById(selectedTable.sectionId)}
            canEdit={canEdit}
            onClose={() => setSelected(null)}
            onOpen={() => openTable(selectedTable)}
            onEdit={() => setTableForm({ open: true, initial: selectedTable })}
            onDelete={() => deleteTable(selectedTable)}
          />
        )}
      </div>

      {programForm && (
        <ProgramForm
          initial={programForm}
          sections={appSections}
          onClose={() => setProgramForm(null)}
          onSave={async (p) => {
            const res = await api.catalog.saveProgram(p);
            if (!res.ok) return res.message ?? 'Ошибка сохранения';
            await reloadCatalog();
            toast('Карточка сохранена', 'success');
            return null;
          }}
        />
      )}
      {tableForm.open && (
        <TableForm
          initial={tableForm.initial}
          sections={tableSections}
          defaultSectionId={defaultTableSection}
          onClose={() => setTableForm({ open: false, initial: null })}
          onSave={async (t) => {
            const res = await api.catalog.saveTable(t);
            if (!res.ok) return res.message ?? 'Ошибка сохранения';
            await reloadCatalog();
            toast('Таблица сохранена', 'success');
            return null;
          }}
        />
      )}
    </div>
  );
}
