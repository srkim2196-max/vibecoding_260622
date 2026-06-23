const canvas = document.getElementById("bird-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("bird-score");
const leftEl = document.getElementById("bird-left");
const bestEl = document.getElementById("bird-best");
const statusEl = document.getElementById("bird-status");
const restartBtn = document.getElementById("bird-restart");

const GRAVITY = 0.28;
const SLING = { x: 0.14, y: 0.62 };
const MAX_PULL = 100;
const LAUNCH_POWER = 0.22;
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
let phase = "aim";
let settleTimer = 0;
let flyTimer = 0;

function groundY() {
  return height * 0.88;
}

function slingPos() {
  return { x: width * SLING.x, y: height * SLING.y };
}

function createLevel() {
  const baseX = width * 0.48;
  const g = groundY();

  blocks = [
    { x: baseX, y: g, w: 110, h: 22, hp: 2, alive: true },
    { x: baseX + 25, y: g - 70, w: 55, h: 22, hp: 2, alive: true },
    { x: baseX + 85, y: g - 70, w: 55, h: 22, hp: 2, alive: true },
    { x: baseX + 25, y: g - 115, w: 115, h: 22, hp: 2, alive: true },
    { x: baseX + 175, y: g, w: 22, h: 75, hp: 2, alive: true },
    { x: baseX + 140, y: g - 95, w: 90, h: 22, hp: 2, alive: true },
  ];

  pigs = [
    { x: baseX + 55, y: g - 138, r: 18, alive: true },
    { x: baseX + 165, y: g - 125, r: 18, alive: true },
    { x: baseX + 186, y: g - 52, r: 16, alive: true },
  ];
}

function resetBirdOnSling() {
  const s = slingPos();
  bird = { x: s.x, y: s.y, vx: 0, vy: 0, r: BIRD_R, flying: false, alive: true };
  slingPull = { x: s.x, y: s.y };
  dragging = false;
  flyTimer = 0;
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
  height = Math.max(380, Math.min(520, width * 0.58));
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
  block.hp -= force > 5 ? 2 : 1;
  score += 50;
  if (block.hp <= 0) {
    block.alive = false;
    score += 100;
  }
}

function hitPig(pig, force) {
  if (!pig.alive) return;
  if (force > 2.5) {
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
  if (alivePigs() === 0 && phase !== "win") {
    phase = "win";
    bird.flying = false;
    saveScore(true);
    setStatus("클리어! 🎉 모든 돼지를 처리했습니다!", "win");
    return;
  }
  if (birdsLeft <= 0 && phase !== "fly" && phase !== "wait" && phase !== "win") {
    phase = "lose";
    saveScore(false);
    setStatus("아쉽네요… 😅 다시 도전해 보세요!", "lose");
  }
}

function beginWait() {
  bird.flying = false;
  phase = "wait";
  settleTimer = 45;
}

function launchBird() {
  const s = slingPos();
  const dx = s.x - slingPull.x;
  const dy = s.y - slingPull.y;
  bird.vx = dx * LAUNCH_POWER;
  bird.vy = dy * LAUNCH_POWER;
  bird.flying = true;
  birdsLeft -= 1;
  phase = "fly";
  flyTimer = 0;
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
    checkEnd();
  }
}

function updateFlyingBird() {
  bird.vy += GRAVITY;
  bird.x += bird.vx;
  bird.y += bird.vy;
  flyTimer += 1;

  const speed = Math.hypot(bird.vx, bird.vy);
  const g = groundY();

  if (bird.y + bird.r >= g) {
    bird.y = g - bird.r;
    bird.vy *= -0.4;
    bird.vx *= 0.78;
    if (Math.abs(bird.vy) < 1.2 && Math.abs(bird.vx) < 0.8) {
      beginWait();
    }
  }

  if (bird.x > width + 40 || bird.x < -40 || flyTimer > 480) {
    beginWait();
  }

  blocks.forEach((block) => {
    if (!block.alive) return;
    if (circleRectHit(bird.x, bird.y, bird.r, block.x, block.y - block.h, block.w, block.h)) {
      hitBlock(block, speed);
      bird.vx *= -0.45;
      bird.vy *= -0.35;
    }
  });

  pigs.forEach((pig) => {
    if (!pig.alive) return;
    if (circleCircleHit(bird.x, bird.y, bird.r, pig.x, pig.y, pig.r)) {
      hitPig(pig, speed);
      bird.vx *= -0.5;
      bird.vy *= -0.4;
    }
  });

  updateHud();
  checkEnd();
}

function updatePhysics() {
  if (bird?.flying) {
    updateFlyingBird();
  }

  if (phase === "wait") {
    settleTimer -= 1;
    if (settleTimer <= 0) {
      afterBirdSettled();
    }
  }
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
  const g = groundY();
  ctx.strokeStyle = "#5d4037";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(s.x - 18, g);
  ctx.lineTo(s.x, s.y + 10);
  ctx.lineTo(s.x + 18, g);
  ctx.stroke();

  if (phase === "aim" && slingPull) {
    ctx.strokeStyle = "#4a154b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x - 12, s.y);
    ctx.lineTo(slingPull.x, slingPull.y);
    ctx.lineTo(s.x + 12, s.y);
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
  if (bird && (phase === "aim" || phase === "fly" || phase === "wait")) {
    drawBird(bird);
  }
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
  if (dist(p.x, p.y, bird.x, bird.y) < bird.r + 24) {
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
  if (dist(slingPull.x, slingPull.y, s.x, s.y) > 15) {
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
  setStatus("새를 뒤로 당겼다가 놓으면 발사됩니다! (왼쪽·아래로 당기세요)");
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
