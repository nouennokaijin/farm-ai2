const chatLog =
document.getElementById("chatLog");

const input =
document.getElementById("messageInput");

const sendButton =
document.getElementById("sendButton");

function appendUser(text){

    chatLog.innerHTML += `
        <div class="userMessage">
            <div class="userBubble">
                ${escapeHtml(text)}
            </div>
        </div>
    `;

    scrollBottom();
}

function appendAlbedo(text){

    chatLog.innerHTML += `
        <div class="albedoMessage">
            <div class="albedoBubble">
                ${escapeHtml(text)}
            </div>
        </div>
    `;

    scrollBottom();
}

function scrollBottom(){

    chatLog.scrollTop =
    chatLog.scrollHeight;
}

function escapeHtml(str){

    return str
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;");
}

async function sendMessage(){

    const text =
    input.value.trim();

    if(!text) return;

    appendUser(text);

    input.value = "";

    try{

        const res =
        await fetch("/api/talk",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                message:text
            })
        });

        const data =
        await res.json();

        appendAlbedo(
            data.reply || "..."
        );

    }
    catch(err){

        console.error(err);

        appendAlbedo(
            "申し訳ございません。通信に失敗いたしました。"
        );
    }
}

sendButton.addEventListener(
    "click",
    sendMessage
);

input.addEventListener(
    "keydown",
    e=>{
        if(e.key==="Enter"){
            sendMessage();
        }
    }
);