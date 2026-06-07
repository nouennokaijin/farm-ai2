// ========================================
// 📁 FILE   : calendarApi.js
// 📅 Nazarick Calendar - Domain API
// ========================================

import { createClient } from "@supabase/supabase-js";

// ========================================
// 🔐 Supabase Client（内部保持）
// ========================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("❌ Supabase環境変数が未設定です");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================
// 📌 カレンダーAPI（統一インターフェース）
// ========================================

export const calendarApi = {
  // 📅 予定取得
  async getEvents(userId) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data;
  },

  // ➕ 予定追加
  async addEvent(event) {
    const { data, error } = await supabase
      .from("events")
      .insert([event])
      .select();

    if (error) throw error;
    return data;
  },

  // ✏️ 更新
  async updateEvent(id, updates) {
    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data;
  },

  // ❌ 削除
  async deleteEvent(id) {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};

// ========================================
// 🧠 補助（認証系は必要ならここに統合）
// ========================================

export const getUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
};

export const signOut = async () => {
  await supabase.auth.signOut();
};