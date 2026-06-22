const DEFAULT_PARTICIPANTS = ["철수", "영희", "민수", "지연"];
const DEFAULT_RESULTS = ["당첨 🎉", "꽝", "당첨 🎉", "꽝"];

const MIN_COUNT = 2;
const MAX_COUNT = 12;
const RUNG_DENSITY = 0.35;

const participantsList = document.getElementById("participants-list");
const resultsList = document.getElementById("results-list");
const generateBtn = document.getElementById("generate-btn");
const resetBtn = document.getElementById("reset-btn");
const gameArea = document.getElementById("game-area");
const canvas = document.getElementById("ladder-canvas");
const ctx = canvas.getContext("2d");
const resultBanner = document.getElementById("result-banner");

let ladder = null;
let animating = false;

function createInputRow(value = "", placeholder = "") {
  const row = document.createElement("div");
  row.className = "input-row";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = placeholder;
  input.maxLength = 20;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-remove";
  removeBtn.textContent = "×";
  removeBtn.title = "삭제";
  removeBtn.addEventListener("click", () => {
    const list = row.parentElement;
    if (list.children.length <= MIN_COUNT) return;
    row.remove();
  });

  row.appendChild(input);
  row.appendChild(removeBtn);
  return row;
}

function fillList(container, values, placeholderPrefix) {
  container.innerHTML = "";
  values.forEach((value, index) => {
    container.appendChild(createInputRow(value, `${placeholderPrefix} ${index + 1}`));
  });
}

function readList(container) {
  return [...container.querySelectorAll("input")]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function addRow(container, placeholderPrefix) {
  if (container.children.length >= MAX_COUNT) return;
  const index = container.children.length + 1;
  container.appendChild(createInputRow("", `${placeholderPrefix} ${index}`));
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateRungs(columnCount, rowCount) {
  const rungs = Array.from({ length: columnCount - 1 }, () =>
    Array.from({ length: rowCount }, () => false)
  );

  for (let row = 0; row < rowCount; row += 1) {
    let col = 0;
    while (col < columnCount - 1) {
      if (Math.random() < RUNG_DENSITY) {
        rungs[col][row] = true;
        col += 2;
      } else {
        col += 1;
      }
    }
  }

  return rungs;
}

function tracePath(startColumn, rungs, rowCount) {
  const path = [{ col: startColumn, row: -1 }];
  let col = startColumn;

  for (let row = 0; row < rowCount; row += 1) {
    path.push({ col, row });

    if (col > 0 && rungs[col - 1][row]) {
      col -= 1;
      path.push({ col, row });
    } else if (col < rungs.length && rungs[col][row]) {
      col += 1;
      path.push({ col, row });
    }
  }

  path.push({ col, row: rowCount });
  return { path, endColumn: col };
}

function buildLadder(participants, results) {
  const shuffledResults = shuffle(results);
  const rowCount = Math.max(participants.length * 3, 8);
  const rungs = generateRungs(participants.length, rowCount);
  const mappings = participants.map((_, startCol) =>
    tracePath(startCol, rungs, rowCount).endColumn
  );

  return {
    participants,
    results: shuffledResults,
    rungs,
    rowCount,
    mappings,
  };
}

function getLayout(ladderData) {
  const count = ladderData.participants.length;
  const paddingX = 56;
  const paddingTop = 72;
  const paddingBottom = 72;
  const gap = Math.min(120, Math.max(72, (720 - paddingX * 2) / Math.max(count - 1, 1)));
  const width = paddingX * 2 + gap * (count - 1);
  const height = paddingTop + paddingBottom + ladderData.rowCount * 28;

  const columns = Array.from({ length: count }, (_, index) => ({
    x: paddingX + gap * index,
  }));

  return { width, height, paddingTop, paddingBottom, gap, columns };
}

function resizeCanvas(ladderData) {
  const layout = getLayout(ladderData);
  const dpr = window.devicePixelRatio || 1;

  canvas.width = layout.width * dpr;
  canvas.height = layout.height * dpr;
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return layout;
}

function rowY(layout, row) {
  const ladderHeight = layout.height - layout.paddingTop - layout.paddingBottom;
  const step = ladderHeight / (ladder.rowCount + 1);
  return layout.paddingTop + step * (row + 1);
}

function drawLadder(ladderData, layout, highlight = null) {
  ctx.clearRect(0, 0, layout.width, layout.height);

  ctx.strokeStyle = "#592466";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  ladderData.participants.forEach((name, index) => {
    const { x } = layout.columns[index];
    const top = layout.paddingTop - 8;
    const bottom = layout.height - layout.paddingBottom + 8;

    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();

    ctx.fillStyle = highlight?.startColumn === index ? "#4a154b" : "#1d1d1d";
    ctx.font = "700 14px Inter, Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(name, x, top - 10);

    ctx.fillStyle = "#696969";
    ctx.textBaseline = "top";
    ctx.fillText(ladderData.results[index], x, bottom + 12);
  });

  ctx.strokeStyle = "#611f69";
  ctx.lineWidth = 2;

  for (let col = 0; col < ladderData.rungs.length; col += 1) {
    for (let row = 0; row < ladderData.rowCount; row += 1) {
      if (!ladderData.rungs[col][row]) continue;

      const x1 = layout.columns[col].x;
      const x2 = layout.columns[col + 1].x;
      const y = rowY(layout, row);

      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    }
  }

  if (highlight?.segments?.length) {
    ctx.strokeStyle = "#4a154b";
    ctx.lineWidth = 5;
    ctx.shadowColor = "rgba(74, 21, 75, 0.35)";
    ctx.shadowBlur = 10;

    highlight.segments.forEach(([from, to]) => {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });

    ctx.shadowBlur = 0;
  }
}

function pathToSegments(path, layout) {
  const top = layout.paddingTop - 8;
  const bottom = layout.height - layout.paddingBottom + 8;
  const points = path.map(({ col, row }) => {
    const x = layout.columns[col].x;
    if (row === -1) return { x, y: top };
    if (row === ladder.rowCount) return { x, y: bottom };
    return { x, y: rowY(layout, row) };
  });

  const segments = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    segments.push([points[i], points[i + 1]]);
  }
  return segments;
}

function animatePath(startColumn) {
  if (!ladder || animating) return;

  animating = true;
  resultBanner.classList.add("hidden");

  const { path, endColumn } = tracePath(startColumn, ladder.rungs, ladder.rowCount);
  const layout = getLayout(ladder);
  const segments = pathToSegments(path, layout);
  let frame = 0;

  const tick = () => {
    drawLadder(ladder, layout, {
      startColumn,
      segments: segments.slice(0, frame),
    });

    if (frame < segments.length) {
      frame += 1;
      requestAnimationFrame(tick);
      return;
    }

    const participant = ladder.participants[startColumn];
    const result = ladder.results[endColumn];
    resultBanner.textContent = `${participant} → ${result}`;
    resultBanner.classList.remove("hidden");
    animating = false;
  };

  tick();
}

function handleCanvasClick(event) {
  if (!ladder || animating) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const layout = getLayout(ladder);
  const topZone = layout.paddingTop;

  if (event.clientY - rect.top > topZone) return;

  let nearest = 0;
  let minDistance = Infinity;

  layout.columns.forEach((column, index) => {
    const distance = Math.abs(column.x - x);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = index;
    }
  });

  if (minDistance > 40) return;
  animatePath(nearest);
}

