// Словарь контрастных пар слов для игры WordBridge
export const CURATED_PAIRS = [
  { start: "Чайник", target: "Чёрная дыра" },
  { start: "Кактус", target: "Балет" },
  { start: "Скрипка", target: "Кирпич" },
  { start: "Пицца", target: "Северный полюс" },
  { start: "Комар", target: "Искусственный интеллект" },
  { start: "Карандаш", target: "Атлантида" },
  { start: "Бабушка", target: "Киберпанк" },
  { start: "Тапочки", target: "Вулкан" },
  { start: "Эспрессо", target: "Глубоководный кракен" },
  { start: "Мыло", target: "Гравитация" },
  { start: "Будильник", target: "Нирвана" },
  { start: "Снежинка", target: "Сталелитейный завод" },
  { start: "Улитка", target: "Сверхзвуковой истребитель" },
  { start: "Зубная щетка", target: "Марсоход" },
  { start: "Одуванчик", target: "Банковский сейф" },
  { start: "Арбуз", target: "Большой адронный коллайдер" },
  { start: "Спичка", target: "Полярное сияние" },
  { start: "Микроволновка", target: "Древний Египет" },
  { start: "Зонтик", target: "Космическая станция" },
  { start: "Подушка", target: "Эверест" }
];

export function getRandomPair(excludePair = null) {
  const available = excludePair
    ? CURATED_PAIRS.filter(p => p.start !== excludePair.start || p.target !== excludePair.target)
    : CURATED_PAIRS;
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}
