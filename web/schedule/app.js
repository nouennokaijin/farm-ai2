// =====================================================
// Nazarick Calendar v1.1
//
// app.js
// カレンダー表示
// 日別モーダル
// 新規予定モーダル
//
// =====================================================

import { createClient } 
from "https://esm.sh/@supabase/supabase-js";


const SUPABASE_URL =
  "https://stgaqwmdhnddqayqmedi.supabase.co";


const SUPABASE_KEY =
  "sb_publishable_cabU7_5aabCnGMdXAvitNw_VsX6JhKk";


const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
  
  function getTagColor(tag) {

  switch (tag) {

    case "work":
      return "#0984e3";

    case "meeting":
      return "#6c5ce7";

    case "management":
      return "#00b894";

    case "private":
      return "#fd79a8";

    default:
      return "#636e72";

  }
}
  
document.addEventListener('DOMContentLoaded', function () {

let selectedDate = "";
  // ======================
  // FullCalendar 初期化
  // ======================


  const calendarEl = document.getElementById('calendar');


  const calendar = new FullCalendar.Calendar(calendarEl, {

    initialView: 'dayGridMonth',
    displayEventTime: true,
    locale: 'ja',
    height: "auto",
    
events: async function(fetchInfo, successCallback, failureCallback) {


  const { data, error } =
    await supabase
      .from("events")
      .select("*");
      
  //    alert(JSON.stringify(data));


  if(error){

    console.error(error);

    failureCallback(error);

    return;

  }


successCallback(
  data.map(ev => ({

    id: ev.id,

    title: ev.title,

    start: ev.start_time
      ? `${ev.event_date}T${ev.start_time}`
      : ev.event_date,

    end: ev.end_time
      ? `${ev.event_date}T${ev.end_time}`
      : null,

    color: getTagColor(ev.tag),

    extendedProps: {

      tag: ev.tag,

      memo: ev.memo,

      items: ev.items

    }

  }))
);
},

    // ======================
    // 予定クリック
    // ======================

eventClick: function(info) {

  const ev = info.event;


  document.getElementById("eventModalTitle").textContent =
    "予定編集";

document.getElementById("eventId").value =
    ev.id;

  document.getElementById("eventTitleInput").value =
    ev.title;

document.getElementById("eventTag").value =
    ev.extendedProps.tag || "other";


document.getElementById("eventMemo").value =
    ev.extendedProps.memo || "";


document.getElementById("eventItems").value =
    Array.isArray(ev.extendedProps.items)
      ? ev.extendedProps.items.join("\n")
      : ev.extendedProps.items || "";



  document.getElementById("eventDate").value =
    ev.startStr.substring(0,10);


  if(ev.start){

    document.getElementById("startTime").value =
      ev.start.toTimeString().substring(0,5);

  }


  if(ev.end){

    document.getElementById("endTime").value =
      ev.end.toTimeString().substring(0,5);

  }


  document.getElementById("eventModal").style.display =
    "flex";

},


    // ======================
    // 日付クリック
    // ======================
dateClick: function(info) {

  selectedDate = info.dateStr;

  const dayModal = document.getElementById('dayModal');

  const dayTitle = document.getElementById('dayTitle');

  dayTitle.textContent =
    info.dateStr + " の予定";

  dayModal.style.display = 'flex';

}


  });



  // カレンダー描画

  calendar.render();






  // ======================
  // 日別一覧モーダル
  // ======================


  const dayModal =
    document.getElementById('dayModal');


  const closeDayModal =
    document.getElementById('closeDayModal');

// ======================
// 保存
// ======================

const saveEventBtn =
  document.getElementById('saveEventBtn');


saveEventBtn.onclick = async function(){

  const id =
    document.getElementById("eventId").value;


  const payload = {

    title:
      document.getElementById("eventTitleInput").value,

    tag:
      document.getElementById("eventTag").value,

    memo:
      document.getElementById("eventMemo").value,

    items:
      document.getElementById("eventItems").value
        .split("\n")
        .filter(v => v),

    event_date:
      document.getElementById("eventDate").value,

    start_time:
      document.getElementById("startTime").value || null,

    end_time:
      document.getElementById("endTime").value || null

  };


  let result;


  if(id){

    result = await supabase
      .from("events")
      .update(payload)
      .eq("id", id);

  }else{

    result = await supabase
      .from("events")
      .insert([payload]);

  }


  if(result.error){

    alert("保存失敗");

    console.error(result.error);

    return;

  }

  alert("保存しました");

  document.getElementById("eventModal").style.display = "none";
  calendar.refetchEvents();
  
};

// ======================
// 削除
// ======================

const deleteEventBtn =
  document.getElementById("deleteEventBtn");


deleteEventBtn.onclick = async function(){

  const id =
    document.getElementById("eventId").value;


  if(!id){

    alert("削除する予定を選択してください");

    return;

  }


  if(!confirm("この予定を削除しますか？")){

    return;

  }


  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id);


  if(error){

    alert("削除失敗");

    console.error(error);

    return;

  }


  alert("削除しました");


  document.getElementById("eventModal").style.display = "none";


  calendar.refetchEvents();

};

  
  closeDayModal.onclick = function(){
  dayModal.style.display = 'none';
};









  // ======================
  // 新規予定モーダル
  // ======================


  const newEventBtn =
    document.getElementById('newEventBtn');


  const eventModal =
    document.getElementById('eventModal');


  const closeEventModal =
    document.getElementById('closeEventModal');





  // ＋新規予定を押す
newEventBtn.onclick = function(){

  document.getElementById("eventId").value = "";

  document.getElementById("eventTitleInput").value = "";

  document.getElementById("eventDate").value =
  selectedDate || new Date().toISOString().substring(0,10);

  document.getElementById("eventTag").value = "work";

  document.getElementById("eventMemo").value = "";

  document.getElementById("eventItems").value = "";

  eventModal.style.display = 'flex';

};

  // 新規予定画面を閉じる

  closeEventModal.onclick = function(){


    eventModal.style.display = 'none';


  };
});