function validateInputs() {
  const participants = readList(participantsList);
  const results = readList(resultsList);

  if (participants.length < MIN_COUNT || results.length < MIN_COUNT) {
    alert(`참가자와 결과는 각각 최소 ${MIN_COUNT}개 이상 입력해 주세요.`);
    return null;
  }

  if (participants.length !== results.length) {
    alert("참가자 수와 결과 수가 같아야 합니다.");
    return null;
  }

  return { participants, results };
}

function generateLadder() {
  const data = validateInputs();
  if (!data) return;

  ladder = buildLadder(data.participants, data.results);
  const layout = resizeCanvas(ladder);
  drawLadder(ladder, layout);

  gameArea.classList.remove("hidden");
  resultBanner.classList.add("hidden");
  animating = false;
}

function resetAll() {
  fillList(participantsList, DEFAULT_PARTICIPANTS, "참가자");
  fillList(resultsList, DEFAULT_RESULTS, "결과");
  ladder = null;
  animating = false;
  gameArea.classList.add("hidden");
  resultBanner.classList.add("hidden");
}

document.getElementById("add-participant").addEventListener("click", () => {
  addRow(participantsList, "참가자");
});

document.getElementById("add-result").addEventListener("click", () => {
  addRow(resultsList, "결과");
});

generateBtn.addEventListener("click", generateLadder);
resetBtn.addEventListener("click", resetAll);
canvas.addEventListener("click", handleCanvasClick);

window.addEventListener("resize", () => {
  if (!ladder) return;
  const layout = resizeCanvas(ladder);
  drawLadder(ladder, layout);
});

resetAll();
