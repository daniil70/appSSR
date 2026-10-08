# AppSSR (C# / WPF)

Макет каталога ПО SSR без базы данных. Данные — JSON-файл `%APPDATA%\AppSSR\appssr-data.json`,
пароли только как PBKDF2-хэши с солью.

## Запуск на Windows

Нужен [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).

```bat
cd путь\к\репозиторию
dotnet restore AppSSR.sln
dotnet run --project AppSSR.Wpf
```

Вход: `admin` / `admin`. Можно зарегистрировать обычного пользователя.

Собрать один exe:

```bat
dotnet publish AppSSR.Wpf -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o publish
```

Готовый файл: `publish\AppSSR.exe`.

## Что умеет

- Каталог без вкладок категорий: все программы на одном экране «Все приложения».
- Установка через `cmd.exe` (команда из карточки), «Открыть» exe, «Удалить» папку.
- Предзаполнено: Ассессмент, Аналитика, LIFApp, BCApp (без репозитория — «Скоро»).
- Таблицы: ссылка + название, открытие в браузере.
- Настройки: папка `C:\Games\AppSSR\apps`, пользователи и права, журнал.

Предыдущий Electron-макет оставлен в папке `appssr/` как референс интерфейса.
