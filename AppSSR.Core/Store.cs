using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AppSSR;

/// <summary>
/// Файловое хранилище-заглушка вместо БД. Пароли — только PBKDF2-хэши с солью.
/// </summary>
public sealed class Store
{
    private static readonly JsonSerializerOptions Json = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private readonly string _file;
    private AppData _data;

    public Store(string file)
    {
        _file = file;
        _data = Load();
    }

    public Catalog Catalog => _data.Catalog;
    public IReadOnlyList<AuditEntry> Audit => _data.Audit;

    private AppData Load()
    {
        try
        {
            if (File.Exists(_file))
            {
                var parsed = JsonSerializer.Deserialize<AppData>(File.ReadAllText(_file), Json);
                if (parsed is { Version: >= 1 })
                {
                    parsed.Catalog ??= Seed.Catalog();
                    parsed.Catalog.Programs ??= [];
                    parsed.Catalog.Tables ??= [];
                    parsed.Catalog.Settings ??= new AppSettings();
                    parsed.Users ??= [];
                    parsed.Audit ??= [];
                    parsed.Favorites ??= new Dictionary<string, List<string>>(StringComparer.Ordinal);
                    _data = parsed;
                    var n = _data.Users.Count;
                    EnsureAdmin();
                    if (_data.Users.Count != n) Save();
                    return _data;
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("[store] не удалось прочитать данные: " + ex.Message);
        }

        _data = new AppData { Version = 2, Catalog = Seed.Catalog() };
        EnsureAdmin();
        Save();
        return _data;
    }

    private void EnsureAdmin()
    {
        if (_data.Users.Any(u => u.Login.Equals("admin", StringComparison.OrdinalIgnoreCase))) return;
        var salt = RandomNumberGenerator.GetBytes(16);
        _data.Users.Add(new StoredUser
        {
            Id = "u-admin",
            Login = "admin",
            DisplayName = "Администратор",
            Role = Role.Admin,
            Permissions = new Permissions { ManageCatalog = true },
            CreatedAt = DateTime.UtcNow.ToString("O"),
            Salt = Convert.ToHexString(salt),
            Hash = HashPassword("admin", salt),
        });
    }

    public void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_file)!);
        var tmp = _file + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(_data, Json));
        File.Move(tmp, _file, overwrite: true);
    }

    public static string NewId(string prefix) => $"{prefix}-{Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant()}";

    private static string HashPassword(string password, byte[] salt)
    {
        var hash = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, 120_000, HashAlgorithmName.SHA256, 32);
        return Convert.ToHexString(hash);
    }

    public UserInfo? VerifyUser(string login, string password)
    {
        var u = _data.Users.FirstOrDefault(x => x.Login.Equals(login.Trim(), StringComparison.OrdinalIgnoreCase));
        if (u is null) return null;
        var salt = Convert.FromHexString(u.Salt);
        var candidate = Convert.FromHexString(HashPassword(password, salt));
        var expected = Convert.FromHexString(u.Hash);
        if (candidate.Length != expected.Length || !CryptographicOperations.FixedTimeEquals(candidate, expected)) return null;
        return UserInfo.From(u);
    }

    public UserInfo CreateUser(string login, string password, string displayName)
    {
        var clean = login.Trim();
        if (!Regex.IsMatch(clean, @"^[a-zA-Z0-9._-]{3,32}$"))
            throw new InvalidOperationException("Логин: 3–32 символа, латиница, цифры, точка, дефис, подчёркивание");
        if (password.Length < 4) throw new InvalidOperationException("Пароль должен содержать минимум 4 символа");
        if (_data.Users.Any(u => u.Login.Equals(clean, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("Пользователь с таким логином уже существует");
        var salt = RandomNumberGenerator.GetBytes(16);
        var user = new StoredUser
        {
            Id = NewId("u"),
            Login = clean,
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? clean : displayName.Trim(),
            Role = Role.User,
            Permissions = new Permissions { ManageCatalog = false },
            CreatedAt = DateTime.UtcNow.ToString("O"),
            Salt = Convert.ToHexString(salt),
            Hash = HashPassword(password, salt),
        };
        _data.Users.Add(user);
        Save();
        return UserInfo.From(user);
    }

    public UserInfo? GetUser(string id)
    {
        var u = _data.Users.FirstOrDefault(x => x.Id == id);
        return u is null ? null : UserInfo.From(u);
    }

    public IReadOnlyList<UserInfo> ListUsers() => _data.Users.Select(UserInfo.From).ToList();

    public void SetPermissions(string id, Permissions permissions)
    {
        var u = _data.Users.FirstOrDefault(x => x.Id == id) ?? throw new InvalidOperationException("Пользователь не найден");
        u.Permissions = new Permissions { ManageCatalog = permissions.ManageCatalog };
        Save();
    }

    public void SetRole(string id, Role role)
    {
        var u = _data.Users.FirstOrDefault(x => x.Id == id) ?? throw new InvalidOperationException("Пользователь не найден");
        if (u.Login == "admin" && role != Role.Admin) throw new InvalidOperationException("Нельзя снять роль с встроенного администратора");
        u.Role = role;
        if (role == Role.Admin) u.Permissions.ManageCatalog = true;
        Save();
    }

    public void MutateCatalog(Action<Catalog> mutate)
    {
        mutate(_data.Catalog);
        Save();
    }

    public void AddAudit(string user, string action, string target)
    {
        _data.Audit.Insert(0, new AuditEntry
        {
            Id = NewId("a"),
            At = DateTime.UtcNow.ToString("O"),
            User = user,
            Action = action,
            Target = target,
        });
        if (_data.Audit.Count > 500) _data.Audit.RemoveRange(500, _data.Audit.Count - 500);
        Save();
    }

    public List<string> Favorites(string userId) =>
        _data.Favorites.TryGetValue(userId, out var list) ? list : [];

    public void SetFavorites(string userId, IEnumerable<string> ids)
    {
        _data.Favorites[userId] = ids.ToList();
        Save();
    }
}
