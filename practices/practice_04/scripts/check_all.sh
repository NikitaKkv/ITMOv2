#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "🔍 [HOOK] Запуск детерминированных проверок проекта..."

# 1. Проверка синтаксиса JavaScript
echo "  ⚡ Проверка синтаксиса JS файлов..."
node -c src/words.js src/audio.js src/app.js

# 2. Проверка тестов бизнес-логики (TDD)
echo "  🧪 Запуск тестов логики (test_logic.py)..."
python3 tests/test_logic.py

echo "✅ [HOOK] Все проверки успешно пройдены!"
