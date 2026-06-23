const canvas = document.getElementById("bird-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("bird-score");
const leftEl = document.getElementById("bird-left");
const bestEl = document.getElementById("bird-best");
const statusEl = document.getElementById("bird-status");
const restartBtn = document.getElementById("bird-restart");

const GRAVITY = 0.28;
const BLOCK_GRAVITY = 0.32;
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
let blockIdCounter = 0;

function groundY() {
  return height * 0.88;
}

function slingPos() {
  return { x: width * SLING.x, y: height * SLING.y };
}

function makeBlock(x, y, w, h, hp = 2) {
  return {
    id: blockIdCounter++,
    x,
    y,
    w,
    h,
    hp,
    maxHp: hp,
    vx: 0,
    vy: 0,
    angle: 0,
    va: 0,
    dynamic: false,
    debris: false,
    alive: true,
  };
}

function createLevel() {
  const baseX = width * 0.48;
  const g = groundY();
  blockIdCounter = 0;

  blocks = [
    makeBlock(baseX, g, 110, 22, 2),
    makeBlock(baseX + 25, g - 70, 55, 22, 2),
    makeBlock(baseX + 85, g - 70, 55, 22, 2),
    makeBlock(baseX + 25, g - 115, 115, 22, 2),
    makeBlock(baseX + 175, g, 22, 75, 2),
    makeBlock(baseX + 140, g - 95, 90, 22, 2),
  ];

  pigs = [
    { x: baseX + 55, y: g - 138, r: 18, vx: 0, vy: 0, alive: true },
    { x: baseX + 165, y: g - 125, r: 18, vx: 0, vy: 0, alive: true },
    { x: baseX + 186, y: g - 52, r: 16, vx: 0, vy: 0, alive: true },
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

function circleRectResolve(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const d = Math.hypot(dx, dy);
  if (d >= cr) return null;
  const nx = d > 0.001 ? dx / d : 1;
  const ny = d > 0.001 ? dy / d : 0;
  return { nx, ny, overlap: cr - d };
}

function circleCircleHit(x1, y1, r1, x2, y2, r2) {
  return dist(x1, y1, x2, y2) < r1 + r2;
}

function blockCenter(block) {
  return { x: block.x + block.w / 2, y: block.y - block.h / 2 };
}

function isBlockSupported(block) {
  const g = groundY();
  if (Math.abs(block.y - g) < 5) return true;

  for (const other of blocks) {
    if (!other.alive || other.id === block.id) continue;
    const gap = block.y - other.y;
    if (gap < 0 || gap > 10) continue;
    const overlap = Math.min(block.x + block.w, other.x + other.w) - Math.max(block.x, other.x);
    if (overlap > Math.min(block.w, other.w) * 0.3) {
      if (!other.dynamic || (Math.abs(other.vy) < 1.5 && Math.abs(other.vx) < 1.5)) {
        return true;
      }
    }
  }
  return false;
}

function breakBlock(block) {
  if (!block.alive) return;

  if (block.debris || block.w < 26 || block.h < 14) {
    block.alive = false;
    return;
  }

  block.alive = false;
  score += 100;

  const pieces = [];
  if (block.w >= block.h * 1.4) {
    const half = block.w / 2;
    pieces.push(
      { x: block.x, y: block.y, w: half, h: block.h },
      { x: block.x + half, y: block.y, w: half, h: block.h },
    );
  } else {
    const half = block.h / 2;
    pieces.push(
      { x: block.x, y: block.y, w: block.w, h: half },
      { x: block.x, y: block.y - half, w: block.w, h: half },
    );
  }

  pieces.forEach((piece, i) => {
    const debris = makeBlock(piece.x, piece.y, piece.w, piece.h, 1);
    debris.debris = true;
    debris.dynamic = true;
    debris.vx = block.vx + (i === 0 ? -2.5 : 2.5) + (Math.random() - 0.5) * 2;
    debris.vy = block.vy - 1.5 - Math.random();
    debris.va = (Math.random() - 0.5) * 0.18;
    blocks.push(debris);
  });
}

function hitBlock(block, force) {
  if (!block.alive) return;
  block.hp -= force > 5 ? 1.2 : 0.7;
  score += 50;
  if (block.hp <= 0) {
    breakBlock(block);
  }
}

function hitPig(pig, force) {
  if (!pig.alive) return;
  if (force > 2.5) {
    pig.alive = false;
    score += 500;
  }
}

function applyBirdBlockCollision(block, speed) {
  const rectY = block.y - block.h;
  const hit = circleRectResolve(bird.x, bird.y, bird.r, block.x, rectY, block.w, block.h);
  if (!hit) return;

  bird.x += hit.nx * hit.overlap;
  bird.y += hit.ny * hit.overlap;

  block.dynamic = true;
  block.vx += bird.vx * 0.22 + hit.nx * speed * 0.08;
  block.vy += bird.vy * 0.18 + hit.ny * speed * 0.06 - speed * 0.04;
  block.va += (Math.random() - 0.5) * 0.06;

  const intoSurface = bird.vx * hit.nx + bird.vy * hit.ny;
  if (intoSurface > 0) {
    bird.vx -= hit.nx * intoSurface * 0.55;
    bird.vy -= hit.ny * intoSurface * 0.55;
  }

  const forward = Math.max(speed * 0.72, 3);
  if (bird.vx > 0) {
    bird.vx = Math.max(bird.vx, forward * 0.85);
  } else {
    bird.vx = Math.abs(bird.vx) * 0.25 + forward * 0.5;
  }
  bird.vy *= 0.72;

  hitBlock(block, speed);
}

function resolveBlockPair(a, b) {
  const ax2 = a.x + a.w;
  const ay1 = a.y - a.h;
  const bx2 = b.x + b.w;
  const by1 = b.y - b.h;
  const ox = Math.min(ax2, bx2) - Math.max(a.x, b.x);
  const oy = Math.min(a.y, b.y) - Math.max(ay1, by1);
  if (ox <= 0 || oy <= 0) return;

  if (!a.dynamic && !b.dynamic) return;

  if (ox < oy) {
    const shift = ox / 2 + 0.5;
    if (a.x < b.x) {
      if (a.dynamic) a.x -= shift;
      if (b.dynamic) b.x += shift;
    } else {
      if (a.dynamic) a.x += shift;
      if (b.dynamic) b.x -= shift;
    }
    if (a.dynamic) a.vx *= -0.25;
    if (b.dynamic) b.vx *= -0.25;
    if (a.dynamic && !b.dynamic) {
      b.dynamic = true;
      b.vx += a.vx * 0.15;
    }
    if (b.dynamic && !a.dynamic) {
      a.dynamic = true;
      a.vx += b.vx * 0.15;
    }
  } else {
    const shift = oy / 2 + 0.5;
    if (ay1 < by1) {
      if (a.dynamic) a.y -= shift;
      if (b.dynamic) b.y += shift;
    } else {
      if (a.dynamic) a.y += shift;
      if (b.dynamic) b.y -= shift;
    }
    if (a.dynamic) a.vy *= -0.2;
    if (b.dynamic) b.vy *= -0.2;
  }
}

function updateBlocks() {
  const g = groundY();

  blocks.forEach((block) => {
    if (!block.alive || block.dynamic) return;
    if (!isBlockSupported(block)) {
      block.dynamic = true;
      block.vy += 0.4;
    }
  });

  blocks.forEach((block) => {
    if (!block.alive || !block.dynamic) return;

    block.vy += BLOCK_GRAVITY;
    block.x += block.vx;
    block.y += block.vy;
    block.angle += block.va;
    block.va *= 0.985;

    if (block.y >= g) {
      block.y = g;
      if (block.vy > 1) block.va += block.vx * 0.008;
      block.vy *= -0.22;
      block.vx *= 0.78;
      block.va *= 0.65;
      if (Math.abs(block.vy) < 0.9) block.vy = 0;
      if (Math.abs(block.vx) < 0.35 && Math.abs(block.va) < 0.015) {
        block.vx = 0;
        block.va = 0;
        block.angle *= 0.85;
        if (Math.abs(block.angle) < 0.05) {
          block.angle = 0;
          block.dynamic = false;
        }
      }
    }

    if (block.x + block.w < -60 || block.x > width + 60 || block.y > g + 120) {
      block.alive = false;
    }
  });

  const alive = blocks.filter((b) => b.alive);
  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      resolveBlockPair(alive[i], alive[j]);
    }
  }

  alive.forEach((block) => {
    const speed = Math.hypot(block.vx, block.vy);
    pigs.forEach((pig) => {
      if (!pig.alive) return;
      if (circleRectHit(pig.x, pig.y, pig.r, block.x, block.y - block.h, block.w, block.h)) {
        pig.vx += block.vx * 0.3;
        pig.vy += block.vy * 0.3 - 1;
        hitPig(pig, Math.max(speed, 3));
      }
    });
  });
}

function updatePigs() {
  const g = groundY();
  pigs.forEach((pig) => {
    if (!pig.alive) return;
    pig.vy += BLOCK_GRAVITY * 0.6;
    pig.x += pig.vx;
    pig.y += pig.vy;
    pig.vx *= 0.96;

    if (pig.y + pig.r >= g) {
      pig.y = g - pig.r;
      pig.vy *= -0.3;
      pig.vx *= 0.7;
      if (Math.abs(pig.vy) < 0.8) pig.vy = 0;
    }
  });
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
  settleTimer = 60;
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
    bird.vy *= -0.35;
    bird.vx *= 0.82;
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
      applyBirdBlockCollision(block, speed);
    }
  });

  pigs.forEach((pig) => {
    if (!pig.alive) return;
    if (circleCircleHit(bird.x, bird.y, bird.r, pig.x, pig.y, pig.r)) {
      const nx = (bird.x - pig.x) / Math.max(dist(bird.x, bird.y, pig.x, pig.y), 0.001);
      const ny = (bird.y - pig.y) / Math.max(dist(bird.x, bird.y, pig.x, pig.y), 0.001);
      pig.vx += bird.vx * 0.25 + nx * 2;
      pig.vy += bird.vy * 0.2 + ny * 2;
      hitPig(pig, speed);
      bird.vx = Math.max(bird.vx * 0.88, 2.5);
      bird.vy *= 0.75;
    }
  });

  updateHud();
  checkEnd();
}

