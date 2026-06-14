// core/logWriter.js

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function writeLog({
  session_id = null,
  room_id,
  persona_id,
  source,
  speaker, // "user" | "ai"
  message,
  tags = []
}) {
  const { error } = await supabase
    .from("conversation_logs")
    .insert([
      {
        session_id,
        room_id,
        persona_id,
        source,
        speaker,
        message,
        tags
      }
    ]);

  if (error) {
    console.error("LOG WRITE ERROR:", error);
  }

  return !error;
}
