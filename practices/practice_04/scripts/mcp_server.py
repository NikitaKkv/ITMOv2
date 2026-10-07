#!/usr/bin/env python3
"""
scripts/mcp_server.py — Максимально простой и прозрачный MCP-сервер для игры WordBridge.
Работает по официальному стандарту Model Context Protocol (JSON-RPC 2.0 через stdin/stdout).
"""
import sys
import json

def normalize(word: str) -> str:
    return word.strip().lower()

def handle_validate_bridge(args: dict) -> dict:
    """Бизнес-логика инструмента: проверка ассоциативного моста."""
    start = args.get("start")
    target = args.get("target")
    chain = args.get("chain")

    # 1. Обработка ошибочного входа (Error Handling)
    if not start or not isinstance(start, str) or not start.strip():
        return {
            "isError": True,
            "content": [{"type": "text", "text": "Ошибка: поле 'start' обязательно и должно быть непустой строкой."}]
        }

    if not target or not isinstance(target, str) or not target.strip():
        return {
            "isError": True,
            "content": [{"type": "text", "text": "Ошибка: поле 'target' обязательно и должно быть непустой строкой."}]
        }

    if chain is None or not isinstance(chain, list):
        return {
            "isError": True,
            "content": [{"type": "text", "text": "Ошибка: поле 'chain' должно быть списком промежуточных слов."}]
        }

    if len(chain) == 0:
        return {
            "isError": True,
            "content": [{"type": "text", "text": "Ошибка: мост не может быть пустым. Добавьте хотя бы одно промежуточное слово."}]
        }

    if normalize(start) == normalize(target):
        return {
            "isError": True,
            "content": [{"type": "text", "text": "Ошибка: стартовое и целевое слова не могут совпадать."}]
        }

    # Проверка на дубликаты
    seen = {normalize(start)}
    for idx, word in enumerate(chain, 1):
        if not isinstance(word, str) or not word.strip():
            return {
                "isError": True,
                "content": [{"type": "text", "text": f"Ошибка: слово #{idx} в цепочке пустое или не является строкой."}]
            }
        norm_w = normalize(word)
        if norm_w in seen:
            return {
                "isError": True,
                "content": [{"type": "text", "text": f"Ошибка: слово '{word.strip()}' повторяется в цепочке (дубликат)."}]
            }
        seen.add(norm_w)

    # 2. Успешный сценарий (Success)
    total_steps = len(chain) + 1  # количество переходов от start через chain до target
    full_path = [start.strip()] + [w.strip() for w in chain] + [target.strip()]
    
    result_data = {
        "status": "valid",
        "start": start.strip(),
        "target": target.strip(),
        "total_steps": total_steps,
        "full_path": " ➔ ".join(full_path),
        "verdict": f"Мост построен корректно! Общая длина пути: {total_steps} шагов."
    }

    return {
        "isError": False,
        "content": [{"type": "text", "text": json.dumps(result_data, ensure_ascii=False, indent=2)}]
    }

def main():
    """Главный цикл обработки JSON-RPC сообщений."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        # Ответ на рукопожатие (initialize)
        if method == "initialize":
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {"name": "wordbridge-mcp", "version": "1.0.0"},
                    "capabilities": {"tools": {}}
                }
            }
            sys.stdout.write(json.dumps(res) + "\n")
            sys.stdout.flush()

        # Уведомление об успешной инициализации (клиент присылает после initialize)
        elif method == "notifications/initialized":
            pass

        # Список доступных инструментов (tools/list)
        elif method == "tools/list":
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": [
                        {
                            "name": "validate_association_bridge",
                            "description": "Проверяет корректность ассоциативного моста между словами: структуру, отсутствие дубликатов и подсчитывает число шагов.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "start": {"type": "string", "description": "Стартовое слово"},
                                    "target": {"type": "string", "description": "Целевое слово"},
                                    "chain": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": "Список промежуточных слов-мостиков"
                                    }
                                },
                                "required": ["start", "target", "chain"]
                            }
                        }
                    ]
                }
            }
            sys.stdout.write(json.dumps(res) + "\n")
            sys.stdout.flush()

        # Вызов инструмента (tools/call)
        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})

            if tool_name == "validate_association_bridge":
                tool_result = handle_validate_bridge(tool_args)
            else:
                tool_result = {
                    "isError": True,
                    "content": [{"type": "text", "text": f"Неизвестный инструмент: {tool_name}"}]
                }

            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": tool_result
            }
            sys.stdout.write(json.dumps(res) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
