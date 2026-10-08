using System.Windows;
using System.Windows.Controls;
using AppSSR;
using AppSSR.Wpf.ViewModels;

namespace AppSSR.Wpf.Dialogs;

public partial class ProgramEditWindow : Window
{
    private readonly ProgramEditViewModel _vm;
    private readonly Action<ProgramItem, Action<string?>> _save;

    public ProgramEditWindow(ProgramEditViewModel vm, Action<ProgramItem, Action<string?>> save)
    {
        InitializeComponent();
        _vm = vm;
        _save = save;
        DataContext = vm;
    }

    private void OnCancel(object sender, RoutedEventArgs e) => Close();
    private void OnColor(object sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string c })
        {
            _vm.Item.Color = c;
            _vm.NotifyItem();
        }
    }
    private void OnSave(object sender, RoutedEventArgs e)
    {
        _save(_vm.Build(), err =>
        {
            if (err is null) { DialogResult = true; Close(); }
            else _vm.Error = err;
        });
    }
}
