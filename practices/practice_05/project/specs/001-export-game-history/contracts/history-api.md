# Interface Contracts: History & Export API

**Feature**: `001-export-game-history` | **Date**: 2026-10-22

Данный документ фиксирует функциональные контракты для создания, накопления, валидации и экспорта записей истории игры WordBridge. Контракты определяют сигнатуры чистых функций, поведение при ошибках и возвращаемые типы данных.

---

## 1. Функции создания записей раунда

### 1.1. `createSoloRoundRecord(startWord, targetWord, chain, completedAt)`
Создает валидную запись завершенного одиночного раунда.

* **Параметры**:
  * `startWord` (`string`): Стартовое слово.
  * `targetWord` (`string`): Целевое слово.
  * `chain` (`string[]`): Массив слов от старта до финиша (`chain[0] === startWord`, `chain[last] === targetWord`).
  * `completedAt` (`string`, опционально): Метка времени ISO 8601 (по умолчанию текущее время).
* **Возвращает**: `GameRoundRecord` с `mode: "solo"`, `submode: null` и данными `SoloRoundData`.
* **Исключения/Ошибки**:
  * Выбрасывает ошибку валидации, если цепочка короче 2 слов или границы цепочки не совпадают со `startWord` / `targetWord`.

### 1.2. `createDuelRoundRecord(submode, p1Data, p2Data, outcome, completedAt)`
Создает валидную запись завершенного раунда дуэли.

* **Параметры**:
  * `submode` (`"race" | "challenge"`): Подрежим дуэли.
  * `p1Data` (`{ pair: { start, target }, chain: string[], isDisputed: boolean }`): Данные Игрока 1.
  * `p2Data` (`{ pair: { start, target }, chain: string[], isDisputed: boolean }`): Данные Игрока 2.
  * `outcome` (`{ winner: string, reason: string }`): Результат дуэли.
  * `completedAt` (`string`, опционально): Метка времени ISO 8601.
* **Возвращает**: `GameRoundRecord` с `mode: "duel"`, `submode` и данными `DuelRoundData`.
* **Исключения/Ошибки**:
  * Выбрасывает ошибку, если подрежим не равен `"race"` или `"challenge"`, либо данные участников не валидны.

---

## 2. Функции агрегации и сборки экспорта

### 2.1. `calculateSessionSummary(rounds)`
Вычисляет агрегированную статистику по переданному массиву раундов.

* **Параметры**:
  * `rounds` (`GameRoundRecord[]`): Массив завершенных раундов (может быть пустым).
* **Возвращает**: `SessionSummary`
  * `totalRounds`: `number` (число раундов).
  * `soloRoundsCount`: `number`.
  * `duelRoundsCount`: `number`.
  * `averageSteps`: `number` (среднее число шагов с округлением до 1 знака, 0 если раундов нет).
  * `duelStats`: `{ player1Wins, player2Wins, draws, disputedDraws }`.

### 2.2. `createExportEnvelope(rounds, exportedAt)`
Формирует корневой объект для экспорта.

* **Параметры**:
  * `rounds` (`GameRoundRecord[]`): Список раундов.
  * `exportedAt` (`string`, опционально): Метка времени ISO 8601.
* **Возвращает**: `ExportEnvelope` со структурой:
  * `schemaVersion`: `"1.0.0"`.
  * `appName`: `"WordBridge"`.
  * `exportedAt`: ISO строка.
  * `summary`: результат `calculateSessionSummary(rounds)`.
  * `rounds`: глубокая копия массива раундов.

### 2.3. `serializeExportJson(envelope, pretty = true)`
Сериализует объект экспорта в JSON-строку.

* **Параметры**:
  * `envelope` (`ExportEnvelope`): Валидный объект экспорта.
  * `pretty` (`boolean`, по умолчанию `true`): Форматировать с отступами в 2 пробела.
* **Возвращает**: `string` (валидный JSON).

---

## 3. Функции валидации целостности

### 3.1. `validateRoundRecord(record)`
Проверяет инварианты отдельной записи раунда.

* **Параметры**:
  * `record` (`unknown`): Объект для проверки.
* **Возвращает**: `{ valid: boolean, errors: string[] }`.

### 3.2. `validateExportEnvelope(envelope)`
Проверяет соответствие объекта структуре схемы `export-schema.json`.

* **Параметры**:
  * `envelope` (`unknown`): Корневой объект экспорта.
* **Возвращает**: `{ valid: boolean, errors: string[] }`.

---

## 4. Клиентские UI-интерфейсы экспорта (Browser Delivery)

### 4.1. `downloadJsonFile(data, filename)`
Инициирует скачивание JSON-файла в браузере.

* **Параметры**:
  * `data` (`string` | `object`): JSON-строка или объект.
  * `filename` (`string`, по умолчанию `wordbridge-history-<timestamp>.json`).
* **Поведение**:
  * Создает `Blob` типа `application/json;charset=utf-8`.
  * Генерирует объектную ссылку через `URL.createObjectURL`.
  * Кликает программно по скрытому `<a>` и затем вызывает `URL.revokeObjectURL`.

### 4.2. `copyJsonToClipboard(data)`
Копирует форматированный JSON в буфер обмена.

* **Параметры**:
  * `data` (`string` | `object`).
* **Возвращает**: `Promise<{ success: boolean, message: string }>`.
* **Поведение**:
  * При успешной записи возвращает `{ success: true, message: "Скопировано!" }`.
  * При ошибке или отказе в доступе возвращает `{ success: false, message: "Буфер обмена недоступен" }`.
