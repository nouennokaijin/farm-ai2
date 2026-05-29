// ========================================
// 📁 FOLDER : web/calendar
// 📄 FILE   : app.js
// 📅 DATE   : 2026/05/30
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 📅 Nazarick Calendar
// Supabase + FullCalendar + Discord連携対応設計
//
// 🎯 機能概要
// ・予定の取得（Supabase）
// ・予定の追加
// ・予定の編集 / 削除
// ・タグ分類（仕事/バイト/ヘルス/その他）
// ・リアルタイム同期
// ・日別ビュー切替
// ========================================

document.addEventListener("DOMContentLoaded", async function () {

  // ========================================
  // 🔌 Supabase接続（DBの入口）
  // ========================================
  const supabase = window.supabase.createClient(
    "https://stgaqwmdhnddqayqmedi.supabase.co",
 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0Z2Fxd21kaG5kZHFheXFtZWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTYzOTgsImV4cCI6MjA5NTYzMjM5OH0.KMvwGVyxSpbXJAyxsz5mCNkRU_M9jRB1VZZbvGzcL00"
  );

  // ========================================
  // 🏷 タグカラー定義（UI視認性強化）
  // ========================================
  function getTagColor(tag) {
    if (tag === "work") return "#4dabf7";     // 仕事
    if (tag === "part") return "#51cf66";     // バイト
    if (tag === "health") return "#ff6b6b";   // 健康
    return "#9775fa";                         // その他
  }

  // ========================================
  // 📥 イベント取得（DB → 表示用変換前）
  // ========================================
  async function fetchEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      console.error("fetch error:", error);
      return [];
    }

    return data || [];
  }

  // ========================================
  // ➕ イベント追加（DB登録）
  // ========================================
  async function addEvent(title, tag, dateStr) {
    const { data, error } = await supabase
      .from("events")
      .insert([
        {
          title,
          tag,
          start_time: dateStr,
          end_time: dateStr,
          items: [] // 初期持ち物
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("insert error:", error);
      return null;
    }

    return data;
  }

  // ========================================
  // ✏ イベント更新（タイトル・タグ変更）
  // ========================================
  async function updateEvent(id, title, tag) {
    const { error } = await supabase
      .from("events")
      .update({ title, tag })
      .eq("id", id);

    if (error) {
      console.error("update error:", error);
    }
  }

  // ========================================
  // 🗑 イベント削除
  // ========================================
  async function deleteEvent(id) {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("delete error:", error);
    }
  }

  // ========================================
  // 📅 カレンダーUI初期化
  // ========================================
  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {

    // 月表示スタート
    initialView: "dayGridMonth",

    // 上部メニュー
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridDay"
    },

    // ========================================
    // 📦 DBデータ → カレンダー描画変換
    // ========================================
    events: async function (fetchInfo, successCallback) {

      const events = await fetchEvents();

      successCallback(
        events.map(e => ({
          id: e.id,
          title: `[${e.tag}] ${e.title}`,
          start: e.start_time,
          end: e.end_time,

          // 色分け
          backgroundColor: getTagColor(e.tag),
          borderColor: getTagColor(e.tag),

          // 拡張データ（持ち物など）
          extendedProps: {
            tag: e.tag,
            items: e.items || []
          }
        }))
      );
    },

    // ========================================
    // 📆 日付クリック → 日ビューへ
    // ========================================
    dateClick: function (info) {
      calendar.changeView("timeGridDay", info.dateStr);
    },

    // ========================================
    // 📌 イベントクリック操作
    // ========================================
    eventClick: async function (info) {

      const action = prompt("edit / delete / items / cancel");

      if (!action || action === "cancel") return;

      // 🗑 削除
      if (action === "delete") {
        await deleteEvent(info.event.id);
        info.event.remove();
        return;
      }

      // ✏ 編集
      if (action === "edit") {
        const title = prompt("title", info.event.title);
        const tag = prompt("tag (work/part/health/other)", info.event.extendedProps.tag);

        if (!title) return;

        await updateEvent(info.event.id, title, tag);

        info.event.setProp("title", `[${tag}] ${title}`);
        info.event.setProp("backgroundColor", getTagColor(tag));
        info.event.setProp("borderColor", getTagColor(tag));

        return;
      }

      // 🎒 持ち物編集
      if (action === "items") {
        const current = info.event.extendedProps.items || [];

        const input = prompt("items（カンマ区切り）", current.join(","));

        const items = input
          ? input.split(",").map(i => i.trim())
          : [];

        await supabase
          .from("events")
          .update({ items })
          .eq("id", info.event.id);

        return;
      }
    }
  });

  // ========================================
  // 🚀 カレンダー起動
  // ========================================
  calendar.render();

  // ========================================
  // ➕ 追加ボタン処理
  // ========================================
  document.getElementById("addBtn").addEventListener("click", async () => {

    const title = document.getElementById("title").value;
    const tag = document.getElementById("tag").value;
    const time = document.getElementById("time").value;

    if (!title) return;

    const today = new Date().toISOString().split("T")[0];
    const dateStr = `${today}T${time}`;

    const data = await addEvent(title, tag, dateStr);

    if (!data) return;

    // 再取得して最新反映
    calendar.refetchEvents();
  });

  // ========================================
  // 🌍 リアルタイム同期（全端末反映）
  // ========================================
  supabase
    .channel("events")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "events"
      },
      () => {
        // DB変更があれば即更新
        calendar.refetchEvents();
      }
    )
    .subscribe();

});
