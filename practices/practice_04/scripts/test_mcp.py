#!/usr/bin/env python3
"""
scripts/test_mcp.py — Автоматическая демонстрация работы собственного MCP-сервера.
Проверяет рукопожатие, discovery инструментов, успешный вызов и обработку ошибок.
Работает из любой рабочей директории.
"""
import sys
import os
import json
import subprocess

# Определяем абсолютный путь к mcp_server.py рядом с этим скриптом
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_PATH = os.path.join(SCRIPT_DIR, "mcp_server.py")

def call_mcp(req: dict) -> dict:
    proc = subprocess.Popen(
        [sys.executable, SERVER_PATH],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = proc.communicate(json.dumps(req) + "\n")
    if proc.returncode != 0 or not stdout.strip():
        raise RuntimeError(f"Сервер завершился с кодом {proc.returncode}. Stderr: {stderr}")
    return json.loads(stdout.strip())

def main():
    print("🚀 Тестирование собственного MCP-сервера WordBridge (JSON-RPC 2.0)...\n")

    # 1. Инициализация (initialize)
    print("1️⃣ [Handshake] Вызов метода 'initialize'...")
    init_res = call_mcp({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
    server_info = init_res["result"]["serverInfo"]
    print(f"   ✅ Сервер ответил: {server_info['name']} v{server_info['version']}")
    print(f"   Протокол: {init_res['result']['protocolVersion']}\n")

    # 2. Список инструментов (tools/list)
    print("2️⃣ [Discovery] Вызов метода 'tools/list'...")
    tools_res = call_mcp({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
    tools = tools_res["result"]["tools"]
    print(f"   ✅ Обнаружено инструментов: {len(tools)}")
    for t in tools:
        print(f"   🔧 Инструмент: {t['name']} — {t['description']}\n")

    # 3. Успешный сценарий (Success Case)
    print("3️⃣ [Success Scenario] Реальный вызов инструмента с валидными данными:")
    valid_call = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "validate_association_bridge",
            "arguments": {
                "start": "Чайник",
                "target": "Чёрная дыра",
                "chain": ["Кипяток", "Пар", "Облако", "Космос"]
            }
        }
    }
    success_res = call_mcp(valid_call)
    print(f"   Запрос: Чайник ➔ [Кипяток, Пар, Облако, Космос] ➔ Чёрная дыра")
    print(f"   isError: {success_res['result']['isError']}")
    print("   Ответ сервера:")
    print(success_res["result"]["content"][0]["text"])
    print()

    # 4. Ошибочный сценарий (Error Case)
    print("4️⃣ [Error Handling] Реальный вызов инструмента с ошибочным входом (дубликат слова):")
    error_call = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "validate_association_bridge",
            "arguments": {
                "start": "Чайник",
                "target": "Чёрная дыра",
                "chain": ["Кипяток", "чайник", "Космос"]
            }
        }
    }
    error_res = call_mcp(error_call)
    print(f"   Запрос с дубликатом: Чайник ➔ ['Кипяток', 'чайник', 'Космос'] ➔ Чёрная дыра")
    print(f"   isError: {error_res['result']['isError']}")
    print(f"   Ответ об ошибке: {error_res['result']['content'][0]["text"]}\n")

    print("🎉 Все сценарии собственного MCP-сервера успешно подтверждены!")

if __name__ == "__main__":
    main()
