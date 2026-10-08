using AppSSR;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace AppSSR.Wpf.ViewModels;

public enum NavPage { All, Installed, Favorites, Tables, Settings }

public partial class ProgramCardViewModel : ObservableObject
{
    private readonly ShellViewModel _shell;
    public ProgramItem Item { get; private set; }

    [ObservableProperty] private ProgramStatus _status = new();
    [ObservableProperty] private string _log = "";
    [ObservableProperty] private bool _isSelected;
    [ObservableProperty] private bool _isFavorite;

    public ProgramCardViewModel(ProgramItem item, ShellViewModel shell)
    {
        Item = item;
        _shell = shell;
        Refresh();
    }

    public void Replace(ProgramItem item) { Item = item; OnPropertyChanged(nameof(Item)); Refresh(); }

    public void Refresh()
    {
        Status = _shell.Service.StatusOf(Item);
        OnPropertyChanged(nameof(ActionLabel));
        OnPropertyChanged(nameof(ActionKind));
        OnPropertyChanged(nameof(ActionEnabled));
        OnPropertyChanged(nameof(ChipText));
        OnPropertyChanged(nameof(ChipKind));
        OnPropertyChanged(nameof(ShowRemove));
        OnPropertyChanged(nameof(StateLabel));
    }

    public string ChipText => !Item.Available ? "Скоро" : Item.Type == ProgramType.Builtin ? "Встроенная" : "GitLab";
    public string ChipKind => !Item.Available ? "amber" : Item.Type == ProgramType.Builtin ? "green" : "blue";
    public string StateLabel => Status.State switch
    {
        InstallState.Installed => "Установлена",
        InstallState.Installing => "Идёт установка",
        InstallState.Error => "Ошибка",
        _ => Item.Available ? "Не установлена" : "Нет репозитория",
    };
    public string ActionLabel => Status.State switch
    {
        InstallState.Installed => "Открыть",
        InstallState.Installing => "Идёт установка",
        InstallState.Error => "Ошибка · повторить",
        _ => Item.Available ? "Установить" : "Скоро",
    };
    public string ActionKind => Status.State switch
    {
        InstallState.Installed => "primary",
        InstallState.Installing => "primary",
        InstallState.Error => "danger",
        _ => Item.Available ? "soft" : "outline",
    };
    public bool ActionEnabled => Item.Available && Status.State != InstallState.Installing;
    public bool ShowRemove => Status.State == InstallState.Installed && Item.Type == ProgramType.External;
    public bool CanEdit => _shell.CanEdit;

    [RelayCommand] private void Select() => _shell.SelectProgram(this);
    [RelayCommand] private void Action() => _shell.RunProgramAction(this);
    [RelayCommand] private void ToggleFavorite() => _shell.ToggleFavorite(Item.Id);
    [RelayCommand] private void Edit() => _shell.EditProgram(this);
    [RelayCommand] private void DeleteFromCatalog() => _shell.DeleteProgramFromCatalog(this);
    [RelayCommand] private void RemoveInstall() => _shell.RemoveInstall(this);
}

public partial class TableCardViewModel : ObservableObject
{
    private readonly ShellViewModel _shell;
    public TableLink Item { get; private set; }
    [ObservableProperty] private bool _isSelected;
    [ObservableProperty] private bool _isFavorite;
    public bool CanEdit => _shell.CanEdit;
    public string AddedLabel => DateTime.TryParse(Item.CreatedAt, out var d) ? d.ToLocalTime().ToString("dd.MM.yyyy") : Item.CreatedAt;

    public TableCardViewModel(TableLink item, ShellViewModel shell)
    {
        Item = item;
        _shell = shell;
    }
    public void Replace(TableLink item) { Item = item; OnPropertyChanged(nameof(Item)); OnPropertyChanged(nameof(AddedLabel)); }

    [RelayCommand] private void Select() => _shell.SelectTable(this);
    [RelayCommand] private void Open() => _shell.OpenTable(this);
    [RelayCommand] private void ToggleFavorite() => _shell.ToggleFavorite(Item.Id);
    [RelayCommand] private void Edit() => _shell.EditTable(this);
    [RelayCommand] private void Delete() => _shell.DeleteTable(this);
}
