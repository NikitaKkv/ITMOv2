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


if __name__ == "__main__":
    unittest.main()
