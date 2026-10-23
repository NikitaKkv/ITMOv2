# Feature Specification: Логика и структуры данных экспорта истории (Export Game History)

**Feature Branch**: `001-export-game-history`  
**Created**: 2026-10-22  
**Status**: APPROVED (Согласовано с `specs/contract.md`)  
**Input**: User description: "Логика и структуры данных для экспорта истории игры в JSON"  
**Shared Contract**: [specs/contract.md](file:///home/nikita/ITMO/ITMOv2/practices/practice_05/project/specs/contract.md)  

---

## 1. Архитектурные границы и изоляция (Strict Boundaries)

В соответствии с согласованным контрактом:
- **Файл реализации:** Вся логика извлечения данных, формирования JSON, форматирования текста для буфера обмена и инициирования загрузки файлов инкапсулируется в **`src/export_service.js`**. Модуль не зависит от внешних библиотек и работает с чистыми JS-объектами.
- **Файл тестов:** Все unit-тесты (TDD) пишутся в **`tests/test_export.py`**. Существующий тестовый набор `tests/test_logic.py` не модифицируется.
- **Контракт с UI:** Модуль предоставляет синхронные чистые функции форматирования и асинхронную функцию работы с буфером обмена `copyTextToClipboard`.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Экспорт полной истории текущей сессии в JSON (Priority: P1)

Игрок (или пара игроков) проводит одну или несколько игровых партий. По завершении сессии система предоставляет возможность выгрузить полный архив всех завершённых раундов с агрегированной статистикой в валидный JSON-файл `wordbridge-history-YYYY-MM-DD-HHmmss.json`.

**Why this priority**: Базовый сценарий сохранения долгосрочных результатов, ведения статистики побед и внешнего анализа ассоциативных цепочек.

**Independent Test**: Передать массив из 2 завершённых раундов (соло и дуэль) в функцию `buildSessionHistoryEnvelope(history)`, проверить наличие полей `schemaVersion: "1.0.0"`, `totalRounds: 2`, корректность агрегатов побед и валидность сериализации `formatJsonString`.

**Acceptance Scenarios**:
1. **Given** завершено не менее одного раунда, **When** вызывается сбор истории, **Then** функция `buildSessionHistoryEnvelope(history)` формирует объект `ExportEnvelope`, содержащий метаданные, агрегированную статистику `summary` и список раундов `rounds`.
2. **Given** история содержит раунды разных режимов («Соло», «Гонка», «Вызов»), **When** формируется JSON, **Then** каждый объект раунда строго соответствует интерфейсу `MatchSummaryPayload` из `contract.md`.
3. **Given** история пуста (`history = []`), **When** вызывается экспорт, **Then** система возвращает валидный документ с `totalRounds: 0`, `rounds: []` без падения и исключений.

---

### User Story 2 - Извлечение и экспорт текущего раунда для UI (Priority: P2)

UI-модуль модального окна экспорта на экране Showdown или завершения соло-игры запрашивает снимок текущего сыгранного матча для немедленного отображения предпросмотра и скачивания.

**Why this priority**: Обеспечивает прямую интеграцию с модальным окном Команды 1 (`001-export-game-results-ui`).

**Independent Test**: Передать объект игрового состояния `state` (с экрана Showdown) в `buildCurrentMatchSummary(state)`, проверить корректность извлечения стартового/целевого слов, цепочек обоих игроков, подсчета шагов и победителя.

**Acceptance Scenarios**:
1. **Given** игра находится в состоянии завершения матча (экран Showdown или соло-победа), **When** UI вызывает `buildCurrentMatchSummary(state)`, **Then** возвращается стандартизированный объект `MatchSummaryPayload` с именами игроков, цепочками и вердиктом.
2. **Given** дуэль завершилась оспариванием, **When** формируется сводка, **Then** флаги `isDisputed` и статус исхода (`outcome.winner = 'disputed_draw'`) точно зафиксированы.

---

### User Story 3 - Форматирование текста для шеринга и безопасное копирование (Priority: P3)

Игрок хочет поделиться мостом в соцсетях/мессенджерах. Логика формирует человекочитаемое текстовое сообщение с эмодзи и стрелочками и обеспечивает надёжное копирование в буфер обмена.

**Why this priority**: Высокое удобство шеринга в Telegram/Discord без необходимости скачивать и распаковывать файлы.

**Independent Test**: Передать `MatchSummaryPayload` в `formatShareableText(summary)`, убедиться, что сгенерированная строка содержит заголовок, стрелочки `➔`, цепочки слов и вердикт, а `copyTextToClipboard` возвращает `{ success: true }` или корректно перехватывает ошибки.

**Acceptance Scenarios**:
1. **Given** сформирован объект `MatchSummaryPayload`, **When** вызывается `formatShareableText(summary)`, **Then** возвращается текст строго по каноническому формату из раздела 4 `contract.md`.
2. **Given** системный доступ к Clipboard API заблокирован или недоступен, **When** вызывается `copyTextToClipboard(text)`, **Then** функция безопасно перехватывает `SecurityError`/`NotAllowedError` и возвращает `{ success: false, error: 'CLIPBOARD_DENIED' }` без сбоя в консоли.

---

## 3. Edge Cases & Целостность данных

- **Экранирование символов UTF-8:** любые пользовательские слова (дефисы, кавычки, буква «ё», пробелы) корректно сериализуются без поломки JSON-структуры.
- **Целостность цепочек:** валидатор гарантирует, что количество шагов `steps = chain.length - 1`, стартовое слово совпадает с `chain[0]`, а конечное — с `chain[chain.length - 1]`.
- **Пустая сессия:** при вызове экспорта до завершения раундов формируется объект с нулевыми счетчиками, исключая ошибки `TypeError: Cannot read properties of undefined`.
- **Pretty-print JSON:** форматирование выполняется с отступом в 2 пробела для читаемости человеком.

---

## 4. Requirements & Key Entities *(mandatory)*

### Functional Requirements
- **FR-001**: Модуль `src/export_service.js` ДОЛЖЕН экспортировать 6 функций в соответствии с разделом 2 `specs/contract.md`:
  - `buildCurrentMatchSummary(state)`
  - `buildSessionHistoryEnvelope(history)`
  - `formatShareableText(summary)`
  - `formatJsonString(data)`
  - `copyTextToClipboard(text)`
  - `triggerFileDownload(content, filename, mimeType)`
- **FR-002**: Функция `buildCurrentMatchSummary` ДОЛЖНА извлекать данные как для режима `solo`, так и для режимов дуэли (`race`, `challenge`).
- **FR-003**: Функция `formatShareableText` ДОЛЖНА формировать сообщение с использованием символов `➔`, эмодзи победы 🏆 и отметки даты в формате `YYYY-MM-DD HH:mm`.
- **FR-004**: Функция `copyTextToClipboard` ДОЛЖНА поддерживать асинхронный `navigator.clipboard.writeText` с безопасным перехватом исключений и fallback через `document.execCommand('copy')` при доступности.
- **FR-005**: Функция `triggerFileDownload` ДОЛЖНА создавать объект `Blob` с типом `application/json;charset=utf-8` и инициировать скачивание через временный DOM-элемент `<a>`.

### Key Entities
- **MatchSummaryPayload**: Согласно схеме раздела 3.1 `specs/contract.md`.
- **ExportEnvelope**: Согласно схеме раздела 3.2 `specs/contract.md`.

---

## 5. Success Criteria *(mandatory)*

- **SC-001**: 100% покрытие функций `src/export_service.js` автоматизированными тестами в `tests/test_export.py`.
- **SC-002**: Формируемый JSON на 100% валиден по стандарту RFC 8259.
- **SC-003**: Генерация отчета занимает менее 10 миллисекунд даже при сессиях из 50+ раундов.
- **SC-004**: 0 модификаций файла `tests/test_logic.py` и сохранение прохождения `bash scripts/check_all.sh`.
