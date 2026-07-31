// =====================================================
// Nazarick Calendar v1.1
//
// app.js 復旧整理版
//
// 機能:
// ・FullCalendar
// ・Supabase CRUD
// ・予定一覧
// ・新規
// ・編集
// ・削除
//
// =====================================================


import { createClient } 
from "https://esm.sh/@supabase/supabase-js";

import { Calendar } 
from "https://esm.sh/@fullcalendar/core@6.1.19";

import dayGridPlugin 
from "https://esm.sh/@fullcalendar/daygrid@6.1.19";

import timeGridPlugin 
from "https://esm.sh/@fullcalendar/timegrid@6.1.19";

import interactionPlugin 
from "https://esm.sh/@fullcalendar/interaction@6.1.19";



// =====================
// Supabase
// =====================

const SUPABASE_URL =
  "https://stgaqwmdhnddqayqmedi.supabase.co";


const SUPABASE_KEY =
  "sb_publishable_cabU7_5aabCnGMdXAvitNw_VsX6JhKk";


const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );



// =====================
// state
// =====================

let calendarInstance = null;

let selectedDate = "";

let currentDayData = [];




// =====================
// タグ色
// =====================

function getTagColor(tag){

  switch(tag){

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




// =====================
// 日別一覧表示
// =====================

async function openDayModal(date){


  selectedDate = date;


  const modal =
    document.getElementById("dayModal");


  const title =
    document.getElementById("dayTitle");


  const list =
    document.getElementById("eventList");



  title.textContent =
    date + " の予定";


  list.innerHTML =
    "読込中...";


  modal.style.display =
    "flex";



  const {data,error} =
    await supabase
      .from("events")
      .select("*")
      .eq("event_date",date)
      .order("start_time");



  if(error){

    console.error(error);

    list.innerHTML =
      "取得失敗";

    return;

  }



  currentDayData =
    data || [];



  if(currentDayData.length === 0){

    list.innerHTML =
      "予定なし";

    return;

  }



  list.innerHTML = "";



  currentDayData.forEach(ev=>{


    const row =
      document.createElement("div");


    row.className =
      "event-row";



    row.innerHTML = `

      <div class="event-time">
        ${ev.start_time
          ? ev.start_time.substring(0,5)
          : "--:--"}
      </div>


      <div class="event-tag tag-${ev.tag}">
        ${ev.tag}
      </div>


      <div class="event-title">
        ${ev.title}
      </div>

    `;



    row.onclick = ()=>{

      openEditModal(ev);

    };



    list.appendChild(row);


  });


}
// =====================
// 新規予定
// =====================

function openNewModal(){


  document.getElementById("eventModalTitle").textContent =
    "新規予定";


  document.getElementById("eventId").value =
    "";


  document.getElementById("eventDate").value =
    selectedDate;


  document.getElementById("startTime").value =
    "";


  document.getElementById("endTime").value =
    "";


  document.getElementById("eventTitleInput").value =
    "";


  document.getElementById("eventTag").value =
    "other";


  document.getElementById("eventItems").value =
    "";


  document.getElementById("eventMemo").value =
    "";


  document.getElementById("deleteEventBtn").style.display =
    "none";


  document.getElementById("eventModal").style.display =
    "flex";


}




// =====================
// 編集
// =====================

function openEditModal(ev){


  document.getElementById("eventModalTitle").textContent =
    "予定編集";


  document.getElementById("eventId").value =
    ev.id;


  document.getElementById("eventDate").value =
    ev.event_date;


  document.getElementById("startTime").value =
    ev.start_time || "";


  document.getElementById("endTime").value =
    ev.end_time || "";


  document.getElementById("eventTitleInput").value =
    ev.title || "";


  document.getElementById("eventTag").value =
    ev.tag || "other";



  document.getElementById("eventItems").value =
    (ev.items || []).join("\n");


  document.getElementById("eventMemo").value =
    ev.memo || "";



  document.getElementById("deleteEventBtn").style.display =
    "inline-block";


  document.getElementById("eventModal").style.display =
    "flex";


}





// =====================
// 保存
// =====================

async function saveEvent(){


  const id =
    document.getElementById("eventId").value;



  const items =
    document.getElementById("eventItems")
      .value
      .split("\n")
      .map(v=>v.trim())
      .filter(v=>v);



  const payload = {


    title:
      document.getElementById("eventTitleInput").value,


    tag:
      document.getElementById("eventTag").value,


    memo:
      document.getElementById("eventMemo").value,


    items,


    event_date:
      document.getElementById("eventDate").value,


    start_time:
      document.getElementById("startTime").value || null,


    end_time:
      document.getElementById("endTime").value || null


  };



  let error;



  if(id){


    ({error} =
      await supabase
        .from("events")
        .update(payload)
        .eq("id",id));


  }else{


    ({error} =
      await supabase
        .from("events")
        .insert([payload]));


  }



  if(error){

    console.error(error);

    alert("保存失敗");

    return;

  }



  document.getElementById("eventModal").style.display =
    "none";



  calendarInstance.refetchEvents();



  await openDayModal(payload.event_date);


}





// =====================
// 削除
// =====================

async function deleteEvent(){


  const id =
    document.getElementById("eventId").value;



  if(!id)
    return;



  if(!confirm("削除しますか？"))
    return;



  const {error} =
    await supabase
      .from("events")
      .delete()
      .eq("id",id);



  if(error){

    console.error(error);

    alert("削除失敗");

    return;

  }



  document.getElementById("eventModal").style.display =
    "none";



  calendarInstance.refetchEvents();



  await openDayModal(selectedDate);


}
// =====================
// カレンダー初期化
// =====================

function initCalendar(){


  const calendarEl =
    document.getElementById("calendar");



  const calendar =
    new Calendar(calendarEl, {


      height:700,


      plugins:[

        dayGridPlugin,

        timeGridPlugin,

        interactionPlugin

      ],



      locale:"ja",



      initialView:
        "dayGridMonth",





      // =====================
      // 土日・今日色分け
      // =====================

      dayCellDidMount(info){


        const day =
          info.date.getDay();



        if(day === 0){

          info.el.style.backgroundColor =
            "#ffeaea";

        }



        if(day === 6){

          info.el.style.backgroundColor =
            "#eaf4ff";

        }



        if(info.isToday){

          info.el.style.backgroundColor =
            "rgba(0,128,0,0.3)";

        }


      },





      // =====================
      // ヘッダー
      // =====================

      headerToolbar:{


        left:
          "prev,next today",


        center:
          "title",


        right:
          "dayGridMonth,timeGridWeek"


      },





      // =====================
      // 日付クリック
      // =====================

      dateClick(info){


        openDayModal(
          info.dateStr
        );


      },





      // =====================
      // Supabase予定取得
      // =====================

      events:
        async(fetchInfo,success,failure)=>{


          const {data,error} =
            await supabase
              .from("events")
              .select("*");



          if(error){

            console.error(error);

            failure(error);

            return;

          }




          success(

            (data || []).map(ev=>({


              id:
                ev.id,


              title:
                ev.title,


              start:
                ev.start_time

                ? `${ev.event_date}T${ev.start_time}`

                : ev.event_date,



              color:
                getTagColor(ev.tag)


            }))

          );


        }


    });




  calendar.render();



  calendarInstance =
    calendar;






  // =====================
  // ボタン接続
  // =====================


  const newBtn =
    document.getElementById("newEventBtn");


  const saveBtn =
    document.getElementById("saveEventBtn");


  const deleteBtn =
    document.getElementById("deleteEventBtn");


  const closeDay =
    document.getElementById("closeDayModal");


  const closeEvent =
    document.getElementById("closeEventModal");





  if(newBtn){

    newBtn.onclick =
      openNewModal;

  }



  if(saveBtn){

    saveBtn.onclick =
      saveEvent;

  }



  if(deleteBtn){

    deleteBtn.onclick =
      deleteEvent;

  }



  if(closeDay){

    closeDay.onclick = ()=>{


      document
        .getElementById("dayModal")
        .style.display =
        "none";


    };

  }




  if(closeEvent){

    closeEvent.onclick = ()=>{


      document
        .getElementById("eventModal")
        .style.display =
        "none";


    };

  }



}





// =====================
// 起動
// =====================

if(document.readyState === "loading"){


  document.addEventListener(
    "DOMContentLoaded",
    initCalendar
  );


}else{


  initCalendar();


}