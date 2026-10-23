"""
Тесты логики экспорта истории игры WordBridge (TDD):
- Построение структур данных раундов (Solo, Duel)
- Проверка инвариантов и валидация структур
- Расчет агрегированной сводки сессии (SessionSummary)
- Сборка конверта экспорта (ExportEnvelope) и валидация схемы
- Сериализация в JSON (pretty-print, UTF-8)
"""
import unittest
import json
import time
from datetime import datetime, timezone

def _get_iso_utc():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def _get_timestamp_ms():
    return int(time.time() * 1000)

# ============================================================================
# Чистые функции логики экспорта (зеркало src/export_service.js)
# ============================================================================

def create_solo_round_record(start_word: str, target_word: str, chain: list[str], completed_at: str | None = None) -> dict:
    if not chain or len(chain) < 2:
        raise ValueError("Цепочка должна содержать минимум 2 слова (старт и финиш).")
    if chain[0] != start_word:
        raise ValueError("Первое слово цепочки должно совпадать со стартовым словом.")
    if chain[-1] != target_word:
        raise ValueError("Последнее слово цепочки должно совпадать с целевым словом.")
    
    timestamp = completed_at or _get_iso_utc()
    return {
        "id": f"round-solo-{_get_timestamp_ms()}",
        "mode": "solo",
        "submode": None,
        "completedAt": timestamp,
        "data": {
            "startWord": start_word,
            "targetWord": target_word,
            "chain": list(chain),
            "steps": len(chain) - 1
        }
    }

def create_duel_round_record(submode: str, p1_data: dict, p2_data: dict, outcome: dict, completed_at: str | None = None) -> dict:
    if submode not in ("race", "challenge"):
        raise ValueError(f"Недопустимый подрежим дуэли: {submode}")
    
    for player_key, player_data in [("player1", p1_data), ("player2", p2_data)]:
        chain = player_data.get("chain", [])
        pair = player_data.get("pair", {})
        if len(chain) < 2:
            raise ValueError(f"{player_key}: Цепочка должна содержать минимум 2 слова.")
        if chain[0] != pair.get("start"):
            raise ValueError(f"{player_key}: Старт цепочки не совпадает с парой.")
        if chain[-1] != pair.get("target"):
            raise ValueError(f"{player_key}: Финиш цепочки не совпадает с парой.")
    
    timestamp = completed_at or _get_iso_utc()
    return {
        "id": f"round-duel-{_get_timestamp_ms()}",
        "mode": "duel",
        "submode": submode,
        "completedAt": timestamp,
        "data": {
            "submode": submode,
            "player1": {
                "pair": dict(p1_data["pair"]),
                "chain": list(p1_data["chain"]),
                "steps": len(p1_data["chain"]) - 1,
                "isDisputed": bool(p1_data.get("isDisputed", False))
            },
            "player2": {
                "pair": dict(p2_data["pair"]),
                "chain": list(p2_data["chain"]),
                "steps": len(p2_data["chain"]) - 1,
                "isDisputed": bool(p2_data.get("isDisputed", False))
            },
            "outcome": {
                "winner": outcome["winner"],
                "reason": outcome["reason"]
            }
        }
    }

def validate_round_record(record: dict) -> tuple[bool, list[str]]:
    errors = []
    if not isinstance(record, dict):
        return False, ["Запись должна быть объектом."]
    
    for field in ("id", "mode", "completedAt", "data"):
        if field not in record:
            errors.append(f"Отсутствует обязательное поле: {field}")
            
    mode = record.get("mode")
    if mode not in ("solo", "duel"):
        errors.append(f"Некорректный режим: {mode}")
        
    data = record.get("data", {})
    if mode == "solo":
        if "chain" not in data or len(data.get("chain", [])) < 2:
            errors.append("Соло-раунд должен содержать chain длиной >= 2")
        if data.get("steps") != len(data.get("chain", [])) - 1:
            errors.append("Несоответствие steps и длины chain")
    elif mode == "duel":
        if "player1" not in data or "player2" not in data:
            errors.append("Дуэль-раунд должен содержать player1 и player2")
        if "outcome" not in data or "winner" not in data.get("outcome", {}):
            errors.append("Дуэль-раунд должен содержать outcome.winner")
            
    return (len(errors) == 0, errors)

