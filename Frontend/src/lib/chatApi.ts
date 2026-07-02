// Frontend/src/lib/chatApi.ts

/* -------------------------------------------------------------------------- */
/* Chat API Types                                                              */
/* These types describe the message payload sent to the backend AI endpoint    */
/* and the response returned to the chatbot interface.                         */
/* -------------------------------------------------------------------------- */

export type ChatMsg = {
  role: "user" | "assistant" | "developer";
  content: string;
};

export type SendChatPayload = {
  messages: ChatMsg[];
  note?: string;
  reflection?: string;
  confidence?: number;
};

export type SendChatResponse = {
  session_id?: number;
  reply: string;
  suggestions?: string[];
};

/* -------------------------------------------------------------------------- */
/* Send Chat Message Helper                                                    */
/* This function sends chat history and optional uploaded files to FastAPI. It */
/* uses FormData because the request may contain both JSON text and files.     */
/* -------------------------------------------------------------------------- */

export async function sendChatMessage(
  payload: SendChatPayload,
  files: File[] = []
): Promise<SendChatResponse> {
  /* ------------------------------------------------------------------------ */
  /* FormData Payload Setup                                                    */
  /* The chat JSON is stored inside FormData, then files are appended under    */
  /* the files key so the backend can read both parts in one request.          */
  /* ------------------------------------------------------------------------ */

  const formData = new FormData();

  formData.append("payload", JSON.stringify(payload));

  files.forEach((file) => {
    formData.append("files", file);
  });

  /* ------------------------------------------------------------------------ */
  /* Backend Chat Request                                                      */
  /* The browser calls the Next.js proxy route. The proxy forwards the request */
  /* to FastAPI while keeping httpOnly authentication cookies available.       */
  /* ------------------------------------------------------------------------ */

  const res = await fetch("/api/backend/ai/chat", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const responseText = await res.text();

  /* ------------------------------------------------------------------------ */
  /* Error Handling                                                            */
  /* Failed backend responses are logged with useful details, then converted   */
  /* into an Error so the page can display a user-friendly message.            */
  /* ------------------------------------------------------------------------ */

  if (!res.ok) {
    console.error("AI chat request failed:", {
      status: res.status,
      responseText,
    });

    throw new Error(responseText || "Chat request failed");
  }

  /* ------------------------------------------------------------------------ */
  /* Successful Response Parsing                                               */
  /* The backend returns JSON containing the assistant reply and optional      */
  /* suggestion buttons for the chat interface.                                */
  /* ------------------------------------------------------------------------ */

  return JSON.parse(responseText) as SendChatResponse;
}
