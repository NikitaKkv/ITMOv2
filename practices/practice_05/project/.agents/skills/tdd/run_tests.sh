#!/usr/bin/env bash
set -e

echo "🧪 Запуск тестов логики WordBridge..."
python3 tests/test_logic.py
python3 -m unittest tests/test_export.py
echo "✅ Все тесты успешно пройдены!"
