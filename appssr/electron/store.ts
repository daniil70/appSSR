import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AuditEntry, Catalog, Permissions, PublicUser, Role } from '../shared/types';
import { seedCatalog } from '../shared/seed';

interface StoredUser extends PublicUser {
  salt: string;
  hash: string;
}

interface Data {
  version: 1;
  users: StoredUser[];
  catalog: Catalog;
  audit: AuditEntry[];
  favorites: Record<string, string[]>;
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Файловое хранилище-заглушка вместо БД. Пароли хранятся только как scrypt-хэши с солью.
 */
export class Store {
  private data: Data;

  constructor(private readonly file: string) {
    this.data = this.load();
  }

  private load(): Data {
    try {
      if (fs.existsSync(this.file)) {
        const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Data;
        if (parsed && parsed.version === 1) return parsed;
      }
    } catch (err) {
      console.error('[store] не удалось прочитать данные, используем значения по умолчанию', err);
    }
    const data: Data = { version: 1, users: [], catalog: seedCatalog(), audit: [], favorites: {} };
    this.data = data;
    this.ensureAdmin();
    this.save();
    return this.data;
  }

  private ensureAdmin() {
    if (this.data.users.some((u) => u.login === 'admin')) return;
    const salt = crypto.randomBytes(16).toString('hex');
    this.data.users.push({
      id: 'u-admin',
      login: 'admin',
      displayName: 'Администратор',
      role: 'admin',
      permissions: { manageCatalog: true },
      createdAt: new Date().toISOString(),
      salt,
      hash: hashPassword('admin', salt),
    });
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  // ---- users -------------------------------------------------------------

  private toPublic(u: StoredUser): PublicUser {
    const { salt: _s, hash: _h, ...pub } = u;
    return pub;
  }

  verifyUser(login: string, password: string): PublicUser | null {
    const u = this.data.users.find((x) => x.login.toLowerCase() === login.trim().toLowerCase());
    if (!u) return null;
    const candidate = Buffer.from(hashPassword(password, u.salt), 'hex');
    const expected = Buffer.from(u.hash, 'hex');
    if (candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) return null;
    return this.toPublic(u);
  }

  createUser(login: string, password: string, displayName: string): PublicUser {
    const clean = login.trim();
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(clean)) throw new Error('Логин: 3–32 символа, латиница, цифры, точка, дефис, подчёркивание');
    if (password.length < 4) throw new Error('Пароль должен содержать минимум 4 символа');
    if (this.data.users.some((u) => u.login.toLowerCase() === clean.toLowerCase())) throw new Error('Пользователь с таким логином уже существует');
    const salt = crypto.randomBytes(16).toString('hex');
    const user: StoredUser = {
      id: newId('u'),
      login: clean,
      displayName: displayName.trim() || clean,
      role: 'user',
      permissions: { manageCatalog: false },
      createdAt: new Date().toISOString(),
      salt,
      hash: hashPassword(password, salt),
    };
    this.data.users.push(user);
    this.save();
    return this.toPublic(user);
  }

  getUser(id: string): PublicUser | null {
    const u = this.data.users.find((x) => x.id === id);
    return u ? this.toPublic(u) : null;
  }

  listUsers(): PublicUser[] {
    return this.data.users.map((u) => this.toPublic(u));
  }

  setPermissions(id: string, permissions: Permissions) {
    const u = this.data.users.find((x) => x.id === id);
    if (!u) throw new Error('Пользователь не найден');
    u.permissions = { manageCatalog: Boolean(permissions.manageCatalog) };
    this.save();
  }

  setRole(id: string, role: Role) {
    const u = this.data.users.find((x) => x.id === id);
    if (!u) throw new Error('Пользователь не найден');
    if (u.login === 'admin' && role !== 'admin') throw new Error('Нельзя снять роль с встроенного администратора');
    u.role = role;
    if (role === 'admin') u.permissions.manageCatalog = true;
    this.save();
  }

  // ---- catalog -----------------------------------------------------------

  get catalog(): Catalog {
    return this.data.catalog;
  }

  setCatalog(mutate: (c: Catalog) => void) {
    mutate(this.data.catalog);
    this.save();
  }

  addAudit(user: string, action: string, target: string) {
    this.data.audit.unshift({ id: newId('a'), at: new Date().toISOString(), user, action, target });
    this.data.audit = this.data.audit.slice(0, 500);
    this.save();
  }

  get audit(): AuditEntry[] {
    return this.data.audit;
  }

  favorites(userId: string): string[] {
    return this.data.favorites[userId] ?? [];
  }

  setFavorites(userId: string, ids: string[]) {
    this.data.favorites[userId] = ids;
    this.save();
  }
}

export { newId };
