# UI & Integration Contract: Модальное окно экспорта

**Feature**: `001-export-game-results-ui`  
**Shared Reference**: [`specs/contract.md`](file:///home/nikita/ITMO/ITMOv2/practices/practice_05/project/specs/contract.md)  
**Date**: 2026-10-22  
**Status**: APPROVED  

---

## 1. Контракт разметки DOM (`src/index.html`)

### 1.1. Кнопка вызова на экране Showdown
Кнопка размещается в футере финального экрана (`.showdown-footer`):

```html
<button id="showdown-export-btn" class="btn btn-secondary" type="button" aria-haspopup="dialog">
  <span class="btn-icon">📤</span>
  <span class="btn-text">Экспорт результатов</span>
</button>
```

### 1.2. Контейнер модального окна
Размещается перед закрывающим тегом `</body>` или внутри основного контейнера `.app-container`:

```html
<div id="export-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
  <div class="modal-dialog">
    <div class="modal-header">
      <div class="modal-title-group">
        <span class="badge-pill modal-badge">Экспорт</span>
        <h3 id="export-modal-title" class="modal-title">Итоги матча</h3>
      </div>
      <button id="export-modal-close-btn" class="modal-close-btn" type="button" aria-label="Закрыть модальное окно">×</button>
    </div>

    <div class="modal-body">
      <label for="export-preview-text" class="modal-field-label">Предпросмотр отчёта:</label>
      <div class="export-preview-container">
        <textarea id="export-preview-text" class="export-preview-text" readonly rows="8" spellcheck="false"></textarea>
      </div>

      <div id="export-status-banner" class="export-status status-idle" aria-live="polite">
        <span id="export-status-icon" class="status-icon">ℹ️</span>
        <span id="export-status-text" class="status-text">Выберите действие для экспорта</span>
        <button id="export-retry-btn" class="btn-retry hidden" type="button">Повторить</button>
      </div>
    </div>

    <div class="modal-footer">
      <button id="export-copy-btn" class="btn btn-primary" type="button">
        <span class="btn-icon">📋</span>
        <span class="btn-text">Скопировать</span>
      </button>
      <button id="export-download-btn" class="btn btn-secondary" type="button">
        <span class="btn-icon">📁</span>
        <span class="btn-text">Скачать JSON</span>
      </button>
    </div>
  </div>
</div>
```

---

## 2. Контракт CSS-классов и состояний (`src/styles.css`)

### 2.1. Классы видимости
- `.hidden` — скрывает оверлей (`display: none; opacity: 0;`).
- Модальное окно при открытии удаляет класс `.hidden`, плавно анимируя появление оверлея (`backdrop-filter: blur(8px)`) и масштаб карточки (`scale(0.96) -> scale(1)`).

### 2.2. Классы блока статуса (`#export-status-banner`)
- `.status-idle`: нейтральная темно-серая подложка, белый/светло-серый текст, иконка `ℹ️`.
- `.status-loading`: фиолетовая подсветка, анимированная иконка `⏳`, текст *«Подготовка отчёта...»* или *«Копирование в буфер...»*.
- `.status-success`: яркая неоново-зеленая рамка (`var(--neon-green)`), мягкое зеленое свечение, иконка `✅` или `👍`, текст подтверждения.
- `.status-error`: янтарно-красная рамка (`var(--neon-pink)` / `var(--accent-danger)`), иконка `⚠️`, текст ошибки, отображение кнопки `#export-retry-btn`.

---

## 3. Контракт интеграции скриптов (`src/app.js` ↔ `src/export_service.js`)

Модуль `src/app.js` импортирует следующие функции из `src/export_service.js`:

```javascript
import {
  buildCurrentMatchSummary,
  formatShareableText,
  formatJsonString,
  copyTextToClipboard,
  triggerFileDownload
} from "./export_service.js";
```

### 3.1. Сценарий открытия модального окна:
1. Клик по `#showdown-export-btn`.
2. Извлечение `summary = buildCurrentMatchSummary(state)`.
3. Форматирование текста `shareableText = formatShareableText(summary)`.
4. Заполнение поля `#export-preview-text.value = shareableText`.
5. Сброс статуса в `setExportStatus("idle", "Выберите действие для экспорта")`.
6. Снятие класса `.hidden` с `#export-modal`, фокус на `#export-copy-btn`.

### 3.2. Сценарий копирования:
1. Клик по `#export-copy-btn`.
2. Установка `setExportStatus("loading", "Копирование в буфер...")`.
3. Блокировка кнопок `#export-copy-btn.disabled = true`, `#export-download-btn.disabled = true`.
4. Вызов `const result = await copyTextToClipboard(shareableText)`.
5. Если `result.success`:
   - `setExportStatus("success", "Результаты скопированы в буфер! 👍")`.
   - Разблокировка кнопок.
   - Запуск таймера на 3000 мс для возврата в `"idle"`.
6. Если не `result.success`:
   - `setExportStatus("error", "Не удалось скопировать. Выделите текст вручную.")`.
   - Разблокировка кнопок.
   - Автоматический вызов `#export-preview-text.select()`.

### 3.3. Сценарий скачивания:
1. Клик по `#export-download-btn`.
2. Установка `setExportStatus("loading", "Формирование файла...")`.
3. Сериализация `jsonContent = formatJsonString(summary)`.
4. Вызов `triggerFileDownload(jsonContent, \`wordbridge-match-\${timestamp}.json\`)`.
5. `setExportStatus("success", "Файл успешно сохранён! 📁")`.
6. Разблокировка кнопок и запуск таймера сброса в `"idle"` (3000 мс).
