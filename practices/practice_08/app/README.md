# Issue Classifier — фронтенд поверх n8n

Внутренний инструмент мейнтейнера: вводит GitHub Issue, получает тип (`bug` / `task` / `feature`),
уверенность модели и статус проставленного лейбла. Работает поверх webhook n8n.

## Макет

Опубликованный прототип: **https://issue-oracle-confidence.lovable.app**

> Это именно макет: кнопка в нём имитирует ответ, реальных запросов он не делает.
> Рабочий интерфейс с настоящим webhook n8n запускается локально — см. «Запуск».

Состояния переключаются через `?state=empty|filled|loading|success|error`
или панелью «Демо» в правом нижнем углу. Скриншоты — в `mockups/`.

## Основной сценарий

1. Мейнтейнер заполняет Repository (`owner/name`), Issue number, Title и Body.
2. Нажимает «Классифицировать» — уходит `POST` в webhook n8n.
3. Видит тип, confidence и «Лейбл проставлен в #N»; запись появляется в таблице.
4. При ошибке введённые значения сохраняются, можно нажать «Повторить».

## Стек и библиотека компонентов

- React 19 + TypeScript, TanStack Start / Router, Vite
- Tailwind CSS v4, **shadcn/ui** (`src/components/ui`, стиль new-york)
- Тема: `src/styles.css` — oklch-токены, `--ring`, `--success`, шрифт Inter

## Запуск

```bash
npm install
cp .env.example .env.local   # VITE_N8N_WEBHOOK_URL
npm run dev                  # http://localhost:8080
```

`.env.local` в git не попадает. Используется **production** webhook (`/webhook/...`),
не `/webhook-test/...`: тестовый живёт только при открытом «Listen for test event».

## Тесты

```bash
npm test
```

27 тестов в 8 файлах, ответы сервера подменяются через **MSW** (`src/test/mocks.ts`)
в формате реального ответа n8n:

| Файл | Что проверяет |
|---|---|
| `validation.test.ts` | обязательные поля, формат `owner/name`, номер > 0, длины, преобразование в payload |
| `classify-form.test.tsx` | подписи полей, пустая история, ошибки под полями, `aria-invalid`, загрузка и блокировка кнопки |
| `states.test.tsx` | успех, ошибка с сохранением ввода и «Повторить», отсутствие дубля в истории |
| `double-submit.test.tsx` | два submit/клика во время ожидания → ровно один запрос |
| `scenario.test.tsx` | полный сценарий: пустой экран → ввод → результат → запись в истории |
| `demo-state.test.ts`, `issue-types.test.ts`, `app-routing.test.tsx` | дизайн-превью и маршрутизация |

MSW-ответ:

```json
{ "repository": "NikitaKkv/AvitoSample", "issueNumber": 20,
  "type": "bug", "confidence": 0.98, "label": "bug", "needsTriage": false }
```

## Структура

```
src/
  components/issue-classifier/  форма, карточка результата, таблица, демо-панель
  components/ui/                shadcn/ui
  lib/api.ts                    единственный модуль запросов к n8n
  lib/validation.ts             правила валидации формы
  lib/types.ts                  типы формы и ответа
  test/                         MSW-сервер, моки, тесты
```

## Использование AI

Что сгенерировали Lovable и кодинг-агент, что и почему исправлено, результаты mutation-check —
в [AI_USAGE.md](./AI_USAGE.md).