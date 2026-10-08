using System.Collections.ObjectModel;
using System.Windows;
using AppSSR;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace AppSSR.Wpf.ViewModels;

public partial class LoginViewModel : ObservableObject
{
    private readonly AppService _svc;
    [ObservableProperty] private string _login = "";
    [ObservableProperty] private string _password = "";
    [ObservableProperty] private string _displayName = "";
    [ObservableProperty] private bool _isRegister;
    [ObservableProperty] private string? _error;
    [ObservableProperty] private bool _busy;
    public string ModeLabel => IsRegister ? "Регистрация" : "Вход в AppSSR";
    public string SubmitLabel => IsRegister ? "Создать учётную запись" : "Войти";
    public event Action<UserInfo>? LoggedIn;

    public LoginViewModel(AppService svc) => _svc = svc;

    partial void OnIsRegisterChanged(bool value)
    {
        Error = null;
        OnPropertyChanged(nameof(ModeLabel));
        OnPropertyChanged(nameof(SubmitLabel));
    }

    [RelayCommand]
    private void Submit()
    {
        Error = null;
        Busy = true;
        try
        {
            var (ok, user, msg) = IsRegister
                ? _svc.Register(Login, Password, DisplayName)
                : _svc.Login(Login, Password);
            if (ok && user is not null) LoggedIn?.Invoke(user);
            else Error = msg ?? "Ошибка";
        }
        finally { Busy = false; }
    }
}

public partial class ShellViewModel : ObservableObject
{
    public AppService Service { get; }
    private readonly Action<Action> _ui;
    private HashSet<string> _favorites = [];

    [ObservableProperty] private UserInfo _currentUser = null!;
    [ObservableProperty] private string _search = "";
    [ObservableProperty] private NavPage _page = NavPage.All;
    [ObservableProperty] private ProgramCardViewModel? _selectedProgram;
    [ObservableProperty] private TableCardViewModel? _selectedTable;
    [ObservableProperty] private string? _toast;
    [ObservableProperty] private string _toastKind = "info";
    [ObservableProperty] private SettingsViewModel? _settings;

    public ObservableCollection<ProgramCardViewModel> Programs { get; } = [];
    public ObservableCollection<TableCardViewModel> Tables { get; } = [];
    public ObservableCollection<object> VisibleItems { get; } = [];

    public bool CanEdit => CurrentUser.CanEditCatalog;
    public bool IsSettings => Page == NavPage.Settings;
    public bool ShowTables => Page == NavPage.Tables;
    public bool ShowCatalog => Page is NavPage.All or NavPage.Installed or NavPage.Favorites;
    public bool PanelOpen => !IsSettings && (SelectedProgram is not null || SelectedTable is not null);
    public bool ShowAddProgram => CanEdit && Page is NavPage.All;
    public bool ShowAddTable => CanEdit && Page == NavPage.Tables;
    public bool ShowEmpty => !IsSettings && VisibleItems.Count == 0;
    public bool HasVisibleItems => VisibleItems.Count > 0;

    public string Title => Page switch
    {
        NavPage.Settings => "Настройки",
        NavPage.Installed => "Установленные",
        NavPage.Favorites => "Избранное",
        NavPage.Tables => "Таблицы",
        _ => "Приложения",
    };
    public string Subtitle => Page switch
    {
        NavPage.Settings => "Папка установки, пользователи и права.",
        NavPage.Tables => "Ссылки на таблицы с аналитикой в Synology. Открываются в браузере по умолчанию.",
        NavPage.Installed => "Программы, файлы которых найдены в папке установки.",
        NavPage.Favorites => "Отмеченные звёздочкой программы и таблицы.",
        _ => "Выберите программу из каталога, чтобы установить или открыть.",
    };

    public int CountAll => Programs.Count;
    public int CountInstalled => Programs.Count(p => p.Status.State == InstallState.Installed);
    public int CountTables => Tables.Count;
    public int CountFavorites => Programs.Count(p => p.IsFavorite) + Tables.Count(t => t.IsFavorite);

