// =========================
// Supabase接続
// =========================
const supabase = window.supabase.createClient(
  "https://stgaqwmdhnddqayqmedi.supabase.co",
  "sb_publishable_cabU7_5aabCnGMdXAvitNw_VsX6JhKk"
);

let calendar;

// =========================
// イベント読込
// =========================
async function loadEvents() {

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date");

  if (error) {
    console.error("読込エラー:", error);
    return;
  }

  const events = data.map(e => ({
    id: e.id,
    title: e.title,
    start: e.event_date
  }));

  calendar.removeAllEvents();
  calendar.addEventSource(events);
}

// =========================
// カレンダー初期化
// =========================
document.addEventListener("DOMContentLoaded", async () => {

  calendar = new FullCalendar.Calendar(
    document.getElementById("calendar"),
    {
      initialView: "dayGridMonth",
      locale: "ja",
      height: "auto"
    }
  );

  calendar.render();

  await loadEvents();

});

// =========================
// 予定追加
// =========================
document
  .getElementById("addBtn")
  .addEventListener("click", async () => {

    const title =
      document.getElementById("title").value.trim();

    const date =
      document.getElementById("date").value;

    const tag =
      document.getElementById("tag").value;

    if (!title || !date) {
      alert("予定と日付を入力してください");
      return;
    }

    const { error } = await supabase
      .from("events")
      .insert([
        {
          title: title,
          tag: tag,
          event_date: date
        }
      ]);

    if (error) {
      console.error("保存エラー:", error);
      alert("保存失敗");
      return;
    }

    document.getElementById("title").value = "";
    document.getElementById("date").value = "";

    await loadEvents();

    alert("保存しました");
  });