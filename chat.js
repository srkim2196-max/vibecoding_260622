const messagesEl = document.getElementById("chat-messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("chat-send");
const suggestionsEl = document.getElementById("chat-suggestions");

const history = [];
let sending = false;

function appendMessage(role, content) {
  const bubble = document.createElement("div");
  bubble.className = `chat-message chat-message-${role}`;
  bubble.textContent = content;
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setLoading(isLoading) {
  sending = isLoading;
  sendBtn.disabled = isLoading;
  inputEl.disabled = isLoading;
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
    const response = await fetch("/api/chat", {
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
      `죄송합니다. ${message}\n\nVercel에 배포 후 GEMINI_API_KEY 환경 변수를 설정했는지 확인해 주세요.`
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
