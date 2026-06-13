// =========================
// TODO APP
// =========================

let todoList = JSON.parse(localStorage.getItem("todo")) || [];
let calendarBuffer = JSON.parse(localStorage.getItem("calendar")) || [];

// -------------------------
// DOM
// -------------------------
const todoContainer = document.getElementById("todoList");

// -------------------------
// 初期表示
// -------------------------
renderTodo();

// -------------------------
// 描画
// -------------------------
function renderTodo() {
  if (!todoContainer) return;

  todoContainer.innerHTML = "";

  todoList.forEach(item => {
    const div = document.createElement("div");
    div.className = "event-row";

    div.innerHTML = `
      <div class="event-title">${item.text}</div>
      <span>${item.status}</span>

      <button onclick="toCalendar(${item.id})">カレンダーへ</button>
      <button onclick="deleteTodo(${item.id})">削除</button>
    `;

    todoContainer.appendChild(div);
  });
}

// -------------------------
// カレンダーへ送る
// -------------------------
function toCalendar(id) {
  const item = todoList.find(t => t.id === id);
  if (!item) return;

  const date = prompt("日付（例：2026-07-01 10:00）");

  if (!date) return;

  calendarBuffer.push({
    id: Date.now(),
    title: item.text,
    start: date,
    tag: "other"
  });

  localStorage.setItem("calendar", JSON.stringify(calendarBuffer));

  // TODOから削除
  todoList = todoList.filter(t => t.id !== id);
  localStorage.setItem("todo", JSON.stringify(todoList));

  alert("カレンダーへ送信しました");
  renderTodo();
}

// -------------------------
// 削除
// -------------------------
function deleteTodo(id) {
  todoList = todoList.filter(t => t.id !== id);
  localStorage.setItem("todo", JSON.stringify(todoList));
  renderTodo();
}