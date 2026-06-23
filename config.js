(function () {
  const VERCEL_API_BASE = "https://vibecoding-260622.vercel.app";

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
