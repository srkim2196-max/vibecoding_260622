const { createClient } = require("@supabase/supabase-js");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function buildRecordRow(playerId, gameId, patch) {
  if (gameId === "reaction" && patch.lastMs != null) {
    return { player_id: playerId, game_id: gameId, event_type: "score", value: patch.lastMs, meta: { attempts: patch.attempts } };
  }
  if (gameId === "guess" && patch.attempts != null) {
    return { player_id: playerId, game_id: gameId, event_type: "clear", value: patch.attempts, meta: {} };
  }
  if (gameId === "memory" && patch.moves != null) {
    return { player_id: playerId, game_id: gameId, event_type: "clear", value: patch.moves, meta: {} };
  }
  if (gameId === "rps" && patch.wins != null) {
    return { player_id: playerId, game_id: gameId, event_type: "round", value: patch.currentStreak, meta: { wins: patch.wins, losses: patch.losses, draws: patch.draws } };
  }
  if (gameId === "ttt" && patch.wins != null) {
    return { player_id: playerId, game_id: gameId, event_type: "match", value: patch.wins, meta: { losses: patch.losses, draws: patch.draws } };
  }
  if (gameId === "ladder" && patch.runs != null) {
    return { player_id: playerId, game_id: gameId, event_type: "run", value: patch.runs, meta: {} };
  }
  if (gameId === "bird" && patch.score != null) {
    return { player_id: playerId, game_id: gameId, event_type: patch.cleared ? "clear" : "score", value: patch.score, meta: { bestScore: patch.bestScore } };
  }
  return null;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({
      error: "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.",
    });
  }

  if (req.method === "GET") {
    if (req.query?.health === "1") {
      return res.status(200).json({
        ok: true,
        supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      });
    }

    const playerId = req.query?.playerId;
    if (!playerId) {
      return res.status(400).json({ error: "playerId가 필요합니다." });
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, nickname, stats, updated_at")
      .eq("id", playerId)
      .maybeSingle();

    if (playerError) {
      return res.status(500).json({ error: playerError.message });
    }

    const { data: records, error: recordsError } = await supabase
      .from("game_records")
      .select("id, game_id, event_type, value, meta, created_at")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (recordsError) {
      return res.status(500).json({ error: recordsError.message });
    }

    return res.status(200).json({
      player: player || null,
      recentRecords: records || [],
    });
  }

  if (req.method === "POST") {
    const { playerId, nickname, stats, gameId, patch } = req.body || {};

    if (!playerId || !stats) {
      return res.status(400).json({ error: "playerId와 stats가 필요합니다." });
    }

    const { error: upsertError } = await supabase.from("players").upsert({
      id: playerId,
      nickname: nickname || "플레이어",
      stats,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message });
    }

    if (gameId && patch) {
      const row = buildRecordRow(playerId, gameId, patch);
      if (row) {
        const { error: recordError } = await supabase.from("game_records").insert(row);
        if (recordError) {
          return res.status(500).json({ error: recordError.message });
        }
      }
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "GET, POST만 지원합니다." });
};
