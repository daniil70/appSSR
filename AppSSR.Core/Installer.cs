using System.Diagnostics;
using System.Text;

namespace AppSSR;

/// <summary>
/// Установка/запуск/удаление внешних программ. «Установлена» — если в папке есть файлы.
/// </summary>
public sealed class Installer
{
    private readonly string _logFile;
    private readonly Action<InstallEvent> _emit;
    private readonly Dictionary<string, StringBuilder> _running = new();
    private readonly Dictionary<string, (string Message, string Log)> _errors = new();
    private readonly object _gate = new();

    public Installer(string logFile, Action<InstallEvent> emit)
    {
        _logFile = logFile;
        _emit = emit;
    }

    public static string ResolveInstallDir(ProgramItem program, AppSettings settings)
    {
        var dir = string.IsNullOrWhiteSpace(program.InstallDir) ? SlugFromCommand(program) : program.InstallDir.Trim();
        if (Path.IsPathRooted(dir) || System.Text.RegularExpressions.Regex.IsMatch(dir, @"^[a-zA-Z]:[\\/]")) return dir;
        return Path.Combine(settings.AppsRoot, dir);
    }

    private static string SlugFromCommand(ProgramItem program)
    {
        var cmd = program.InstallCommand ?? "";
        var m = System.Text.RegularExpressions.Regex.Match(cmd, @"([^/\s""']+?)(?:\.git)?[""']?\s*$");
        var slug = m.Success ? m.Groups[1].Value : program.Id;
        return System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-zA-Z0-9._-]", "");
    }

    private static bool DirHasFiles(string dir)
    {
        try { return Directory.Exists(dir) && Directory.EnumerateFileSystemEntries(dir).Any(); }
        catch { return false; }
    }

    private void WriteLog(string line)
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_logFile)!);
            File.AppendAllText(_logFile, $"[{DateTime.UtcNow:O}] {line}{Environment.NewLine}");
        }
        catch { /* лог не должен ронять приложение */ }
    }

    public ProgramStatus Status(ProgramItem program, AppSettings settings)
    {
        var dir = ResolveInstallDir(program, settings);
        if (program.Type == ProgramType.Builtin) return new ProgramStatus { State = InstallState.Installed, ResolvedDir = dir };
        lock (_gate)
        {
            if (_running.TryGetValue(program.Id, out var log))
                return new ProgramStatus { State = InstallState.Installing, ResolvedDir = dir, Log = log.ToString() };
            if (DirHasFiles(dir))
            {
                _errors.Remove(program.Id);
                return new ProgramStatus { State = InstallState.Installed, ResolvedDir = dir };
            }
            if (_errors.TryGetValue(program.Id, out var err))
                return new ProgramStatus { State = InstallState.Error, ResolvedDir = dir, Error = err.Message, Log = err.Log };
        }
        return new ProgramStatus { State = InstallState.NotInstalled, ResolvedDir = dir };
    }

    public ActionResult Install(ProgramItem program, AppSettings settings, string user)
    {
        if (program.Type != ProgramType.External) return ActionResult.Fail("Встроенная программа не требует установки");
        if (!program.Available || string.IsNullOrWhiteSpace(program.InstallCommand))
            return ActionResult.Fail("Для этой программы ещё не задана команда установки");

        lock (_gate)
        {
            if (_running.ContainsKey(program.Id)) return ActionResult.Fail("Установка уже выполняется");
        }

        var cwd = settings.AppsRoot;
        try { Directory.CreateDirectory(cwd); }
        catch (Exception ex) { return ActionResult.Fail($"Не удалось создать папку {cwd}: {ex.Message}"); }

        var command = program.InstallCommand;
        var buf = new StringBuilder();
        lock (_gate)
        {
            _errors.Remove(program.Id);
            _running[program.Id] = buf;
        }
        WriteLog($"[{user}] INSTALL {program.Name}: {command} (cwd={cwd})");
        _emit(InstallEvent.Started(program.Id));

        var psi = new ProcessStartInfo
        {
            WorkingDirectory = cwd,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };
        if (OperatingSystem.IsWindows())
        {
            psi.FileName = "cmd.exe";
            psi.ArgumentList.Add("/d");
            psi.ArgumentList.Add("/s");
            psi.ArgumentList.Add("/c");
            psi.ArgumentList.Add(command);
            psi.StandardOutputEncoding = Encoding.UTF8;
            psi.StandardErrorEncoding = Encoding.UTF8;
        }
        else
        {
            psi.FileName = "/bin/sh";
            psi.ArgumentList.Add("-c");
            psi.ArgumentList.Add(command);
        }

        Process process;
        try { process = Process.Start(psi) ?? throw new InvalidOperationException("Process.Start вернул null"); }
        catch (Exception ex)
        {
            Finish(program, settings, user, buf, null, ex);
            return ActionResult.Fail($"Не удалось запустить команду установки: {ex.Message}");
        }

        void OnData(object _, DataReceivedEventArgs e)
        {
            if (e.Data is null) return;
            lock (buf) buf.AppendLine(e.Data);
            _emit(InstallEvent.Log(program.Id, e.Data + Environment.NewLine));
        }
        process.OutputDataReceived += OnData;
        process.ErrorDataReceived += OnData;
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        process.EnableRaisingEvents = true;
        process.Exited += (_, _) =>
        {
            try { process.WaitForExit(); } catch { /* ignore */ }
            Finish(program, settings, user, buf, process.ExitCode, null);
            process.Dispose();
        };
        return ActionResult.Success();
    }

    private void Finish(ProgramItem program, AppSettings settings, string user, StringBuilder buf, int? code, Exception? spawnError)
    {
        var log = buf.ToString();
        if (spawnError is not null) log += Environment.NewLine + spawnError.Message;
        lock (_gate) _running.Remove(program.Id);
        var dir = ResolveInstallDir(program, settings);
        var ok = spawnError is null && code == 0 && DirHasFiles(dir);
        if (!ok)
        {
            var message = spawnError is not null
                ? $"Не удалось запустить команду установки: {spawnError.Message}"
                : code != 0
                    ? $"Команда установки завершилась с кодом {code}. Проверьте авторизацию в GitLab и доступ к сети."
                    : $"Команда выполнена, но папка {dir} пуста или не создана.";
            lock (_gate) _errors[program.Id] = (message, log);
        }
        WriteLog($"[{user}] INSTALL {program.Name}: {(ok ? "OK" : $"FAILED code={code}")}");
        _emit(InstallEvent.Finished(program.Id, ok, code, log));
    }

    public ActionResult Open(ProgramItem program, AppSettings settings, string user)
    {
        var dir = ResolveInstallDir(program, settings);
        if (!DirHasFiles(dir)) return ActionResult.Fail("Программа не установлена или папка установки пуста.", exeMissing: true);
        if (string.IsNullOrWhiteSpace(program.ExePath))
        {
            try
            {
                Process.Start(new ProcessStartInfo { FileName = dir, UseShellExecute = true });
                return ActionResult.Success("Путь к exe не задан — открыта папка программы.");
            }
            catch (Exception ex) { return ActionResult.Fail(ex.Message); }
        }
        var exe = Path.Combine(dir, program.ExePath);
        if (!File.Exists(exe))
            return ActionResult.Fail($"Исполняемый файл не найден: {exe}. Переустановить программу?", exeMissing: true);
        WriteLog($"[{user}] OPEN {program.Name}: {exe}");
        try
        {
            Process.Start(new ProcessStartInfo { FileName = exe, WorkingDirectory = Path.GetDirectoryName(exe), UseShellExecute = true });
            return ActionResult.Success();
        }
        catch (Exception ex)
        {
            WriteLog($"[{user}] OPEN {program.Name} ERROR: {ex.Message}");
            return ActionResult.Fail($"Не удалось запустить: {ex.Message}");
        }
    }

    public ActionResult Remove(ProgramItem program, AppSettings settings, string user)
    {
        lock (_gate)
        {
            if (_running.ContainsKey(program.Id)) return ActionResult.Fail("Дождитесь окончания установки");
        }
        var dir = Path.GetFullPath(ResolveInstallDir(program, settings));
        var root = Path.GetFullPath(settings.AppsRoot);
        if (dir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar).Length < 8)
            return ActionResult.Fail($"Отказ: подозрительный путь удаления {dir}");
        if (string.Equals(dir.TrimEnd('\\', '/'), root.TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase))
            return ActionResult.Fail("Отказ: нельзя удалить корневую папку apps");
        try
        {
            if (Directory.Exists(dir)) Directory.Delete(dir, recursive: true);
            lock (_gate) _errors.Remove(program.Id);
            WriteLog($"[{user}] REMOVE {program.Name}: {dir}");
            return ActionResult.Success();
        }
        catch (Exception ex)
        {
            WriteLog($"[{user}] REMOVE {program.Name} ERROR: {ex.Message}");
            return ActionResult.Fail($"Не удалось удалить: {ex.Message}");
        }
    }
}
