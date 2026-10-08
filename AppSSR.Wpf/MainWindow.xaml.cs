using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Threading;
using AppSSR;
using AppSSR.Wpf.Dialogs;
using AppSSR.Wpf.ViewModels;

namespace AppSSR.Wpf;

public partial class MainWindow : Window
{
    private readonly ShellViewModel _vm;

    public MainWindow(UserInfo user)
    {
        InitializeComponent();
        _vm = new ShellViewModel(App.Services, user, a => Dispatcher.Invoke(a, DispatcherPriority.Normal));
        _vm.LogoutRequested += () =>
        {
            App.Services.Logout();
            App.ShowLogin();
            Close();
        };
        _vm.ConfirmRequested += req =>
        {
            var w = new ConfirmWindow(req) { Owner = this };
            return w.ShowDialog() == true;
        };
        _vm.EditProgramRequested += (edit, save) =>
        {
            var w = new ProgramEditWindow(edit, save) { Owner = this };
            w.ShowDialog();
        };
        _vm.EditTableRequested += (edit, save) =>
        {
            var w = new TableEditWindow(edit, save) { Owner = this };
            w.ShowDialog();
        };
        DataContext = _vm;
    }

    private void OnCardMenu(object sender, RoutedEventArgs e)
    {
        if (sender is Button b)
        {
            if (b.ContextMenu is null) return;
            b.ContextMenu.PlacementTarget = b;
            b.ContextMenu.Placement = System.Windows.Controls.Primitives.PlacementMode.Bottom;
            b.ContextMenu.IsOpen = true;
        }
        e.Handled = true;
    }

    private void OnCardMouseUp(object sender, MouseButtonEventArgs e)
    {
        if (sender is FrameworkElement { DataContext: ProgramCardViewModel p }) p.SelectCommand.Execute(null);
        if (sender is FrameworkElement { DataContext: TableCardViewModel t }) t.SelectCommand.Execute(null);
    }
}