    public event Action? LogoutRequested;
    public event Action<ProgramEditViewModel, Action<ProgramItem, Action<string?>>>? EditProgramRequested;
    public event Action<TableEditViewModel, Action<TableLink, Action<string?>>>? EditTableRequested;
    public event Func<ConfirmRequest, bool>? ConfirmRequested;

    public ShellViewModel(AppService svc, UserInfo user, Action<Action> ui)
    {
        Service = svc;
        CurrentUser = user;
        _ui = ui;
        svc.InstallHappened += e => ui(() => OnInstall(e));
        Reload();
        _ = RefreshLoop();
    }

    private async Task RefreshLoop()
    {
        while (true)
        {
            await Task.Delay(5000);
            _ui(() => { foreach (var p in Programs) p.Refresh(); Recount(); });
        }
    }

    public void Reload()
    {
        _favorites = Service.Store.Favorites(CurrentUser.Id).ToHashSet();
        var keepP = SelectedProgram?.Item.Id;
        var keepT = SelectedTable?.Item.Id;
        Programs.Clear();
        Tables.Clear();
        foreach (var p in Service.Store.Catalog.Programs.OrderByDescending(x => x.Popularity))
        {
            var vm = new ProgramCardViewModel(p, this) { IsFavorite = _favorites.Contains(p.Id) };
            Programs.Add(vm);
        }
        foreach (var t in Service.Store.Catalog.Tables.OrderBy(x => x.Name, StringComparer.CurrentCulture))
        {
            var vm = new TableCardViewModel(t, this) { IsFavorite = _favorites.Contains(t.Id) };
            Tables.Add(vm);
        }
        SelectedProgram = Programs.FirstOrDefault(p => p.Item.Id == keepP);
        SelectedTable = Tables.FirstOrDefault(t => t.Item.Id == keepT);
        ApplyFilter();
        Settings = new SettingsViewModel(Service, ShowToast);
        Recount();
        OnPropertyChanged(nameof(CanEdit));
        OnPropertyChanged(nameof(ShowAddProgram));
        OnPropertyChanged(nameof(ShowAddTable));
    }

    private void Recount()
    {
        OnPropertyChanged(nameof(CountAll));
        OnPropertyChanged(nameof(CountInstalled));
        OnPropertyChanged(nameof(CountTables));
        OnPropertyChanged(nameof(CountFavorites));
        if (Page is NavPage.Installed or NavPage.Favorites) ApplyFilter();
    }

    partial void OnSearchChanged(string value) => ApplyFilter();
    partial void OnPageChanged(NavPage value)
    {
        SelectedProgram = null;
        SelectedTable = null;
        ApplyFilter();
        OnPropertyChanged(nameof(IsSettings));
        OnPropertyChanged(nameof(ShowTables));
        OnPropertyChanged(nameof(ShowCatalog));
        OnPropertyChanged(nameof(Title));
        OnPropertyChanged(nameof(Subtitle));
        OnPropertyChanged(nameof(ShowAddProgram));
        OnPropertyChanged(nameof(ShowAddTable));
        OnPropertyChanged(nameof(PanelOpen));
        if (value == NavPage.Settings) Settings?.Reload();
    }

    partial void OnSelectedProgramChanged(ProgramCardViewModel? value)
    {
        foreach (var p in Programs) p.IsSelected = p == value;
        if (value is not null) SelectedTable = null;
        OnPropertyChanged(nameof(PanelOpen));
    }
    partial void OnSelectedTableChanged(TableCardViewModel? value)
    {
        foreach (var t in Tables) t.IsSelected = t == value;
        if (value is not null) SelectedProgram = null;
        OnPropertyChanged(nameof(PanelOpen));
    }

