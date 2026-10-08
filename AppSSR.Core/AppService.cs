namespace AppSSR;

/// <summary>
/// Фасад над Store + Installer с проверкой прав. Аналог IPC-слоя Electron-макета.
/// </summary>
public sealed class AppService
{
    public Store Store { get; }
    public Installer Installer { get; }
    public UserInfo? CurrentUser { get; private set; }

    public AppService(string dataDir)
    {
        Directory.CreateDirectory(dataDir);
        Store = new Store(Path.Combine(dataDir, "appssr-data.json"));
        Installer = new Installer(Path.Combine(dataDir, "logs", "appssr.log"), e => InstallHappened?.Invoke(e));
    }

    public event Action<InstallEvent>? InstallHappened;

    public UserInfo RequireUser() => CurrentUser ?? throw new InvalidOperationException("Требуется авторизация");

    public UserInfo RequireCatalogRight()
    {
        var u = RequireUser();
        if (!u.CanEditCatalog) throw new InvalidOperationException("Недостаточно прав для изменения каталога");
        return u;
    }

    public UserInfo RequireAdmin()
    {
        var u = RequireUser();
        if (u.Role != Role.Admin) throw new InvalidOperationException("Требуются права администратора");
        return u;
    }

    public (bool Ok, UserInfo? User, string? Message) Login(string login, string password)
    {
        var user = Store.VerifyUser(login, password);
        if (user is null) return (false, null, "Неверный логин или пароль");
        CurrentUser = user;
        return (true, user, null);
    }

    public (bool Ok, UserInfo? User, string? Message) Register(string login, string password, string displayName)
    {
        try
        {
            var user = Store.CreateUser(login, password, displayName);
            CurrentUser = user;
            return (true, user, null);
        }
        catch (Exception ex) { return (false, null, ex.Message); }
    }

    public void Logout() => CurrentUser = null;

    public ProgramStatus StatusOf(ProgramItem p) => Installer.Status(p, Store.Catalog.Settings);

    public ActionResult Try(Func<ActionResult> fn)
    {
        try { return fn(); }
        catch (Exception ex) { return ActionResult.Fail(ex.Message); }
    }

    public ActionResult SaveProgram(ProgramItem input)
    {
        return Try(() =>
        {
            var u = RequireCatalogRight();
            var program = Sanitize(input);
            if (string.IsNullOrWhiteSpace(program.Name)) return ActionResult.Fail("Укажите название программы");
            var action = "Добавил ПО";
            Store.MutateCatalog(c =>
            {
                var i = c.Programs.FindIndex(p => p.Id == program.Id);
                if (i >= 0) { c.Programs[i] = program; action = "Изменил ПО"; }
                else c.Programs.Add(program);
            });
            Store.AddAudit(u.Login, action, program.Name);
            return ActionResult.Success();
        });
    }

    public ActionResult DeleteProgram(string id)
    {
        return Try(() =>
        {
            var u = RequireCatalogRight();
            var p = Store.Catalog.Programs.FirstOrDefault(x => x.Id == id) ?? throw new InvalidOperationException("Программа не найдена");
            Store.MutateCatalog(c => c.Programs.RemoveAll(x => x.Id == id));
            Store.AddAudit(u.Login, "Удалил ПО из каталога", p.Name);
            return ActionResult.Success();
        });
    }

