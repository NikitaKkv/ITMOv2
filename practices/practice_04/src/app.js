// app.js — Ядро интерактивного построителя моста (Feature 1: Chain Builder)
import { getRandomPair } from "./words.js";
import { playPop, playUndo, playVictory } from "./audio.js";

// Состояние игры (Feature 1)
const state = {
  currentPair: { start: "Чайник", target: "Чёрная дыра" },
  chain: ["Чайник"], // цепочка начинается со стартового слова
  isCompleted: false
};

// DOM Элементы
const elements = {
  startWordDisplay: document.getElementById("start-word-display"),
  targetWordDisplay: document.getElementById("target-word-display"),
  stepCounter: document.getElementById("step-counter"),
  chainContainer: document.getElementById("chain-container"),
  wordForm: document.getElementById("word-form"),
  wordInput: document.getElementById("word-input"),
  errorMessage: document.getElementById("error-message"),
  undoBtn: document.getElementById("undo-btn"),
  resetBtn: document.getElementById("reset-btn"),
  randomPairBtn: document.getElementById("random-pair-btn"),
  completionBanner: document.getElementById("completion-banner"),
  completionSummary: document.getElementById("completion-summary"),
  nextRoundBtn: document.getElementById("next-round-btn"),
  inputSection: document.getElementById("input-section")
};

// Вспомогательные функции валидации (синхронизированы с TDD-тестами)
function normalizeWord(word) {
  return word.trim().toLowerCase();
}

function validateNewWord(word) {
  const cleaned = normalizeWord(word);
  if (!cleaned) {
    return { valid: false, message: "Введите слово-ассоциацию." };
  }

  const existing = state.chain.map(normalizeWord);
  if (existing.includes(cleaned)) {
    return { valid: false, message: "Это слово уже есть в вашей цепочке!" };
  }

  return { valid: true, message: "" };
}

// Рендеринг визуального моста
function renderBridge() {
  const { start, target } = state.currentPair;
  elements.startWordDisplay.textContent = start;
  elements.targetWordDisplay.textContent = target;

  // Очистка контейнера
  elements.chainContainer.innerHTML = "";

  // 1. Стартовая карточка
  const startStep = document.createElement("div");
  startStep.className = "chain-step";
  startStep.innerHTML = `
    <div class="node-card start-node">
      <div class="node-info">
        <span class="tag-status tag-success">СТАРТ</span>
        <span class="node-text">${escapeHtml(start)}</span>
      </div>
      <span class="node-badge">Начальная точка</span>
    </div>
  `;
  elements.chainContainer.appendChild(startStep);

  // 2. Промежуточные шаги
  const intermediateWords = state.chain.slice(1);
  const targetReached = state.isCompleted;

  intermediateWords.forEach((word, index) => {
    // Если это целевое слово и мы завершили мост, отрисуем его особо ниже
    const isTargetWord = normalizeWord(word) === normalizeWord(target);
    if (isTargetWord && targetReached) {
      return;
    }

    const stepNum = index + 1;
    const stepEl = document.createElement("div");
    stepEl.className = "chain-step";
    stepEl.innerHTML = `
      <div class="chain-connector solid"></div>
      <div class="node-card">
        <div class="node-info">
          <span class="node-step-chip">#${stepNum}</span>
          <span class="node-text">${escapeHtml(word)}</span>
        </div>
        <span class="node-badge">мост</span>
      </div>
    `;
    elements.chainContainer.appendChild(stepEl);
  });

  // 3. Целевая карточка (Финиш)
  const targetStep = document.createElement("div");
  targetStep.className = "chain-step";

  if (targetReached) {
    // Мост замкнут
    targetStep.innerHTML = `
      <div class="chain-connector solid"></div>
      <div class="node-card target-node completed">
        <div class="node-info">
          <span class="tag-status tag-primary">ЦЕЛЬ</span>
          <span class="node-text">${escapeHtml(target)}</span>
        </div>
        <span class="tag-status tag-success">Замкнуто! 🏁</span>
      </div>
    `;
  } else {
    // Мост еще строится
    targetStep.innerHTML = `
      <div class="chain-connector"></div>
      <div class="node-card target-node pending">
        <div class="node-info">
          <span class="tag-status tag-neutral">ЦЕЛЬ</span>
          <span class="node-text">${escapeHtml(target)}</span>
        </div>
        <span class="node-badge">ожидает мост...</span>
      </div>
    `;
  }
  elements.chainContainer.appendChild(targetStep);

  // Обновление счетчика шагов
  const stepsCount = Math.max(0, state.chain.length - 1);
  const stepWord = getStepDeclension(stepsCount);
  elements.stepCounter.textContent = `${stepsCount} ${stepWord}`;

  // Управление кнопкой отмены
  elements.undoBtn.disabled = state.chain.length <= 1;

  // Видимость баннера победы и поля ввода
  if (targetReached) {
    elements.completionBanner.classList.remove("hidden");
    elements.completionSummary.textContent = `Вы связали слова за ${stepsCount} ${stepWord}!`;
    elements.inputSection.classList.add("hidden");
  } else {
    elements.completionBanner.classList.add("hidden");
    elements.inputSection.classList.remove("hidden");
  }
}

// Склонение слова "шаг"
function getStepDeclension(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "шагов";
  if (mod10 === 1) return "шаг";
  if (mod10 >= 2 && mod10 <= 4) return "шага";
  return "шагов";
}

// Добавление слова
function handleAddWord(e) {
  e.preventDefault();
  clearError();

  const rawValue = elements.wordInput.value;
  const validation = validateNewWord(rawValue);

  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  const word = rawValue.trim();
  state.chain.push(word);
  elements.wordInput.value = "";

  // Проверка замыкания моста
  const targetClean = normalizeWord(state.currentPair.target);
  const currentClean = normalizeWord(word);

  if (currentClean === targetClean) {
    state.isCompleted = true;
    playVictory();
  } else {
    playPop();
  }

  renderBridge();
  elements.wordInput.focus();
}

// Отмена последнего шага
function handleUndo() {
  if (state.chain.length <= 1) return;

  clearError();
  state.chain.pop();
  state.isCompleted = false;
  playUndo();
  renderBridge();
  elements.wordInput.focus();
}

// Сброс текущей цепочки
function handleReset() {
  clearError();
  state.chain = [state.currentPair.start];
  state.isCompleted = false;
  renderBridge();
  elements.wordInput.focus();
}

// Загрузка новой случайной пары
function handleRandomPair() {
  clearError();
  const newPair = getRandomPair(state.currentPair);
  state.currentPair = newPair;
  state.chain = [newPair.start];
  state.isCompleted = false;
  renderBridge();
  elements.wordInput.focus();
}

// Отображение / очистка ошибок
function showError(msg) {
  elements.errorMessage.textContent = msg;
  elements.errorMessage.classList.remove("hidden");
  elements.wordInput.classList.add("input-error");
}

function clearError() {
  elements.errorMessage.textContent = "";
  elements.errorMessage.classList.add("hidden");
  elements.wordInput.classList.remove("input-error");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Инициализация событий
function setupEventListeners() {
  elements.wordForm.addEventListener("submit", handleAddWord);
  elements.undoBtn.addEventListener("click", handleUndo);
  elements.resetBtn.addEventListener("click", handleReset);
  elements.randomPairBtn.addEventListener("click", handleRandomPair);
  elements.nextRoundBtn.addEventListener("click", handleRandomPair);
}

// Старт приложения
function init() {
  setupEventListeners();
  // Выбираем стартовую случайную пару
  state.currentPair = getRandomPair();
  state.chain = [state.currentPair.start];
  renderBridge();
}

init();
