#!/usr/bin/env bash
set -e

echo "🧪 Запуск тестов логики WordBridge..."
python3 tests/test_logic.py
echo "✅ Все тесты успешно пройдены!"
