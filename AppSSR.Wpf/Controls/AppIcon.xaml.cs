using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using AppSSR;

namespace AppSSR.Wpf.Controls;

public partial class AppIcon : UserControl
{
    public static readonly DependencyProperty IconProperty = DependencyProperty.Register(nameof(Icon), typeof(IconKey), typeof(AppIcon), new PropertyMetadata(IconKey.App, OnChanged));
    public static readonly DependencyProperty ColorProperty = DependencyProperty.Register(nameof(Color), typeof(string), typeof(AppIcon), new PropertyMetadata("#1769e0", OnChanged));
    public static readonly DependencyProperty SizeProperty = DependencyProperty.Register(nameof(Size), typeof(double), typeof(AppIcon), new PropertyMetadata(48.0, OnChanged));

    public IconKey Icon { get => (IconKey)GetValue(IconProperty); set => SetValue(IconProperty, value); }
    public string Color { get => (string)GetValue(ColorProperty); set => SetValue(ColorProperty, value); }
    public double Size { get => (double)GetValue(SizeProperty); set => SetValue(SizeProperty, value); }

    public AppIcon()
    {
        InitializeComponent();
        Loaded += (_, _) => Apply();
    }

    private static void OnChanged(DependencyObject d, DependencyPropertyChangedEventArgs e) => ((AppIcon)d).Apply();

    private void Apply()
    {
        if (Bg is null) return;
        var c = Parse(Color);
        var dark = Shade(c, -28);
        Bg.CornerRadius = new CornerRadius(Math.Round(Size * 0.22));
        Bg.Background = new LinearGradientBrush(c, dark, new Point(0, 0), new Point(1, 1));
        Glyph.Data = Geometry.Parse(PathFor(Icon));
    }

    private static Color Parse(string hex)
    {
        try { return (Color)ColorConverter.ConvertFromString(hex); }
        catch { return System.Windows.Media.Color.FromRgb(23, 105, 224); }
    }

    private static Color Shade(Color c, int d)
    {
        byte N(int v) => (byte)Math.Clamp(v + d, 0, 255);
        return System.Windows.Media.Color.FromRgb(N(c.R), N(c.G), N(c.B));
    }

    private static string PathFor(IconKey icon) => icon switch
    {
        IconKey.Assessment => "M4 7 L12 3 L20 7 L20 17 L12 21 L4 17 Z M4 7 L12 11 L20 7 M12 11 L12 21",
        IconKey.Analytics => "M5 20 L5 10 M12 20 L12 4 M19 20 L19 13",
        IconKey.Lif => "M12 2 L3 7 L3 17 L12 22 L21 17 L21 7 Z M3 7 L12 12 L21 7 M12 12 L12 22",
        IconKey.Bc => "M3 4 H21 V20 H3 Z M7 15 L10 12 L13 14 L17 9",
        IconKey.Table => "M3 4 H21 V20 H3 Z M3 10 H21 M9 4 V20 M15 4 V20",
        IconKey.Doc => "M6 2 H14 L19 7 V22 H6 Z M14 2 V7 H19 M9 13 H15 M9 17 H15",
        IconKey.Shield => "M12 2 L4 5 V11 C4 16 7.4 20.4 12 22 C16.6 20.4 20 16 20 11 V5 Z",
        IconKey.Cloud => "M7 18 H18 C20 18 21.5 16.5 21.5 14.5 C21.5 12.5 20 11 18 11 C17.8 8 15.5 6 12.5 6 C9.2 6 6.5 8.5 6.5 12 C4.5 12.2 3 14 3 16 C3 18 4.8 18 7 18",
        IconKey.Drive => "M12 3 A2 2 0 1 1 12 7 A2 2 0 1 1 12 3 M6 16 A2 2 0 1 1 6 20 A2 2 0 1 1 6 16 M18 16 A2 2 0 1 1 18 20 A2 2 0 1 1 18 16 M12 7 V11 M7.5 16.5 L11 11 M16.5 16.5 L13 11",
        _ => "M12 3 L20 17 H4 Z M8.5 17 L12 10 L15.5 17",
    };
}
