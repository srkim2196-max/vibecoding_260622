(function () {
  const VERCEL_API_BASE = "https://vibecoding-260622.vercel.app";

  function resolveChatApiUrl() {
    const { hostname } = window.location;

    if (hostname.includes("vercel.app") || hostname === "localhost") {
      return "/api/chat";
    }

    return `${VERCEL_API_BASE}/api/chat`;
  }

  window.APP_CONFIG = {
    chatApiUrl: resolveChatApiUrl(),
    vercelSiteUrl: VERCEL_API_BASE,
  };
})();
