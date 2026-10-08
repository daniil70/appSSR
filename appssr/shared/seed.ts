import type { Catalog, Program, Section, TableLink } from './types';

export const DEFAULT_APPS_ROOT = 'C:\\Games\\AppSSR\\apps';

export const seedSections: Section[] = [
  { id: 'assessment', name: 'Ассессмент', kind: 'apps', order: 1 },
  { id: 'analytics', name: 'Аналитика', kind: 'apps', order: 2 },
  { id: 'apps', name: 'Приложения', kind: 'apps', order: 3 },
  { id: 'tables-analytics', name: 'Таблицы Аналитика', kind: 'tables', order: 10 },
];

export const seedPrograms: Program[] = [
  {
    id: 'assessment',
    name: 'Ассессмент',
    sectionId: 'assessment',
    type: 'external',
    shortDescription: 'Проведение и анализ ассессментов.',
    description:
      'ПО Ассессмент — инструмент для планирования, проведения и анализа оценочных мероприятий. ' +
      'Позволяет вести базу участников, фиксировать результаты и формировать отчёты.',
    features: [
      'Планирование оценочных мероприятий',
      'Фиксация результатов участников',
      'Формирование сводных отчётов',
      'Работа с базой данных MySQL',
    ],
    icon: 'assessment',
    color: '#1b8a5a',
    installCommand: 'git -C "C:\\Games" clone https://gitlab.alabuga.space/Sibmag/assessmentmysql.git',
    repoUrl: 'https://gitlab.alabuga.space/Sibmag/assessmentmysql.git',
    installDir: 'C:\\Games\\assessmentmysql',
    exePath: 'assessment.exe',
    version: '1.0.0',
    developer: 'Sibmag / SSR',
    size: '—',
    updatedAt: '2026-10-01',
    available: true,
    popularity: 90,
  },
  {
    id: 'analytics',
    name: 'Аналитика',
    sectionId: 'analytics',
    type: 'external',
    shortDescription: 'Сбор и визуализация ключевых показателей.',
    description:
      'ПО Аналитика — сбор, обработка и визуализация ключевых показателей SSR. ' +
      'Позволяет строить дашборды и выгружать данные для дальнейшего анализа.',
    features: [
      'Дашборды и графики',
      'Выгрузка данных',
      'Актуальные данные в реальном времени',
      'Интеграция с таблицами Synology',
    ],
    icon: 'analytics',
    color: '#1769e0',
    installCommand: 'git clone https://gitlab.alabuga.space/Sibmag/analitika.git',
    repoUrl: 'https://gitlab.alabuga.space/Sibmag/analitika.git',
    installDir: 'analitika',
    exePath: 'analitika.exe',
    version: '1.0.0',
    developer: 'Sibmag / SSR',
    size: '—',
    updatedAt: '2026-10-01',
    available: true,
    popularity: 80,
  },
  {
    id: 'lifapp',
    name: 'LIFApp',
    sectionId: 'apps',
    type: 'external',
    shortDescription: 'Приложение LIF для работы с данными SSR.',
    description:
      'LIFApp — внутреннее приложение SSR. Устанавливается из репозитория GitLab и запускается ' +
      'через исполняемый файл из папки установки.',
    features: ['Быстрый доступ к данным', 'Удобная навигация', 'Интеграция с корпоративными системами'],
    icon: 'lif',
    color: '#6a3fd6',
    installCommand: 'git clone https://gitlab.alabuga.space/Sibmag/lifapp.git',
    repoUrl: 'https://gitlab.alabuga.space/Sibmag/lifapp.git',
    installDir: 'lifapp',
    exePath: 'lifapp.exe',
    version: '1.0.0',
    developer: 'Sibmag / SSR',
    size: '—',
    updatedAt: '2026-10-01',
    available: true,
    popularity: 70,
  },
  {
    id: 'bcapp',
    name: 'BCApp',
    sectionId: 'apps',
    type: 'external',
    shortDescription: 'Приложение BC. Репозиторий появится позже.',
    description:
      'BCApp — внутреннее приложение SSR. Репозиторий ещё не опубликован в GitLab; ' +
      'команда установки будет добавлена администратором позже.',
    features: ['В разработке'],
    icon: 'bc',
    color: '#d97706',
    version: '—',
    developer: 'SSR',
    size: '—',
    updatedAt: '—',
    available: false,
    popularity: 10,
  },
];

export const seedTables: TableLink[] = [
  {
    id: 'tbl-demo',
    name: 'Сводная аналитика SSR',
    url: 'https://synology.alabuga.space/',
    sectionId: 'tables-analytics',
    description: 'Пример ссылки на таблицу в Synology. Замените на реальную.',
    createdBy: 'admin',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
];

export function seedCatalog(): Catalog {
  return {
    sections: seedSections,
    programs: seedPrograms,
    tables: seedTables,
    settings: { appsRoot: DEFAULT_APPS_ROOT },
  };
}
