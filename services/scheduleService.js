/**
 * =========================================================
 * project      : nazarick
 * file         : services/scheduleService.js
 * date         : 2026-05-29
 * author       : kei
 * purpose      :
 *   - スケジュールの最小コア管理
 *   - メモリベースのイベント保存
 *   - 後にDBへ拡張可能な構造
 * =========================================================
 */

/**
 * 仮想インメモリストレージ
 * ※現段階ではDB未使用（後でSQLite / PostgreSQLへ拡張）
 */
const events = [];

/**
 * スケジュールイベントを追加する
 * @param {Object} event
 * @param {string} event.title - 予定タイトル
 * @param {string} event.start - 開始日時 (ISO形式)
 * @param {string} event.end - 終了日時 (ISO形式)
 * @param {string[]} [event.tags] - タグ情報（任意）
 * @param {string} [event.memo] - 補足情報
 *
 * @returns {Object} newEvent - 登録されたイベント
 */
export function addEvent(event) {
  const newEvent = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...event,
  };

  events.push(newEvent);
  return newEvent;
}

/**
 * 指定日付のイベントを取得
 * @param {string} dateStr - "YYYY-MM-DD"形式
 *
 * @returns {Object[]} 該当日のイベント一覧
 */
export function getEventsByDate(dateStr) {
  return events.filter(e =>
    e.start?.startsWith(dateStr)
  );
}

/**
 * 全イベント取得
 * @returns {Object[]} 全スケジュールデータ
 */
export function getAllEvents() {
  return events;
}

