export type Role = 'admin' | 'user';

export interface Permissions {
  /** Право добавлять/редактировать/удалять ПО и таблицы в каталоге. */
  manageCatalog: boolean;
}

export interface PublicUser {
  id: string;
  login: string;
  displayName: string;
  role: Role;
  permissions: Permissions;
  createdAt: string;
}

export type SectionKind = 'apps' | 'tables';

export interface Section {
  id: string;
  name: string;
  kind: SectionKind;
  order: number;
}

export type ProgramType = 'external' | 'builtin';

export type IconKey =
  | 'assessment'
  | 'analytics'
  | 'lif'
  | 'bc'
  | 'table'
  | 'doc'
  | 'shield'
  | 'cloud'
  | 'drive'
  | 'app';

export interface Program {
  id: string;
  name: string;
  sectionId: string;
  type: ProgramType;
  shortDescription: string;
  description: string;
  features: string[];
  icon: IconKey;
  color: string;
  /** Команда установки, выполняется через cmd в папке apps. */
  installCommand?: string;
  /** Адрес репозитория (информационно). */
  repoUrl?: string;
  /**
   * Папка, в которой окажется программа после установки.
   * Абсолютный путь или путь относительно папки apps.
   */
  installDir?: string;
  /** Путь к exe относительно installDir. */
  exePath?: string;
  version?: string;
  developer?: string;
  size?: string;
  updatedAt?: string;
  /** false — программа ещё не опубликована (нет репозитория). */
  available: boolean;
  popularity: number;
}

export interface TableLink {
  id: string;
  name: string;
  url: string;
  sectionId: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
}

export interface AppSettings {
  /** Корневая папка для установки внешних программ. */
  appsRoot: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  action: string;
  target: string;
}

export interface Catalog {
  sections: Section[];
  programs: Program[];
  tables: TableLink[];
  settings: AppSettings;
}

export type InstallState = 'not_installed' | 'installing' | 'installed' | 'error';

export interface ProgramStatus {
  state: InstallState;
  /** Папка установки, вычисленная с учётом настроек. */
  resolvedDir: string;
  error?: string;
  log?: string;
}

export type InstallEvent =
  | { type: 'started'; programId: string }
  | { type: 'log'; programId: string; chunk: string }
  | { type: 'finished'; programId: string; ok: boolean; code: number | null; output: string };

export interface ActionResult {
  ok: boolean;
  message?: string;
  /** Для "Открыть": exe не найден, можно предложить переустановку. */
  exeMissing?: boolean;
}

export interface AppSSRApi {
  platform: string;
  auth: {
    login(login: string, password: string): Promise<{ ok: boolean; user?: PublicUser; message?: string }>;
    register(login: string, password: string, displayName: string): Promise<{ ok: boolean; user?: PublicUser; message?: string }>;
    logout(): Promise<void>;
    current(): Promise<PublicUser | null>;
  };
  catalog: {
    get(): Promise<Catalog>;
    saveProgram(program: Program): Promise<ActionResult>;
    deleteProgram(id: string): Promise<ActionResult>;
    saveTable(table: TableLink): Promise<ActionResult>;
    deleteTable(id: string): Promise<ActionResult>;
    saveSection(section: Section): Promise<ActionResult>;
    deleteSection(id: string): Promise<ActionResult>;
    saveSettings(settings: AppSettings): Promise<ActionResult>;
    audit(): Promise<AuditEntry[]>;
  };
  programs: {
    statuses(): Promise<Record<string, ProgramStatus>>;
    install(id: string): Promise<ActionResult>;
    open(id: string): Promise<ActionResult>;
    remove(id: string): Promise<ActionResult>;
    onInstallEvent(cb: (event: InstallEvent) => void): () => void;
  };
  users: {
    list(): Promise<PublicUser[]>;
    setPermissions(id: string, permissions: Permissions): Promise<ActionResult>;
    setRole(id: string, role: Role): Promise<ActionResult>;
  };
  system: {
    openExternal(url: string): Promise<ActionResult>;
    chooseFolder(): Promise<string | null>;
    favorites(): Promise<string[]>;
    setFavorites(ids: string[]): Promise<void>;
  };
}
