using System.IO;
using System.Windows;
using AppSSR;

namespace AppSSR.Wpf;

public partial class App : Application
{
    public static AppService Services { get; private set; } = null!;

    private void OnStartup(object sender, StartupEventArgs e)
    {
        var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "AppSSR");
        Services = new AppService(dir);
        ShowLogin();
    }

    public static void ShowLogin()
    {
        var w = new LoginWindow();
        w.Show();
    }

    public static void ShowMain(UserInfo user)
    {
        var w = new MainWindow(user);
        w.Show();
    }
}
