# Yclone Frontend

Фронтенд приложение для CRM системы салонов красоты.

## Технологии

- React 19
- TypeScript
- Vite
- Tailwind CSS

## Установка

```bash
npm install
```

## Запуск

```bash
# Режим разработки
npm run dev

# Сборка для продакшена
npm run build

# Предпросмотр продакшен сборки
npm run preview
```

## Структура проекта

```
src/
├── api/          # API клиенты и запросы
├── components/   # React компоненты
├── pages/        # Страницы приложения
├── layouts/      # Layout компоненты
├── hooks/        # Custom React hooks
├── utils/        # Утилиты
└── types/        # TypeScript типы
```

## Переменные окружения

Скопируйте `.env.example` в `.env` и настройте:

```
VITE_API_URL=http://localhost:4000
```
