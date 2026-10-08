namespace AppSSR;

public static class Seed
{
    public const string DefaultAppsRoot = @"C:\Games\AppSSR\apps";

    public static Catalog Catalog() => new()
    {
        Settings = new AppSettings { AppsRoot = DefaultAppsRoot },
        Programs =
        [
            new ProgramItem
            {
                Id = "assessment",
                Name = "Ассессмент",
                Type = ProgramType.External,
                ShortDescription = "Проведение и анализ ассессментов.",
                Description = "ПО Ассессмент — инструмент для планирования, проведения и анализа оценочных мероприятий. Позволяет вести базу участников, фиксировать результаты и формировать отчёты.",
                Features =
                [
                    "Планирование оценочных мероприятий",
                    "Фиксация результатов участников",
                    "Формирование сводных отчётов",
                    "Работа с базой данных MySQL",
                ],
                Icon = IconKey.Assessment,
                Color = "#1b8a5a",
                InstallCommand = @"git -C ""C:\Games"" clone https://gitlab.alabuga.space/Sibmag/assessmentmysql.git",
                RepoUrl = "https://gitlab.alabuga.space/Sibmag/assessmentmysql.git",
                InstallDir = @"C:\Games\assessmentmysql",
                ExePath = "assessment.exe",
                Version = "1.0.0",
                Developer = "Sibmag / SSR",
                Size = "—",
                UpdatedAt = "2026-10-01",
                Available = true,
                Popularity = 90,
            },
            new ProgramItem
            {
                Id = "analytics",
                Name = "Аналитика",
                Type = ProgramType.External,
                ShortDescription = "Сбор и визуализация ключевых показателей.",
                Description = "ПО Аналитика — сбор, обработка и визуализация ключевых показателей SSR. Позволяет строить дашборды и выгружать данные для дальнейшего анализа.",
                Features =
                [
                    "Дашборды и графики",
                    "Выгрузка данных",
                    "Актуальные данные в реальном времени",
                    "Интеграция с таблицами Synology",
                ],
                Icon = IconKey.Analytics,
                Color = "#1769e0",
                InstallCommand = "git clone https://gitlab.alabuga.space/Sibmag/analitika.git",
                RepoUrl = "https://gitlab.alabuga.space/Sibmag/analitika.git",
                InstallDir = "analitika",
                ExePath = "analitika.exe",
                Version = "1.0.0",
                Developer = "Sibmag / SSR",
                Size = "—",
                UpdatedAt = "2026-10-01",
                Available = true,
                Popularity = 80,
            },
            new ProgramItem
            {
                Id = "lifapp",
                Name = "LIFApp",
                Type = ProgramType.External,
                ShortDescription = "Приложение LIF для работы с данными SSR.",
                Description = "LIFApp — внутреннее приложение SSR. Устанавливается из репозитория GitLab и запускается через исполняемый файл из папки установки.",
                Features = ["Быстрый доступ к данным", "Удобная навигация", "Интеграция с корпоративными системами"],
                Icon = IconKey.Lif,
                Color = "#6a3fd6",
                InstallCommand = "git clone https://gitlab.alabuga.space/Sibmag/lifapp.git",
                RepoUrl = "https://gitlab.alabuga.space/Sibmag/lifapp.git",
                InstallDir = "lifapp",
                ExePath = "lifapp.exe",
                Version = "1.0.0",
                Developer = "Sibmag / SSR",
                Size = "—",
                UpdatedAt = "2026-10-01",
                Available = true,
                Popularity = 70,
            },
            new ProgramItem
            {
                Id = "bcapp",
                Name = "BCApp",
                Type = ProgramType.External,
                ShortDescription = "Приложение BC. Репозиторий появится позже.",
                Description = "BCApp — внутреннее приложение SSR. Репозиторий ещё не опубликован в GitLab; команда установки будет добавлена администратором позже.",
                Features = ["В разработке"],
                Icon = IconKey.Bc,
                Color = "#d97706",
                Version = "—",
                Developer = "SSR",
                Size = "—",
                UpdatedAt = "—",
                Available = false,
                Popularity = 10,
            },
        ],
        Tables =
        [
            new TableLink
            {
                Id = "tbl-demo",
                Name = "Сводная аналитика SSR",
                Url = "https://synology.alabuga.space/",
                Description = "Пример ссылки на таблицу в Synology. Замените на реальную.",
                CreatedBy = "admin",
                CreatedAt = "2026-10-01T00:00:00.000Z",
            },
        ],
    };
}