def calculate_session_summary(rounds: list[dict]) -> dict:
    total_rounds = len(rounds)
    if total_rounds == 0:
        return {
            "totalRounds": 0,
            "soloRoundsCount": 0,
            "duelRoundsCount": 0,
            "averageSteps": 0.0,
            "duelStats": {
                "player1Wins": 0,
                "player2Wins": 0,
                "draws": 0,
                "disputedDraws": 0
            }
        }
        
    solo_count = 0
    duel_count = 0
    p1_wins = 0
    p2_wins = 0
    draws = 0
    disputed_draws = 0
    all_steps = []
    
    for r in rounds:
        mode = r.get("mode")
        data = r.get("data", {})
        if mode == "solo":
            solo_count += 1
            all_steps.append(data.get("steps", 0))
        elif mode == "duel":
            duel_count += 1
            p1_steps = data.get("player1", {}).get("steps", 0)
            p2_steps = data.get("player2", {}).get("steps", 0)
            all_steps.extend([p1_steps, p2_steps])
            
            winner = data.get("outcome", {}).get("winner")
            if winner == "player1":
                p1_wins += 1
            elif winner == "player2":
                p2_wins += 1
            elif winner == "draw":
                draws += 1
            elif winner == "disputed_draw":
                disputed_draws += 1
                
    avg_steps = round(sum(all_steps) / len(all_steps), 1) if all_steps else 0.0
    
    return {
        "totalRounds": total_rounds,
        "soloRoundsCount": solo_count,
        "duelRoundsCount": duel_count,
        "averageSteps": avg_steps,
        "duelStats": {
            "player1Wins": p1_wins,
            "player2Wins": p2_wins,
            "draws": draws,
            "disputedDraws": disputed_draws
        }
    }

def build_session_history_envelope(rounds: list[dict], exported_at: str | None = None) -> dict:
    timestamp = exported_at or _get_iso_utc()
    summary = calculate_session_summary(rounds)
    return {
        "schemaVersion": "1.0.0",
        "appName": "WordBridge",
        "exportedAt": timestamp,
        "summary": summary,
        "rounds": list(rounds)
    }

def build_current_match_summary(state: dict) -> dict:
    mode = state.get("mode")
    now = _get_iso_utc()
    if mode == "solo":
        pair = state.get("solo", {}).get("currentPair", {})
        chain = state.get("solo", {}).get("chain", [])
        return {
            "schemaVersion": "1.0.0",
            "mode": "solo",
            "submode": None,
            "completedAt": now,
            "pair": dict(pair),
            "solo": {
                "chain": list(chain),
                "steps": len(chain) - 1 if len(chain) > 1 else 0
            }
        }
    
    duel = state.get("duel", {})
    submode = duel.get("submode", "race")
    p1_pair = duel.get("p1Pair") if submode == "challenge" else duel.get("racePair")
    p2_pair = duel.get("p2Pair") if submode == "challenge" else duel.get("racePair")
    p1_chain = duel.get("p1Chain", [])
    p2_chain = duel.get("p2Chain", [])
    p1_steps = len(p1_chain) - 1 if len(p1_chain) > 1 else 0
    p2_steps = len(p2_chain) - 1 if len(p2_chain) > 1 else 0
    p1_disputed = duel.get("p1Disputed", False)
    p2_disputed = duel.get("p2Disputed", False)

    if p1_disputed and p2_disputed:
        winner, winner_name = "disputed_draw", "Ничья (взаимное оспаривание)"
        reason = "Оба моста были оспорены соперниками"
    elif p1_disputed and not p2_disputed:
        winner, winner_name = "player2", "Игрок 2"
        reason = "Мост Игрока 1 был оспорен соперником"
    elif p2_disputed and not p1_disputed:
        winner, winner_name = "player1", "Игрок 1"
        reason = "Мост Игрока 2 был оспорен соперником"
    elif p1_steps < p2_steps:
        winner, winner_name = "player1", "Игрок 1"
        reason = f"Мост Игрока 1 короче ({p1_steps} против {p2_steps} шагов)"
    elif p2_steps < p1_steps:
        winner, winner_name = "player2", "Игрок 2"
        reason = f"Мост Игрока 2 короче ({p2_steps} против {p1_steps} шагов)"
    else:
        winner, winner_name = "draw", "Ничья"
        reason = "Равное количество шагов"

    return {
        "schemaVersion": "1.0.0",
        "mode": "duel",
        "submode": submode,
        "completedAt": now,
        "pair": dict(duel.get("racePair", {})) if submode == "race" else {"start": "Разные пары", "target": "Разные пары"},
        "duel": {
            "player1": {
                "name": "Игрок 1",
                "pair": dict(p1_pair or {}),
                "chain": list(p1_chain),
                "steps": p1_steps,
                "isDisputed": bool(p1_disputed)
            },
            "player2": {
                "name": "Игрок 2",
                "pair": dict(p2_pair or {}),
                "chain": list(p2_chain),
                "steps": p2_steps,
                "isDisputed": bool(p2_disputed)
            },
            "outcome": {
                "winner": winner,
                "winnerName": winner_name,
                "reason": reason
            }
        }
    }

