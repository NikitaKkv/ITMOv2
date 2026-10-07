// app.js — Ядро WordBridge (Фича A: Chain Builder & Фича B: Hot-seat Duel & Showdown)
import { getRandomPair } from "./words.js";
import {
  playPop,
  playUndo,
  playVictory,
  playApprove,
  playDispute,
  playPassTurn
} from "./audio.js";

// Состояние приложения
const state = {
  mode: "solo", // "solo" | "duel"
  solo: {
    currentPair: { start: "Чайник", target: "Чёрная дыра" },
    chain: ["Чайник"],
    isCompleted: false
  },
  duel: {
    submode: "race", // "race" | "challenge"
    phase: "p1_turn", // race: "p1_turn" | "pass_turn" | "p2_turn" | "showdown"
                      // challenge: "challenge_setup_p1" | "pass_turn" | "p2_turn" | "challenge_setup_p2" | "pass_turn" | "p1_turn" | "showdown"
    racePair: { start: "Чайник", target: "Чёрная дыра" },
    p1Pair: { start: "Чайник", target: "Чёрная дыра" },
    p2Pair: { start: "Чайник", target: "Чёрная дыра" },
    activePlayer: 1,
    chain: ["Чайник"],
    p1Chain: [],
    p2Chain: [],
    p1Disputed: false,
    p2Disputed: false,
    passTurnMessage: ""
  }
};

// DOM Элементы
const elements = {
  // Навигация и режимы
  modeSoloTab: document.getElementById("mode-solo-tab"),
  modeDuelTab: document.getElementById("mode-duel-tab"),
  randomPairBtn: document.getElementById("random-pair-btn"),

  // Панель дуэли
  duelBar: document.getElementById("duel-bar"),
  duelSubmodeRace: document.getElementById("duel-submode-race"),
  duelSubmodeChallenge: document.getElementById("duel-submode-challenge"),
  duelTurnText: document.getElementById("duel-turn-text"),
  duelRoundChip: document.getElementById("duel-round-chip"),

  // Карточка загадывания пары (Вызов)
  challengeSetupCard: document.getElementById("challenge-setup-card"),
  challengeSetupTitle: document.getElementById("challenge-setup-title"),
  challengePairForm: document.getElementById("challenge-pair-form"),
  customStartInput: document.getElementById("custom-start-input"),
  customTargetInput: document.getElementById("custom-target-input"),
  challengeRandomBtn: document.getElementById("challenge-random-btn"),
  challengeErrorMessage: document.getElementById("challenge-error-message"),

  // Экран передачи хода ("Не подглядывай!")
  passTurnCard: document.getElementById("pass-turn-card"),
  passTurnMessage: document.getElementById("pass-turn-message"),
  passTurnConfirmBtn: document.getElementById("pass-turn-confirm-btn"),

  // Финальный экран Showdown
  showdownCard: document.getElementById("showdown-card"),
  showdownVerdictBanner: document.getElementById("showdown-verdict-banner"),
  showdownVerdictIcon: document.getElementById("showdown-verdict-icon"),
  showdownVerdictTitle: document.getElementById("showdown-verdict-title"),
  showdownVerdictDesc: document.getElementById("showdown-verdict-desc"),
  showdownP1StepsChip: document.getElementById("showdown-p1-steps-chip"),
  showdownP2StepsChip: document.getElementById("showdown-p2-steps-chip"),
  showdownP1StatusTag: document.getElementById("showdown-p1-status-tag"),
  showdownP2StatusTag: document.getElementById("showdown-p2-status-tag"),
  showdownP1ChainFlow: document.getElementById("showdown-p1-chain-flow"),
  showdownP2ChainFlow: document.getElementById("showdown-p2-chain-flow"),
  p1ApproveBtn: document.getElementById("p1-approve-btn"),
  p1DisputeBtn: document.getElementById("p1-dispute-btn"),
  p2ApproveBtn: document.getElementById("p2-approve-btn"),
  p2DisputeBtn: document.getElementById("p2-dispute-btn"),
  showdownRematchBtn: document.getElementById("showdown-rematch-btn"),
  showdownSoloBtn: document.getElementById("showdown-solo-btn"),

  // Рабочая область построителя моста (Chain Workspace)
  gameWorkspace: document.getElementById("game-workspace"),
  startWordDisplay: document.getElementById("start-word-display"),
  targetWordDisplay: document.getElementById("target-word-display"),
  stepCounter: document.getElementById("step-counter"),
  chainContainer: document.getElementById("chain-container"),
  undoBtn: document.getElementById("undo-btn"),
  resetBtn: document.getElementById("reset-btn"),
  completionBanner: document.getElementById("completion-banner"),
  completionSummary: document.getElementById("completion-summary"),
  nextRoundBtn: document.getElementById("next-round-btn"),
  inputSection: document.getElementById("input-section"),
  wordForm: document.getElementById("word-form"),
  wordInput: document.getElementById("word-input"),
  errorMessage: document.getElementById("error-message"),

  // Подсказка правил
  rulesHintCard: document.getElementById("rules-hint-card"),
  rulesHintTitle: document.getElementById("rules-hint-title"),
  rulesHintBody: document.getElementById("rules-hint-body")
};

