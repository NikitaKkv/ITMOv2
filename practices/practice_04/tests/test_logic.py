"""
Тесты логики игры WordBridge (TDD):
- Построение цепочки слов
- Проверка завершения моста
- Определение победителя по минимальному числу шагов
"""
import unittest

def normalize_word(word: str) -> str:
    return word.strip().lower()

def can_add_step(chain: list[str], new_word: str) -> tuple[bool, str]:
    cleaned = normalize_word(new_word)
    if not cleaned:
        return False, "Слово не может быть пустым"
    if cleaned in [normalize_word(w) for w in chain]:
        return False, "Это слово уже есть в вашей цепочке"
    return True, ""

def is_bridge_complete(chain: list[str], target_word: str) -> bool:
    if not chain:
        return False
    return normalize_word(chain[-1]) == normalize_word(target_word)

def get_bridge_length(chain: list[str]) -> int:
    # Длина пути - это количество связей (шагов) между стартом и финишем
    if len(chain) <= 1:
        return 0
    return len(chain) - 1

def determine_winner(player1_steps: int, player2_steps: int) -> str:
    if player1_steps < player2_steps:
        return "player1"
    elif player2_steps < player1_steps:
        return "player2"
    return "draw"

def determine_duel_result(
    player1_steps: int,
    player2_steps: int,
    player1_disputed: bool = False,
    player2_disputed: bool = False
) -> dict:
    """
    Определяет итог дуэли с учетом взаимного судейства (одобрено/оспорено).
    """
    if player1_disputed and player2_disputed:
        return {
            "winner": "disputed_draw",
            "reason": "Оба моста были оспорены соперниками. Ничья по взаимным претензиям!"
        }
    if player1_disputed and not player2_disputed:
        return {
            "winner": "player2",
            "reason": "Мост Игрока 1 был успешно оспорен соперником! Победа присуждена Игроку 2."
        }
    if player2_disputed and not player1_disputed:
        return {
            "winner": "player1",
            "reason": "Мост Игрока 2 был успешно оспорен соперником! Победа присуждена Игроку 1."
        }

    # Если ни один мост не оспорен (или оба подтверждены)
    base_winner = determine_winner(player1_steps, player2_steps)
    if base_winner == "player1":
        return {
            "winner": "player1",
            "reason": f"Игрок 1 построил более короткий мост ({player1_steps} против {player2_steps} шагов)!"
        }
    elif base_winner == "player2":
        return {
            "winner": "player2",
            "reason": f"Игрок 2 построил более короткий мост ({player2_steps} против {player1_steps} шагов)!"
        }
    else:
        return {
            "winner": "draw",
            "reason": f"Боевая ничья! Оба игрока связали слова ровно за {player1_steps} шагов."
        }

def validate_custom_pair(start_word: str, target_word: str) -> tuple[bool, str]:
    start_clean = normalize_word(start_word)
    target_clean = normalize_word(target_word)
    if not start_clean:
        return False, "Стартовое слово не может быть пустым"
    if not target_clean:
        return False, "Целевое слово не может быть пустым"
    if start_clean == target_clean:
        return False, "Стартовое и целевое слова должны быть разными"
    return True, ""

def get_next_duel_phase(current_phase: str, mode: str = "race") -> str:
    if mode == "race":
        transitions = {
            "p1_turn": "pass_turn",
            "pass_turn": "p2_turn",
            "p2_turn": "showdown",
            "showdown": "p1_turn"
        }
        return transitions.get(current_phase, "p1_turn")
    elif mode == "challenge":
        transitions = {
            "challenge_setup_p1": "pass_turn_to_p2",
            "pass_turn_to_p2": "p2_turn",
            "p2_turn": "challenge_setup_p2",
            "challenge_setup_p2": "pass_turn_to_p1",
            "pass_turn_to_p1": "p1_turn",
            "p1_turn": "showdown",
            "showdown": "challenge_setup_p1"
        }
        return transitions.get(current_phase, "challenge_setup_p1")
    return "p1_turn"


class TestWordBridgeLogic(unittest.TestCase):
    def test_normalize_word(self):
        self.assertEqual(normalize_word("  Чайник "), "чайник")
        self.assertEqual(normalize_word("КОСМОС"), "космос")

    def test_can_add_step(self):
        chain = ["Чайник", "Кипяток"]
        # Нельзя добавить дубликат
        can_add, reason = can_add_step(chain, "чайник")
        self.assertFalse(can_add)
        self.assertIn("уже есть", reason)

        # Нельзя пустое
        can_add, reason = can_add_step(chain, "   ")
        self.assertFalse(can_add)

        # Валидное новое слово
        can_add, reason = can_add_step(chain, "Пар")
        self.assertTrue(can_add)

    def test_is_bridge_complete(self):
        target = "Чёрная дыра"
        self.assertFalse(is_bridge_complete(["Чайник", "Пар"], target))
        self.assertTrue(is_bridge_complete(["Чайник", "Пар", "чёрная дыра"], target))

    def test_determine_winner(self):
        # 3 шага лучше, чем 5
        self.assertEqual(determine_winner(3, 5), "player1")
        self.assertEqual(determine_winner(6, 4), "player2")
        self.assertEqual(determine_winner(4, 4), "draw")

    def test_determine_duel_result_clean(self):
        res1 = determine_duel_result(3, 5, player1_disputed=False, player2_disputed=False)
        self.assertEqual(res1["winner"], "player1")
        self.assertIn("Игрок 1", res1["reason"])

        res2 = determine_duel_result(6, 4, player1_disputed=False, player2_disputed=False)
        self.assertEqual(res2["winner"], "player2")

        res_draw = determine_duel_result(4, 4, player1_disputed=False, player2_disputed=False)
        self.assertEqual(res_draw["winner"], "draw")

    def test_determine_duel_result_with_disputes(self):
        # Игрок 1 сделал меньше шагов (3 vs 5), но его мост оспорен
        res = determine_duel_result(3, 5, player1_disputed=True, player2_disputed=False)
        self.assertEqual(res["winner"], "player2")
        self.assertIn("успешно оспорен", res["reason"])

        # Игрок 2 оспорен, Игрок 1 одобрен
        res2 = determine_duel_result(6, 4, player1_disputed=False, player2_disputed=True)
        self.assertEqual(res2["winner"], "player1")

        # Оба оспорены
        res_both = determine_duel_result(3, 4, player1_disputed=True, player2_disputed=True)
        self.assertEqual(res_both["winner"], "disputed_draw")

    def test_validate_custom_pair(self):
        valid, msg = validate_custom_pair("Солнце", "Луна")
        self.assertTrue(valid)
        self.assertEqual(msg, "")

        invalid_empty, _ = validate_custom_pair("", "Луна")
        self.assertFalse(invalid_empty)

        invalid_same, _ = validate_custom_pair("Солнце", "солнце")
        self.assertFalse(invalid_same)

    def test_get_next_duel_phase(self):
        self.assertEqual(get_next_duel_phase("p1_turn", mode="race"), "pass_turn")
        self.assertEqual(get_next_duel_phase("pass_turn", mode="race"), "p2_turn")
        self.assertEqual(get_next_duel_phase("p2_turn", mode="race"), "showdown")
        self.assertEqual(get_next_duel_phase("showdown", mode="race"), "p1_turn")


if __name__ == "__main__":
    unittest.main()
