using System.Windows;
using System.Windows.Controls;
using AppSSR.Wpf.ViewModels;

namespace AppSSR.Wpf;

public sealed class CardTemplateSelector : DataTemplateSelector
{
    public DataTemplate? ProgramTemplate { get; set; }
    public DataTemplate? TableTemplate { get; set; }
    public override DataTemplate? SelectTemplate(object item, DependencyObject container) =>
        item is ProgramCardViewModel ? ProgramTemplate : TableTemplate;
}
