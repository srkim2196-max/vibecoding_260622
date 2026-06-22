const ICONS = ["🍎", "🍋", "🍇", "🍒", "🌸", "⭐", "🎵", "🎲"];

const boardEl = document.getElementById("memory-board");
const statusEl = document.getElementById("memory-status");
const movesEl = document.getElementById("memory-moves");
const pairsEl = document.getElementById("memory-pairs");
const bestEl = document.getElementById("memory-best");
const restartBtn = document.getElementById("memory-restart");

let cards = [];
let flipped = [];
let matched = new Set();
let moves = 0;
let locked = false;
let bestMoves = null;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createDeck() {
  return shuffle([...ICONS, ...ICONS]).map((icon, index) => ({
    id: index,
    icon,
  }));
}

function updateStats() {
  movesEl.textContent = String(moves);
  pairsEl.textContent = `${matched.size / 2} / ${ICONS.length}`;
  bestEl.textContent = bestMoves === null ? "-" : `${bestMoves}회`;
}

function renderBoard() {
  boardEl.innerHTML = "";
  cards.forEach((card) => {
    const button = document.createElement("button");
    const isFlipped = flipped.includes(card.id) || matched.has(card.id);
    button.type = "button";
    button.className = "memory-card";
    if (isFlipped) button.classList.add("is-flipped");
    if (matched.has(card.id)) button.classList.add("is-matched");
    button.dataset.id = String(card.id);
    button.disabled = locked || matched.has(card.id);
    button.innerHTML = `
      <span class="memory-card-inner">
        <span class="memory-card-front">?</span>
        <span class="memory-card-back">${card.icon}</span>
      </span>
    `;
    boardEl.appendChild(button);
  });
}

function checkWin() {
  if (matched.size !== cards.length) return;

  statusEl.textContent = `완료! 🎉 ${moves}번 만에 모두 맞췄어요!`;
  statusEl.className = "memory-status status-win";

  if (bestMoves === null || moves < bestMoves) {
    bestMoves = moves;
  }
  updateStats();
}

function resetMismatch() {
  flipped = [];
  locked = false;
  statusEl.textContent = "카드를 눌러 같은 그림을 찾아보세요.";
  statusEl.className = "memory-status";
  renderBoard();
}

function handleFlip(cardId) {
  if (locked || flipped.includes(cardId) || matched.has(cardId)) return;

  flipped.push(cardId);
  renderBoard();

  if (flipped.length < 2) {
    statusEl.textContent = "두 번째 카드를 골라보세요.";
    return;
  }

  locked = true;
  moves += 1;
  updateStats();

  const first = cards.find((card) => card.id === flipped[0]);
  const second = cards.find((card) => card.id === flipped[1]);

  if (first.icon === second.icon) {
    matched.add(first.id);
    matched.add(second.id);
    flipped = [];
    locked = false;
    statusEl.textContent = "짝을 맞췄어요! 👏";
    statusEl.className = "memory-status status-win";
    renderBoard();
    checkWin();
    return;
  }

  statusEl.textContent = "아쉽네요… 다시 기억해 보세요.";
  statusEl.className = "memory-status status-lose";
  window.setTimeout(resetMismatch, 700);
}

function startGame() {
  cards = createDeck();
  flipped = [];
  matched = new Set();
  moves = 0;
  locked = false;
  statusEl.textContent = "카드를 눌러 같은 그림을 찾아보세요.";
  statusEl.className = "memory-status";
  updateStats();
  renderBoard();
}

boardEl.addEventListener("click", (event) => {
  const card = event.target.closest(".memory-card");
  if (!card) return;
  handleFlip(Number(card.dataset.id));
});

restartBtn.addEventListener("click", startGame);
startGame();
