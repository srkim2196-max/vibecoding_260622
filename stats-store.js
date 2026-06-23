(function () {
  const STORAGE_KEY = "mini-game-hub-v1";
  const PLAYER_ID_KEY = "mini-game-player-id";

  const CHALLENGE_POOL = [
    {
      id: "reaction-300",
      game: "reaction",
      href: "reaction.html",
      icon: "⚡",
      title: "반응속도 300ms 이하",
      desc: "초록색이 되면 300ms 안에 클릭하세요.",
      check: (s) => s.games.reaction.bestMs !== null && s.games.reaction.bestMs <= 300,
    },
    {
      id: "guess-8",
      game: "guess",
      href: "guess.html",
      icon: "🔢",
      title: "숫자 맞추기 8번 이내",
      desc: "숨은 숫자를 8번 이하 시도로 맞추세요.",
      check: (s) => s.games.guess.bestAttempts !== null && s.games.guess.bestAttempts <= 8,
    },
    {
      id: "memory-22",
      game: "memory",
      href: "memory.html",
      icon: "🃏",
      title: "기억력 카드 22회 이내",
      desc: "8쌍을 22번 이하 이동으로 맞추세요.",
      check: (s) => s.games.memory.bestMoves !== null && s.games.memory.bestMoves <= 22,
    },
    {
      id: "rps-win3",
      game: "rps",
      href: "rps.html",
      icon: "✊",
      title: "가위바위보 3연승",
      desc: "컴퓨터를 3연승으로 이기세요.",
      check: (s) => s.games.rps.bestStreak >= 3,
    },
    {
      id: "ttt-win",
      game: "ttt",
      href: "ttt.html",
      icon: "⭕",
      title: "틱택토 1승",
      desc: "컴퓨터를 한 판 이기세요.",
      check: (s) => s.games.ttt.wins >= 1,
    },
    {
      id: "ladder-run",
      game: "ladder",
      href: "ladder.html",
      icon: "🪜",
      title: "사다리 타기 1회",
      desc: "사다리를 생성해 추첨을 진행하세요.",
      check: (s) => s.games.ladder.runs >= 1,
    },
    {
      id: "bird-clear",
      game: "bird",
      href: "bird.html",
      icon: "🐦",
      title: "새총 슈팅 클리어",
      desc: "모든 돼지를 제거해 스테이지를 클리어하세요.",
      check: (s) => s.games.bird.clears >= 1,
    },
  ];

  const BADGES = [
    { id: "explorer", icon: "🎮", name: "첫 플레이", desc: "아무 게임이나 1회 플레이", check: (s) => Object.values(s.gamesPlayed).some(Boolean) },
    { id: "speedster", icon: "⚡", name: "번개 손", desc: "반응속도 250ms 이하", check: (s) => s.games.reaction.bestMs !== null && s.games.reaction.bestMs <= 250 },
    { id: "mind-reader", icon: "🔢", name: "추리왕", desc: "숫자 맞추기 6번 이내", check: (s) => s.games.guess.bestAttempts !== null && s.games.guess.bestAttempts <= 6 },
    { id: "memory-king", icon: "🃏", name: "기억력왕", desc: "기억력 카드 18회 이내", check: (s) => s.games.memory.bestMoves !== null && s.games.memory.bestMoves <= 18 },
    { id: "rps-master", icon: "✊", name: "RP 마스터", desc: "가위바위보 5연승", check: (s) => s.games.rps.bestStreak >= 5 },
    { id: "ttt-champ", icon: "⭕", name: "틱택토 챔프", desc: "틱택토 3승", check: (s) => s.games.ttt.wins >= 3 },
    { id: "party-host", icon: "🪜", name: "파티 호스트", desc: "사다리 타기 3회", check: (s) => s.games.ladder.runs >= 3 },
    { id: "challenger", icon: "🏆", name: "챌린저", desc: "오늘의 챌린지 3회 클리어", check: (s) => s.challengeTotal >= 3 },
    { id: "collector", icon: "🌟", name: "올라운더", desc: "7개 게임 모두 플레이", check: (s) => Object.values(s.gamesPlayed).filter(Boolean).length >= 7 },
    { id: "bird-hunter", icon: "🐦", name: "새 사냥꾼", desc: "새총 슈팅 1500점 이상", check: (s) => s.games.bird.bestScore >= 1500 },
  ];

  let syncStatus = "idle";
  let recentRecords = [];
  let lastSyncError = "";
  let hydratePromise = null;

  function defaultState() {
    return {
      profile: { nickname: "플레이어" },
      games: {
        reaction: { bestMs: null, attempts: 0 },
        guess: { bestAttempts: null, clears: 0 },
        memory: { bestMoves: null, clears: 0 },
        rps: { wins: 0, losses: 0, draws: 0, bestStreak: 0, currentStreak: 0 },
        ttt: { wins: 0, losses: 0, draws: 0 },
        ladder: { runs: 0 },
        bird: { bestScore: 0, clears: 0 },
      },
      gamesPlayed: {
        reaction: false,
        guess: false,
        memory: false,
        rps: false,
        ttt: false,
        ladder: false,
        bird: false,
      },
      challenge: { date: "", id: "", completed: false },
      challengeTotal: 0,
      badges: [],
    };
  }

  function getStatsApiUrl() {
    const override = localStorage.getItem("mini-game-api-base");
    if (override) return `${override.replace(/\/$/, "")}/api/stats`;
    if (window.APP_CONFIG?.statsApiUrl) return window.APP_CONFIG.statsApiUrl;
    const hostname = window.location.hostname;
    if (hostname.includes("vercel.app") || hostname === "localhost") return "/api/stats";
    return "https://vibe-260622.vercel.app/api/stats";
  }

  async function readError(response) {
    try {
      const data = await response.json();
      return data.error || `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}`;
    }
  }

  function getPlayerId() {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  }

  function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function normalizeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;
    return {
      ...base,
      ...raw,
      profile: { ...base.profile, ...raw.profile },
      games: {
        reaction: { ...base.games.reaction, ...raw.games?.reaction },
        guess: { ...base.games.guess, ...raw.games?.guess },
        memory: { ...base.games.memory, ...raw.games?.memory },
        rps: { ...base.games.rps, ...raw.games?.rps },
        ttt: { ...base.games.ttt, ...raw.games?.ttt },
        ladder: { ...base.games.ladder, ...raw.games?.ladder },
        bird: { ...base.games.bird, ...raw.games?.bird },
      },
      gamesPlayed: { ...base.gamesPlayed, ...raw.gamesPlayed },
      challenge: { ...base.challenge, ...raw.challenge },
      badges: Array.isArray(raw.badges) ? raw.badges : [],
    };
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch {
      return defaultState();
    }
  }

  function saveLocal(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function minNullable(a, b) {
    if (a == null) return b;
    if (b == null) return a;
    return Math.min(a, b);
  }

  function maxNum(a, b) {
    return Math.max(a || 0, b || 0);
  }

  function mergeStates(local, remote) {
    const merged = normalizeState(local);
    const cloud = normalizeState(remote);

    merged.profile.nickname = cloud.profile.nickname || merged.profile.nickname;

    merged.games.reaction.bestMs = minNullable(local.games.reaction.bestMs, cloud.games.reaction.bestMs);
    merged.games.reaction.attempts = maxNum(local.games.reaction.attempts, cloud.games.reaction.attempts);

    merged.games.guess.bestAttempts = minNullable(local.games.guess.bestAttempts, cloud.games.guess.bestAttempts);
    merged.games.guess.clears = maxNum(local.games.guess.clears, cloud.games.guess.clears);

    merged.games.memory.bestMoves = minNullable(local.games.memory.bestMoves, cloud.games.memory.bestMoves);
    merged.games.memory.clears = maxNum(local.games.memory.clears, cloud.games.memory.clears);

    merged.games.rps.wins = maxNum(local.games.rps.wins, cloud.games.rps.wins);
    merged.games.rps.losses = maxNum(local.games.rps.losses, cloud.games.rps.losses);
    merged.games.rps.draws = maxNum(local.games.rps.draws, cloud.games.rps.draws);
    merged.games.rps.bestStreak = maxNum(local.games.rps.bestStreak, cloud.games.rps.bestStreak);
    merged.games.rps.currentStreak = cloud.games.rps.currentStreak ?? merged.games.rps.currentStreak;

    merged.games.ttt.wins = maxNum(local.games.ttt.wins, cloud.games.ttt.wins);
    merged.games.ttt.losses = maxNum(local.games.ttt.losses, cloud.games.ttt.losses);
    merged.games.ttt.draws = maxNum(local.games.ttt.draws, cloud.games.ttt.draws);

    merged.games.ladder.runs = maxNum(local.games.ladder.runs, cloud.games.ladder.runs);

    merged.games.bird.bestScore = maxNum(local.games.bird.bestScore, cloud.games.bird.bestScore);
    merged.games.bird.clears = maxNum(local.games.bird.clears, cloud.games.bird.clears);

    Object.keys(merged.gamesPlayed).forEach((key) => {
      merged.gamesPlayed[key] = Boolean(local.gamesPlayed[key] || cloud.gamesPlayed[key]);
    });

    merged.challengeTotal = maxNum(local.challengeTotal, cloud.challengeTotal);
    merged.badges = [...new Set([...(local.badges || []), ...(cloud.badges || [])])];

    const today = todayKey();
    if (cloud.challenge?.date === today && cloud.challenge.completed) {
      merged.challenge = { ...cloud.challenge };
    }

    return unlockBadges(ensureTodayChallenge(merged));
  }

  function getChallengeForDate(dateKey) {
    let hash = 0;
    for (let i = 0; i < dateKey.length; i += 1) {
      hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
    }
    return CHALLENGE_POOL[hash % CHALLENGE_POOL.length];
  }

  function ensureTodayChallenge(state) {
    const today = todayKey();
    if (state.challenge.date !== today) {
      const picked = getChallengeForDate(today);
      state.challenge = { date: today, id: picked.id, completed: false };
    }
    return state;
  }

  function unlockBadges(state) {
    BADGES.forEach((badge) => {
      if (!state.badges.includes(badge.id) && badge.check(state)) {
        state.badges.push(badge.id);
      }
    });
    return state;
  }

  function markPlayed(state, gameId) {
    if (state.gamesPlayed[gameId] !== undefined) {
      state.gamesPlayed[gameId] = true;
    }
    return state;
  }

  function tryCompleteChallenge(state) {
    state = ensureTodayChallenge(state);
    if (state.challenge.completed) return state;

    const challenge = CHALLENGE_POOL.find((c) => c.id === state.challenge.id);
    if (challenge && challenge.check(state)) {
      state.challenge.completed = true;
      state.challengeTotal += 1;
    }
    return state;
  }

  async function syncToCloud(state, gameId, patch) {
    syncStatus = "syncing";
    lastSyncError = "";
    try {
      const response = await fetch(getStatsApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: getPlayerId(),
          nickname: state.profile.nickname,
          stats: state,
          gameId: gameId || null,
          patch: patch || null,
        }),
      });

      if (!response.ok) {
        lastSyncError = await readError(response);
        throw new Error(lastSyncError);
      }

      syncStatus = "synced";
    } catch (error) {
      syncStatus = "offline";
      if (!lastSyncError && error instanceof Error) {
        lastSyncError = error.message;
      }
    }
  }

  function applyRecord(state, gameId, patch) {
    state = markPlayed(state, gameId);
    const game = state.games[gameId];
    if (!game) return state;

    Object.assign(game, patch);

    if (gameId === "reaction" && patch.lastMs != null) {
      game.attempts = (game.attempts || 0) + 1;
      if (game.bestMs === null || patch.lastMs < game.bestMs) {
        game.bestMs = patch.lastMs;
      }
    }

    if (gameId === "guess" && patch.attempts != null) {
      game.clears = (game.clears || 0) + 1;
      if (game.bestAttempts === null || patch.attempts < game.bestAttempts) {
        game.bestAttempts = patch.attempts;
      }
    }

    if (gameId === "memory" && patch.moves != null) {
      game.clears = (game.clears || 0) + 1;
      if (game.bestMoves === null || patch.moves < game.bestMoves) {
        game.bestMoves = patch.moves;
      }
    }

    if (gameId === "rps" && patch.currentStreak != null) {
      game.currentStreak = patch.currentStreak;
      if (game.currentStreak > (game.bestStreak || 0)) {
        game.bestStreak = game.currentStreak;
      }
    }

    if (gameId === "ladder" && patch.runs != null) {
      game.runs = patch.runs;
    }

    if (gameId === "bird") {
      if (patch.bestScore != null) {
        game.bestScore = Math.max(game.bestScore || 0, patch.bestScore);
      }
      if (patch.cleared) {
        game.clears = (game.clears || 0) + 1;
      }
    }

    state = tryCompleteChallenge(state);
    state = unlockBadges(state);
    return state;
  }

  window.MiniGameStats = {
    getPlayerId,

    getSyncStatus() {
      return syncStatus;
    },

    getStatsApiUrl,

    getLastSyncError() {
      return lastSyncError;
    },

    getRecentRecords() {
      return recentRecords;
    },

    async hydrate() {
      if (hydratePromise) return hydratePromise;

      hydratePromise = (async () => {
        syncStatus = "syncing";
        lastSyncError = "";
        try {
          const response = await fetch(`${getStatsApiUrl()}?playerId=${encodeURIComponent(getPlayerId())}`);
          if (!response.ok) {
            lastSyncError = await readError(response);
            syncStatus = "offline";
            return loadLocal();
          }

          const data = await response.json();
          recentRecords = data.recentRecords || [];

          if (data.player?.stats) {
            const merged = mergeStates(loadLocal(), data.player.stats);
            if (data.player.nickname) {
              merged.profile.nickname = data.player.nickname;
            }
            saveLocal(merged);
          }

          syncStatus = "synced";
          return loadLocal();
        } catch (error) {
          syncStatus = "offline";
          lastSyncError = error instanceof Error ? error.message : "네트워크 오류";
          return loadLocal();
        } finally {
          hydratePromise = null;
        }
      })();

      return hydratePromise;
    },

    getState() {
      return ensureTodayChallenge(loadLocal());
    },

    setNickname(nickname) {
      let state = loadLocal();
      state.profile.nickname = nickname.trim() || "플레이어";
      saveLocal(state);
      syncToCloud(state);
      return state.profile.nickname;
    },

    getDailyChallenge() {
      const state = ensureTodayChallenge(loadLocal());
      saveLocal(state);
      const def = CHALLENGE_POOL.find((c) => c.id === state.challenge.id) || CHALLENGE_POOL[0];
      return { ...def, completed: state.challenge.completed, date: state.challenge.date };
    },

    getBadges() {
      const state = unlockBadges(loadLocal());
      saveLocal(state);
      return BADGES.map((badge) => ({
        ...badge,
        unlocked: state.badges.includes(badge.id),
      }));
    },

    record(gameId, patch) {
      let state = applyRecord(loadLocal(), gameId, patch);
      saveLocal(state);
      syncToCloud(state, gameId, patch);
      return state;
    },

    getGameStats(gameId) {
      return loadLocal().games[gameId] || null;
    },
  };
})();