function blocksSettled() {
  return blocks.every(
    (b) => !b.alive || !b.dynamic || (Math.abs(b.vx) < 0.5 && Math.abs(b.vy) < 0.5),
  );
}

function updatePhysics() {
  updateBlocks();
  updatePigs();

  if (bird?.flying) {
    updateFlyingBird();
  }

  if (phase === "wait") {
    settleTimer -= 1;
    if (settleTimer <= 0 && blocksSettled()) {
      afterBirdSettled();
    } else if (settleTimer <= 0) {
      settleTimer = 15;
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

function drawBlock(block) {
  const cx = block.x + block.w / 2;
  const cy = block.y - block.h / 2;
  const hpRatio = block.hp / block.maxHp;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(block.angle);

  ctx.fillStyle = block.debris
    ? "#bcaaa4"
    : hpRatio > 0.5
      ? "#a1887f"
      : "#8d6e63";
  ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);

  ctx.strokeStyle = "#6d4c41";
  ctx.lineWidth = 2;
  ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

  if (!block.debris && hpRatio < 1) {
    ctx.strokeStyle = "rgba(45, 24, 16, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-block.w * 0.2, -block.h * 0.3);
    ctx.lineTo(block.w * 0.15, block.h * 0.25);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBlocks() {
  blocks.forEach((block) => {
    if (!block.alive) return;
    drawBlock(block);
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
