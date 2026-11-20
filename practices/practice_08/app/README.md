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
- Тесты: Vitest + jsdom + MSW (компоненты) и **Playwright** (реальный Chromium)

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
npm test                          # 27 компонентных тестов: Vitest + jsdom + MSW
npx playwright install chromium   # один раз: браузер для e2e
npm run test:e2e                  # 13 e2e: сценарии + скриншоты + axe (live skipped)
npm run test:e2e:headed           # то же с видимым окном браузера
npm run test:e2e:ui               # Playwright UI для отладки
npm run test:e2e:visual           # только скриншотные тесты
npm run test:e2e:update           # обновить эталоны после просмотра diff
npm run test:e2e:a11y             # только проверка axe
npm run test:e2e:live             # живой webhook n8n
npm run test:all                  # компонентные + e2e
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

### E2E в настоящем браузере (Playwright)

`playwright.config.ts` сам поднимает dev-сервер на `127.0.0.1:4173` и передаёт приложению
`VITE_N8N_WEBHOOK_URL=http://127.0.0.1:4173/mock/webhook`. Запрос перехватывается
`page.route()` и получает тот же JSON, что отдаёт n8n, поэтому прогон не зависит от сети
и не создаёт лейблы в GitHub.

Сервер живёт **один на весь прогон**: Playwright запускает его перед первым тестом, ждёт,
пока URL начнёт отвечать (до 120 с), и останавливает после последнего — порт 4173 освобождается.
`reuseExistingServer: false` специально запрещает переиспользовать чужой процесс на этом порту:
если 4173 занят, прогон упадёт, а не уйдёт на сервер с другим `VITE_N8N_WEBHOOK_URL`.
Ручной `npm run dev` на 8080 — отдельный процесс, e2e его не запускают и не трогают.
Если прогон прервали жёстко (`kill -9`), проверьте, не остался ли сервер:
`ss -ltnp | grep 4173`.

| Файл | Что проверяет |
|---|---|
| `e2e/classify.spec.ts` | пустой экран, валидация без запроса, полный сценарий, загрузка, ошибка 502 с повтором, двойной submit, Tab/фокус/Enter |
| `e2e/visual.spec.ts` | 5 состояний: сравнение с platform-specific эталоном |
| `e2e/a11y.spec.ts` | axe-core: подписи, ARIA, контраст (WCAG A/AA) |
| `e2e/live.spec.ts` | живой webhook n8n: реальный запрос, ответ LLM и лейбл в GitHub |

Живой прогон по умолчанию пропускается — он меняет GitHub. Запуск:

```bash
npm run test:e2e:live
```

Помимо проверок, e2e прикладывает скриншоты состояний к HTML-отчёту
(`playwright-report/index.html`).

### Скриншотные тесты

В проекте два вида снимков:

| Папка | Назначение |
|---|---|
| `screenshots/*.png` | ручные снимки рабочего приложения: эталон для глаз и защиты |
| `screenshots/baseline/*-chromium-linux.png` | машинные эталоны Playwright для регрессии |

Главное правило: **эталон — это снимок приложения, проверенный человеком, а не файл макета.**
Поэтому визуальный тест сравнивает рабочий интерфейс с утверждённым снимком этого же
приложения, а не с картинкой из Lovable.

Тест снимает состояния `?state=empty|filled|loading|success|error` при 1280×720,
с фиксированными данными, отключёнными анимациями и загруженным Inter. Демо-панель
в эталон не входит. Baseline привязан к платформе (`chromium-linux`): на другой ОС
первый прогон создаст свой эталон.

```bash
npm run test:e2e:visual            # сравнить с эталоном
npx playwright show-report         # expected / actual / diff
npm run test:e2e:update            # обновить эталон после просмотра diff
```

Эталоны не обновляются автоматически «ради зелёного теста»: сначала смотрим diff,
потом решаем, ожидаемое это изменение или ошибка. Обновлённые снимки коммитятся
вместе с изменением интерфейса.

Скриншотный тест отвечает только на вопрос «внешний вид изменился?». Поведение
проверяют `classify.spec.ts` и компонентные тесты, доступность — `axe` и ручная
проверка, удобство и пользу — человек.

## Структура

```
src/
  components/issue-classifier/  форма, карточка результата, таблица, демо-панель
  components/ui/                shadcn/ui
  lib/api.ts                    единственный модуль запросов к n8n
  lib/validation.ts             правила валидации формы
  lib/types.ts                  типы формы и ответа
  test/                         MSW-сервер, моки, компонентные тесты
e2e/                            Playwright: сценарии, скриншоты, axe, live-прогон
screenshots/                    ручные снимки состояний
screenshots/baseline/           машинные эталоны Playwright (chromium-linux)
playwright.config.ts            dev-сервер, браузер, перехват webhook, эталоны
```

## Использование AI

Что сгенерировали Lovable и кодинг-агент, что и почему исправлено, результаты mutation-check —
в [AI_USAGE.md](./AI_USAGE.md).