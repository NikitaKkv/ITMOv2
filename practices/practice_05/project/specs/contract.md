# Общий согласованный контракт (Contract Specification)

**Feature**: Экспорт результатов игры (UI + Logic)  
**Участники**: Команда 1 (`001-export-game-results-ui`) и Команда 2 (`001-export-game-history`)  
**Дата согласования**: 2026-10-22  
**Статус**: APPROVED  

---

## 1. Архитектурные границы и изоляция (Strict Boundaries)

Для сохранения чистоты кодовой базы и простоты проверки соблюдаются строгие правила локальности:

1. **Изоляция бизнес-логики:** Вся логика извлечения данных из состояния игры, сборки отчетов, форматирования текста для буфера и сериализации файлов реализуется в **отдельном файле**:  
   `src/export_service.js` (чистый ES6-модуль без сторонних зависимостей).
2. **Изоляция тестов:** Все автоматизированные тесты для логики экспорта, валидации структуры данных и форматирования пишутся в **отдельном файле**:  
   `tests/test_export.py` (запуск через `python3 -m unittest tests/test_export.py` или `pytest tests/test_export.py`).  
   Существующий файл `tests/test_logic.py` модифицировать **запрещено**.
3. **Минимальные точки интеграции:**
   - `src/index.html`: добавление кнопки «Поделиться результатами» в блок действий экрана Showdown (`.showdown-actions`) и контейнера модального окна `#export-modal`.
   - `src/styles.css`: добавление стилей модального окна `#export-modal` и статусных индикаторов.
   - `src/app.js`: импорт функций из `export_service.js` и привязка обработчиков событий модалки. Существующая игровая логика и правила игры не изменяются.

---

## 2. Программный интерфейс (API: `src/export_service.js`)

Модуль экспортирует следующий набор функций:

```javascript
/**
 * Извлекает данные текущего завершённого матча (с экрана Showdown или соло-игры)
 * @param {Object} state - текущий объект состояния игры WordBridge
 * @returns {MatchSummaryPayload} структурированные данные завершённого матча
 */
export function buildCurrentMatchSummary(state) { ... }

/**
 * Формирует полный документ истории всех сыгранных раундов текущей сессии
 * @param {Array<Object>} history - массив завершенных раундов сессии
 * @returns {ExportEnvelope} полный структурированный JSON-контейнер
 */
export function buildSessionHistoryEnvelope(history) { ... }

/**
 * Генерирует форматированный человекочитаемый текст с эмодзи для отправки в мессенджеры
 * @param {MatchSummaryPayload} summary - данные матча
 * @returns {string} готовый текст для буфера обмена
 */
export function formatShareableText(summary) { ... }

/**
 * Сериализует объект в форматированную строку JSON (pretty-print, 2 пробела)
 * @param {Object} data - сериализуемый объект
 * @returns {string} строка JSON в кодировке UTF-8
 */
export function formatJsonString(data) { ... }

/**
 * Безопасно копирует строку в буфер обмена устройства с поддержкой fallback
 * @param {string} text - копируемый текст
 * @returns {Promise<{ success: boolean, error?: string }>} результат операции
 */
export async function copyTextToClipboard(text) { ... }

/**
 * Инициирует загрузку файла на устройство пользователя
 * @param {string} content - строковое содержимое файла
 * @param {string} filename - имя сохраняемого файла
 * @param {string} [mimeType='application/json'] - MIME-тип
 */
export function triggerFileDownload(content, filename, mimeType = 'application/json') { ... }
```

---

## 3. Спецификация структур данных (Data Models)

### 3.1. `MatchSummaryPayload` (Сводка матча для модального окна и шеринга)

