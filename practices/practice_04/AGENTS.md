# AGENTS.md — WordBridge: Игра в ассоциативный мост

Добро пожаловать в репозиторий проекта **WordBridge**! Этот файл является главной точкой входа для AI-агентов и разработчиков.

---

## 1. О проекте и суть игры

**WordBridge** — веб-игра для двух игроков, основанная на поиске кратчайшей цепочки ассоциаций между двумя несвязанными словами (например, от слова *«Чайник»* до *«Чёрная дыра»*).

### Реализуемый скоуп (2 ключевые фичи):

1. **Интерактивный построитель моста ассоциаций (Chain Builder & Graph):**
   * Стартовое и Целевое слово зафиксированы на экране как крайние точки.
   * Игрок вводит промежуточные слова-мостики: слова выстраиваются в красивую визуальную цепочку с динамическими соединительными линиями.
   * Счётчик длины пути («Длина моста: X шагов»), возможность отменить последний шаг (Undo).
   * Автоматическое замыкание моста, когда введено целевое слово, с победным звуковым аккордом (Web Audio API).

2. **Система дуэли для двух игроков (Hot-seat Duel & Showdown):**
   * **Два режима игры:**
     * *«Гонка» (Одна пара на двоих):* генерируется или задается одна пара слов, оба игрока по очереди строят путь. Побеждает тот, у кого путь короче.
     * *«Вызов» (Загадка сопернику):* Игрок 1 загадывает максимально далёкую пару для Игрока 2, затем они меняются ролями.
   * **Экран сравнения путей (Showdown):**
     * Наглядное сопоставление обеих цепочек бок о бок.
     * Определение победителя по числу шагов.
     * Кнопки взаимного судейства: «Одобрить мост 👍» / «Оспорить связь 🤨».

---

## 2. Технологический стек

* **Frontend:** Чистый HTML5 + CSS3 в `src/` (современная тёмная тема, неоновые акценты, SVG-линии соединений, карточки слов).
* **Скрипты:** Vanilla JavaScript (ES6+ модули, чистая архитектура без внешних npm-библиотек).
* **Звук:** Браузерный **Web Audio API** (синтез приятных звуков щелчка, соединения узла и победного аккорда).
* **Словарь:** Встроенный генератор 100+ сочных контрастных пар слов (для быстрой игры без долгого придумывания).
* **Локальный сервер:** Встроенный Python HTTP server (`python3 -m http.server 8000 --directory src`).

---

## 3. Команды для разработки и проверки

* **Запуск локального сервера:**
  ```bash
  python3 -m http.server 8000 --directory src
  ```
  Приложение доступно по адресу: `http://localhost:8000`

* **Запуск тестов логики (TDD):**
  ```bash
  bash .agents/skills/tdd/run_tests.sh
  ```

---

## 4. Навигация по документации и правилам

* 🎨 **Дизайн-система и UI:** См. [`docs/front.md`](file:///home/nikita/ITMO/ITMOv2/practices/practice_04/docs/front.md) (цвета, шрифты, компоненты, визуальные токены).
* 📐 **Правила написания кода:** См. [`.agents/rules/code-style.md`](file:///home/nikita/ITMO/ITMOv2/practices/practice_04/.agents/rules/code-style.md).
* 🌐 **Навык Web Code Style:** См. [`.agents/skills/web-code-style/SKILL.md`](file:///home/nikita/ITMO/ITMOv2/practices/practice_04/.agents/skills/web-code-style/SKILL.md).
* 🧪 **Навык TDD (Test-Driven Development):** См. [`.agents/skills/tdd/SKILL.md`](file:///home/nikita/ITMO/ITMOv2/practices/practice_04/.agents/skills/tdd/SKILL.md).
* 🐍 **Навык Python Code Style:** См. [`.agents/skills/python-code-style/SKILL.md`](file:///home/nikita/ITMO/ITMOv2/practices/practice_04/.agents/skills/python-code-style/SKILL.md).
* 🪝 **Детерминированные хуки (Тесты & Линтер):** См. [`.agents/hooks.json`](file:///home/nikita/ITMO/ITMOv2/practices/practice_04/.agents/hooks.json) и скрипт [`scripts/check_all.sh`](file:///home/nikita/ITMO/ITMOv2/practices/practice_04/scripts/check_all.sh).
* 🔌 **Конфиг MCP (GitHub и др.):** См. [`mcp_config.json`](file:///home/nikita/ITMO/ITMOv2/practices/practice_04/mcp_config.json).