    public ActionResult SaveTable(TableLink input)
    {
        return Try(() =>
        {
            var u = RequireCatalogRight();
            var name = (input.Name ?? "").Trim();
            var url = (input.Url ?? "").Trim();
            if (name.Length == 0) return ActionResult.Fail("Укажите название таблицы");
            if (!System.Text.RegularExpressions.Regex.IsMatch(url, @"^https?://\S+$", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
                return ActionResult.Fail("Ссылка должна начинаться с http:// или https://");
            var table = new TableLink
            {
                Id = string.IsNullOrWhiteSpace(input.Id) ? Store.NewId("t") : input.Id.Trim(),
                Name = name[..Math.Min(name.Length, 120)],
                Url = url[..Math.Min(url.Length, 2000)],
                Description = string.IsNullOrWhiteSpace(input.Description) ? null : input.Description.Trim(),
                CreatedBy = u.Login,
                CreatedAt = string.IsNullOrWhiteSpace(input.CreatedAt) ? DateTime.UtcNow.ToString("O") : input.CreatedAt,
            };
            var action = "Добавил таблицу";
            Store.MutateCatalog(c =>
            {
                var i = c.Tables.FindIndex(t => t.Id == table.Id);
                if (i >= 0)
                {
                    table.CreatedBy = c.Tables[i].CreatedBy;
                    c.Tables[i] = table;
                    action = "Изменил таблицу";
                }
                else c.Tables.Add(table);
            });
            Store.AddAudit(u.Login, action, table.Name);
            return ActionResult.Success();
        });
    }

    public ActionResult DeleteTable(string id)
    {
        return Try(() =>
        {
            var u = RequireCatalogRight();
            var t = Store.Catalog.Tables.FirstOrDefault(x => x.Id == id) ?? throw new InvalidOperationException("Таблица не найдена");
            Store.MutateCatalog(c => c.Tables.RemoveAll(x => x.Id == id));
            Store.AddAudit(u.Login, "Удалил таблицу", t.Name);
            return ActionResult.Success();
        });
    }

    public ActionResult SaveSettings(string appsRoot)
    {
        return Try(() =>
        {
            var u = RequireAdmin();
            var root = (appsRoot ?? "").Trim();
            if (root.Length == 0) return ActionResult.Fail("Укажите папку установки");
            Store.MutateCatalog(c => c.Settings.AppsRoot = root);
            Store.AddAudit(u.Login, "Изменил папку установки", root);
            return ActionResult.Success();
        });
    }

    public ActionResult SetPermissions(string id, bool manageCatalog)
    {
        return Try(() =>
        {
            var admin = RequireAdmin();
            Store.SetPermissions(id, new Permissions { ManageCatalog = manageCatalog });
            var target = Store.GetUser(id);
            Store.AddAudit(admin.Login, manageCatalog ? "Выдал право управления каталогом" : "Отозвал право управления каталогом", target?.Login ?? id);
            return ActionResult.Success();
        });
    }

    public ActionResult SetRole(string id, Role role)
    {
        return Try(() =>
        {
            var admin = RequireAdmin();
            Store.SetRole(id, role);
            var target = Store.GetUser(id);
            Store.AddAudit(admin.Login, $"Назначил роль «{(role == Role.Admin ? "Администратор" : "Пользователь")}»", target?.Login ?? id);
            return ActionResult.Success();
        });
    }

    public ActionResult OpenUrl(string url)
    {
        return Try(() =>
        {
            RequireUser();
            if (!System.Text.RegularExpressions.Regex.IsMatch(url ?? "", @"^https?://", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
                return ActionResult.Fail("Разрешены только ссылки http(s)");
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo { FileName = url, UseShellExecute = true });
            return ActionResult.Success();
        });
    }

    private static ProgramItem Sanitize(ProgramItem input)
    {
        string S(string? v, int max) => (v ?? "").Trim().Length <= max ? (v ?? "").Trim() : (v ?? "").Trim()[..max];
        var color = S(input.Color, 7);
        if (!System.Text.RegularExpressions.Regex.IsMatch(color, "^#[0-9A-Fa-f]{6}$")) color = "#1769e0";
        return new ProgramItem
        {
            Id = string.IsNullOrWhiteSpace(input.Id) ? Store.NewId("p") : S(input.Id, 64),
            Name = S(input.Name, 120),
            Type = input.Type == ProgramType.Builtin ? ProgramType.Builtin : ProgramType.External,
            ShortDescription = S(input.ShortDescription, 200),
            Description = S(input.Description, 4000),
            Features = (input.Features ?? []).Select(f => S(f, 120)).Where(f => f.Length > 0).Take(12).ToList(),
            Icon = input.Icon,
            Color = color,
            InstallCommand = EmptyToNull(S(input.InstallCommand, 1000)),
            RepoUrl = EmptyToNull(S(input.RepoUrl, 500)),
            InstallDir = EmptyToNull(S(input.InstallDir, 500)),
            ExePath = EmptyToNull(S(input.ExePath, 500)),
            Version = EmptyToNull(S(input.Version, 40)),
            Developer = EmptyToNull(S(input.Developer, 120)),
            Size = EmptyToNull(S(input.Size, 40)),
            UpdatedAt = EmptyToNull(S(input.UpdatedAt, 40)),
            Available = input.Available,
            Popularity = input.Popularity,
        };
    }

    private static string? EmptyToNull(string s) => s.Length == 0 ? null : s;
}
