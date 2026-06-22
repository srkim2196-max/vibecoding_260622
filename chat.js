const messagesEl = document.getElementById("chat-messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("chat-send");
const suggestionsEl = document.getElementById("chat-suggestions");
const noticeEl = document.getElementById("chat-notice");

const history = [];
let sending = false;

const chatApiUrl = window.APP_CONFIG?.chatApiUrl || "/api/chat";
const healthApiUrl = chatApiUrl.replace(/\/chat$/, "/health");

function appendMessage(role, content) {
  const bubble = document.createElement("div");
  bubble.className = `chat-message chat-message-${role}`;
  bubble.textContent = content;
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showNotice(message, type = "warn") {
  noticeEl.textContent = message;
  noticeEl.className = `chat-notice chat-notice-${type}`;
  noticeEl.classList.remove("hidden");
}

function setLoading(isLoading) {
  sending = isLoading;
  sendBtn.disabled = isLoading;
  inputEl.disabled = isLoading;
}

async function checkApiHealth() {
  try {
    const response = await fetch(healthApiUrl);
    const data = await response.json();

    if (!data.ok) {
      showNotice(
        "챗봇 API 키가 아직 설정되지 않았습니다. Vercel → Settings → Environment Variables에 GEMINI_API_KEY를 추가한 뒤 Redeploy 해 주세요.",
        "warn"
      );
      return;
    }

    if (window.location.hostname.includes("github.io")) {
      showNotice(
        "GitHub Pages에서 접속 중입니다. 챗봇은 Vercel API를 통해 동작합니다.",
        "info"
      );
    }
  } catch {
    showNotice(
      "챗봇 서버에 연결할 수 없습니다. Vercel 배포 상태를 확인해 주세요.",
      "error"
    );
  }
}

async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed || sending) return;

  history.push({ role: "user", content: trimmed });
  appendMessage("user", trimmed);
  inputEl.value = "";
  setLoading(true);

  const loadingBubble = document.createElement("div");
  loadingBubble.className = "chat-message chat-message-assistant chat-message-loading";
  loadingBubble.textContent = "답변 생성 중…";
  messagesEl.appendChild(loadingBubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const response = await fetch(chatApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    const data = await response.json();
    loadingBubble.remove();

    if (!response.ok) {
      throw new Error(data.error || "요청에 실패했습니다.");
    }

    history.push({ role: "assistant", content: data.reply });
    appendMessage("assistant", data.reply);
  } catch (error) {
    loadingBubble.remove();
    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
    appendMessage(
      "assistant",
      `죄송합니다. ${message}\n\nVercel 대시보드에서 GEMINI_API_KEY 환경 변수를 설정하고 재배포했는지 확인해 주세요.`
    );
  } finally {
    setLoading(false);
    inputEl.focus();
  }
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(inputEl.value);
});

suggestionsEl.addEventListener("click", (event) => {
  const chip = event.target.closest(".chat-chip");
  if (!chip) return;
  sendMessage(chip.dataset.prompt || chip.textContent);
});

appendMessage(
  "assistant",
  "안녕하세요! 미니 게임 가이드 봇입니다. 🎮\n어떤 게임이 궁금하신가요? 아래 버튼을 누르거나 직접 질문해 주세요."
);

checkApiHealth();
