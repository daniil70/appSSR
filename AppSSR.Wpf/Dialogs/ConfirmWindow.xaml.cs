using System.Windows;
using AppSSR.Wpf.ViewModels;

namespace AppSSR.Wpf.Dialogs;

public partial class ConfirmWindow : Window
{
    public ConfirmWindow(ConfirmRequest req)
    {
        InitializeComponent();
        DataContext = req;
        OkBtn.Style = (Style)FindResource(req.Danger ? "BtnDanger" : "BtnPrimary");
    }
    private void OnOk(object sender, RoutedEventArgs e) { DialogResult = true; }
    private void OnCancel(object sender, RoutedEventArgs e) { DialogResult = false; }
}