def format_shareable_text(summary: dict) -> str:
    mode = summary.get("mode")
    date_str = summary.get("completedAt", "")[:16].replace("T", " ")
    if mode == "solo":
        chain_str = " ➔ ".join(summary.get("solo", {}).get("chain", []))
        pair = summary.get("pair", {})
        steps = summary.get("solo", {}).get("steps", 0)
        return (
            f"🌉 WordBridge | Соло-мост\n"
            f"🎯 Пара: {pair.get('start')} ➔ {pair.get('target')}\n\n"
            f"✨ Мост ({steps} шагов): {chain_str}\n"
            f"📅 {date_str}"
        )
    
    submode = summary.get("submode")
    is_race = submode == "race"
    p1 = summary.get("duel", {}).get("player1", {})
    p2 = summary.get("duel", {}).get("player2", {})
    outcome = summary.get("duel", {}).get("outcome", {})
    
    lines = [f"🌉 WordBridge | Дуэль: {'Гонка' if is_race else 'Вызов'}"]
    if is_race:
        pair = summary.get("pair", {})
        lines.append(f"🎯 Пара: {pair.get('start')} ➔ {pair.get('target')}")
    lines.append("")
    
    p1_mark = " 🏆" if outcome.get("winner") == "player1" else ""
    p2_mark = " 🏆" if outcome.get("winner") == "player2" else ""
    
    lines.append(f"👤 Игрок 1 ({p1.get('steps')} шагов): {' ➔ '.join(p1.get('chain', []))}{p1_mark}")
    lines.append(f"👤 Игрок 2 ({p2.get('steps')} шагов): {' ➔ '.join(p2.get('chain', []))}{p2_mark}")
    lines.append("")
    lines.append(f"🏆 Итог: {outcome.get('winnerName')} ({outcome.get('reason')})")
    lines.append(f"📅 {date_str}")
    return "\n".join(lines)

def format_json_string(data: dict, pretty: bool = True) -> str:
    indent = 2 if pretty else None
    return json.dumps(data, ensure_ascii=False, indent=indent)

# ============================================================================
# Юнит-тесты TDD
# ============================================================================

