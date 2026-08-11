// =====================================================
// folder : web/home
// file   : diaryApp.js
// date   : 2026-08-01
// author : OKIURA KAZUO
// purpose: 静謐の間 自省録登録
// note   :
//   保存ボタンからserver.jsへ送信する。
// =====================================================


document
.getElementById("saveDiaryBtn")
.addEventListener(

"click",

async()=>{


const text =
document
.getElementById("diaryText")
.value;



if(!text.trim()){

document
.getElementById("saveResult")
.textContent =
"内容を入力してください";

return;

}



try{


const response =
await fetch(

"/api/document",

{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:JSON.stringify({

text:text

})

}

);



const result =
await response.json();



if(result.success){


document
.getElementById("saveResult")
.textContent =
"保存しました";


document
.getElementById("diaryText")
.value="";


}



}catch(error){


console.error(error);


document
.getElementById("saveResult")
.textContent =
"保存エラー";


}


}

);
