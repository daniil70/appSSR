using AppSSR;
using Xunit;

public class StoreTests
{
    private static string Tmp()
    {
        var dir = Path.Combine(Path.GetTempPath(), "appssr-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        return dir;
    }

    [Fact]
    public void Admin_admin_logs_in()
    {
        var svc = new AppService(Tmp());
        var (ok, user, err) = svc.Login("admin", "admin");
        Assert.True(ok, err);
        Assert.Equal("admin", user!.Login);
        Assert.Equal(Role.Admin, user.Role);
        Assert.True(user.CanEditCatalog);
    }

    [Fact]
    public void Wrong_password_is_rejected()
    {
        var svc = new AppService(Tmp());
        var (ok, _, msg) = svc.Login("admin", "nope");
        Assert.False(ok);
        Assert.Equal("Неверный логин или пароль", msg);
    }

    [Fact]
    public void Catalog_is_closed_without_login()
    {
        var svc = new AppService(Tmp());
        var r = svc.SaveTable(new TableLink { Name = "X", Url = "https://example.com" });
        Assert.False(r.Ok);
        Assert.Contains("авторизац", r.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Admin_can_add_named_table_link()
    {
        var svc = new AppService(Tmp());
        svc.Login("admin", "admin");
        var r = svc.SaveTable(new TableLink { Name = "Отчёт Q3", Url = "https://synology.alabuga.space/q3", Description = "Квартальный" });
        Assert.True(r.Ok, r.Message);
        Assert.Contains(svc.Store.Catalog.Tables, t => t.Name == "Отчёт Q3" && t.Url.Contains("q3"));
    }

    [Fact]
    public void Regular_user_cannot_edit_catalog()
    {
        var svc = new AppService(Tmp());
        svc.Register("ivan", "pass123", "Иван Петров");
        var r = svc.SaveProgram(new ProgramItem { Name = "X", Available = true });
        Assert.False(r.Ok);
    }

    [Fact]
    public void Seed_contains_install_commands()
    {
        var c = Seed.Catalog();
        Assert.Contains(c.Programs, p => p.Id == "assessment" && p.InstallCommand!.Contains("assessmentmysql.git"));
        Assert.Contains(c.Programs, p => p.Id == "analytics" && p.InstallCommand!.Contains("analitika.git"));
        Assert.Contains(c.Programs, p => p.Id == "lifapp" && p.InstallCommand!.Contains("lifapp.git"));
        Assert.Contains(c.Programs, p => p.Id == "bcapp" && !p.Available);
    }

    [Fact]
    public void Installer_status_is_not_installed_when_folder_empty()
    {
        var dir = Tmp();
        var svc = new AppService(dir);
        svc.Login("admin", "admin");
        var p = svc.Store.Catalog.Programs.First(x => x.Id == "analytics");
        p.InstallDir = Path.Combine(dir, "empty-analytics");
        var st = svc.StatusOf(p);
        Assert.Equal(InstallState.NotInstalled, st.State);
    }

    [Fact]
    public void Passwords_are_not_stored_in_plaintext()
    {
        var dir = Tmp();
        var svc = new AppService(dir);
        var json = File.ReadAllText(Path.Combine(dir, "appssr-data.json"));
        Assert.DoesNotContain("\"password\"", json, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("\"hash\"", json);
        Assert.Contains("\"salt\"", json);
        Assert.DoesNotMatch("\"hash\"\\s*:\\s*\"admin\"", json);
    }
}
