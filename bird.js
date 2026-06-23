const canvas = document.getElementById("bird-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("bird-score");
const leftEl = document.getElementById("bird-left");
const bestEl = document.getElementById("bird-best");
const statusEl = document.getElementById("bird-status");
const restartBtn = document.getElementById("bird-restart");

const GRAVITY = 0.38;
const GROUND_Y = 0.82;
const SLING = { x: 0.18, y: 0.72 };
const MAX_PULL = 90;
const BIRD_R = 16;
const MAX_BIRDS = 3;

let width = 800;
let height = 460;
let blocks = [];
let pigs = [];
let bird = null;
let slingPull = null;
let dragging = false;
let birdsLeft = MAX_BIRDS;
let score = 0;
let bestScore = 0;
let phase = "aim"; // aim | fly | wait | win | lose
let settleTimer = 0;

function groundY() {
  return height * GROUND_Y;
}

function slingPos() {
  return { x: width * SLING.x, y: groundY() - 20 };
}

function createLevel() {
  const baseX = width * 0.55;
  const g = groundY();

  blocks = [
    { x: baseX, y: g - 40, w: 120, h: 20, hp: 2, alive: true },
    { x: baseX + 30, y: g - 80, w: 60, h: 20, hp: 2, alive: true },
    { x: baseX + 90, y: g - 80, w: 60, h: 20, hp: 2, alive: true },
    { x: baseX + 30, y: g - 120, w: 120, h: 20, hp: 2, alive: true },
    { x: baseX + 200, y: g - 40, w: 20, h: 80, hp: 2, alive: true },
    { x: baseX + 160, y: g - 100, w: 100, h: 20, hp: 2, alive: true },
  ];

  pigs = [
    { x: baseX + 60, y: g - 145, r: 18, alive: true },
    { x: baseX + 180, y: g - 130, r: 18, alive: true },
    { x: baseX + 210, y: g - 55, r: 16, alive: true },
  ];
}

function resetBirdOnSling() {
  const s = slingPos();
  bird = { x: s.x, y: s.y, vx: 0, vy: 0, r: BIRD_R, flying: false, alive: true };
  slingPull = { x: s.x, y: s.y };
  dragging = false;
  phase = birdsLeft > 0 ? "aim" : "lose";
}

function updateHud() {
  scoreEl.textContent = String(score);
  leftEl.textContent = String(birdsLeft);
  bestEl.textContent = String(bestScore);
}

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = type ? `bird-status status-${type}` : "bird-status";
}

