using System.Windows;
using System.Windows.Controls;
using AppSSR.Wpf.ViewModels;

namespace AppSSR.Wpf;

public partial class LoginWindow : Window
{
    private readonly LoginViewModel _vm;

    public LoginWindow()
    {
        InitializeComponent();
        _vm = new LoginViewModel(App.Services);
        _vm.LoggedIn += user =>
        {
            App.ShowMain(user);
            Close();
        };
        DataContext = _vm;
        Loaded += (_, _) => LoginBox.Focus();
    }

    private void OnPasswordChanged(object sender, RoutedEventArgs e) => _vm.Password = ((PasswordBox)sender).Password;
    private void OnLoginTab(object sender, RoutedEventArgs e) => _vm.IsRegister = false;
    private void OnRegisterTab(object sender, RoutedEventArgs e) => _vm.IsRegister = true;
    private void OnSubmit(object sender, RoutedEventArgs e) => _vm.SubmitCommand.Execute(null);
}