    public void ApplyFilter()
    {
        var q = Search.Trim().ToLowerInvariant();
        bool Match(params string?[] f) => q.Length == 0 || f.Any(s => s?.ToLowerInvariant().Contains(q) == true);
        VisibleItems.Clear();
        if (Page == NavPage.Settings) return;
        if (Page == NavPage.Tables)
        {
            foreach (var t in Tables.Where(t => Match(t.Item.Name, t.Item.Description, t.Item.Url))) VisibleItems.Add(t);
            return;
        }
        IEnumerable<ProgramCardViewModel> list = Programs.Where(p => Match(p.Item.Name, p.Item.ShortDescription, p.Item.Description));
        if (Page == NavPage.Installed) list = list.Where(p => p.Status.State == InstallState.Installed);
        if (Page == NavPage.Favorites)
        {
            foreach (var p in list.Where(p => p.IsFavorite)) VisibleItems.Add(p);
            foreach (var t in Tables.Where(t => t.IsFavorite && Match(t.Item.Name, t.Item.Description))) VisibleItems.Add(t);
            return;
        }
        foreach (var p in list) VisibleItems.Add(p);
        OnPropertyChanged(nameof(EmptyText));
        OnPropertyChanged(nameof(ShowEmpty));
        OnPropertyChanged(nameof(HasVisibleItems));
    }

    public string EmptyText => Search.Length > 0 ? "Ничего не найдено"
        : Page == NavPage.Tables ? "Таблиц пока нет"
        : Page == NavPage.Installed ? "Нет установленных программ"
        : Page == NavPage.Favorites ? "Избранное пусто"
        : "В каталоге пока нет программ";

    public void SelectProgram(ProgramCardViewModel vm) => SelectedProgram = vm;
    public void SelectTable(TableCardViewModel vm) => SelectedTable = vm;

    public void RunProgramAction(ProgramCardViewModel vm)
    {
        if (!vm.Item.Available) return;
        if (vm.Status.State is InstallState.NotInstalled or InstallState.Error) Install(vm);
        else if (vm.Status.State == InstallState.Installed) Open(vm);
    }

    public void Install(ProgramCardViewModel vm)
    {
        var r = Service.Installer.Install(vm.Item, Service.Store.Catalog.Settings, CurrentUser.Login);
        if (!r.Ok) ShowToast(r.Message ?? "Не удалось начать установку", "error");
        vm.Refresh();
        Recount();
    }

    public async void Open(ProgramCardViewModel vm)
    {
        var r = await Task.Run(() => Service.Installer.Open(vm.Item, Service.Store.Catalog.Settings, CurrentUser.Login));
        if (r.Ok)
        {
            if (r.Message is not null) ShowToast(r.Message, "info");
            return;
        }
        if (r.ExeMissing)
        {
            if (ConfirmRequested?.Invoke(new ConfirmRequest { Title = "Файл не найден", Message = r.Message ?? "", ConfirmText = "Переустановить" }) == true)
            {
                Service.Installer.Remove(vm.Item, Service.Store.Catalog.Settings, CurrentUser.Login);
                Install(vm);
            }
        }
        else ShowToast(r.Message ?? "Не удалось запустить программу", "error");
    }

    public void RemoveInstall(ProgramCardViewModel vm)
    {
        var msg = $"Папка «{vm.Status.ResolvedDir}» будет удалена. Карточка вернётся в состояние «не установлена».";
        if (ConfirmRequested?.Invoke(new ConfirmRequest { Title = "Удалить программу?", Message = msg, ConfirmText = "Удалить", Danger = true }) != true) return;
        var r = Service.Installer.Remove(vm.Item, Service.Store.Catalog.Settings, CurrentUser.Login);
        if (!r.Ok) ShowToast(r.Message ?? "Не удалось удалить", "error");
        else ShowToast($"{vm.Item.Name} удалена", "success");
        vm.Log = "";
        vm.Refresh();
        Recount();
    }

    public void DeleteProgramFromCatalog(ProgramCardViewModel vm)
    {
        if (ConfirmRequested?.Invoke(new ConfirmRequest { Title = "Удалить из каталога?", Message = $"Карточка «{vm.Item.Name}» будет удалена из каталога для всех пользователей. Файлы на диске не затрагиваются.", ConfirmText = "Удалить", Danger = true }) != true) return;
        var r = Service.DeleteProgram(vm.Item.Id);
        if (!r.Ok) { ShowToast(r.Message ?? "Ошибка", "error"); return; }
        if (SelectedProgram == vm) SelectedProgram = null;
        Reload();
    }

