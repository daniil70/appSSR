using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;
using AppSSR;

namespace AppSSR.Wpf;

public sealed class BoolVis : IValueConverter
{
    public bool Invert { get; set; }
    public object Convert(object value, Type t, object p, CultureInfo c)
    {
        var b = value is true;
        if (Invert) b = !b;
        return b ? Visibility.Visible : Visibility.Collapsed;
    }
    public object ConvertBack(object value, Type t, object p, CultureInfo c) => throw new NotSupportedException();
}

public sealed class NullVis : IValueConverter
{
    public bool Invert { get; set; }
    public object Convert(object value, Type t, object p, CultureInfo c)
    {
        var b = value is not null && value is not "";
        if (Invert) b = !b;
        return b ? Visibility.Visible : Visibility.Collapsed;
    }
    public object ConvertBack(object value, Type t, object p, CultureInfo c) => throw new NotSupportedException();
}

public sealed class StringBrush : IValueConverter
{
    public object Convert(object value, Type t, object p, CultureInfo c)
    {
        var s = value as string ?? "#1769e0";
        try { return new SolidColorBrush((Color)ColorConverter.ConvertFromString(s)); }
        catch { return new SolidColorBrush(Color.FromRgb(23, 105, 224)); }
    }
    public object ConvertBack(object value, Type t, object p, CultureInfo c) => throw new NotSupportedException();
}

public sealed class InvertBool : IValueConverter
{
    public object Convert(object value, Type t, object p, CultureInfo c) => value is not true;
    public object ConvertBack(object value, Type t, object p, CultureInfo c) => value is not true;
}

public sealed class StateIs : IValueConverter
{
    public object Convert(object value, Type t, object p, CultureInfo c)
        => value is InstallState s && p is string want && s.ToString().Equals(want, StringComparison.OrdinalIgnoreCase);
    public object ConvertBack(object value, Type t, object p, CultureInfo c) => throw new NotSupportedException();
}

public static class Ui
{
    public static T? FindParent<T>(DependencyObject? d) where T : DependencyObject
    {
        while (d is not null)
        {
            if (d is T t) return t;
            d = VisualTreeHelper.GetParent(d);
        }
        return null;
    }
}
