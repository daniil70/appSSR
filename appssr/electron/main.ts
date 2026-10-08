import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import type {
  ActionResult,
  AppSettings,
  InstallEvent,
  Permissions,
  Program,
  ProgramStatus,
  PublicUser,
  Role,
  Section,
  TableLink,
} from '../shared/types';
import { Store, newId } from './store';
import { Installer } from './installer';

let win: BrowserWindow | null = null;
let store: Store;
let installer: Installer;
let currentUser: PublicUser | null = null;

const DEV_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'AppSSR',
    backgroundColor: '#eef3f9',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (DEV_URL) {
    void win.loadURL(DEV_URL);
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  win.on('closed', () => (win = null));
}

// ---- helpers ---------------------------------------------------------------

const ok = (message?: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

function requireUser(): PublicUser {
  if (!currentUser) throw new Error('Требуется авторизация');
  return currentUser;
}

function requireCatalogRight(): PublicUser {
  const u = requireUser();
  if (u.role !== 'admin' && !u.permissions.manageCatalog) throw new Error('Недостаточно прав для изменения каталога');
  return u;
}

function requireAdmin(): PublicUser {
  const u = requireUser();
  if (u.role !== 'admin') throw new Error('Требуются права администратора');
  return u;
}

function guarded<T extends unknown[]>(fn: (...args: T) => ActionResult | Promise<ActionResult>) {
  return async (_e: Electron.IpcMainInvokeEvent, ...args: T): Promise<ActionResult> => {
    try {
      return await fn(...args);
    } catch (err) {
      return fail((err as Error).message);
    }
  };
}

function findProgram(id: string): Program {
  const p = store.catalog.programs.find((x) => x.id === id);
  if (!p) throw new Error('Программа не найдена');
  return p;
}

function sanitizeProgram(input: Program): Program {
  const str = (v: unknown, max = 2000) => String(v ?? '').trim().slice(0, max);
  return {
    id: str(input.id, 64) || newId('p'),
    name: str(input.name, 120),
    sectionId: str(input.sectionId, 64),
    type: input.type === 'builtin' ? 'builtin' : 'external',
    shortDescription: str(input.shortDescription, 200),
    description: str(input.description),
    features: Array.isArray(input.features) ? input.features.map((f) => str(f, 120)).filter(Boolean).slice(0, 12) : [],
    icon: input.icon || 'app',
    color: /^#[0-9a-fA-F]{6}$/.test(String(input.color)) ? input.color : '#1769e0',
    installCommand: str(input.installCommand, 1000) || undefined,
    repoUrl: str(input.repoUrl, 500) || undefined,
    installDir: str(input.installDir, 500) || undefined,
    exePath: str(input.exePath, 500) || undefined,
    version: str(input.version, 40) || undefined,
    developer: str(input.developer, 120) || undefined,
    size: str(input.size, 40) || undefined,
    updatedAt: str(input.updatedAt, 40) || undefined,
    available: Boolean(input.available),
    popularity: Number.isFinite(Number(input.popularity)) ? Number(input.popularity) : 0,
  };
}

function registerIpc() {
  // auth
  ipcMain.handle('auth:login', (_e, login: string, password: string) => {
    const user = store.verifyUser(String(login ?? ''), String(password ?? ''));
    if (!user) return { ok: false, message: 'Неверный логин или пароль' };
    currentUser = user;
    return { ok: true, user };
  });
  ipcMain.handle('auth:register', (_e, login: string, password: string, displayName: string) => {
    try {
      const user = store.createUser(String(login ?? ''), String(password ?? ''), String(displayName ?? ''));
      currentUser = user;
      return { ok: true, user };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  });
  ipcMain.handle('auth:logout', () => {
    currentUser = null;
  });
  ipcMain.handle('auth:current', () => (currentUser ? store.getUser(currentUser.id) : null));

  // catalog
  ipcMain.handle('catalog:get', () => {
    requireUser();
    return store.catalog;
  });
  ipcMain.handle(
    'catalog:saveProgram',
    guarded((input: Program) => {
      const u = requireCatalogRight();
      const program = sanitizeProgram(input);
      if (!program.name) return fail('Укажите название программы');
      if (!store.catalog.sections.some((s) => s.id === program.sectionId && s.kind === 'apps')) return fail('Укажите раздел');
      let action = 'Добавил ПО';
      store.setCatalog((c) => {
        const i = c.programs.findIndex((p) => p.id === program.id);
        if (i >= 0) {
          c.programs[i] = program;
          action = 'Изменил ПО';
        } else c.programs.push(program);
      });
      store.addAudit(u.login, action, program.name);
      return ok();
    }),
  );
  ipcMain.handle(
    'catalog:deleteProgram',
    guarded((id: string) => {
      const u = requireCatalogRight();
      const p = findProgram(id);
      store.setCatalog((c) => {
        c.programs = c.programs.filter((x) => x.id !== id);
      });
      store.addAudit(u.login, 'Удалил ПО из каталога', p.name);
      return ok();
    }),
  );
  ipcMain.handle(
    'catalog:saveTable',
    guarded((input: TableLink) => {
      const u = requireCatalogRight();
      const name = String(input.name ?? '').trim().slice(0, 120);
      const url = String(input.url ?? '').trim().slice(0, 2000);
      if (!name) return fail('Укажите название таблицы');
      if (!/^https?:\/\/\S+$/i.test(url)) return fail('Ссылка должна начинаться с http:// или https://');
      const sectionId = String(input.sectionId ?? '');
      if (!store.catalog.sections.some((s) => s.id === sectionId && s.kind === 'tables')) return fail('Укажите раздел таблиц');
      const table: TableLink = {
        id: String(input.id ?? '').trim() || newId('t'),
        name,
        url,
        sectionId,
        description: String(input.description ?? '').trim().slice(0, 500) || undefined,
        createdBy: u.login,
        createdAt: input.createdAt || new Date().toISOString(),
      };
      let action = 'Добавил таблицу';
      store.setCatalog((c) => {
        const i = c.tables.findIndex((t) => t.id === table.id);
        if (i >= 0) {
          table.createdBy = c.tables[i].createdBy;
          c.tables[i] = table;
          action = 'Изменил таблицу';
        } else c.tables.push(table);
      });
      store.addAudit(u.login, action, table.name);
      return ok();
    }),
  );
  ipcMain.handle(
    'catalog:deleteTable',
    guarded((id: string) => {
      const u = requireCatalogRight();
      const t = store.catalog.tables.find((x) => x.id === id);
      if (!t) return fail('Таблица не найдена');
      store.setCatalog((c) => {
        c.tables = c.tables.filter((x) => x.id !== id);
      });
      store.addAudit(u.login, 'Удалил таблицу', t.name);
      return ok();
    }),
  );
  ipcMain.handle(
    'catalog:saveSection',
    guarded((input: Section) => {
      const u = requireCatalogRight();
      const name = String(input.name ?? '').trim().slice(0, 80);
      if (!name) return fail('Укажите название раздела');
      const section: Section = {
        id: String(input.id ?? '').trim() || newId('s'),
        name,
        kind: input.kind === 'tables' ? 'tables' : 'apps',
        order: Number(input.order) || store.catalog.sections.length + 1,
      };
      store.setCatalog((c) => {
        const i = c.sections.findIndex((s) => s.id === section.id);
        if (i >= 0) c.sections[i] = section;
        else c.sections.push(section);
      });
      store.addAudit(u.login, 'Сохранил раздел', section.name);
      return ok();
    }),
  );
  ipcMain.handle(
    'catalog:deleteSection',
    guarded((id: string) => {
      const u = requireCatalogRight();
      const s = store.catalog.sections.find((x) => x.id === id);
      if (!s) return fail('Раздел не найден');
      const used = store.catalog.programs.some((p) => p.sectionId === id) || store.catalog.tables.some((t) => t.sectionId === id);
      if (used) return fail('Раздел не пуст — сначала перенесите или удалите его записи');
      store.setCatalog((c) => {
        c.sections = c.sections.filter((x) => x.id !== id);
      });
      store.addAudit(u.login, 'Удалил раздел', s.name);
      return ok();
    }),
  );
  ipcMain.handle(
    'catalog:saveSettings',
    guarded((settings: AppSettings) => {
      const u = requireAdmin();
      const appsRoot = String(settings.appsRoot ?? '').trim();
      if (!appsRoot) return fail('Укажите папку установки');
      store.setCatalog((c) => {
        c.settings = { appsRoot };
      });
      store.addAudit(u.login, 'Изменил папку установки', appsRoot);
      return ok();
    }),
  );
  ipcMain.handle('catalog:audit', () => {
    requireAdmin();
    return store.audit;
  });

  // programs
  ipcMain.handle('programs:statuses', () => {
    requireUser();
    const result: Record<string, ProgramStatus> = {};
    for (const p of store.catalog.programs) result[p.id] = installer.status(p, store.catalog.settings);
    return result;
  });
  ipcMain.handle(
    'programs:install',
    guarded((id: string) => {
      const u = requireUser();
      return installer.install(findProgram(id), store.catalog.settings, u.login);
    }),
  );
  ipcMain.handle(
    'programs:open',
    guarded((id: string) => {
      const u = requireUser();
      return installer.open(findProgram(id), store.catalog.settings, u.login);
    }),
  );
  ipcMain.handle(
    'programs:remove',
    guarded((id: string) => {
      const u = requireUser();
      return installer.remove(findProgram(id), store.catalog.settings, u.login);
    }),
  );

  // users
  ipcMain.handle('users:list', () => {
    requireAdmin();
    return store.listUsers();
  });
  ipcMain.handle(
    'users:setPermissions',
    guarded((id: string, permissions: Permissions) => {
      const admin = requireAdmin();
      store.setPermissions(id, permissions);
      const target = store.getUser(id);
      store.addAudit(admin.login, permissions.manageCatalog ? 'Выдал право управления каталогом' : 'Отозвал право управления каталогом', target?.login ?? id);
      return ok();
    }),
  );
  ipcMain.handle(
    'users:setRole',
    guarded((id: string, role: Role) => {
      const admin = requireAdmin();
      store.setRole(id, role === 'admin' ? 'admin' : 'user');
      const target = store.getUser(id);
      store.addAudit(admin.login, `Назначил роль «${role === 'admin' ? 'Администратор' : 'Пользователь'}»`, target?.login ?? id);
      return ok();
    }),
  );

  // system
  ipcMain.handle(
    'system:openExternal',
    guarded(async (url: string) => {
      requireUser();
      if (!/^https?:\/\//i.test(url)) return fail('Разрешены только ссылки http(s)');
      await shell.openExternal(url);
      return ok();
    }),
  );
  ipcMain.handle('system:chooseFolder', async () => {
    requireAdmin();
    const res = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'] });
    return res.canceled ? null : res.filePaths[0];
  });
  ipcMain.handle('system:favorites', () => store.favorites(requireUser().id));
  ipcMain.handle('system:setFavorites', (_e, ids: string[]) => {
    store.setFavorites(requireUser().id, Array.isArray(ids) ? ids.map(String) : []);
  });
}

app.whenReady().then(() => {
  const userData = app.getPath('userData');
  store = new Store(path.join(userData, 'appssr-data.json'));
  installer = new Installer(path.join(userData, 'logs', 'appssr.log'), (event: InstallEvent) => {
    win?.webContents.send('programs:event', event);
  });
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
