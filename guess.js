const MIN = 1;
const MAX = 100;

const statusEl = document.getElementById("guess-status");
const hintEl = document.getElementById("guess-hint");
const attemptsEl = document.getElementById("guess-attempts");
const rangeEl = document.getElementById("guess-range");
const bestEl = document.getElementById("guess-best");
const formEl = document.getElementById("guess-form");
const inputEl = document.getElementById("guess-input");
const restartBtn = document.getElementById("guess-restart");

let answer = 0;
let attempts = 0;
let minBound = MIN;
let maxBound = MAX;
let finished = false;
let bestAttempts = null;

function updateStats() {
  attemptsEl.textContent = String(attempts);
  rangeEl.textContent = `${minBound} ~ ${maxBound}`;
  bestEl.textContent = bestAttempts === null ? "-" : `${bestAttempts}회`;
}

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = type ? `guess-status status-${type}` : "guess-status";
}

function startGame() {
  answer = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
  attempts = 0;
  minBound = MIN;
  maxBound = MAX;
  finished = false;
  hintEl.textContent = "";
  inputEl.value = "";
  inputEl.disabled = false;
  setStatus("숫자를 입력하고 확인을 눌러보세요!");
  updateStats();
  inputEl.focus();
}

function finishGame() {
  finished = true;
  inputEl.disabled = true;

  if (bestAttempts === null || attempts < bestAttempts) {
    bestAttempts = attempts;
  }

  setStatus(`정답! 🎉 ${answer}입니다. ${attempts}번 만에 맞췄어요!`, "win");
  hintEl.textContent = "새 게임으로 다시 도전해 보세요.";
  updateStats();
}

function handleGuess(value) {
  if (finished) return;

  if (!Number.isInteger(value) || value < MIN || value > MAX) {
    setStatus("1부터 100까지의 정수를 입력해 주세요.", "lose");
    return;
  }

  attempts += 1;
  updateStats();

  if (value === answer) {
    finishGame();
    return;
  }

  if (value < answer) {
    minBound = Math.max(minBound, value + 1);
    setStatus(`${value}보다 UP! ⬆️`, "draw");
    hintEl.textContent = `힌트: 정답은 ${value}보다 큽니다.`;
  } else {
    maxBound = Math.min(maxBound, value - 1);
    setStatus(`${value}보다 DOWN! ⬇️`, "draw");
    hintEl.textContent = `힌트: 정답은 ${value}보다 작습니다.`;
  }

  inputEl.value = "";
  inputEl.focus();
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  handleGuess(Number(inputEl.value));
});

restartBtn.addEventListener("click", startGame);

startGame();