// ============================================================================
// Чистые функции валидации и логики (синхронизированы с tests/test_logic.py)
// ============================================================================

function normalizeWord(word) {
  return word.trim().toLowerCase();
}

function canAddStep(chain, newWord) {
  const cleaned = normalizeWord(newWord);
  if (!cleaned) {
    return { valid: false, message: "Слово не может быть пустым." };
  }
  const existing = chain.map(normalizeWord);
  if (existing.includes(cleaned)) {
    return { valid: false, message: "Это слово уже есть в вашей цепочке!" };
  }
  return { valid: true, message: "" };
}

function isBridgeComplete(chain, targetWord) {
  if (!chain || chain.length === 0) return false;
  return normalizeWord(chain[chain.length - 1]) === normalizeWord(targetWord);
}

function getBridgeLength(chain) {
  if (!chain || chain.length <= 1) return 0;
  return chain.length - 1;
}

function determineWinner(player1Steps, player2Steps) {
  if (player1Steps < player2Steps) return "player1";
  if (player2Steps < player1Steps) return "player2";
  return "draw";
}

function determineDuelResult(p1Steps, p2Steps, p1Disputed, p2Disputed) {
  if (p1Disputed && p2Disputed) {
    return {
      winner: "disputed_draw",
      reason: "Оба моста были оспорены соперниками! Ничья по взаимным претензиям."
    };
  }
  if (p1Disputed && !p2Disputed) {
    return {
      winner: "player2",
      reason: "Мост Игрока 1 был успешно оспорен соперником! Победа присуждена Игроку 2."
    };
  }
  if (p2Disputed && !p1Disputed) {
    return {
      winner: "player1",
      reason: "Мост Игрока 2 был успешно оспорен соперником! Победа присуждена Игроку 1."
    };
  }

  const baseWinner = determineWinner(p1Steps, p2Steps);
  if (baseWinner === "player1") {
    return {
      winner: "player1",
      reason: `Игрок 1 построил более короткий мост (${p1Steps} против ${p2Steps} шагов)!`
    };
  } else if (baseWinner === "player2") {
    return {
      winner: "player2",
      reason: `Игрок 2 построил более короткий мост (${p2Steps} против ${p1Steps} шагов)!`
    };
  }
  return {
    winner: "draw",
    reason: `Боевая ничья! Оба игрока связали слова ровно за ${p1Steps} ${getStepDeclension(p1Steps)}.`
  };
}

