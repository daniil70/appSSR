using System.Text.Json.Serialization;

namespace AppSSR;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Role { Admin, User }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ProgramType { External, Builtin }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InstallState { NotInstalled, Installing, Installed, Error }

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum IconKey { Assessment, Analytics, Lif, Bc, Table, Doc, Shield, Cloud, Drive, App }

public sealed class Permissions
{
    public bool ManageCatalog { get; set; }
}

public sealed class StoredUser
{
    public string Id { get; set; } = "";
    public string Login { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public Role Role { get; set; }
    public Permissions Permissions { get; set; } = new();
    public string CreatedAt { get; set; } = "";
    public string Salt { get; set; } = "";
    public string Hash { get; set; } = "";
}

public sealed class UserInfo
{
    public string Id { get; set; } = "";
    public string Login { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public Role Role { get; set; }
    public Permissions Permissions { get; set; } = new();
    public string CreatedAt { get; set; } = "";

    public bool CanEditCatalog => Role == Role.Admin || Permissions.ManageCatalog;
    public string RoleLabel => Role == Role.Admin ? "Администратор" : Permissions.ManageCatalog ? "Редактор каталога" : "Пользователь";
    public string Initials
    {
        get
        {
            var parts = DisplayName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return string.Concat(parts.Take(2).Select(p => char.ToUpperInvariant(p[0])));
        }
    }

    public static UserInfo From(StoredUser u) => new()
    {
        Id = u.Id,
        Login = u.Login,
        DisplayName = u.DisplayName,
        Role = u.Role,
        Permissions = new Permissions { ManageCatalog = u.Permissions.ManageCatalog },
        CreatedAt = u.CreatedAt,
    };
}

public sealed class ProgramItem
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public ProgramType Type { get; set; } = ProgramType.External;
    public string ShortDescription { get; set; } = "";
    public string Description { get; set; } = "";
    public List<string> Features { get; set; } = new();
    public IconKey Icon { get; set; } = IconKey.App;
    public string Color { get; set; } = "#1769e0";
    public string? InstallCommand { get; set; }
    public string? RepoUrl { get; set; }
    public string? InstallDir { get; set; }
    public string? ExePath { get; set; }
    public string? Version { get; set; }
    public string? Developer { get; set; }
    public string? Size { get; set; }
    public string? UpdatedAt { get; set; }
    public bool Available { get; set; } = true;
    public int Popularity { get; set; }
}

public sealed class TableLink
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string? Description { get; set; }
    public string? CreatedBy { get; set; }
    public string CreatedAt { get; set; } = "";
}

public sealed class AppSettings
{
    public string AppsRoot { get; set; } = Seed.DefaultAppsRoot;
}

public sealed class Catalog
{
    public List<ProgramItem> Programs { get; set; } = new();
    public List<TableLink> Tables { get; set; } = new();
    public AppSettings Settings { get; set; } = new();
}

public sealed class AuditEntry
{
    public string Id { get; set; } = "";
    public string At { get; set; } = "";
    public string User { get; set; } = "";
    public string Action { get; set; } = "";
    public string Target { get; set; } = "";
}

public sealed class AppData
{
    public int Version { get; set; } = 2;
    public List<StoredUser> Users { get; set; } = new();
    public Catalog Catalog { get; set; } = new();
    public List<AuditEntry> Audit { get; set; } = new();
    public Dictionary<string, List<string>> Favorites { get; set; } = new(StringComparer.Ordinal);
}

public sealed class ActionResult
{
    public bool Ok { get; init; }
    public string? Message { get; init; }
    public bool ExeMissing { get; init; }
    public static ActionResult Success(string? message = null) => new() { Ok = true, Message = message };
    public static ActionResult Fail(string message, bool exeMissing = false) => new() { Ok = false, Message = message, ExeMissing = exeMissing };
}

public sealed class ProgramStatus
{
    public InstallState State { get; set; }
    public string ResolvedDir { get; set; } = "";
    public string? Error { get; set; }
    public string? Log { get; set; }
}

public sealed class InstallEvent
{
    public string Kind { get; init; } = "";
    public string ProgramId { get; init; } = "";
    public string? Chunk { get; init; }
    public bool Ok { get; init; }
    public int? Code { get; init; }
    public string? Output { get; init; }

    public static InstallEvent Started(string id) => new() { Kind = "started", ProgramId = id };
    public static InstallEvent Log(string id, string chunk) => new() { Kind = "log", ProgramId = id, Chunk = chunk };
    public static InstallEvent Finished(string id, bool ok, int? code, string output) =>
        new() { Kind = "finished", ProgramId = id, Ok = ok, Code = code, Output = output };
}
