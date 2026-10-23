// export_service.js — Модуль экспорта истории и результатов WordBridge
// Чистая архитектура: независимый сервис без прямых обращений к DOM-дереву игры

/**
 * Создает валидную запись завершенного одиночного раунда
 */
export function createSoloRoundRecord(startWord, targetWord, chain, completedAt = null) {
  if (!chain || chain.length < 2) {
    throw new Error("Цепочка должна содержать минимум 2 слова (старт и финиш).");
  }
  if (chain[0] !== startWord) {
    throw new Error("Первое слово цепочки должно совпадать со стартовым словом.");
  }
  if (chain[chain.length - 1] !== targetWord) {
    throw new Error("Последнее слово цепочки должно совпадать с целевым словом.");
  }

  const timestamp = completedAt || new Date().toISOString();
  return {
    id: `round-solo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    mode: "solo",
    submode: null,
    completedAt: timestamp,
    data: {
      startWord,
      targetWord,
      chain: [...chain],
      steps: chain.length - 1
    }
  };
}

/**
 * Создает валидную запись завершенного раунда дуэли
 */
export function createDuelRoundRecord(submode, p1Data, p2Data, outcome, completedAt = null) {
  if (submode !== "race" && submode !== "challenge") {
    throw new Error(`Недопустимый подрежим дуэли: ${submode}`);
  }

  for (const [key, player] of [["player1", p1Data], ["player2", p2Data]]) {
    const chain = player?.chain || [];
    const pair = player?.pair || {};
    if (chain.length < 2) {
      throw new Error(`${key}: Цепочка должна содержать минимум 2 слова.`);
    }
    if (chain[0] !== pair.start) {
      throw new Error(`${key}: Старт цепочки не совпадает со стартовым словом пары.`);
    }
    if (chain[chain.length - 1] !== pair.target) {
      throw new Error(`${key}: Финиш цепочки не совпадает с целевым словом пары.`);
    }
  }

  const timestamp = completedAt || new Date().toISOString();
  return {
    id: `round-duel-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    mode: "duel",
    submode,
    completedAt: timestamp,
    data: {
      submode,
      player1: {
        pair: { ...p1Data.pair },
        chain: [...p1Data.chain],
        steps: p1Data.chain.length - 1,
        isDisputed: Boolean(p1Data.isDisputed)
      },
      player2: {
        pair: { ...p2Data.pair },
        chain: [...p2Data.chain],
        steps: p2Data.chain.length - 1,
        isDisputed: Boolean(p2Data.isDisputed)
      },
      outcome: {
        winner: outcome.winner,
        reason: outcome.reason
      }
    }
  };
}

/**
 * Валидирует инварианты структуры записи раунда
 */
