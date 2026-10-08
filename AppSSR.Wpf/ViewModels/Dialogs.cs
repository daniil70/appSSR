using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Media;
using AppSSR;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace AppSSR.Wpf.ViewModels;

public sealed class ConfirmRequest
{
    public string Title { get; init; } = "Подтверждение";
    public string Message { get; init; } = "";
    public string ConfirmText { get; init; } = "Подтвердить";
    public bool Danger { get; init; }
}

public sealed class ProgramEditViewModel : ObservableObject
{
    public ProgramItem Item { get; }
    public bool IsNew { get; }
    public string Title => IsNew ? "Новая программа" : "Редактирование программы";
    public IReadOnlyList<IconKey> Icons { get; } = Enum.GetValues<IconKey>();
    public IReadOnlyList<string> Colors { get; } = ["#1769e0", "#1b8a5a", "#6a3fd6", "#d97706", "#0e8c8c", "#d64545", "#2c8cff", "#15233a"];
    public IReadOnlyList<string> Types { get; } = ["Внешняя (установка из GitLab)", "Встроенная в AppSSR"];
    public ObservableCollection<string> FeatureList { get; }

    private string _featureDraft = "";
    public string FeatureDraft { get => _featureDraft; set => SetProperty(ref _featureDraft, value); }

    private string? _error;
    public string? Error { get => _error; set => SetProperty(ref _error, value); }

    public int TypeIndex
    {
        get => Item.Type == ProgramType.Builtin ? 1 : 0;
        set { Item.Type = value == 1 ? ProgramType.Builtin : ProgramType.External; OnPropertyChanged(); OnPropertyChanged(nameof(IsExternal)); }
    }
    public bool IsExternal => Item.Type == ProgramType.External;

    public ProgramEditViewModel(ProgramItem? source)
    {
        IsNew = source is null || string.IsNullOrEmpty(source.Id);
        Item = source is null
            ? new ProgramItem { Color = "#1769e0", Icon = IconKey.App, Version = "1.0.0", Developer = "SSR", Size = "—", UpdatedAt = DateTime.Today.ToString("yyyy-MM-dd"), Available = true, Popularity = 50 }
            : Clone(source);
        FeatureList = new ObservableCollection<string>(Item.Features);
    }

    public void AddFeature()
    {
        if (string.IsNullOrWhiteSpace(FeatureDraft)) return;
        FeatureList.Add(FeatureDraft.Trim());
        FeatureDraft = "";
    }

    public void RemoveFeature(string f) => FeatureList.Remove(f);

    public void NotifyItem() => OnPropertyChanged(nameof(Item));

    public ProgramItem Build()
    {
        Item.Features = FeatureList.ToList();
        return Item;
    }

    private static ProgramItem Clone(ProgramItem s) => new()
    {
        Id = s.Id, Name = s.Name, Type = s.Type, ShortDescription = s.ShortDescription, Description = s.Description,
        Features = [.. s.Features], Icon = s.Icon, Color = s.Color, InstallCommand = s.InstallCommand, RepoUrl = s.RepoUrl,
        InstallDir = s.InstallDir, ExePath = s.ExePath, Version = s.Version, Developer = s.Developer, Size = s.Size,
        UpdatedAt = s.UpdatedAt, Available = s.Available, Popularity = s.Popularity,
    };
}

public sealed class TableEditViewModel : ObservableObject
{
    public TableLink Item { get; }
    public bool IsNew { get; }
    public string Title => IsNew ? "Новая ссылка на таблицу" : "Редактирование таблицы";
    private string? _error;
    public string? Error { get => _error; set => SetProperty(ref _error, value); }

    public TableEditViewModel(TableLink? source)
    {
        IsNew = source is null || string.IsNullOrEmpty(source.Id);
        Item = source is null
            ? new TableLink { CreatedAt = DateTime.UtcNow.ToString("O") }
            : new TableLink { Id = source.Id, Name = source.Name, Url = source.Url, Description = source.Description, CreatedBy = source.CreatedBy, CreatedAt = source.CreatedAt };
    }
}

public sealed class UserRowViewModel : ObservableObject
{
    private readonly AppService _svc;
    private readonly Action _reload;
    public UserInfo User { get; }
    public bool IsBuiltInAdmin => User.Login == "admin";
    public bool CanChangeRole { get; }
    public IReadOnlyList<string> Roles { get; } = ["Пользователь", "Администратор"];
    public int RoleIndex
    {
        get => User.Role == Role.Admin ? 1 : 0;
        set
        {
            if (IsBuiltInAdmin) return;
            var role = value == 1 ? Role.Admin : Role.User;
            var r = _svc.SetRole(User.Id, role);
            if (!r.Ok) MessageBox.Show(r.Message, "AppSSR", MessageBoxButton.OK, MessageBoxImage.Warning);
            _reload();
        }
    }
    public bool ManageCatalog
    {
        get => User.Role == Role.Admin || User.Permissions.ManageCatalog;
        set
        {
            if (User.Role == Role.Admin) return;
            var r = _svc.SetPermissions(User.Id, value);
            if (!r.Ok) MessageBox.Show(r.Message, "AppSSR", MessageBoxButton.OK, MessageBoxImage.Warning);
            _reload();
        }
    }
    public UserRowViewModel(UserInfo user, AppService svc, Action reload, string currentUserId)
    {
        User = user;
        _svc = svc;
        _reload = reload;
        CanChangeRole = !IsBuiltInAdmin && user.Id != currentUserId;
    }
}

public partial class SettingsViewModel : ObservableObject
{
    private readonly AppService _svc;
    private readonly Action<string, string> _toast;

    [ObservableProperty] private string _appsRoot = "";
    [ObservableProperty] private ObservableCollection<UserRowViewModel> _users = [];
    [ObservableProperty] private ObservableCollection<AuditEntry> _audit = [];

    public bool IsAdmin => _svc.CurrentUser?.Role == Role.Admin;
    public bool CanSaveSettings => IsAdmin && AppsRoot != _svc.Store.Catalog.Settings.AppsRoot;

    public SettingsViewModel(AppService svc, Action<string, string> toast)
    {
        _svc = svc;
        _toast = toast;
        Reload();
    }

    public void Reload()
    {
        AppsRoot = _svc.Store.Catalog.Settings.AppsRoot;
        if (IsAdmin)
        {
            Users = new ObservableCollection<UserRowViewModel>(
                _svc.Store.ListUsers().Select(u => new UserRowViewModel(u, _svc, Reload, _svc.CurrentUser!.Id)));
            Audit = new ObservableCollection<AuditEntry>(_svc.Store.Audit.Take(30));
        }
        OnPropertyChanged(nameof(IsAdmin));
        OnPropertyChanged(nameof(CanSaveSettings));
    }

    partial void OnAppsRootChanged(string value) => OnPropertyChanged(nameof(CanSaveSettings));

    [RelayCommand]
    private void SaveSettings()
    {
        var r = _svc.SaveSettings(AppsRoot);
        if (!r.Ok) { _toast(r.Message ?? "Ошибка", "error"); return; }
        _toast("Настройки сохранены", "success");
        Reload();
    }

    [RelayCommand]
    private void BrowseFolder()
    {
        var dlg = new Microsoft.Win32.OpenFolderDialog { Title = "Папка установки программ" };
        if (dlg.ShowDialog() == true) AppsRoot = dlg.FolderName;
    }
}