    public void EditProgram(ProgramCardViewModel? vm)
    {
        var edit = new ProgramEditViewModel(vm?.Item);
        EditProgramRequested?.Invoke(edit, (item, done) =>
        {
            var r = Service.SaveProgram(item);
            done(r.Ok ? null : r.Message);
            if (r.Ok) { ShowToast("Карточка сохранена", "success"); Reload(); }
        });
    }

    public void OpenTable(TableCardViewModel vm)
    {
        var r = Service.OpenUrl(vm.Item.Url);
        if (!r.Ok) ShowToast(r.Message ?? "Не удалось открыть ссылку", "error");
    }

    public void EditTable(TableCardViewModel? vm)
    {
        var edit = new TableEditViewModel(vm?.Item);
        EditTableRequested?.Invoke(edit, (item, done) =>
        {
            var r = Service.SaveTable(item);
            done(r.Ok ? null : r.Message);
            if (r.Ok) { ShowToast("Таблица сохранена", "success"); Reload(); }
        });
    }

    public void DeleteTable(TableCardViewModel vm)
    {
        if (ConfirmRequested?.Invoke(new ConfirmRequest { Title = "Удалить таблицу?", Message = $"Ссылка «{vm.Item.Name}» будет удалена из каталога.", ConfirmText = "Удалить", Danger = true }) != true) return;
        var r = Service.DeleteTable(vm.Item.Id);
        if (!r.Ok) { ShowToast(r.Message ?? "Ошибка", "error"); return; }
        if (SelectedTable == vm) SelectedTable = null;
        Reload();
    }

    public void ToggleFavorite(string id)
    {
        if (!_favorites.Add(id)) _favorites.Remove(id);
        Service.Store.SetFavorites(CurrentUser.Id, _favorites);
        foreach (var p in Programs) p.IsFavorite = _favorites.Contains(p.Item.Id);
        foreach (var t in Tables) t.IsFavorite = _favorites.Contains(t.Item.Id);
        Recount();
        if (Page == NavPage.Favorites) ApplyFilter();
    }

    private void OnInstall(InstallEvent e)
    {
        var vm = Programs.FirstOrDefault(p => p.Item.Id == e.ProgramId);
        if (vm is null) return;
        if (e.Kind == "started") vm.Log = "";
        else if (e.Kind == "log") vm.Log += e.Chunk;
        else if (e.Kind == "finished")
        {
            vm.Log = e.Output ?? vm.Log;
            if (e.Ok) ShowToast($"{vm.Item.Name}: установка завершена", "success");
            else ShowToast($"{vm.Item.Name}: установка не выполнена{(e.Code is int c ? $" (код {c})" : "")}. Подробности — в карточке программы.", "error");
        }
        vm.Refresh();
        Recount();
    }

    public void ShowToast(string text, string kind)
    {
        ToastKind = kind;
        Toast = text;
        _ = HideToast();
    }

    private async Task HideToast()
    {
        var current = Toast;
        await Task.Delay(ToastKind == "error" ? 7000 : 4000);
        if (Toast == current) Toast = null;
    }

    [RelayCommand] private void GoAll() => Page = NavPage.All;
    [RelayCommand] private void GoInstalled() => Page = NavPage.Installed;
    [RelayCommand] private void GoFavorites() => Page = NavPage.Favorites;
    [RelayCommand] private void GoTables() => Page = NavPage.Tables;
    [RelayCommand] private void GoSettings() => Page = NavPage.Settings;
    [RelayCommand] private void ClosePanel() { SelectedProgram = null; SelectedTable = null; }
    [RelayCommand] private void Logout() => LogoutRequested?.Invoke();
    [RelayCommand] private void AddProgram() => EditProgram(null);
    [RelayCommand] private void AddTable() => EditTable(null);
    [RelayCommand] private void ClearSearch() => Search = "";
}
