(function () {
  // Vercel Production 도메인 (Settings → Domains에서 확인)
  const VERCEL_API_BASE = "https://vibe-260622.vercel.app";

  function resolveApiUrl(path) {
    const { hostname } = window.location;
    if (hostname.includes("vercel.app") || hostname === "localhost") {
      return path;
    }
    return `${VERCEL_API_BASE}${path}`;
  }

  window.APP_CONFIG = {
    chatApiUrl: resolveApiUrl("/api/chat"),
    statsApiUrl: resolveApiUrl("/api/stats"),
    vercelSiteUrl: VERCEL_API_BASE,
  };
})();