function resize() {
  const wrap = canvas.parentElement;
  width = Math.min(820, wrap.clientWidth - 2);
  height = Math.max(360, Math.min(480, width * 0.55));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function clampPull(px, py) {
  const s = slingPos();
  const dx = px - s.x;
  const dy = py - s.y;
  const d = Math.hypot(dx, dy);
  if (d <= MAX_PULL) return { x: px, y: py };
  const ratio = MAX_PULL / d;
  return { x: s.x + dx * ratio, y: s.y + dy * ratio };
}

function circleRectHit(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  return dist(cx, cy, closestX, closestY) < cr;
}

function circleCircleHit(x1, y1, r1, x2, y2, r2) {
  return dist(x1, y1, x2, y2) < r1 + r2;
}

function hitBlock(block, force) {
  if (!block.alive) return;
  block.hp -= force > 8 ? 2 : 1;
  score += 50;
  if (block.hp <= 0) {
    block.alive = false;
    score += 100;
  }
}

function hitPig(pig, force) {
  if (!pig.alive) return;
  if (force > 4) {
    pig.alive = false;
    score += 500;
  }
}

function alivePigs() {
  return pigs.filter((p) => p.alive).length;
}

function saveScore(cleared = false) {
  if (score > bestScore) bestScore = score;
  updateHud();
  if (window.MiniGameStats) {
    MiniGameStats.record("bird", { score, bestScore, cleared });
  }
}

function checkEnd() {
  if (alivePigs() === 0) {
    phase = "win";
    saveScore(true);
    setStatus("클리어! 🎉 모든 돼지를 처리했습니다!", "win");
    return;
  }
  if (birdsLeft <= 0 && phase !== "fly" && phase !== "wait") {
    phase = "lose";
    saveScore(false);
    setStatus("아쉽네요… 😅 다시 도전해 보세요!", "lose");
  }
}

function launchBird() {
  const s = slingPos();
  const dx = s.x - slingPull.x;
  const dy = s.y - slingPull.y;
  const power = 0.12;
  bird.vx = dx * power;
  bird.vy = dy * power;
  bird.flying = true;
  birdsLeft -= 1;
  phase = "fly";
  updateHud();
  setStatus("날아간다! 🐦");
}

function afterBirdSettled() {
  if (alivePigs() === 0) {
    checkEnd();
    return;
  }
  if (birdsLeft > 0) {
    resetBirdOnSling();
    setStatus("다음 새! 드래그해서 발사하세요.");
  } else {
    phase = "lose";
    checkEnd();
  }
}

function updatePhysics() {
  if (!bird?.flying) return;

  bird.vy += GRAVITY;
  bird.x += bird.vx;
  bird.y += bird.vy;

  const speed = Math.hypot(bird.vx, bird.vy);
  const g = groundY();

  if (bird.y + bird.r >= g) {
    bird.y = g - bird.r;
    bird.vy *= -0.35;
    bird.vx *= 0.75;
    if (Math.abs(bird.vy) < 1 && Math.abs(bird.vx) < 0.5) {
      bird.flying = false;
      phase = "wait";
      settleTimer = 40;
    }
  }

  if (bird.x > width + 50 || bird.x < -50) {
    bird.flying = false;
    phase = "wait";
    settleTimer = 20;
  }

  blocks.forEach((block) => {
    if (!block.alive) return;
    if (circleRectHit(bird.x, bird.y, bird.r, block.x, block.y - block.h, block.w, block.h)) {
      hitBlock(block, speed);
      bird.vx *= -0.5;
      bird.vy *= -0.4;
    }
  });

  pigs.forEach((pig) => {
    if (!pig.alive) return;
    if (circleCircleHit(bird.x, bird.y, bird.r, pig.x, pig.y, pig.r)) {
      hitPig(pig, speed);
      bird.vx *= -0.6;
      bird.vy *= -0.5;
    }
  });

  if (phase === "wait") {
    settleTimer -= 1;
    if (settleTimer <= 0) afterBirdSettled();
  }

  updateHud();
  checkEnd();
}

function drawBackground() {
  const g = groundY();
  const sky = ctx.createLinearGradient(0, 0, 0, g);
  sky.addColorStop(0, "#e9f4ff");
  sky.addColorStop(1, "#f4ede4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#8bc34a";
  ctx.fillRect(0, g, width, height - g);
  ctx.fillStyle = "#689f38";
  ctx.fillRect(0, g, width, 8);
}

function drawSlingshot() {
  const s = slingPos();
  ctx.strokeStyle = "#5d4037";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(s.x - 20, groundY());
  ctx.lineTo(s.x, s.y - 30);
  ctx.lineTo(s.x + 20, groundY());
  ctx.stroke();

  if (phase === "aim" && slingPull) {
    ctx.strokeStyle = "#4a154b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x - 15, s.y - 10);
    ctx.lineTo(slingPull.x, slingPull.y);
    ctx.lineTo(s.x + 15, s.y - 10);
    ctx.stroke();
  }
}

function drawBird(b) {
  if (!b?.alive) return;
  ctx.fillStyle = "#e53935";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(b.x + 5, b.y - 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1d1d1d";
  ctx.beginPath();
  ctx.arc(b.x + 7, b.y - 4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fb8c00";
  ctx.beginPath();
  ctx.moveTo(b.x + b.r, b.y);
  ctx.lineTo(b.x + b.r + 10, b.y + 3);
  ctx.lineTo(b.x + b.r, b.y + 6);
  ctx.closePath();
  ctx.fill();
}

function drawBlocks() {
  blocks.forEach((block) => {
    if (!block.alive) return;
    ctx.fillStyle = block.hp > 1 ? "#a1887f" : "#bcaaa4";
    ctx.fillRect(block.x, block.y - block.h, block.w, block.h);
    ctx.strokeStyle = "#6d4c41";
    ctx.lineWidth = 2;
    ctx.strokeRect(block.x, block.y - block.h, block.w, block.h);
  });
}

function drawPigs() {
  pigs.forEach((pig) => {
    if (!pig.alive) return;
    ctx.fillStyle = "#7cb342";
    ctx.beginPath();
    ctx.arc(pig.x, pig.y, pig.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#558b2f";
    ctx.beginPath();
    ctx.ellipse(pig.x, pig.y + 4, pig.r * 0.55, pig.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d1d1d";
    ctx.beginPath();
    ctx.arc(pig.x - 5, pig.y - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(pig.x + 5, pig.y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function draw() {
  drawBackground();
  drawBlocks();
  drawPigs();
  drawSlingshot();
  if (phase === "aim" || bird?.flying) drawBird(bird);
}

function loop() {
  updatePhysics();
  draw();
  requestAnimationFrame(loop);
}

function pointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: ((clientX - rect.left) / rect.width) * width,
    y: ((clientY - rect.top) / rect.height) * height,
  };
}

function onDown(event) {
  if (phase !== "aim" || !bird) return;
  const p = pointerPos(event);
  if (dist(p.x, p.y, bird.x, bird.y) < bird.r + 20) {
    dragging = true;
    event.preventDefault();
  }
}

function onMove(event) {
  if (!dragging || phase !== "aim") return;
  const p = pointerPos(event);
  slingPull = clampPull(p.x, p.y);
  bird.x = slingPull.x;
  bird.y = slingPull.y;
  event.preventDefault();
}

function onUp() {
  if (!dragging || phase !== "aim") return;
  dragging = false;
  const s = slingPos();
  if (dist(slingPull.x, slingPull.y, s.x, s.y) > 12) {
    launchBird();
  } else {
    bird.x = s.x;
    bird.y = s.y;
    slingPull = { x: s.x, y: s.y };
  }
}

function startGame() {
  score = 0;
  birdsLeft = MAX_BIRDS;
  phase = "aim";
  createLevel();
  resetBirdOnSling();
  updateHud();
  setStatus("새를 드래그해 당긴 뒤, 놓으면 발사됩니다!");
}

canvas.addEventListener("mousedown", onDown);
canvas.addEventListener("mousemove", onMove);
window.addEventListener("mouseup", onUp);
canvas.addEventListener("touchstart", onDown, { passive: false });
canvas.addEventListener("touchmove", onMove, { passive: false });
canvas.addEventListener("touchend", onUp);
restartBtn.addEventListener("click", startGame);
window.addEventListener("resize", () => {
  resize();
  createLevel();
  if (phase === "aim") resetBirdOnSling();
});

if (window.MiniGameStats) {
  const saved = MiniGameStats.getGameStats("bird");
  if (saved?.bestScore) bestScore = saved.bestScore;
}

resize();
startGame();
loop();
