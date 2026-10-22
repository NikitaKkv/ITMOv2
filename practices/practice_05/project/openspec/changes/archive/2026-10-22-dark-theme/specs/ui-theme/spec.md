# Spec Delta

## Purpose

Предоставляет пользователю возможность переключения между светлой и тёмной цветовыми темами оформления интерфейса с сохранением выбора, валидацией данных, предотвращением FOUC и адаптацией под системные настройки.

## ADDED Requirements

### Requirement: Theme Toggle Control
The system SHALL provide an accessible two-state theme toggle control in the top-right navigation bar, displaying a Moon icon when the active theme is light and a Sun icon when the active theme is dark.

#### Scenario: Switching from light to dark theme
- **WHEN** пользователь со светлой темой кликает на кнопку переключателя темы (с иконкой Луны)
- **THEN** атрибут `data-theme="dark"` устанавливается на корневой элемент документа, иконка меняется на символ Солнца, а выбор сохраняется в `localStorage`

#### Scenario: Switching from dark to light theme
- **WHEN** пользователь с тёмной темой кликает на кнопку переключателя темы (с иконкой Солнца)
- **THEN** атрибут `data-theme="light"` устанавливается на корневой элемент документа, иконка меняется на символ Луны, а выбор сохраняется в `localStorage`

### Requirement: Theme State Persistence and Validation
The system SHALL persist the user's explicit theme selection in `localStorage` under key `wb_theme` and validate stored values strictly against allowed values (`dark` or `light`).

#### Scenario: Restoring saved dark theme on load
- **WHEN** страница загружается и в `localStorage` по ключу `wb_theme` содержится значение `"dark"`
- **THEN** система активирует тёмную тему, устанавливая `data-theme="dark"`

#### Scenario: Restoring saved light theme on load
- **WHEN** страница загружается и в `localStorage` по ключу `wb_theme` содержится значение `"light"`
- **THEN** система активирует светлую тему, устанавливая `data-theme="light"`

#### Scenario: Validating corrupted or unrecognized storage values
- **WHEN** в `localStorage` по ключу `wb_theme` обнаружено любое значение, отличное от `"dark"` или `"light"` (например, пустая строка, мусорный текст или произвольный JSON)
- **THEN** система отбрасывает некорректное значение и определяет тему на основе системных настроек `prefers-color-scheme` или использует светлую тему по умолчанию

### Requirement: FOUC Prevention via Inline Script
The system SHALL execute a synchronous inline script in the document `<head>` before style sheets or body elements are rendered to eliminate flash of unstyled theme (FOUC).

#### Scenario: Instant dark theme application during initial render
- **WHEN** браузер начинает парсинг документа и выполняется синхронный скрипт в `<head>`
- **THEN** атрибут `data-theme` выставляется на тег `<html>` до первой визуальной отрисовки страницы

### Requirement: System Preference Detection
When no valid theme preference is stored in `localStorage`, the system SHALL detect and apply the operating system color scheme preference via `prefers-color-scheme`.

#### Scenario: First visit with dark OS preference
- **WHEN** страница загружается без валидной записи `wb_theme` в `localStorage`, а браузер сообщает `prefers-color-scheme: dark`
- **THEN** система активирует тёмную тему (`data-theme="dark"`)

#### Scenario: First visit with light or unspecified OS preference
- **WHEN** страница загружается без валидной записи `wb_theme` в `localStorage`, а системное предпочтение светлое или отсутствует
- **THEN** система сохраняет базовую светлую тему по умолчанию (`data-theme="light"`)

### Requirement: Dark Theme Visual Contract
When dark theme is active, all visual components SHALL utilize Genesis dark palette variables and explicit dark theme rules for `.tag-*`, `.showdown-badge`, and `.btn-secondary:hover`.

#### Scenario: Complete visual adaptation
- **WHEN** тёмная тема активна
- **THEN** фоновая сетка, панель навигации, карточки слов, форма ввода и экран Showdown отображаются на тёмных поверхностях с соблюдением контраста текста и фирменных индиго-акцентов

#### Scenario: Dark theme badge and status tag styling
- **WHEN** тёмная тема активна
- **THEN** элементы `.tag-success`, `.tag-primary`, `.tag-neutral` и `.showdown-badge` отображаются с полупрозрачными тёмными подложками и контрастным цветом текста без ослепляющих белых или светло-серых рамок

#### Scenario: Dark theme secondary button hover
- **WHEN** пользователь наводит курсор на элемент `.btn-secondary` при активной тёмной теме
- **THEN** цвет фона кнопки изменяется на тёмную поверхность (`--surface-subtle`), предотвращая появление светлых серых пятен

### Requirement: Graceful Degradation on Storage Failure
If `localStorage` access is blocked or throws an exception, the system SHALL switch the theme in-memory for the current session without unhandled errors.

#### Scenario: LocalStorage blocked by security policy
- **WHEN** браузер блокирует запись или чтение из `localStorage` при переключении темы
- **THEN** тема переключается в DOM для текущей вкладки, а ошибка хранилища безопасно перехватывается
