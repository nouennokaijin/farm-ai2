// =========================
// INBOX APP
// =========================

const inboxList = [];
let todoBuffer = JSON.parse(localStorage.getItem("todo")) || [];

// -------------------------
// DOM
// -------------------------
const inboxInput = document.getElementById("inboxInput");
const inboxAddBtn = document.getElementById("addInboxBtn");
const inboxContainer = document.getElementById("inboxList");

// -------------------------
// 追加
// -------------------------
inboxAddBtn?.addEventListener("click", () => {
  const text = inboxInput.value.trim();
  if (!text) return;

  const item = {
    id: Date.now(),
    text,
    createdAt: new Date().toISOString()
  };

  inboxList.push(item);
  inboxInput.value = "";

  renderInbox();
});

// -------------------------
// 表示
// -------------------------
function renderInbox() {
  if (!inboxContainer) return;

  inboxContainer.innerHTML = "";

  inboxList.forEach(item => {
    const div = document.createElement("div");
    div.className = "event-row";

    div.innerHTML = `
      <div class="event-title">${item.text}</div>
      <button onclick="openDecompose(${item.id})">分解</button>
      <button onclick="sendToTodo(${item.id})">TODOへ</button>
      <button onclick="deleteInbox(${item.id})">削除</button>
    `;

    inboxContainer.appendChild(div);
  });
}

// -------------------------
// 分解（コア機能）
// -------------------------
function openDecompose(id) {
  const item = inboxList.find(i => i.id === id);
  if (!item) return;

  const result = decompose(item.text);

  alert(
`【分解結果】

- ${result.join("\n- ")}`
  );
}

// -------------------------
// 超シンプル分解ロジック
// （後でAI化できる場所）
// -------------------------
function decompose(text) {
  if (text.includes("農業")) {
    return [
      "農協制度を調べる",
      "道の駅の出店条件を調べる",
      "販売戦略を考える"
    ];
  }

  if (text.includes("お金")) {
    return [
      "収益構造を調査する",
      "市場価格を調べる"
    ];
  }

  return [
    "内容を整理する",
    "情報収集する"
  ];
}

// -------------------------
// TODOへ送る
// -------------------------
function sendToTodo(id) {
  const item = inboxList.find(i => i.id === id);
  if (!item) return;

  const decomposed = decompose(item.text);

  decomposed.forEach(task => {
    todoBuffer.push({
      id: Date.now() + Math.random(),
      text: task,
      status: "READY",
      createdAt: new Date().toISOString()
    });
  });

  localStorage.setItem("todo", JSON.stringify(todoBuffer));

  alert("TODOへ送信しました");
}

// -------------------------
// 削除
// -------------------------
function deleteInbox(id) {
  const index = inboxList.findIndex(i => i.id === id);
  if (index !== -1) inboxList.splice(index, 1);
  renderInbox();
}