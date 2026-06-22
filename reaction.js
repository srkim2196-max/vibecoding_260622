const pad = document.getElementById("reaction-pad");
const titleEl = document.getElementById("reaction-title");
const subEl = document.getElementById("reaction-sub");
const bestEl = document.getElementById("best-time");
const avgEl = document.getElementById("avg-time");
const countEl = document.getElementById("attempt-count");

const STATES = {
  IDLE: "idle",
  WAITING: "waiting",
  READY: "ready",
  RESULT: "result",
  EARLY: "early",
};

const MIN_DELAY = 1500;
const MAX_DELAY = 4500;
const RECENT_LIMIT = 5;

let state = STATES.IDLE;
let timeoutId = null;
let readyAt = 0;
let bestTime = null;
let recentTimes = [];
let attemptCount = 0;

function randomDelay() {
  return MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
}

function formatMs(ms) {
  return `${Math.round(ms)} ms`;
}

function getRating(ms) {
  if (ms < 200) return "번개처럼 빠릅니다! ⚡";
  if (ms < 250) return "아주 훌륭해요! 🔥";
  if (ms < 300) return "좋은 반응속도예요 👍";
  if (ms < 400) return "평균 이상이에요 🙂";
  return "다음엔 더 빨라질 거예요 💪";
}

function updateStats() {
  bestEl.textContent = bestTime === null ? "-" : formatMs(bestTime);

  if (recentTimes.length === 0) {
    avgEl.textContent = "-";
  } else {
    const avg = recentTimes.reduce((sum, value) => sum + value, 0) / recentTimes.length;
    avgEl.textContent = formatMs(avg);
  }

  countEl.textContent = String(attemptCount);
}

function setState(nextState) {
  state = nextState;
  pad.className = `reaction-pad state-${nextState}`;
}

function clearTimer() {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

function startWaiting() {
  clearTimer();
  setState(STATES.WAITING);
  titleEl.textContent = "기다리세요…";
  subEl.textContent = "초록색이 될 때까지 클릭하지 마세요";

  timeoutId = setTimeout(() => {
    readyAt = performance.now();
    setState(STATES.READY);
    titleEl.textContent = "지금 클릭!";
    subEl.textContent = "최대한 빠르게 누르세요";
    timeoutId = null;
  }, randomDelay());
}

function showResult(ms) {
  attemptCount += 1;
  recentTimes.push(ms);
  if (recentTimes.length > RECENT_LIMIT) {
    recentTimes.shift();
  }
  if (bestTime === null || ms < bestTime) {
    bestTime = ms;
  }
  if (window.MiniGameStats) {
    MiniGameStats.record("reaction", { lastMs: ms, bestMs: bestTime, attempts: attemptCount });
  }
  updateStats();

  setState(STATES.RESULT);
  titleEl.textContent = formatMs(ms);
  subEl.textContent = `${getRating(ms)} · 다시 하려면 클릭`;
}

function showEarly() {
  clearTimer();
  setState(STATES.EARLY);
  titleEl.textContent = "너무 빨랐어요!";
  subEl.textContent = "초록색이 된 뒤에 클릭해야 합니다 · 다시 시도";
}

function handleClick() {
  if (state === STATES.IDLE || state === STATES.RESULT) {
    startWaiting();
    return;
  }

  if (state === STATES.WAITING) {
    showEarly();
    return;
  }

  if (state === STATES.READY) {
    showResult(performance.now() - readyAt);
    return;
  }

  if (state === STATES.EARLY) {
    startWaiting();
  }
}

pad.addEventListener("click", handleClick);

if (window.MiniGameStats) {
  const saved = MiniGameStats.getGameStats("reaction");
  if (saved) {
    bestTime = saved.bestMs;
    attemptCount = saved.attempts || 0;
  }
}

updateStats();
