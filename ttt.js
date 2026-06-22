const boardEl = document.getElementById("ttt-board");
const statusEl = document.getElementById("ttt-status");
const winsEl = document.getElementById("ttt-wins");
const lossesEl = document.getElementById("ttt-losses");
const drawsEl = document.getElementById("ttt-draws");
const restartBtn = document.getElementById("ttt-restart");
const resetScoreBtn = document.getElementById("ttt-reset-score");

const PLAYER = "X";
const CPU = "O";
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

let board = Array(9).fill("");
let gameOver = false;
let wins = 0;
let losses = 0;
let draws = 0;

function getWinner(cells) {
  for (const [a, b, c] of LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) {
      return cells[a];
    }
  }
  return cells.includes("") ? null : "draw";
}

function minimax(cells, isMaximizing) {
  const winner = getWinner(cells);
  if (winner === CPU) return 10;
  if (winner === PLAYER) return -10;
  if (winner === "draw") return 0;

  if (isMaximizing) {
    let best = -Infinity;
    cells.forEach((cell, index) => {
      if (cell) return;
      cells[index] = CPU;
      best = Math.max(best, minimax(cells, false));
      cells[index] = "";
    });
    return best;
  }

  let best = Infinity;
  cells.forEach((cell, index) => {
    if (cell) return;
    cells[index] = PLAYER;
    best = Math.min(best, minimax(cells, true));
    cells[index] = "";
  });
  return best;
}

function getCpuMove() {
  let bestScore = -Infinity;
  let move = 0;

  board.forEach((cell, index) => {
    if (cell) return;
    board[index] = CPU;
    const score = minimax(board, false);
    board[index] = "";
    if (score > bestScore) {
      bestScore = score;
      move = index;
    }
  });

  return move;
}

function updateScoreboard() {
  winsEl.textContent = String(wins);
  lossesEl.textContent = String(losses);
  drawsEl.textContent = String(draws);
}

function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((cell, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ttt-cell";
    button.dataset.index = String(index);
    button.textContent = cell;
    button.disabled = gameOver || Boolean(cell);
    button.setAttribute("aria-label", `칸 ${index + 1}${cell ? `, ${cell}` : ""}`);
    boardEl.appendChild(button);
  });
}

function finishRound(winner) {
  gameOver = true;
  if (winner === PLAYER) {
    wins += 1;
    statusEl.textContent = "승리! 🎉 완벽한 한 수였어요.";
    statusEl.className = "ttt-status status-win";
  } else if (winner === CPU) {
    losses += 1;
    statusEl.textContent = "패배… 😅 다시 도전해 보세요!";
    statusEl.className = "ttt-status status-lose";
  } else {
    draws += 1;
    statusEl.textContent = "무승부! 🤝 팽팽한 대결이었어요.";
    statusEl.className = "ttt-status status-draw";
  }
  updateScoreboard();
  if (window.MiniGameStats) {
    MiniGameStats.record("ttt", { wins, losses, draws });
  }
  renderBoard();
}

function handlePlayerMove(index) {
  if (gameOver || board[index]) return;

  board[index] = PLAYER;
  const winner = getWinner(board);
  if (winner) {
    renderBoard();
    finishRound(winner);
    return;
  }

  gameOver = true;
  statusEl.textContent = "컴퓨터 생각 중…";
  statusEl.className = "ttt-status";
  renderBoard();

  window.setTimeout(() => {
    const cpuIndex = getCpuMove();
    board[cpuIndex] = CPU;
    const cpuWinner = getWinner(board);
    if (cpuWinner) {
      finishRound(cpuWinner);
      return;
    }
    gameOver = false;
    statusEl.textContent = "당신 차례입니다. X를 놓으세요!";
    statusEl.className = "ttt-status";
    renderBoard();
  }, 350);
}

function resetRound() {
  board = Array(9).fill("");
  gameOver = false;
  statusEl.textContent = "당신은 X · 컴퓨터는 O · 먼저 두세요!";
  statusEl.className = "ttt-status";
  renderBoard();
}

function resetScore() {
  wins = 0;
  losses = 0;
  draws = 0;
  updateScoreboard();
  resetRound();
  if (window.MiniGameStats) {
    MiniGameStats.record("ttt", { wins: 0, losses: 0, draws: 0 });
  }
}

boardEl.addEventListener("click", (event) => {
  const cell = event.target.closest(".ttt-cell");
  if (!cell) return;
  handlePlayerMove(Number(cell.dataset.index));
});

restartBtn.addEventListener("click", resetRound);
resetScoreBtn.addEventListener("click", resetScore);

if (window.MiniGameStats) {
  const saved = MiniGameStats.getGameStats("ttt");
  if (saved) {
    wins = saved.wins || 0;
    losses = saved.losses || 0;
    draws = saved.draws || 0;
  }
}

updateScoreboard();
resetRound();