function validateCustomPair(startWord, targetWord) {
  const startClean = normalizeWord(startWord);
  const targetClean = normalizeWord(targetWord);
  if (!startClean) {
    return { valid: false, message: "Стартовое слово не может быть пустым." };
  }
  if (!targetClean) {
    return { valid: false, message: "Целевое слово не может быть пустым." };
  }
  if (startClean === targetClean) {
    return { valid: false, message: "Стартовое и целевое слова должны быть разными!" };
  }
  return { valid: true, message: "" };
}

function getStepDeclension(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "шагов";
  if (mod10 === 1) return "шаг";
  if (mod10 >= 2 && mod10 <= 4) return "шага";
  return "шагов";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================================
// Управление режимами (Solo vs Duel)
// ============================================================================

function switchMode(newMode) {
  if (state.mode === newMode) return;
  state.mode = newMode;

  clearError();

  if (newMode === "solo") {
    elements.modeSoloTab.classList.add("active");
    elements.modeSoloTab.setAttribute("aria-selected", "true");
    elements.modeDuelTab.classList.remove("active");
    elements.modeDuelTab.setAttribute("aria-selected", "false");
    elements.randomPairBtn.classList.remove("hidden");
  } else {
    elements.modeSoloTab.classList.remove("active");
    elements.modeSoloTab.setAttribute("aria-selected", "false");
    elements.modeDuelTab.classList.add("active");
    elements.modeDuelTab.setAttribute("aria-selected", "true");
    elements.randomPairBtn.classList.add("hidden");
    resetDuelState();
  }

  renderApp();
}

function switchDuelSubmode(newSubmode) {
  if (state.duel.submode === newSubmode) return;
  state.duel.submode = newSubmode;

  if (newSubmode === "race") {
    elements.duelSubmodeRace.classList.add("active");
    elements.duelSubmodeChallenge.classList.remove("active");
  } else {
    elements.duelSubmodeRace.classList.remove("active");
    elements.duelSubmodeChallenge.classList.add("active");
  }

  resetDuelState();
  renderApp();
}

function resetDuelState() {
  const newPair = getRandomPair();
  state.duel.racePair = newPair;
  state.duel.p1Pair = { ...newPair };
  state.duel.p2Pair = { ...newPair };
  state.duel.p1Chain = [];
  state.duel.p2Chain = [];
  state.duel.p1Disputed = false;
  state.duel.p2Disputed = false;

  if (state.duel.submode === "race") {
    state.duel.phase = "p1_turn";
    state.duel.activePlayer = 1;
    state.duel.chain = [newPair.start];
  } else {
    state.duel.phase = "challenge_setup_p1";
    state.duel.activePlayer = 1;
    state.duel.chain = [];
  }
}

// ============================================================================
// Главный роутинг экранов (renderApp)
// ============================================================================

function renderApp() {
  clearError();

  if (state.mode === "solo") {
    // В одиночном режиме показываем рабочую область и скрываем дуэльные элементы
    elements.duelBar.classList.add("hidden");
    elements.challengeSetupCard.classList.add("hidden");
    elements.passTurnCard.classList.add("hidden");
    elements.showdownCard.classList.add("hidden");
    elements.gameWorkspace.classList.remove("hidden");

    renderSoloWorkspace();
    renderRulesHint("solo");
    return;
  }

  // Дуэльный режим
  elements.duelBar.classList.remove("hidden");
  renderDuelBar();

  const phase = state.duel.phase;

  if (phase === "challenge_setup_p1" || phase === "challenge_setup_p2") {
    elements.gameWorkspace.classList.add("hidden");
    elements.passTurnCard.classList.add("hidden");
    elements.showdownCard.classList.add("hidden");
    elements.challengeSetupCard.classList.remove("hidden");

    renderChallengeSetupCard();
    renderRulesHint("challenge_setup");
  } else if (phase === "pass_turn") {
    elements.gameWorkspace.classList.add("hidden");
    elements.challengeSetupCard.classList.add("hidden");
    elements.showdownCard.classList.add("hidden");
    elements.passTurnCard.classList.remove("hidden");

    renderPassTurnCard();
    renderRulesHint("pass_turn");
  } else if (phase === "showdown") {
    elements.gameWorkspace.classList.add("hidden");
    elements.challengeSetupCard.classList.add("hidden");
    elements.passTurnCard.classList.add("hidden");
    elements.showdownCard.classList.remove("hidden");

    renderShowdownCard();
    renderRulesHint("showdown");
  } else {
    // Активный ход игрока: "p1_turn" или "p2_turn"
    elements.challengeSetupCard.classList.add("hidden");
    elements.passTurnCard.classList.add("hidden");
    elements.showdownCard.classList.add("hidden");
    elements.gameWorkspace.classList.remove("hidden");

    renderDuelWorkspace();
    renderRulesHint("duel_turn");
  }
}

// ============================================================================
// Рендеринг компонентов интерфейса
// ============================================================================

function renderSoloWorkspace() {
  const { start, target } = state.solo.currentPair;
  elements.startWordDisplay.textContent = start;
  elements.targetWordDisplay.textContent = target;

  renderChainNodes(state.solo.chain, target, state.solo.isCompleted);

  const stepsCount = getBridgeLength(state.solo.chain);
  const stepWord = getStepDeclension(stepsCount);
  elements.stepCounter.textContent = `${stepsCount} ${stepWord}`;
  elements.undoBtn.disabled = state.solo.chain.length <= 1;

  if (state.solo.isCompleted) {
    elements.completionBanner.classList.remove("hidden");
    elements.completionSummary.textContent = `Вы связали слова за ${stepsCount} ${stepWord}!`;
    elements.inputSection.classList.add("hidden");
  } else {
    elements.completionBanner.classList.add("hidden");
    elements.inputSection.classList.remove("hidden");
  }
}

function renderDuelWorkspace() {
  const currentPair = getActiveDuelPair();
  elements.startWordDisplay.textContent = currentPair.start;
  elements.targetWordDisplay.textContent = currentPair.target;

  // В дуэли баннер победы соло скрыт — сразу переходим на следующий экран
  elements.completionBanner.classList.add("hidden");
  elements.inputSection.classList.remove("hidden");

  renderChainNodes(state.duel.chain, currentPair.target, false);

  const stepsCount = getBridgeLength(state.duel.chain);
  const stepWord = getStepDeclension(stepsCount);
  elements.stepCounter.textContent = `${stepsCount} ${stepWord}`;
  elements.undoBtn.disabled = state.duel.chain.length <= 1;
}

function getActiveDuelPair() {
  if (state.duel.submode === "race") {
    return state.duel.racePair;
  }
  return state.duel.activePlayer === 1 ? state.duel.p1Pair : state.duel.p2Pair;
}

function renderChainNodes(chain, target, targetReached) {
  elements.chainContainer.innerHTML = "";
  if (!chain || chain.length === 0) return;

  const startWord = chain[0];

  // Стартовая карточка
  const startStep = document.createElement("div");
  startStep.className = "chain-step";
  startStep.innerHTML = `
    <div class="node-card start-node">
      <div class="node-info">
        <span class="tag-status tag-success">СТАРТ</span>
        <span class="node-text">${escapeHtml(startWord)}</span>
      </div>
      <span class="node-badge">Начальная точка</span>
    </div>
  `;
  elements.chainContainer.appendChild(startStep);

  // Промежуточные шаги
  const intermediateWords = chain.slice(1);
  intermediateWords.forEach((word, index) => {
    const isTargetWord = normalizeWord(word) === normalizeWord(target);
    if (isTargetWord && targetReached) return;

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

  // Целевая карточка (Финиш)
  const targetStep = document.createElement("div");
  targetStep.className = "chain-step";

  if (targetReached) {
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
}

function renderDuelBar() {
  const isP1 = state.duel.activePlayer === 1;
  const playerName = isP1 ? "Игрок 1" : "Игрок 2";

  if (state.duel.phase === "showdown") {
    elements.duelTurnText.textContent = "Showdown: Сравнение";
    elements.duelRoundChip.textContent = "Финал";
  } else if (state.duel.phase === "pass_turn") {
    elements.duelTurnText.textContent = "Передача хода";
    elements.duelRoundChip.textContent = "Пауза";
  } else {
    elements.duelTurnText.textContent = `Ход: ${playerName}`;
    const roundText = state.duel.submode === "race"
      ? (isP1 ? "Раунд 1/2" : "Раунд 2/2")
      : (isP1 ? "Очередь P1" : "Очередь P2");
    elements.duelRoundChip.textContent = roundText;
  }
}

function renderChallengeSetupCard() {
  const isP1 = state.duel.phase === "challenge_setup_p1";
  if (isP1) {
    elements.challengeSetupTitle.textContent = "Игрок 1: загадай пару для Игрока 2";
  } else {
    elements.challengeSetupTitle.textContent = "Игрок 2: загадай пару для Игрока 1";
  }
  elements.customStartInput.value = "";
  elements.customTargetInput.value = "";
  elements.challengeErrorMessage.classList.add("hidden");
  elements.customStartInput.focus();
}

function renderPassTurnCard() {
  elements.passTurnMessage.textContent = state.duel.passTurnMessage || "Передайте устройство следующему игроку!";
}

function renderShowdownCard() {
  const p1Steps = getBridgeLength(state.duel.p1Chain);
  const p2Steps = getBridgeLength(state.duel.p2Chain);

  elements.showdownP1StepsChip.textContent = `${p1Steps} ${getStepDeclension(p1Steps)}`;
  elements.showdownP2StepsChip.textContent = `${p2Steps} ${getStepDeclension(p2Steps)}`;

  // Рендеринг цепочек в колонках
  renderShowdownChainFlow(elements.showdownP1ChainFlow, state.duel.p1Chain);
  renderShowdownChainFlow(elements.showdownP2ChainFlow, state.duel.p2Chain);

  // Статусы судейства
  updateJudgingBadge(elements.showdownP1StatusTag, state.duel.p1Disputed);
  updateJudgingBadge(elements.showdownP2StatusTag, state.duel.p2Disputed);

  // Кнопки судейства
  elements.p1ApproveBtn.className = `btn btn-secondary btn-sm btn-approve ${!state.duel.p1Disputed ? "active-approved" : ""}`;
  elements.p1DisputeBtn.className = `btn btn-secondary btn-sm btn-dispute ${state.duel.p1Disputed ? "active-disputed" : ""}`;

  elements.p2ApproveBtn.className = `btn btn-secondary btn-sm btn-approve ${!state.duel.p2Disputed ? "active-approved" : ""}`;
  elements.p2DisputeBtn.className = `btn btn-secondary btn-sm btn-dispute ${state.duel.p2Disputed ? "active-disputed" : ""}`;

  // Итоговый расчет результата
  const result = determineDuelResult(
    p1Steps,
    p2Steps,
    state.duel.p1Disputed,
    state.duel.p2Disputed
  );

  elements.showdownVerdictTitle.textContent = getVerdictTitle(result.winner);
  elements.showdownVerdictDesc.textContent = result.reason;

  if (result.winner === "disputed_draw" || (state.duel.p1Disputed || state.duel.p2Disputed)) {
    elements.showdownVerdictBanner.classList.add("banner-disputed");
    elements.showdownVerdictIcon.textContent = "🤨";
  } else if (result.winner === "draw") {
    elements.showdownVerdictBanner.classList.remove("banner-disputed");
    elements.showdownVerdictIcon.textContent = "🤝";
  } else {
    elements.showdownVerdictBanner.classList.remove("banner-disputed");
    elements.showdownVerdictIcon.textContent = "🏆";
  }
}

function getVerdictTitle(winner) {
  if (winner === "player1") return "Победитель: Игрок 1! 🏆";
  if (winner === "player2") return "Победитель: Игрок 2! 🏆";
  if (winner === "disputed_draw") return "Ничья по взаимным спорам! 🤨";
  return "Боевая ничья! 🤝";
}

function updateJudgingBadge(tagElement, isDisputed) {
  if (isDisputed) {
    tagElement.className = "verdict-status-tag status-disputed";
    tagElement.textContent = "Связь оспорена 🤨";
  } else {
    tagElement.className = "verdict-status-tag status-approved";
    tagElement.textContent = "Мост одобрен 👍";
  }
}

function renderShowdownChainFlow(container, chain) {
  container.innerHTML = "";
  if (!chain || chain.length === 0) return;

  chain.forEach((word, index) => {
    const isStart = index === 0;
    const isTarget = index === chain.length - 1;

    const nodeItem = document.createElement("div");
    let modifier = "";
    let roleText = `шаг #${index}`;
    if (isStart) {
      modifier = "node-start";
      roleText = "старт";
    } else if (isTarget) {
      modifier = "node-target";
      roleText = "финиш";
    }

    nodeItem.className = `showdown-node-item ${modifier}`;
    nodeItem.innerHTML = `
      <span class="node-text">${escapeHtml(word)}</span>
      <span class="node-badge">${roleText}</span>
    `;

    if (index > 0) {
      const arrow = document.createElement("div");
      arrow.className = "showdown-node-arrow";
      arrow.textContent = "↓";
      container.appendChild(arrow);
    }
    container.appendChild(nodeItem);
  });
}

function renderRulesHint(context) {
  if (context === "solo") {
    elements.rulesHintTitle.textContent = "Как работает построитель ассоциаций:";
    elements.rulesHintBody.textContent = "Каждое новое слово должно логически или образно связываться с предыдущим. Твоя цель — дойти до целевого слова за наименьшее число промежуточных мостиков!";
  } else if (context === "duel_turn") {
    elements.rulesHintTitle.textContent = "Правила дуэли:";
    elements.rulesHintBody.textContent = "Построй мост как можно короче. После того как ты введешь целевое слово, ход перейдет сопернику, а твои слова останутся в секрете!";
  } else if (context === "pass_turn") {
    elements.rulesHintTitle.textContent = "Передача устройства:";
    elements.rulesHintBody.textContent = "Не подглядывай за ходами соперника. Нажми кнопку только тогда, когда устройство уже в руках следующего игрока.";
  } else if (context === "challenge_setup") {
    elements.rulesHintTitle.textContent = "Режим вызова:";
    elements.rulesHintBody.textContent = "Загадай максимально контрастную пару слов, чтобы сопернику пришлось поломать голову над переходом.";
  } else if (context === "showdown") {
    elements.rulesHintTitle.textContent = "Судейство в Showdown:";
    elements.rulesHintBody.textContent = "Внимательно изучите цепочки друг друга. Если связь между соседними словами кажется притянутой за уши или нечестной, нажми «Оспорить связь 🤨».";
  }
}

// ============================================================================
// Обработчики событий (Event Handlers)
// ============================================================================

function handleWordSubmit(e) {
  e.preventDefault();
  clearError();

  const rawValue = elements.wordInput.value;
  const currentChain = state.mode === "solo" ? state.solo.chain : state.duel.chain;

  const validation = canAddStep(currentChain, rawValue);
  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  const word = rawValue.trim();
  elements.wordInput.value = "";

  if (state.mode === "solo") {
    handleSoloStep(word);
  } else {
    handleDuelStep(word);
  }
}

function handleSoloStep(word) {
  state.solo.chain.push(word);
  const targetClean = normalizeWord(state.solo.currentPair.target);
  const currentClean = normalizeWord(word);

  if (currentClean === targetClean) {
    state.solo.isCompleted = true;
    playVictory();
  } else {
    playPop();
  }

  renderApp();
  elements.wordInput.focus();
}

function handleDuelStep(word) {
  state.duel.chain.push(word);
  const currentPair = getActiveDuelPair();
  const targetClean = normalizeWord(currentPair.target);
  const currentClean = normalizeWord(word);

  if (currentClean === targetClean) {
    playVictory();
    completeDuelTurn();
  } else {
    playPop();
    renderApp();
    elements.wordInput.focus();
  }
}

function completeDuelTurn() {
  if (state.duel.submode === "race") {
    if (state.duel.phase === "p1_turn") {
      state.duel.p1Chain = [...state.duel.chain];
      state.duel.phase = "pass_turn";
      state.duel.passTurnMessage = `Игрок 1 завершил свой мост за ${getBridgeLength(state.duel.p1Chain)} ${getStepDeclension(getBridgeLength(state.duel.p1Chain))}. Передайте управление Игроку 2!`;
    } else if (state.duel.phase === "p2_turn") {
      state.duel.p2Chain = [...state.duel.chain];
      state.duel.phase = "showdown";
    }
  } else if (state.duel.submode === "challenge") {
    if (state.duel.phase === "p2_turn") {
      state.duel.p2Chain = [...state.duel.chain];
      state.duel.phase = "challenge_setup_p2";
    } else if (state.duel.phase === "p1_turn") {
      state.duel.p1Chain = [...state.duel.chain];
      state.duel.phase = "showdown";
    }
  }

  renderApp();
}

function handlePassTurnConfirm() {
  playPassTurn();

  if (state.duel.submode === "race") {
    state.duel.phase = "p2_turn";
    state.duel.activePlayer = 2;
    state.duel.chain = [state.duel.racePair.start];
  } else if (state.duel.submode === "challenge") {
    // В режиме вызова переход после загадки
    if (state.duel.activePlayer === 2) {
      state.duel.phase = "p2_turn";
      state.duel.chain = [state.duel.p2Pair.start];
    } else {
      state.duel.phase = "p1_turn";
      state.duel.chain = [state.duel.p1Pair.start];
    }
  }

  renderApp();
  setTimeout(() => {
    if (elements.wordInput) {
      elements.wordInput.focus();
    }
  }, 50);
}

function handleChallengeFormSubmit(e) {
  e.preventDefault();
  const startVal = elements.customStartInput.value;
  const targetVal = elements.customTargetInput.value;

  const validation = validateCustomPair(startVal, targetVal);
  if (!validation.valid) {
    elements.challengeErrorMessage.textContent = validation.message;
    elements.challengeErrorMessage.classList.remove("hidden");
    return;
  }

  elements.challengeErrorMessage.classList.add("hidden");
  const isP1 = state.duel.phase === "challenge_setup_p1";

  if (isP1) {
    state.duel.p2Pair = { start: startVal.trim(), target: targetVal.trim() };
    state.duel.activePlayer = 2;
    state.duel.phase = "pass_turn";
    state.duel.passTurnMessage = `Игрок 1 загадал пару для Игрока 2: «${startVal.trim()}» ➔ «${targetVal.trim()}». Передайте управление Игроку 2!`;
  } else {
    state.duel.p1Pair = { start: startVal.trim(), target: targetVal.trim() };
    state.duel.activePlayer = 1;
    state.duel.phase = "pass_turn";
    state.duel.passTurnMessage = `Игрок 2 загадал пару для Игрока 1: «${startVal.trim()}» ➔ «${targetVal.trim()}». Передайте управление Игроку 1!`;
  }

  renderApp();
}

function handleChallengeRandomIdea() {
  const pair = getRandomPair();
  elements.customStartInput.value = pair.start;
  elements.customTargetInput.value = pair.target;
  elements.challengeErrorMessage.classList.add("hidden");
}

function handleUndoClick() {
  clearError();
  if (state.mode === "solo") {
    if (state.solo.chain.length <= 1) return;
    state.solo.chain.pop();
    state.solo.isCompleted = false;
  } else {
    if (state.duel.chain.length <= 1) return;
    state.duel.chain.pop();
  }

  playUndo();
  renderApp();
  elements.wordInput.focus();
}

function handleResetClick() {
  clearError();
  if (state.mode === "solo") {
    state.solo.chain = [state.solo.currentPair.start];
    state.solo.isCompleted = false;
  } else {
    const pair = getActiveDuelPair();
    state.duel.chain = [pair.start];
  }

  renderApp();
  elements.wordInput.focus();
}

function handleRandomPairClick() {
  clearError();
  const newPair = getRandomPair(state.solo.currentPair);
  state.solo.currentPair = newPair;
  state.solo.chain = [newPair.start];
  state.solo.isCompleted = false;
  renderApp();
  elements.wordInput.focus();
}

function handleJudgeP1(dispute) {
  state.duel.p1Disputed = dispute;
  if (dispute) {
    playDispute();
  } else {
    playApprove();
  }
  renderShowdownCard();
}

function handleJudgeP2(dispute) {
  state.duel.p2Disputed = dispute;
  if (dispute) {
    playDispute();
  } else {
    playApprove();
  }
  renderShowdownCard();
}

function handleShowdownRematch() {
  playPassTurn();
  resetDuelState();
  renderApp();
}

function handleShowdownToSolo() {
  switchMode("solo");
}

function showError(msg) {
  elements.errorMessage.textContent = msg;
  elements.errorMessage.classList.remove("hidden");
  elements.wordInput.classList.add("input-error");
}

function clearError() {
  if (elements.errorMessage) {
    elements.errorMessage.textContent = "";
    elements.errorMessage.classList.add("hidden");
  }
  if (elements.wordInput) {
    elements.wordInput.classList.remove("input-error");
  }
}

// ============================================================================
// Инициализация событий и запуск
// ============================================================================

function setupEventListeners() {
  // Переключение режимов
  elements.modeSoloTab.addEventListener("click", () => switchMode("solo"));
  elements.modeDuelTab.addEventListener("click", () => switchMode("duel"));

  // Подрежимы дуэли
  elements.duelSubmodeRace.addEventListener("click", () => switchDuelSubmode("race"));
  elements.duelSubmodeChallenge.addEventListener("click", () => switchDuelSubmode("challenge"));

  // Ввод слов и элементы управления цепью
  elements.wordForm.addEventListener("submit", handleWordSubmit);
  elements.undoBtn.addEventListener("click", handleUndoClick);
  elements.resetBtn.addEventListener("click", handleResetClick);
  elements.randomPairBtn.addEventListener("click", handleRandomPairClick);
  elements.nextRoundBtn.addEventListener("click", handleRandomPairClick);

  // Передача хода и вызов
  elements.passTurnConfirmBtn.addEventListener("click", handlePassTurnConfirm);
  elements.challengePairForm.addEventListener("submit", handleChallengeFormSubmit);
  elements.challengeRandomBtn.addEventListener("click", handleChallengeRandomIdea);

  // Судейство в Showdown
  elements.p1ApproveBtn.addEventListener("click", () => handleJudgeP1(false));
  elements.p1DisputeBtn.addEventListener("click", () => handleJudgeP1(true));
  elements.p2ApproveBtn.addEventListener("click", () => handleJudgeP2(false));
  elements.p2DisputeBtn.addEventListener("click", () => handleJudgeP2(true));

  // Финальные действия в Showdown
  elements.showdownRematchBtn.addEventListener("click", handleShowdownRematch);
  elements.showdownSoloBtn.addEventListener("click", handleShowdownToSolo);
}

function init() {
  setupEventListeners();

  // Инициализируем стартовую пару
  const startPair = getRandomPair();
  state.solo.currentPair = startPair;
  state.solo.chain = [startPair.start];

  state.duel.racePair = startPair;
  state.duel.p1Pair = { ...startPair };
  state.duel.p2Pair = { ...startPair };
  state.duel.chain = [startPair.start];

  renderApp();
}

init();