```typescript
interface MatchSummaryPayload {
  schemaVersion: "1.0.0";
  mode: "solo" | "duel";
  submode: "race" | "challenge" | null;
  completedAt: string; // ISO 8601 (например, "2026-10-22T20:30:00.000Z")
  pair: {
    start: string;
    target: string;
  };
  solo?: {
    chain: string[];
    steps: number;
  };
  duel?: {
    player1: {
      name: string;
      pair: { start: string; target: string };
      chain: string[];
      steps: number;
      isDisputed: boolean;
    };
    player2: {
      name: string;
      pair: { start: string; target: string };
      chain: string[];
      steps: number;
      isDisputed: boolean;
    };
    outcome: {
      winner: "player1" | "player2" | "draw" | "disputed_draw";
      winnerName: string;
      reason: string;
    };
  };
}
```

### 3.2. `ExportEnvelope` (Корневой контейнер полной истории сессии)

```typescript
interface ExportEnvelope {
  schemaVersion: "1.0.0";
  appName: "WordBridge";
  exportedAt: string; // ISO 8601
  summary: {
    totalRounds: number;
    soloCount: number;
    duelCount: number;
    averageSteps: number;
    duelStats: {
      p1Wins: number;
      p2Wins: number;
      draws: number;
    };
  };
  rounds: Array<MatchSummaryPayload & { id: string }>;
}
```

---

## 4. Канонический формат текста для буфера обмена

Функция `formatShareableText` генерирует сообщение следующего вида:

### Для дуэли:
```text
🌉 WordBridge | Дуэль: Гонка
🎯 Пара: Кот ➔ Сыр

👤 Игрок 1 (4 шага): Кот ➔ Мяу ➔ Молоко ➔ Сыр
👤 Игрок 2 (3 шага): Кот ➔ Мышь ➔ Сыр 🏆

🏆 Итог: Победа Игрока 2 (мост короче на 1 шаг)
📅 2026-10-22 20:30
```

### Для соло-режима:
```text
🌉 WordBridge | Соло-мост
🎯 Пара: Чайник ➔ Черная дыра

✨ Мост (3 шага): Чайник ➔ Пар ➔ Космос ➔ Черная дыра
📅 2026-10-22 20:30
```

---

## 5. Поведение интерфейса, статусы и ошибки (UI State Machine)

Модальное окно `#export-modal` управляется машиной состояний из 4 фаз:

| Фаза (`state`) | Визуальное отображение | Кнопки действий | Поведение |
| :--- | :--- | :--- | :--- |
| **`idle`** | Нейтральная подсказка: *«Выберите действие для экспорта»* | Активны | Начальное состояние при открытии. |
| **`loading`** | Спиннер/индикатор: *«Подготовка отчёта...»* / *«Копирование...»* | Заблокированы (`disabled`) | Защита от спам-кликов и повторных вызовов. |
| **`success`** | Зеленый бейдж: *«Скопировано в буфер! 👍»* или *«Файл сохранён! 📁»* | Активны | Автоматический сброс в `idle` через 3000 мс (таймаут). |
| **`error`** | Янтарно-красный бейдж: текст ошибки + кнопка *«Повторить»* | Активны | Возникает при отказе прав Clipboard API или пустой истории. |

### Обработка ошибок:
1. **Clipboard API отклонён:**  
   Если `navigator.clipboard.writeText` бросает исключение (`NotAllowedError`), функция `copyTextToClipboard` возвращает `{ success: false, error: "CLIPBOARD_DENIED" }`.  
   UI показывает статус ошибки и автоматически подсвечивает/выделяет текст в блоке предпросмотра с подсказкой: *«Нажмите Ctrl+C для копирования»*.
2. **Пустая история раундов:**  
   Если раундов нет, `buildSessionHistoryEnvelope` возвращает валидный документ с `totalRounds: 0` и `rounds: []`, не вызывая падения скрипта.
3. **Имя файла скачивания:**  
   Для отдельного раунда: `wordbridge-match-YYYY-MM-DD-HHmmss.json`.  
   Для всей истории: `wordbridge-history-YYYY-MM-DD-HHmmss.json`.
