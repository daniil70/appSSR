using System.Windows;
using AppSSR;
using AppSSR.Wpf.ViewModels;

namespace AppSSR.Wpf.Dialogs;

public partial class TableEditWindow : Window
{
    private readonly TableEditViewModel _vm;
    private readonly Action<TableLink, Action<string?>> _save;

    public TableEditWindow(TableEditViewModel vm, Action<TableLink, Action<string?>> save)
    {
        InitializeComponent();
        _vm = vm;
        _save = save;
        DataContext = vm;
    }

    private void OnCancel(object sender, RoutedEventArgs e) => Close();
    private void OnSave(object sender, RoutedEventArgs e)
    {
        _save(_vm.Item, err =>
        {
            if (err is null) { DialogResult = true; Close(); }
            else _vm.Error = err;
        });
    }
}