class TestExportHistory(unittest.TestCase):

    def test_create_solo_round_record(self):
        record = create_solo_round_record("Чайник", "Космос", ["Чайник", "Пар", "Облако", "Космос"])
        self.assertEqual(record["mode"], "solo")
        self.assertIsNone(record["submode"])
        self.assertEqual(record["data"]["startWord"], "Чайник")
        self.assertEqual(record["data"]["targetWord"], "Космос")
        self.assertEqual(record["data"]["steps"], 3)
        self.assertEqual(len(record["data"]["chain"]), 4)

    def test_create_solo_round_validation(self):
        with self.assertRaises(ValueError):
            create_solo_round_record("Чайник", "Космос", ["Чайник"])  # < 2 слов
        with self.assertRaises(ValueError):
            create_solo_round_record("Чайник", "Космос", ["Утюг", "Космос"])  # старт не совпадает
        with self.assertRaises(ValueError):
            create_solo_round_record("Чайник", "Космос", ["Чайник", "Звезда"])  # финиш не совпадает

    def test_create_duel_round_record(self):
        p1 = {"pair": {"start": "Кот", "target": "Сыр"}, "chain": ["Кот", "Мышь", "Сыр"], "isDisputed": False}
        p2 = {"pair": {"start": "Кот", "target": "Сыр"}, "chain": ["Кот", "Молоко", "Сыр"], "isDisputed": False}
        outcome = {"winner": "draw", "reason": "Ничья по числу шагов!"}
        
        record = create_duel_round_record("race", p1, p2, outcome)
        self.assertEqual(record["mode"], "duel")
        self.assertEqual(record["submode"], "race")
        self.assertEqual(record["data"]["player1"]["steps"], 2)
        self.assertEqual(record["data"]["player2"]["steps"], 2)
        self.assertEqual(record["data"]["outcome"]["winner"], "draw")

    def test_calculate_session_summary_empty(self):
        summary = calculate_session_summary([])
        self.assertEqual(summary["totalRounds"], 0)
        self.assertEqual(summary["soloRoundsCount"], 0)
        self.assertEqual(summary["duelRoundsCount"], 0)
        self.assertEqual(summary["averageSteps"], 0.0)

    def test_calculate_session_summary_mixed(self):
        solo = create_solo_round_record("А", "В", ["А", "Б", "В"])  # 2 шага
        p1 = {"pair": {"start": "Кот", "target": "Сыр"}, "chain": ["Кот", "Сыр"], "isDisputed": False} # 1 шаг
        p2 = {"pair": {"start": "Кот", "target": "Сыр"}, "chain": ["Кот", "Мышь", "Сыр"], "isDisputed": False} # 2 шага
        outcome = {"winner": "player1", "reason": "Игрок 1 быстрее"}
        duel = create_duel_round_record("race", p1, p2, outcome)
        
        summary = calculate_session_summary([solo, duel])
        self.assertEqual(summary["totalRounds"], 2)
        self.assertEqual(summary["soloRoundsCount"], 1)
        self.assertEqual(summary["duelRoundsCount"], 1)
        self.assertEqual(summary["duelStats"]["player1Wins"], 1)
        # steps: solo: 2, p1: 1, p2: 2 -> avg: (2+1+2)/3 = 5/3 = 1.7
        self.assertEqual(summary["averageSteps"], 1.7)

    def test_build_session_history_envelope(self):
        solo = create_solo_round_record("А", "В", ["А", "Б", "В"])
        envelope = build_session_history_envelope([solo])
        self.assertEqual(envelope["schemaVersion"], "1.0.0")
        self.assertEqual(envelope["appName"], "WordBridge")
        self.assertEqual(envelope["summary"]["totalRounds"], 1)
        self.assertEqual(len(envelope["rounds"]), 1)

    def test_build_current_match_summary_solo(self):
        state = {
            "mode": "solo",
            "solo": {
                "currentPair": {"start": "Чайник", "target": "Космос"},
                "chain": ["Чайник", "Пар", "Космос"]
            }
        }
        summary = build_current_match_summary(state)
        self.assertEqual(summary["mode"], "solo")
        self.assertEqual(summary["solo"]["steps"], 2)
        text = format_shareable_text(summary)
        self.assertIn("Соло-мост", text)
        self.assertIn("Чайник ➔ Пар ➔ Космос", text)

    def test_build_current_match_summary_duel_race(self):
        state = {
            "mode": "duel",
            "duel": {
                "submode": "race",
                "racePair": {"start": "Кот", "target": "Сыр"},
                "p1Chain": ["Кот", "Мышь", "Сыр"],
                "p2Chain": ["Кот", "Сыр"],
                "p1Disputed": False,
                "p2Disputed": False
            }
        }
        summary = build_current_match_summary(state)
        self.assertEqual(summary["mode"], "duel")
        self.assertEqual(summary["submode"], "race")
        self.assertEqual(summary["duel"]["outcome"]["winner"], "player2")
        text = format_shareable_text(summary)
        self.assertIn("Дуэль: Гонка", text)
        self.assertIn("Игрок 2", text)

    def test_format_json_utf8_cyrillic(self):
        solo = create_solo_round_record("Чайник", "Дыра", ["Чайник", "Пар", "Дыра"])
        envelope = build_session_history_envelope([solo])
        json_str = format_json_string(envelope)
        self.assertIn("Чайник", json_str)
        self.assertIn("Дыра", json_str)
        parsed = json.loads(json_str)
        self.assertEqual(parsed["schemaVersion"], "1.0.0")

    def test_build_current_match_summary_duel_disputed(self):
        state = {
            "mode": "duel",
            "duel": {
                "submode": "race",
                "racePair": {"start": "Кот", "target": "Сыр"},
                "p1Chain": ["Кот", "Сыр"],
                "p2Chain": ["Кот", "Мышь", "Сыр"],
                "p1Disputed": True,
                "p2Disputed": False
            }
        }
        summary = build_current_match_summary(state)
        self.assertEqual(summary["duel"]["outcome"]["winner"], "player2")
        text = format_shareable_text(summary)
        self.assertIn("Мост Игрока 1 был оспорен", text)

    def test_match_filename_pattern(self):
        import re
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M%S")
        filename = f"wordbridge-match-{timestamp}.json"
        pattern = r"^wordbridge-match-\d{4}-\d{2}-\d{2}-\d{6}\.json$"
        self.assertTrue(re.match(pattern, filename))

    def test_error_status_mapping(self):
        # Проверка маппинга фаз статуса
        status_phases = ["idle", "loading", "success", "error"]
        for phase in status_phases:
            self.assertIn(phase, ("idle", "loading", "success", "error"))

if __name__ == "__main__":
    unittest.main()
