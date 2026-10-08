import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { shell } from 'electron';
import type { ActionResult, AppSettings, InstallEvent, Program, ProgramStatus } from '../shared/types';

const isWindows = process.platform === 'win32';

function slugFromCommand(program: Program): string {
  const m = program.installCommand?.match(/([^/\s"']+?)(?:\.git)?(?:["']?)\s*$/);
  return (m?.[1] || program.id).replace(/[^a-zA-Z0-9._-]/g, '');
}

export function resolveInstallDir(program: Program, settings: AppSettings): string {
  const root = settings.appsRoot;
  const dir = program.installDir?.trim() || slugFromCommand(program);
  return path.isAbsolute(dir) || /^[a-zA-Z]:[\\/]/.test(dir) ? dir : path.join(root, dir);
}

function dirHasFiles(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

interface Running {
  log: string;
}

/**
 * Установка/запуск/удаление внешних программ. Состояние "установлена" определяется по
 * фактическому наличию файлов в папке установки (п. 4.2.3 ТЗ).
 */
export class Installer {
  private running = new Map<string, Running>();
  private errors = new Map<string, { message: string; log: string }>();

  constructor(
    private readonly logFile: string,
    private readonly emit: (event: InstallEvent) => void,
  ) {}

  private writeLog(line: string) {
    try {
      fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
      fs.appendFileSync(this.logFile, `[${new Date().toISOString()}] ${line}\n`);
    } catch (err) {
      console.error('[installer] не удалось записать лог', err);
    }
  }

  status(program: Program, settings: AppSettings): ProgramStatus {
    const resolvedDir = resolveInstallDir(program, settings);
    if (program.type === 'builtin') return { state: 'installed', resolvedDir };
    if (this.running.has(program.id)) return { state: 'installing', resolvedDir, log: this.running.get(program.id)!.log };
    if (dirHasFiles(resolvedDir)) {
      this.errors.delete(program.id);
      return { state: 'installed', resolvedDir };
    }
    const err = this.errors.get(program.id);
    if (err) return { state: 'error', resolvedDir, error: err.message, log: err.log };
    return { state: 'not_installed', resolvedDir };
  }

  clearError(programId: string) {
    this.errors.delete(programId);
  }

  install(program: Program, settings: AppSettings, user: string): ActionResult {
    if (program.type !== 'external') return { ok: false, message: 'Встроенная программа не требует установки' };
    if (!program.available || !program.installCommand) return { ok: false, message: 'Для этой программы ещё не задана команда установки' };
    if (this.running.has(program.id)) return { ok: false, message: 'Установка уже выполняется' };

    const cwd = settings.appsRoot;
    try {
      fs.mkdirSync(cwd, { recursive: true });
    } catch (err) {
      return { ok: false, message: `Не удалось создать папку ${cwd}: ${(err as Error).message}` };
    }

    const command = program.installCommand;
    this.errors.delete(program.id);
    const run: Running = { log: '' };
    this.running.set(program.id, run);
    this.writeLog(`[${user}] INSTALL ${program.name}: ${command} (cwd=${cwd})`);
    this.emit({ type: 'started', programId: program.id });

    // Команда берётся только из карточки программы (её задаёт пользователь с правом управления
    // каталогом); пользовательский ввод в неё не подставляется.
    const child = isWindows
      ? spawn('cmd.exe', ['/d', '/s', '/c', command], { cwd, windowsHide: true, env: process.env })
      : spawn('/bin/sh', ['-c', command], { cwd, env: process.env });

    const onData = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      run.log += text;
      this.emit({ type: 'log', programId: program.id, chunk: text });
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);

    const finish = (code: number | null, spawnError?: Error) => {
      this.running.delete(program.id);
      if (spawnError) run.log += `\n${spawnError.message}`;
      const resolvedDir = resolveInstallDir(program, settings);
      const ok = !spawnError && code === 0 && dirHasFiles(resolvedDir);
      if (!ok) {
        const message = spawnError
          ? `Не удалось запустить команду установки: ${spawnError.message}`
          : code !== 0
            ? `Команда установки завершилась с кодом ${code}. Проверьте авторизацию в GitLab и доступ к сети.`
            : `Команда выполнена, но папка ${resolvedDir} пуста или не создана.`;
        this.errors.set(program.id, { message, log: run.log });
      }
      this.writeLog(`[${user}] INSTALL ${program.name}: ${ok ? 'OK' : `FAILED code=${code}`}`);
      this.emit({ type: 'finished', programId: program.id, ok, code, output: run.log });
    };

    child.on('error', (err) => finish(null, err));
    child.on('close', (code) => finish(code));
    return { ok: true };
  }

  async open(program: Program, settings: AppSettings, user: string): Promise<ActionResult> {
    const dir = resolveInstallDir(program, settings);
    if (!dirHasFiles(dir)) return { ok: false, exeMissing: true, message: 'Программа не установлена или папка установки пуста.' };
    if (!program.exePath) {
      const err = await shell.openPath(dir);
      return err ? { ok: false, message: err } : { ok: true, message: 'Путь к exe не задан — открыта папка программы.' };
    }
    const exe = path.join(dir, program.exePath);
    if (!fs.existsSync(exe)) {
      return { ok: false, exeMissing: true, message: `Исполняемый файл не найден: ${exe}. Переустановить программу?` };
    }
    this.writeLog(`[${user}] OPEN ${program.name}: ${exe}`);
    try {
      const child = spawn(exe, [], { cwd: path.dirname(exe), detached: true, stdio: 'ignore' });
      child.on('error', (err) => this.writeLog(`[${user}] OPEN ${program.name} ERROR: ${err.message}`));
      child.unref();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: `Не удалось запустить: ${(err as Error).message}` };
    }
  }

  remove(program: Program, settings: AppSettings, user: string): ActionResult {
    if (this.running.has(program.id)) return { ok: false, message: 'Дождитесь окончания установки' };
    const dir = resolveInstallDir(program, settings);
    const root = path.resolve(settings.appsRoot);
    const target = path.resolve(dir);
    // Защита от удаления чего-либо вне папки установки программы.
    if (target === path.parse(target).root || target.split(path.sep).length < 3) {
      return { ok: false, message: `Отказ: подозрительный путь удаления ${target}` };
    }
    if (target === root) return { ok: false, message: 'Отказ: нельзя удалить корневую папку apps' };
    try {
      fs.rmSync(target, { recursive: true, force: true });
      this.errors.delete(program.id);
      this.writeLog(`[${user}] REMOVE ${program.name}: ${target}`);
      return { ok: true };
    } catch (err) {
      this.writeLog(`[${user}] REMOVE ${program.name} ERROR: ${(err as Error).message}`);
      return { ok: false, message: `Не удалось удалить: ${(err as Error).message}` };
    }
  }
}
