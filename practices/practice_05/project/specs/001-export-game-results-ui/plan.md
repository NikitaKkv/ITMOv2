# Implementation Plan: UI экспорта результатов игры (Export Game Results UI)

**Branch**: `001-export-game-results-ui` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-export-game-results-ui/spec.md`  
**Shared Contract**: [`specs/contract.md`](file:///home/nikita/ITMO/ITMOv2/practices/practice_05/project/specs/contract.md)

---

## Summary

Реализация интерфейса экспорта результатов игры WordBridge на финальном экране (Showdown) в соответствии с согласованным межкомандным контрактом. Включает кнопку вызова экспорта, доступное модальное диалоговое окно предпросмотра с поддержкой WAI-ARIA, кнопки копирования в буфер обмена и скачивания JSON-файла, а также реактивный индикатор 4-фазного статуса операции (idle / loading / success / error) с автосбросом через 3 секунды.

---

## Technical Context

**Language/Version**: Vanilla JavaScript (ES6+ Modules), HTML5, CSS3, Python 3 (для запуска тестового раннера и локального dev-сервера).  
**Primary Dependencies**: None (архитектурный инвариант: Vanilla JS, отсутствие npm/внешних библиотек; браузерные Clipboard API, Blob/URL API, Web Audio API).  
**Storage**: Оперативная память браузера (DOM/JS State) + клиентская генерация файлов через Blob URL.  
**Testing**: Python `unittest` (`tests/test_export.py` для логики экспорта и контрактов данных; существующий `tests/test_logic.py` не модифицируется) + ручные E2E-сценарии в браузере.  
**Target Platform**: Современные десктопные и мобильные веб-браузеры (Chrome, Firefox, Safari, Edge) с адаптивной версткой от 320px.  
**Project Type**: Клиентское веб-приложение (SPA) / Vanilla JS Web Game.  
**Performance Goals**: Время отклика открытия модального окна < 50 мс; время реакции индикатора статуса < 100 мс; плавная анимация 60 FPS.  
**Constraints**: Строгая изоляция бизнес-логики в `src/export_service.js`, минимальные точечные врезки в `src/index.html`, `src/styles.css` и `src/app.js`; отсутствие деструктивных изменений; полное соответствие стандартам доступности WAI-ARIA.  
**Scale/Scope**: 1 модальное окно, 1 кнопка вызова на экране Showdown, 4 состояния UI-статуса, 2 действия экспорта (буфер обмена и JSON-файл).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип / Инвариант | Статус | Анализ соответствия |
| :--- | :---: | :--- |
| **I. Модульность и изоляция логики** | PASS | Вся бизнес-логика извлечения данных, сериализации JSON и форматирования вынесена в отдельный модуль `src/export_service.js`. Модуль UI в `src/app.js` только управляет DOM и вызывает чистые функции сервиса. |
| **II. Отсутствие внешних зависимостей** | PASS | Используются стандартные возможности браузера (DOM, Blob, Clipboard API). Никаких npm-пакетов или тяжелых библиотек. |
| **III. Тестируемость (TDD)** | PASS | Тесты контракта и логики вынесены в `tests/test_export.py`. Существующий `tests/test_logic.py` сохраняется в неизменном виде. |
| **IV. Безопасность и неразрушающие правки** | PASS | Существующий игровой цикл, логика построения цепочек ассоциаций и судейство Showdown не затрагиваются. Экспорт интегрируется как расширение экрана результатов. |
| **V. Доступность и UX** | PASS | Реализованы WAI-ARIA разметка (`role="dialog"`, `aria-modal="true"`, `aria-live="polite"`), фокус-менеджмент при открытии/закрытии и поддержка клавиши `Escape`. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-export-game-results-ui/
├── spec.md              # Спецификация требований (выход команды /speckit-specify)
├── plan.md              # План реализации (этот документ)
├── research.md          # Исследования и обоснование технических решений (Phase 0)
├── data-model.md        # Модели данных и машина состояний UI (Phase 1)
├── quickstart.md        # Руководство по верификации и сценарии тестирования (Phase 1)
├── contracts/
│   └── modal-ui-contract.md # Контракт разметки, CSS и событий модального окна
└── checklists/
    └── requirements.md  # Чек-лист качества требований
```

### Source Code (repository root)

```text
src/
├── index.html           # Добавление кнопки #showdown-export-btn и контейнера #export-modal
├── styles.css           # Стили неонового модального окна, бэкдропа и статусных бейджей
├── app.js               # Кэширование DOM, обработчики событий модалки, вызов export_service.js
└── export_service.js    # Чистый ES6-сервис извлечения данных, форматирования и скачивания

tests/
├── test_export.py       # Новые модульные тесты для логики экспорта и контрактов данных
└── test_logic.py        # Исходные тесты логики игры (не модифицируются)
```

**Structure Decision**: Однопроектная модульная структура Vanilla JS. Интерфейсная часть расширяет существующие файлы фронтенда (`index.html`, `styles.css`, `app.js`), а логика экспорта и тесты строго изолированы в собственных файлах (`export_service.js`, `test_export.py`), обеспечивая независимость разработки и отсутствие конфликтов.

---

## Complexity Tracking

> Все решения соответствуют базовой архитектуре проекта, неоправданные усложнения отсутствуют.

| Решение / Компонент | Почему необходимо | Отклоненные альтернативы и причины |
| :--- | :--- | :--- |
| **Кастомный WAI-ARIA модал вместо `<dialog>`** | Единый неоновый стиль оформления, стабильная кросс-браузерная анимация бэкдропа (`backdrop-filter`) | Нативный `<dialog>` имеет неоднородную кросс-браузерную стилизацию псевдоэлемента `::backdrop` в темных темах. |
| **Fallback для копирования в буфер** | Гарантия работы в небезопасных контекстах и старых мобильных WebViews | Полагаться только на `navigator.clipboard` рискованно из-за возможных отказов прав доступа (`NotAllowedError`). |
