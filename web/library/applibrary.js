// ========================================
// 📚 Nazarick Library - app layer
// file: applibrary.js
// role: UI ⇄ Supabase bridge
// ========================================

// ========================================
// 📦 Supabase設定
// ========================================
// ※ここは自分のプロジェクトに合わせて変更
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

// Supabaseクライアント生成
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ========================================
// 📚 データ取得（一覧）
// ========================================
async function fetchLibrary() {
  const { data, error } = await supabaseClient
    .from("knowledge")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetch error:", error);
    return [];
  }

  return data;
}

// ========================================
// ➕ データ登録
// ========================================
async function insertLibrary(item) {
  const { data, error } = await supabaseClient
    .from("knowledge")
    .insert([item]);

  if (error) {
    console.error("insert error:", error);
    return null;
  }

  return data;
}

// ========================================
// 🔍 検索（簡易）
// ========================================
async function searchLibrary(keyword) {
  const { data, error } = await supabaseClient
    .from("knowledge")
    .select("*")
    .or(
      `title.ilike.%${keyword}%,summary.ilike.%${keyword}%,content.ilike.%${keyword}%`
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("search error:", error);
    return [];
  }

  return data;
}

// ========================================
// 🧠 フォーム → 登録処理
// ========================================
async function handleSave() {
  const title = document.getElementById("title").value;
  const summary = document.getElementById("summary").value;
  const content = document.getElementById("content").value;
  const tags = document
    .getElementById("tags")
    .value
    .split(",")
    .map(t => t.trim());

  const type = document.getElementById("type").value;
  const author = document.getElementById("author").value;
  const importance = document.getElementById("importance").value;

  const now = new Date().toISOString();

  const item = {
    title,
    summary,
    content,
    tags,
    type,
    author,
    importance: Number(importance),
    created_at: now,
    updated_at: now
  };

  await insertLibrary(item);

  alert("📚 ユリが記録しました");

  loadLibrary();
}

// ========================================
// 📖 一覧表示
// ========================================
async function loadLibrary() {
  const list = await fetchLibrary();

  const container = document.getElementById("libraryList");

  container.innerHTML = "";

  list.forEach(item => {
    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `
      <h3>${item.title}</h3>
      <div class="tags">
        ${(item.tags || []).map(t => `#${t}`).join(" ")}
      </div>
      <p>${item.summary || ""}</p>
      <div class="meta">
        作成者: ${item.author} |
        重要度: ${item.importance}
      </div>
    `;

    container.appendChild(div);
  });
}

// ========================================
// 🔍 検索処理
// ========================================
async function handleSearch() {
  const keyword = document.getElementById("searchInput").value;

  const result = await searchLibrary(keyword);

  const container = document.getElementById("libraryList");

  container.innerHTML = "";

  result.forEach(item => {
    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `
      <h3>${item.title}</h3>
      <div class="tags">
        ${(item.tags || []).map(t => `#${t}`).join(" ")}
      </div>
      <p>${item.summary || ""}</p>
      <div class="meta">
        作成者: ${item.author} |
        重要度: ${item.importance}
      </div>
    `;

    container.appendChild(div);
  });
}

// ========================================
// 🎮 イベント登録
// ========================================
document.getElementById("saveBtn")
  .addEventListener("click", handleSave);

document.getElementById("searchBtn")
  .addEventListener("click", handleSearch);

// ========================================
// 🚀 初期読み込み
// ========================================
loadLibrary();
