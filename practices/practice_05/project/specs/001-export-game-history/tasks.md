# Tasks: Экспорт истории игры в JSON (Export Game History to JSON)

**Input**: Design documents from `specs/001-export-game-history/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/export-schema.json](contracts/export-schema.json), [contracts/history-api.md](contracts/history-api.md), [quickstart.md](quickstart.md)

**Tests**: Включены TDD-тесты логики структур данных, сводки и сериализации на Python в `tests/test_export.py` и проверка синтаксиса JS.
**Organization**: Задачи сгруппированы по пользовательским историям (User Stories) для обеспечения независимой разработки, тестирования и поставки инкрементов.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Возможность параллельного выполнения (разные файлы, отсутствие блокирующих зависимостей)
- **[Story]**: Метка пользовательской истории (`[US1]`, `[US2]`, `[US3]`)
- Каждая задача содержит точный путь к файлу

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Инициализация структуры тестового и сервисного модулей

- [x] T001 Создать каркас тестового набора для логики экспорта в `tests/test_export.py`
- [x] T002 [P] Создать базовый модуль сервиса экспорта со структурой функций в `src/export_service.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Базовые структуры данных, чистые функции валидации, расчет сводной статистики и реестр истории, блокирующие реализацию пользовательских историй

**⚠️ CRITICAL**: Работа над пользовательскими историями начинается только после завершения фундаментального этапа

- [x] T003 Реализовать функции создания записей раунда `createSoloRoundRecord` и `createDuelRoundRecord` в `src/export_service.js` с соблюдением инвариантов `steps >= 1`, `chain.length >= 2`, `chain[0] == startWord`, `chain[last] == targetWord` и тестами в `tests/test_export.py`
- [x] T004 [P] Реализовать функцию проверки целостности структуры раунда `validateRoundRecord` в `src/export_service.js` (проверка отсутствия `undefined`, `NaN`, валидация допустимых перечислений `mode: "solo" | "duel"`, `submode: "race" | "challenge" | null`) с тестами в `tests/test_export.py`
- [x] T005 Реализовать алгоритм расчета агрегированной сводки сессии `calculateSessionSummary` в `src/export_service.js` с полями `totalRounds`, `soloRoundsCount`, `duelRoundsCount`, `averageSteps`, `duelStats: { player1Wins, player2Wins, draws, disputedDraws }` и тестами в `tests/test_export.py`
- [x] T006 Реализовать утилиты сериализации `formatJsonString` (pretty-print, 2 пробела, UTF-8) и скачивания файла `triggerFileDownload` через `Blob` и `URL.createObjectURL` в `src/export_service.js`
- [x] T007 Инициализировать реестр сессии `state.history = []` в `src/app.js` и настроить сохранение неизменяемых снимков завершенных раундов при победе в соло (`finishGame`) и на этапе вердикта дуэли (`Showdown`)

**Checkpoint**: Фундаментальный слой готов — структуры данных и реестр раундов протестированы и готовы к использованию в историях.

---

## Phase 3: User Story 1 - Экспорт полной истории текущей сессии в JSON-файл (Priority: P1) 🎯 MVP

**Goal**: Экспорт всей истории завершенных партий текущей сессии (Соло и Дуэль) в файл `wordbridge-history-YYYY-MM-DD-HHmmss.json` с полным набором метаданных `schemaVersion: "1.0.0"`, `summary` и списком раундов `rounds`.

**Independent Test**: Сыграть 1 соло-раунд и 1 раунд дуэли, нажать кнопку экспорта истории, проверить скачивание файла и валидность JSON-структуры согласно `specs/001-export-game-history/contracts/export-schema.json`.

### Tests for User Story 1 ⚠️

- [x] T008 [P] [US1] Написать модульные тесты для `buildSessionHistoryEnvelope` на соответствие контракту схемы и вычисление сводки в `tests/test_export.py`
- [x] T009 [P] [US1] Написать тест на краевой случай экспорта при пустой истории сессии (`totalRounds: 0`, `rounds: []`) в `tests/test_export.py`

### Implementation for User Story 1

- [x] T010 [US1] Реализовать функцию `buildSessionHistoryEnvelope(history)` в `src/export_service.js` с генерацией `schemaVersion: "1.0.0"`, `appName: "WordBridge"`, `exportedAt`, `summary` и массива `rounds`
- [x] T011 [US1] Добавить кнопку экспорта всей истории сессии в панель действий заголовка приложения в `src/index.html`
- [x] T012 [P] [US1] Добавить стили кнопки экспорта истории и бейджей состояния в `src/styles.css`
- [x] T013 [US1] Подключить обработчик клика кнопки экспорта к `buildSessionHistoryEnvelope` и `triggerFileDownload` в `src/app.js`

**Checkpoint**: User Story 1 (MVP) полностью функциональна и проверяема независимо от остальных историй.

---

