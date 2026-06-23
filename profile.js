const nicknameInput = document.getElementById("profile-nickname");
const profileForm = document.getElementById("profile-form");
const greetingEl = document.getElementById("profile-greeting");
const syncStatusEl = document.getElementById("sync-status");
const challengeTitle = document.getElementById("challenge-title");
const challengeDesc = document.getElementById("challenge-desc");
const challengeStatus = document.getElementById("challenge-status");
const challengeLink = document.getElementById("challenge-link");
const challengeCard = document.getElementById("challenge-card");
const recordGrid = document.getElementById("record-grid");
const badgeGrid = document.getElementById("badge-grid");
const recentRecordsEl = document.getElementById("recent-records");

const RECORDS = [
  { id: "reaction", icon: "⚡", name: "반응속도", format: (g) => (g.bestMs != null ? `최고 ${Math.round(g.bestMs)}ms` : "기록 없음") },
  { id: "guess", icon: "🔢", name: "숫자 맞추기", format: (g) => (g.bestAttempts != null ? `최소 ${g.bestAttempts}회` : "기록 없음") },
  { id: "memory", icon: "🃏", name: "기억력 카드", format: (g) => (g.bestMoves != null ? `최소 ${g.bestMoves}회` : "기록 없음") },
  { id: "rps", icon: "✊", name: "가위바위보", format: (g) => `${g.wins}승 · 최고 ${g.bestStreak || 0}연승` },
  { id: "ttt", icon: "⭕", name: "틱택토", format: (g) => `${g.wins}승 ${g.losses}패 ${g.draws}무` },
  { id: "ladder", icon: "🪜", name: "사다리 타기", format: (g) => `${g.runs || 0}회 진행` },
];

const GAME_NAMES = {
  reaction: "반응속도",
  guess: "숫자 맞추기",
  memory: "기억력 카드",
  rps: "가위바위보",
  ttt: "틱택토",
  ladder: "사다리 타기",
};

function formatSyncStatus(status) {
  if (status === "synced") return "☁️ Supabase 동기화 완료";
  if (status === "syncing") return "☁️ Supabase 동기화 중…";
  if (status === "offline") return "⚠️ 오프라인 · 로컬 저장만 사용 중";
  return "기록 준비 중…";
}

function formatRecordRow(row) {
  const name = GAME_NAMES[row.game_id] || row.game_id;
  const value = row.value != null ? ` · ${row.value}` : "";
  const date = new Date(row.created_at).toLocaleString("ko-KR");
  return `${name}${value} (${date})`;
}

function render() {
  const state = MiniGameStats.getState();
  const challenge = MiniGameStats.getDailyChallenge();
  const badges = MiniGameStats.getBadges();
  const records = MiniGameStats.getRecentRecords();

  nicknameInput.value = state.profile.nickname;
  greetingEl.textContent = `안녕하세요, ${state.profile.nickname}님! 오늘도 미니 게임에 도전해 보세요.`;
  syncStatusEl.textContent = formatSyncStatus(MiniGameStats.getSyncStatus());
  syncStatusEl.className = `sync-status sync-${MiniGameStats.getSyncStatus()}`;

  challengeTitle.textContent = `${challenge.icon} ${challenge.title}`;
  challengeDesc.textContent = challenge.desc;
  challengeLink.href = challenge.href;

  if (challenge.completed) {
    challengeStatus.textContent = "✅ 오늘의 챌린지 클리어!";
    challengeStatus.className = "challenge-status status-win";
    challengeCard.classList.add("challenge-done");
    challengeLink.textContent = "다시 플레이하기";
  } else {
    challengeStatus.textContent = "아직 클리어하지 못했어요. 도전해 보세요!";
    challengeStatus.className = "challenge-status";
    challengeCard.classList.remove("challenge-done");
    challengeLink.textContent = "도전하러 가기";
  }

  recordGrid.innerHTML = RECORDS.map((record) => {
    const game = state.games[record.id];
    return `
      <div class="record-card">
        <span class="record-icon">${record.icon}</span>
        <span class="record-name">${record.name}</span>
        <span class="record-value">${record.format(game)}</span>
      </div>
    `;
  }).join("");

  badgeGrid.innerHTML = badges
    .map(
      (badge) => `
      <div class="badge-card ${badge.unlocked ? "badge-unlocked" : "badge-locked"}">
        <span class="badge-icon">${badge.unlocked ? badge.icon : "🔒"}</span>
        <span class="badge-name">${badge.name}</span>
        <span class="badge-desc">${badge.desc}</span>
      </div>
    `
    )
    .join("");

  if (records.length === 0) {
    recentRecordsEl.innerHTML = "<li>아직 클라우드 플레이 기록이 없습니다.</li>";
  } else {
    recentRecordsEl.innerHTML = records.map((row) => `<li>${formatRecordRow(row)}</li>`).join("");
  }
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  MiniGameStats.setNickname(nicknameInput.value);
  await MiniGameStats.hydrate();
  render();
});

async function init() {
  await MiniGameStats.hydrate();
  render();
}

init();
