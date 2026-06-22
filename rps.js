const CHOICES = {
  rock: { label: "바위", emoji: "✊" },
  paper: { label: "보", emoji: "✋" },
  scissors: { label: "가위", emoji: "✌️" },
};

const CHOICE_IDS = Object.keys(CHOICES);

const playerEmoji = document.getElementById("player-emoji");
const cpuEmoji = document.getElementById("cpu-emoji");
const resultEl = document.getElementById("rps-result");
const winEl = document.getElementById("win-count");
const loseEl = document.getElementById("lose-count");
const drawEl = document.getElementById("draw-count");
const streakEl = document.getElementById("streak-count");
const choiceButtons = [...document.querySelectorAll(".rps-choice")];
const resetBtn = document.getElementById("reset-score");

const RESULT_MESSAGES = {
  win: ["승리! 🎉", "이겼다! 🔥", "완벽한 선택! ⭐"],
  lose: ["아쉽네요 😅", "다음엔 이길 거예요!", "컴퓨터가 이겼어요"],
  draw: ["비겼습니다 🤝", "똑같은 선택!", "무승부!"],
};

let wins = 0;
let losses = 0;
let draws = 0;
let streak = 0;
let playing = false;

function pickRandomChoice() {
  return CHOICE_IDS[Math.floor(Math.random() * CHOICE_IDS.length)];
}

function getOutcome(player, cpu) {
  if (player === cpu) return "draw";
  if (
    (player === "rock" && cpu === "scissors") ||
    (player === "scissors" && cpu === "paper") ||
    (player === "paper" && cpu === "rock")
  ) {
    return "win";
  }
  return "lose";
}

function randomMessage(outcome) {
  const messages = RESULT_MESSAGES[outcome];
  return messages[Math.floor(Math.random() * messages.length)];
}

function updateScoreboard() {
  winEl.textContent = String(wins);
  loseEl.textContent = String(losses);
  drawEl.textContent = String(draws);
  streakEl.textContent = String(streak);
}

function setButtonsDisabled(disabled) {
  choiceButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function animateReveal(playerChoice, cpuChoice, outcome) {
  const shuffleEmojis = ["✊", "✋", "✌️"];
  let step = 0;
  const maxSteps = 8;

  const interval = setInterval(() => {
    playerEmoji.textContent = shuffleEmojis[step % shuffleEmojis.length];
    cpuEmoji.textContent = shuffleEmojis[(step + 1) % shuffleEmojis.length];
    playerEmoji.classList.add("rps-shake");
    cpuEmoji.classList.add("rps-shake");
    step += 1;

    if (step >= maxSteps) {
      clearInterval(interval);
      playerEmoji.classList.remove("rps-shake");
      cpuEmoji.classList.remove("rps-shake");
      playerEmoji.textContent = CHOICES[playerChoice].emoji;
      cpuEmoji.textContent = CHOICES[cpuChoice].emoji;

      const playerLabel = CHOICES[playerChoice].label;
      const cpuLabel = CHOICES[cpuChoice].label;
      resultEl.textContent = `${randomMessage(outcome)} (${playerLabel} vs ${cpuLabel})`;
      resultEl.className = `rps-result result-${outcome}`;

      playing = false;
      setButtonsDisabled(false);
    }
  }, 80);
}

function playRound(playerChoice) {
  if (playing) return;

  playing = true;
  setButtonsDisabled(true);
  resultEl.className = "rps-result";
  resultEl.textContent = "결과 확인 중…";

  const cpuChoice = pickRandomChoice();
  const outcome = getOutcome(playerChoice, cpuChoice);

  if (outcome === "win") {
    wins += 1;
    streak += 1;
  } else if (outcome === "lose") {
    losses += 1;
    streak = 0;
  } else {
    draws += 1;
    streak = 0;
  }

  updateScoreboard();
  animateReveal(playerChoice, cpuChoice, outcome);
}

function resetScore() {
  wins = 0;
  losses = 0;
  draws = 0;
  streak = 0;
  playing = false;
  updateScoreboard();
  setButtonsDisabled(false);
  playerEmoji.textContent = "❔";
  cpuEmoji.textContent = "❔";
  resultEl.className = "rps-result";
  resultEl.textContent = "가위, 바위, 보 중 하나를 선택하세요!";
}

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playRound(button.dataset.choice);
  });
});

resetBtn.addEventListener("click", resetScore);
updateScoreboard();
