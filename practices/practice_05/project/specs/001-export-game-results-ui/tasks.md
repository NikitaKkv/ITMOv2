# Tasks: UI экспорта результатов игры (Export Game Results UI)

**Input**: Design documents from `specs/001-export-game-results-ui/` (`plan.md`, `spec.md`, `data-model.md`, `research.md`, `contracts/modal-ui-contract.md`, `quickstart.md`)  
**Shared Contract**: [`specs/contract.md`](file:///home/nikita/ITMO/ITMOv2/practices/practice_05/project/specs/contract.md)  
**Status**: COMPLETED  

---

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Возможность параллельного выполнения (разные файлы, отсутствие блокирующих зависимостей)
- **[Story]**: Привязка к пользовательской истории (`[US1]`, `[US2]`, `[US3]`) из `spec.md`
- Точные пути к файлам указаны в каждом пункте

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Проверка окружения, подготовка общих интерфейсов и структуры проекта.

- [X] T001 [P] Verify project dependencies and environment setup in src/ and tests/
- [X] T002 [P] Verify export service contract exports in src/export_service.js per specs/contract.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Базовая DOM-разметка и CSS-стилизация модального окна и статусов, необходимые для реализации всех пользовательских историй.

**⚠️ CRITICAL**: Работа над пользовательскими историями начинается только после завершения базовой разметки и стилей.

- [X] T003 Add HTML markup for export trigger button #showdown-export-btn in src/index.html
- [X] T004 [P] Add HTML markup for accessible dialog #export-modal with role="dialog", aria-modal="true", and aria-live="polite" in src/index.html
- [X] T005 [P] Add base CSS styles for modal overlay, backdrop blur, dialog card, and responsive layout in src/styles.css
- [X] T006 [P] Add CSS styles for 4 status phases (.status-idle, .status-loading, .status-success, .status-error) in src/styles.css
- [X] T007 Cache export DOM elements in elements registry and define initial exportModalState in src/app.js

**Checkpoint**: Базовая разметка и стили готовы. Можно приступать к реализации пользовательских историй.

---

## Phase 3: User Story 1 - Вызов модального окна и быстрое копирование результатов в буфер обмена (Priority: P1) 🎯 MVP

**Goal**: Игрок открывает модальное окно с экрана Showdown, видит форматированный отчет матча и в один клик копирует его в системный буфер с 4-фазной индикацией статуса и авто-сбросом успеха через 3 секунды.

**Independent Test**: На экране Showdown нажать `#showdown-export-btn`, проверить заполнение `#export-preview-text`, нажать `#export-copy-btn`, убедиться в появлении статуса «Результаты скопированы в буфер! 👍» и сбросе в idle через 3000 мс.

### Tests for User Story 1 ⚠️
- [X] T008 [P] [US1] Add automated unit tests for match summary extraction and clipboard text formatting in tests/test_export.py

### Implementation for User Story 1
- [X] T009 [US1] Implement openExportModal and closeExportModal with focus-trap and Escape key listener in src/app.js
- [X] T010 [US1] Implement match summary population in #export-preview-text on modal open using buildCurrentMatchSummary in src/app.js
- [X] T011 [US1] Implement handleExportCopy with copyTextToClipboard, loading state, button disabling, and 3000ms auto-reset in src/app.js
- [X] T012 [US1] Wire click events for #showdown-export-btn, #export-copy-btn, #export-modal-close-btn, and backdrop in src/app.js

**Checkpoint**: User Story 1 (MVP) полностью работоспособна и может быть протестирована независимо.

---

## Phase 4: User Story 2 - Скачивание файла с результатами партии (Priority: P2)

**Goal**: Игрок скачивает JSON-файл отчета матча (`wordbridge-match-YYYY-MM-DD-HHmmss.json`) прямо из модального окна с индикацией статуса.

**Independent Test**: В открытом модальном окне нажать `#export-download-btn`, проверить статус «Формирование файла...», затем «Файл успешно сохранён! 📁» и инициирование скачивания файла с валидным JSON.

### Tests for User Story 2 ⚠️
- [X] T013 [P] [US2] Add unit tests for JSON serialization and filename format wordbridge-match-YYYY-MM-DD-HHmmss.json in tests/test_export.py

### Implementation for User Story 2
- [X] T014 [US2] Implement handleExportDownload using formatJsonString and triggerFileDownload in src/app.js
- [X] T015 [US2] Wire click event for #export-download-btn and integrate status feedback in src/app.js

**Checkpoint**: User Story 1 и User Story 2 работают независимо и дополняют друг друга.

---

## Phase 5: User Story 3 - Обработка сбоев экспорта и возможность повтора (Priority: P3)

**Goal**: При отказе доступа к буферу обмена или сбое генерации файла окно переходит в статус ошибки с предупреждающим бейджем, выделяет текст для ручного копирования (Ctrl+C) и предлагает кнопку повтора `#export-retry-btn`.

**Independent Test**: Смоделировать отказ системного буфера, нажать «Скопировать», убедиться в отображении статуса ошибки и автоматическом выделении текста отчёта в `textarea`.

### Tests for User Story 3 ⚠️
- [X] T016 [P] [US3] Add unit test for clipboard rejection handling and error status mapping in tests/test_export.py

### Implementation for User Story 3
- [X] T017 [US3] Implement error state handling, automatic textarea selection, and #export-retry-btn logic in src/app.js
- [X] T018 [US3] Wire click event for #export-retry-btn to re-trigger the failed action in src/app.js

**Checkpoint**: Все три пользовательские истории реализованы и устойчивы к отказам.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Доступность (a11y), адаптивность и верификация по руководству быстрого старта.

- [X] T019 [P] Verify responsive design on small screens (width 320px-480px) in src/styles.css
- [X] T020 [P] Verify keyboard navigation and WAI-ARIA compliance (Tab, Escape, aria-modal, aria-live) across modal in src/app.js
- [X] T021 Run all unit tests python3 -m unittest tests/test_export.py
- [X] T022 Execute end-to-end verification walkthrough per specs/001-export-game-results-ui/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Запускается сразу, без зависимостей.
- **Foundational (Phase 2)**: Зависит от Setup. Блокирует реализацию пользовательских историй (нужны разметка и стили).
- **User Stories (Phase 3+)**: Зависят от Foundational. Могут выполняться последовательно (P1 → P2 → P3) или параллельно.
- **Polish (Phase 6)**: Зависит от реализации историй US1, US2, US3.

### User Story Dependencies

- **User Story 1 (P1)**: Зависит только от Phase 2. Не зависит от US2 и US3. Является ядром MVP.
- **User Story 2 (P2)**: Зависит от Phase 2 и наличия открытого модального окна из US1.
- **User Story 3 (P3)**: Зависит от Phase 2 и обработчиков действий из US1/US2.

---

## Parallel Opportunities

- Задачи **T001, T002** (Phase 1) могут выполняться параллельно.
- Задачи **T004, T005, T006** (HTML/CSS) могут выполняться параллельно после T003.
- Тестовые задачи **T008, T013, T016** могут разрабатываться параллельно в `tests/test_export.py`.
- Задачи доводки **T019, T020** могут выполняться параллельно.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Выполнить Phase 1 (Setup) и Phase 2 (Foundational).
2. Выполнить Phase 3 (User Story 1).
3. **Остановиться и протестировать MVP**: Открыть окно, скопировать отчет в буфер, проверить статус «Успех».

### Incremental Delivery

1. Setup + Foundation $\to$ Готов каркас интерфейса.
2. US1 $\to$ Работает модальное окно и шеринг через буфер (MVP!).
3. US2 $\to$ Добавлено скачивание JSON-архива раунда.
4. US3 $\to$ Добавлена отказоустойчивость, повтор и ручное выделение текста.
5. Polish $\to$ Проверка мобильной верстки, a11y и полный прогон тестов.
