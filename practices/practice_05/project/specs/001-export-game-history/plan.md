# Implementation Plan: Экспорт истории игры в JSON (Export Game History to JSON)

**Branch**: `001-export-game-history` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-export-game-history/spec.md`

## Summary

Реализация чистого модуля сбора, валидации и экспорта истории игровых партий (Solo и Duel) в структурированный формат JSON с вычислением сводной статистики, возможностью сохранения в `.json`-файл на устройстве пользователя и копирования в буфер обмена.

## Technical Context

**Language/Version**: JavaScript (ES6+ модули в браузере), Python 3.10+ (юнит-тесты логики TDD).

**Primary Dependencies**: Отсутствуют (чистый Vanilla JS в `src/`, стандартная библиотека `unittest` в Python, Web APIs: `Blob`, `URL`, `navigator.clipboard`).

**Storage**: Оперативная память клиентской сессии (`state.history`), неизменяемые снимки завершённых раундов.

**Testing**: Python `unittest` (`tests/test_export.py` и `tests/test_logic.py`), проверка синтаксиса `node -c`.

**Target Platform**: Современные веб-браузеры (десктоп и мобильные).

**Project Type**: Клиентское веб-приложение (Single Page Application / Static Web).

**Performance Goals**: Время генерации и сериализации документа < 50 мс для 100 раундов.

**Constraints**: Без внешних npm-библиотек; корректная кодировка UTF-8 для кириллических слов; строгая изоляция чистой логики от манипуляций с DOM.

**Scale/Scope**: Сессии от 0 до 100+ раундов, экспорт полной сессии и единичного раунда.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Статус | Анализ соответствия |
|---------|--------|---------------------|
| **I. Test-First (TDD)** | PASS | Логика валидации, расчета сводки и сборки JSON покрывается модульными тестами до интеграции в UI. |
| **II. Zero-Dependencies & Simplicity** | PASS | Используются нативные возможности JavaScript и Web API без добавления сторонних библиотек. |
| **III. Separation of Concerns** | PASS | Чистые функции сбора и валидации данных изолированы от DOM и UI-рендеринга. |
| **IV. Data Safety** | PASS | Операция экспорта является сугубо неразрушающей (read-only), история сохраняется в неизменяемых снимках. |

## Project Structure

### Documentation (this feature)

```text
specs/001-export-game-history/
├── spec.md              # Спецификация требований
├── plan.md              # Данный план реализации
├── research.md          # Результаты исследования решений (Phase 0)
├── data-model.md        # Модель данных и инварианты (Phase 1)
├── quickstart.md        # Руководство по сквозной проверке (Phase 1)
├── contracts/           # Схемы и интерфейсные контракты (Phase 1)
│   ├── export-schema.json
│   └── history-api.md
└── checklists/
    └── requirements.md  # Чек-лист качества требований
```

### Source Code (repository root)

```text
src/
├── app.js               # Интеграция реестра истории и обработчиков UI экспорта
├── export.js            # Чистый модуль: структуры данных, валидация, расчет summary, сборка JSON
├── audio.js             # Звуковые эффекты
├── words.js             # Словарь пар
├── index.html           # Кнопки экспорта истории, экспорта раунда и копирования JSON
└── styles.css           # Стили для кнопок экспорта и модальных/всплывающих подсказок

tests/
├── test_logic.py        # Базовые тесты логики игры
└── test_export.py       # TDD-тесты логики экспорта, валидации структур и расчета статистики
```

**Structure Decision**: Логика формирования данных, расчета аналитики и сериализации выносится в изолированный модуль `src/export.js` (с зеркальным тестовым модулем `tests/test_export.py` на Python), что обеспечивает полную тестируемость без эмуляции браузерного DOM. В `src/app.js` реализуется подписка на завершение раундов для фиксации снимков и подключение кнопок UI.

## Complexity Tracking

*Нарушений архитектурных инвариантов и усложнений нет.*
