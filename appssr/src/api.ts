import type { AppSSRApi, Catalog, InstallEvent, InstallState, PublicUser } from '../shared/types';
import { seedCatalog } from '../shared/seed';

declare global {
  interface Window {
    appssr?: AppSSRApi;
  }
}

/**
 * Мок моста для запуска интерфейса в обычном браузере (`npm run dev:web`).
 * Данные живут в localStorage, «установка» имитируется таймером.
 */
function createWebMock(): AppSSRApi {
  const KEY = 'appssr-web-mock';
  const load = (): { catalog: Catalog; users: PublicUser[]; passwords: Record<string, string>; favorites: string[] } => {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    const admin: PublicUser = {
      id: 'u-admin',
      login: 'admin',
      displayName: 'Администратор',
      role: 'admin',
      permissions: { manageCatalog: true },
      createdAt: new Date().toISOString(),
    };
    return { catalog: seedCatalog(), users: [admin], passwords: { admin: 'admin' }, favorites: [] };
  };
  let db = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  let user: PublicUser | null = null;
  const states: Record<string, InstallState> = {};
  const listeners = new Set<(e: InstallEvent) => void>();
  const emit = (e: InstallEvent) => listeners.forEach((l) => l(e));
  const ok = { ok: true };

  return {
    platform: 'web',
    auth: {
      async login(login, password) {
        const u = db.users.find((x) => x.login === login);
        if (!u || db.passwords[login] !== password) return { ok: false, message: 'Неверный логин или пароль' };
        user = u;
        return { ok: true, user: u };
      },
      async register(login, password, displayName) {
        if (db.users.some((x) => x.login === login)) return { ok: false, message: 'Пользователь уже существует' };
        const u: PublicUser = {
          id: `u-${Date.now()}`,
          login,
          displayName: displayName || login,
          role: 'user',
          permissions: { manageCatalog: false },
          createdAt: new Date().toISOString(),
        };
        db.users.push(u);
        db.passwords[login] = password;
        save();
        user = u;
        return { ok: true, user: u };
      },
      async logout() {
        user = null;
      },
      async current() {
        return user;
      },
    },
    catalog: {
      async get() {
        return db.catalog;
      },
      async saveProgram(p) {
        const i = db.catalog.programs.findIndex((x) => x.id === p.id);
        if (i >= 0) db.catalog.programs[i] = p;
        else db.catalog.programs.push({ ...p, id: p.id || `p-${Date.now()}` });
        save();
        return ok;
      },
      async deleteProgram(id) {
        db.catalog.programs = db.catalog.programs.filter((x) => x.id !== id);
        save();
        return ok;
      },
      async saveTable(t) {
        if (!/^https?:\/\//.test(t.url)) return { ok: false, message: 'Ссылка должна начинаться с http:// или https://' };
        const table = { ...t, id: t.id || `t-${Date.now()}`, createdBy: user?.login, createdAt: t.createdAt || new Date().toISOString() };
        const i = db.catalog.tables.findIndex((x) => x.id === table.id);
        if (i >= 0) db.catalog.tables[i] = table;
        else db.catalog.tables.push(table);
        save();
        return ok;
      },
      async deleteTable(id) {
        db.catalog.tables = db.catalog.tables.filter((x) => x.id !== id);
        save();
        return ok;
      },
      async saveSection(s) {
        const i = db.catalog.sections.findIndex((x) => x.id === s.id);
        if (i >= 0) db.catalog.sections[i] = s;
        else db.catalog.sections.push({ ...s, id: s.id || `s-${Date.now()}` });
        save();
        return ok;
      },
      async deleteSection(id) {
        db.catalog.sections = db.catalog.sections.filter((x) => x.id !== id);
        save();
        return ok;
      },
      async saveSettings(s) {
        db.catalog.settings = s;
        save();
        return ok;
      },
      async audit() {
        return [];
      },
    },
    programs: {
      async statuses() {
        const out: Record<string, { state: InstallState; resolvedDir: string }> = {};
        for (const p of db.catalog.programs) {
          out[p.id] = { state: p.type === 'builtin' ? 'installed' : states[p.id] ?? 'not_installed', resolvedDir: `${db.catalog.settings.appsRoot}\\${p.installDir ?? p.id}` };
        }
        return out;
      },
      async install(id) {
        states[id] = 'installing';
        emit({ type: 'started', programId: id });
        const p = db.catalog.programs.find((x) => x.id === id);
        let i = 0;
        const lines = [`> ${p?.installCommand}`, "Cloning into '...'...", 'remote: Enumerating objects: 128, done.', 'Receiving objects: 100% (128/128), done.'];
        const timer = setInterval(() => {
          if (i < lines.length) emit({ type: 'log', programId: id, chunk: `${lines[i++]}\n` });
          else {
            clearInterval(timer);
            states[id] = 'installed';
            emit({ type: 'finished', programId: id, ok: true, code: 0, output: lines.join('\n') });
          }
        }, 500);
        return ok;
      },
      async open() {
        return { ok: true, message: 'В браузере запуск exe недоступен (демо-режим).' };
      },
      async remove(id) {
        states[id] = 'not_installed';
        return ok;
      },
      onInstallEvent(cb) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
    },
    users: {
      async list() {
        return db.users;
      },
      async setPermissions(id, permissions) {
        const u = db.users.find((x) => x.id === id);
        if (u) u.permissions = permissions;
        save();
        return ok;
      },
      async setRole(id, role) {
        const u = db.users.find((x) => x.id === id);
        if (u) u.role = role;
        save();
        return ok;
      },
    },
    system: {
      async openExternal(url) {
        window.open(url, '_blank', 'noopener');
        return ok;
      },
      async chooseFolder() {
        return null;
      },
      async favorites() {
        return db.favorites;
      },
      async setFavorites(ids) {
        db.favorites = ids;
        save();
      },
    },
  };
}

export const api: AppSSRApi = window.appssr ?? createWebMock();
export const isElectron = Boolean(window.appssr);