## Phase 4: User Story 2 - Быстрый экспорт отдельного раунда с экрана завершения (Priority: P2)

**Goal**: Точечный экспорт единичного завершенного раунда непосредственно из компонентов `Completion Banner` (Соло) и `Showdown` (Дуэль) в файл `wordbridge-match-YYYY-MM-DD-HHmmss.json`.

**Independent Test**: Завершить партию в дуэли, нажать «Экспорт раунда в JSON» на карточке Showdown, убедиться, что скачанный файл содержит ровно один объект текущей партии со всеми полями.

### Tests for User Story 2 ⚠️

- [x] T014 [P] [US2] Написать модульные тесты для `buildCurrentMatchSummary(state)` для режимов Solo, Duel Race и Duel Challenge в `tests/test_export.py`

### Implementation for User Story 2

- [x] T015 [US2] Реализовать функцию `buildCurrentMatchSummary(state)` в `src/export_service.js`, формирующую снимок текущей завершенной игры
- [x] T016 [US2] Добавить кнопки «Экспорт раунда в JSON» в блок победного баннера `#completion-banner` и блок действий `#showdown-card` в `src/index.html`
- [x] T017 [P] [US2] Добавить CSS-стили для кнопок экспорта раунда на карточках завершения в `src/styles.css`
- [x] T018 [US2] Подключить обработчики экспорта единичного раунда через `buildCurrentMatchSummary` и `triggerFileDownload` в `src/app.js`

**Checkpoint**: User Stories 1 и 2 работают независимо и дополняют друг друга.

---

## Phase 5: User Story 3 - Копирование JSON-структуры в буфер обмена (Priority: P3)

**Goal**: Копирование форматированной JSON-строки истории или текущего матча в буфер обмена пользователя с мгновенной визуальной индикацией («Скопировано! ✓») и обработкой отказа в правах.

**Independent Test**: Нажать «Копировать JSON», проверить появление визуального подтверждения и вставить скопированный валидный JSON в текстовый редактор.

### Tests for User Story 3 ⚠️

- [x] T019 [P] [US3] Написать тесты форматирования строки для буфера обмена и валидации результата в `tests/test_export.py`

### Implementation for User Story 3

- [x] T020 [US3] Реализовать асинхронную функцию `copyTextToClipboard(text)` с обработкой `navigator.clipboard` и фоллбэком в `src/export_service.js`
- [x] T021 [US3] Добавить кнопку «Копировать JSON» и статусную плашку индикации в `src/index.html`
- [x] T022 [P] [US3] Добавить стили анимации и бейджа статуса («Скопировано! ✓», предупреждение об ошибке) в `src/styles.css`
- [x] T023 [US3] Связать кнопку копирования с `copyTextToClipboard` и таймером сброса визуального статуса через 2 секунды в `src/app.js`

**Checkpoint**: Все пользовательские истории (US1, US2, US3) полностью реализованы и функционируют независимо.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Комплексная верификация, прогон детерминированных проверок и документирование

- [x] T024 [P] Запустить полный набор автоматических проверок и тестов с помощью `bash scripts/check_all.sh`
- [x] T025 Выполнить сквозные сценарии проверки по руководству `specs/001-export-game-history/quickstart.md`
- [x] T026 [P] Зафиксировать форматы экспорта и инструкцию использования в документации `docs/HANDOFF.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Зависимостей нет — выполняется сразу.
- **Foundational (Phase 2)**: Зависит от Setup — БЛОКИРУЕТ реализацию всех пользовательских историй.
- **User Stories (Phase 3+)**: Зависят от завершения Foundational (Phase 2):
  - Могут выполняться последовательно (P1 → P2 → P3) либо параллельно.
- **Polish (Phase 6)**: Зависит от завершения выбранных пользовательских историй.

### User Story Dependencies

- **User Story 1 (P1 - MVP)**: Зависит только от Phase 2. Не зависит от US2 и US3.
- **User Story 2 (P2)**: Зависит от Phase 2. Использует общие утилиты сериализации, независима от UI US1.
- **User Story 3 (P3)**: Зависит от Phase 2. Использует сериализованный JSON раунда или сессии.

### Parallel Opportunities

- В Phase 1: `T001` и `T002` могут создаваться параллельно.
- В Phase 2: `T004` (валидация) может реализовываться параллельно с `T003`.
- Тесты историй (`T008`, `T009`, `T014`, `T019`) пишутся параллельно до реализации кода.
- Стили CSS (`T012`, `T017`, `T022`) могут разрабатываться параллельно с JS-логикой.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Завершить Phase 1 (Setup: `T001`, `T002`).
2. Завершить Phase 2 (Foundational: `T003`–`T007`).
3. Завершить Phase 3 (User Story 1: `T008`–`T013`).
4. **Валидация MVP**: Запустить `python3 tests/test_export.py` и протестировать экспорт файла истории в браузере.
5. Решение готово к первой демонстрации / сдаче базового функционала.