export function validateRoundRecord(record) {
  const errors = [];
  if (!record || typeof record !== "object") {
    return { valid: false, errors: ["Запись должна быть объектом."] };
  }

  for (const field of ["id", "mode", "completedAt", "data"]) {
    if (record[field] === undefined || record[field] === null) {
      errors.append ? errors.append(`Отсутствует поле: ${field}`) : errors.push(`Отсутствует поле: ${field}`);
    }
  }

  if (record.mode !== "solo" && record.mode !== "duel") {
    errors.push(`Недопустимый режим: ${record.mode}`);
  }

  const data = record.data || {};
  if (record.mode === "solo") {
    if (!Array.isArray(data.chain) || data.chain.length < 2) {
      errors.push("Соло-раунд должен содержать массив chain длиной >= 2");
    }
    if (data.steps !== (data.chain ? data.chain.length - 1 : 0)) {
      errors.push("Количество шагов не соответствует длине цепочки");
    }
  } else if (record.mode === "duel") {
    if (!data.player1 || !data.player2) {
      errors.push("Дуэль должна содержать объекты player1 и player2");
    }
    if (!data.outcome || !data.outcome.winner) {
      errors.push("Дуэль должна содержать итог outcome.winner");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Вычисляет агрегированную сводку сессии
 */
export function calculateSessionSummary(rounds = []) {
  const totalRounds = rounds.length;
  if (totalRounds === 0) {
    return {
      totalRounds: 0,
      soloRoundsCount: 0,
      duelRoundsCount: 0,
      averageSteps: 0.0,
      duelStats: {
        player1Wins: 0,
        player2Wins: 0,
        draws: 0,
        disputedDraws: 0
      }
    };
  }

  let soloCount = 0;
  let duelCount = 0;
  let p1Wins = 0;
  let p2Wins = 0;
  let draws = 0;
  let disputedDraws = 0;
  const allSteps = [];

  for (const r of rounds) {
    const mode = r.mode;
    const data = r.data || {};
    if (mode === "solo") {
      soloCount++;
      if (typeof data.steps === "number") {
        allSteps.push(data.steps);
      }
    } else if (mode === "duel") {
      duelCount++;
      const p1Steps = data.player1?.steps;
      const p2Steps = data.player2?.steps;
      if (typeof p1Steps === "number") allSteps.push(p1Steps);
      if (typeof p2Steps === "number") allSteps.push(p2Steps);

      const winner = data.outcome?.winner;
      if (winner === "player1") p1Wins++;
      else if (winner === "player2") p2Wins++;
      else if (winner === "draw") draws++;
      else if (winner === "disputed_draw") disputedDraws++;
    }
  }

  const avgSteps = allSteps.length > 0
    ? Math.round((allSteps.reduce((sum, s) => sum + s, 0) / allSteps.length) * 10) / 10
    : 0.0;

  return {
    totalRounds,
    soloRoundsCount: soloCount,
    duelRoundsCount: duelCount,
    averageSteps: avgSteps,
    duelStats: {
      player1Wins: p1Wins,
      player2Wins: p2Wins,
      draws: draws,
      disputedDraws: disputedDraws
    }
  };
}

/**
 * Формирует полный документ истории сессии (Envelope)
 */
export function buildSessionHistoryEnvelope(history = [], exportedAt = null) {
  const timestamp = exportedAt || new Date().toISOString();
  const summary = calculateSessionSummary(history);
  return {
    schemaVersion: "1.0.0",
    appName: "WordBridge",
    exportedAt: timestamp,
    summary,
    rounds: history.map(r => JSON.parse(JSON.stringify(r)))
  };
}

/**
 * Извлекает данные текущего завершённого матча из состояния игры WordBridge
 */
export function buildCurrentMatchSummary(state) {
  const now = new Date().toISOString();
  if (state.mode === "solo") {
    const pair = state.solo.currentPair;
    const chain = [...state.solo.chain];
    return {
      schemaVersion: "1.0.0",
      mode: "solo",
      submode: null,
      completedAt: now,
      pair: { ...pair },
      solo: {
        chain,
        steps: chain.length > 1 ? chain.length - 1 : 0
      }
    };
  }

  // Duel mode
  const duel = state.duel;
  const submode = duel.submode;
  const p1Pair = submode === "challenge" ? duel.p1Pair : duel.racePair;
  const p2Pair = submode === "challenge" ? duel.p2Pair : duel.racePair;
  const p1Chain = [...duel.p1Chain];
  const p2Chain = [...duel.p2Chain];
  const p1Steps = p1Chain.length > 1 ? p1Chain.length - 1 : 0;
  const p2Steps = p2Chain.length > 1 ? p2Chain.length - 1 : 0;

  let winner = "draw";
  let winnerName = "Ничья";
  let reason = "Равное количество шагов";

  if (duel.p1Disputed && duel.p2Disputed) {
    winner = "disputed_draw";
    winnerName = "Ничья (взаимное оспаривание)";
    reason = "Оба моста были оспорены соперниками";
  } else if (duel.p1Disputed && !duel.p2Disputed) {
    winner = "player2";
    winnerName = "Игрок 2";
    reason = "Мост Игрока 1 был оспорен соперником";
  } else if (duel.p2Disputed && !duel.p1Disputed) {
    winner = "player1";
    winnerName = "Игрок 1";
    reason = "Мост Игрока 2 был оспорен соперником";
  } else if (p1Steps < p2Steps) {
    winner = "player1";
    winnerName = "Игрок 1";
    reason = `Мост Игрока 1 короче (${p1Steps} против ${p2Steps} шагов)`;
  } else if (p2Steps < p1Steps) {
    winner = "player2";
    winnerName = "Игрок 2";
    reason = `Мост Игрока 2 короче (${p2Steps} против ${p1Steps} шагов)`;
  }

  return {
    schemaVersion: "1.0.0",
    mode: "duel",
    submode,
    completedAt: now,
    pair: submode === "race" ? { ...duel.racePair } : { start: "Разные пары", target: "Разные пары" },
    duel: {
      player1: {
        name: "Игрок 1",
        pair: { ...p1Pair },
        chain: p1Chain,
        steps: p1Steps,
        isDisputed: Boolean(duel.p1Disputed)
      },
      player2: {
        name: "Игрок 2",
        pair: { ...p2Pair },
        chain: p2Chain,
        steps: p2Steps,
        isDisputed: Boolean(duel.p2Disputed)
      },
      outcome: {
        winner,
        winnerName,
        reason
      }
    }
  };
}

/**
 * Генерирует форматированный текст для отправки в мессенджеры
 */
export function formatShareableText(summary) {
  const dateStr = summary.completedAt ? summary.completedAt.replace("T", " ").slice(0, 16) : "";
  if (summary.mode === "solo") {
    const chainStr = (summary.solo?.chain || []).join(" ➔ ");
    return [
      "🌉 WordBridge | Соло-мост",
      `🎯 Пара: ${summary.pair?.start} ➔ ${summary.pair?.target}`,
      "",
      `✨ Мост (${summary.solo?.steps} шагов): ${chainStr}`,
      `📅 ${dateStr}`
    ].join("\n");
  }

  // Duel mode
  const isRace = summary.submode === "race";
  const p1 = summary.duel?.player1;
  const p2 = summary.duel?.player2;
  const outcome = summary.duel?.outcome;

  const lines = [
    `🌉 WordBridge | Дуэль: ${isRace ? "Гонка" : "Вызов"}`
  ];

  if (isRace) {
    lines.push(`🎯 Пара: ${summary.pair?.start} ➔ ${summary.pair?.target}`);
  }
  lines.push("");

  const p1WinnerMark = outcome?.winner === "player1" ? " 🏆" : "";
  const p2WinnerMark = outcome?.winner === "player2" ? " 🏆" : "";

  lines.push(`👤 Игрок 1 (${p1?.steps} шагов): ${p1?.chain?.join(" ➔ ")}${p1WinnerMark}`);
  lines.push(`👤 Игрок 2 (${p2?.steps} шагов): ${p2?.chain?.join(" ➔ ")}${p2WinnerMark}`);
  lines.push("");
  lines.push(`🏆 Итог: ${outcome?.winnerName || "Итог"} (${outcome?.reason || ""})`);
  lines.push(`📅 ${dateStr}`);

  return lines.join("\n");
}

/**
 * Сериализует объект в форматированную строку JSON
 */
export function formatJsonString(data, pretty = true) {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

/**
 * Безопасно копирует строку в буфер обмена устройства
 */
export async function copyTextToClipboard(text) {
  if (typeof text !== "string") {
    text = formatJsonString(text);
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { success: true, message: "Скопировано в буфер обмена!" };
    }
    // Fallback: execCommand
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (successful) {
      return { success: true, message: "Скопировано в буфер обмена!" };
    }
    return { success: false, error: "CLIPBOARD_DENIED" };
  } catch (err) {
    return { success: false, error: err?.name || "CLIPBOARD_ERROR" };
  }
}

/**
 * Инициирует загрузку файла на устройство пользователя
 */
export function triggerFileDownload(content, filename, mimeType = "application/json;charset=utf-8") {
  const text = typeof content === "string" ? content : formatJsonString(content);
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
